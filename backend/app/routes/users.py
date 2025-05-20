import os

from datetime import datetime
from flask import Blueprint, current_app, g, jsonify, request
from flask_cors import cross_origin
from sqlalchemy import func
from werkzeug.utils import secure_filename

from app.models import db, Friendship, Media, User, UserMediaList
from app.routes.auth import auth_optional, auth_required
from app.schemas import ProfileUpdateSchema


users_bp = Blueprint('users', __name__)


ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB


def allowed_file(filename):
    return '.' in filename and \
        filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@users_bp.route('/<username>', methods=['GET'])
@cross_origin(supports_credentials=True)
@auth_optional
def get_profile(username):
    """Получение профиля пользователя"""
    user = User.query.filter_by(username=username).first()

    if not user:
        return jsonify({
            'error': 'User not found'
        }), 404

    media_type = request.args.get('media_type')
    list_type = request.args.get('list_type')

    if media_type and list_type:
        query = db.session.query(
            UserMediaList,
            Media
        ).join(
            Media,
            UserMediaList.media_id == Media.id
        ).filter(
            UserMediaList.user_id == user.id,
            UserMediaList.list_type == list_type,
            Media.type == media_type
        ).order_by(
            UserMediaList.added_at.desc()
        ).all()

        user_statuses = {}
        if g.get('user_id'):
            user_media_entries = UserMediaList.query.filter_by(
                user_id=g.user_id
            ).all()

            for entry in user_media_entries:
                media_id = entry.media_id
                if media_id not in user_statuses:
                    user_statuses[media_id] = {
                        'planned': False,
                        'completed': False,
                        'favorite': False
                    }
                user_statuses[media_id][entry.list_type] = True

        media = [{
            "id": media.id,
            "title": media.title,
            "type": media.type,
            "cover_url": media.cover_url,
            'rating': media.external_rating,
            'year': media.release_year,
            'is_planned': user_statuses.get(media.id, {}).get('planned', False),
            'is_completed': user_statuses.get(media.id, {}).get('completed', False),
            'is_favorite': user_statuses.get(media.id, {}).get('favorite', False)
        } for user_media, media in query]
        return jsonify(media)

    stats = {
        'anime': {
            'completed': user.lists.filter_by(list_type='completed')
            .join(Media)
            .filter(Media.type == 'anime')
            .count(),
            'planned': user.lists.filter_by(list_type='planned')
            .join(Media)
            .filter(Media.type == 'anime')
            .count()
        },
        'movies': {
            'completed': user.lists.filter_by(list_type='completed')
            .join(Media)
            .filter(Media.type == 'movie')
            .count(),
            'planned': user.lists.filter_by(list_type='planned')
            .join(Media)
            .filter(Media.type == 'movie')
            .count()
        },
        'books': {
            'completed': user.lists.filter_by(list_type='completed')
            .join(Media)
            .filter(Media.type == 'book')
            .count(),
            'planned': user.lists.filter_by(list_type='planned')
            .join(Media)
            .filter(Media.type == 'book')
            .count()
        }
    }

    durations = {
        'anime': {
            'completed': user.lists.join(Media)
            .filter(
                UserMediaList.list_type == 'completed',
                Media.type == 'anime'
            )
            .with_entities(func.coalesce(func.sum(Media.duration), 0))
            .scalar()
        },
        'movies': {
            'completed': user.lists.join(Media)
            .filter(
                UserMediaList.list_type == 'completed',
                Media.type == 'movie'
            )
            .with_entities(func.coalesce(func.sum(Media.duration), 0))
            .scalar()
        },
        'books': {
            'completed': user.lists.join(Media)
            .filter(
                UserMediaList.list_type == 'completed',
                Media.type == 'book'
            )
            .with_entities(func.coalesce(func.sum(Media.duration), 0))
            .scalar()
        }
    }

    status = 'none'
    if g.get('user_id'):
        current_user = User.query.get(g.user_id)
        friendship = Friendship.query.filter(
            ((Friendship.user_id == user.id) & (Friendship.friend_id == current_user.id)
             |
             (Friendship.friend_id == user.id) & (Friendship.user_id == current_user.id))
        ).first()
        if friendship:
            if not friendship.status == 'pending':
                status = friendship.status
            else:
                type = 'incoming' if friendship.friend_id == current_user.id else 'outcoming'
                status = friendship.status + ' ' + type

    return jsonify({
        'id': user.id,
        'username': user.username,
        'display_name': user.display_name or user.username,
        'avatar_url': user.avatar_filename,
        'gender': user.gender,
        'age': user.age,
        'about': user.about,
        'registered_at': user.created_at.isoformat(),
        'durations': durations,
        'stats': stats,
        'is_current_user': g.user_id == user.id,
        'status': status
    }), 200


@users_bp.route('/me', methods=['PUT'])
@auth_required
def update_profile():
    """Редактирование профиля"""
    schema = ProfileUpdateSchema()
    errors = schema.validate(request.json)
    if errors:
        return jsonify({
            'errors': errors
        }), 400

    data = request.json

    update_fields = {}
    if 'display_name' in data:
        update_fields['display_name'] = data['display_name'].strip()
    if 'gender' in data:
        update_fields['gender'] = data['gender'] or None
    if 'age' in data:
        try:
            update_fields['age'] = int(data['age']) if data['age'] else None
        except ValueError:
            return jsonify({
                'error': 'Invalid age format'
            }), 400
    if 'about' in data:
        update_fields['about'] = data['about'].strip()

    try:
        User.query.filter_by(id=g.user_id).update(update_fields)
        db.session.commit()
        return jsonify({
            'message': 'Profile updated successfully'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': str(e)
        }), 500


@users_bp.route('/avatar', methods=['POST'])
@auth_required
def upload_avatar():
    """Загрузка аватара"""
    if 'file' not in request.files:
        return jsonify({
            'error': 'No file part'
        }), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({
            'error': 'No selected file'
        }), 400

    if not allowed_file(file.filename):
        return jsonify({
            'error': 'Invalid file type'
        }), 400

    if len(file.read()) > MAX_FILE_SIZE:
        return jsonify({
            'error': 'File size exceeds 2MB limit'
        }), 400
    file.seek(0)

    filename = secure_filename(
        f"user_{g.user_id}_{datetime.now().timestamp()}."
        f"{file.filename.rsplit('.', 1)[1].lower()}"
    )
    upload_folder = current_app.config['UPLOAD_FOLDER']
    os.makedirs(upload_folder, exist_ok=True)
    file_path = os.path.join(upload_folder, filename)

    try:
        file.save(file_path)
        user = User.query.get(g.user_id)
        user.avatar_filename = filename
        db.session.commit()
        return jsonify({
            'avatar_url': f'{filename}'
        }), 200
    except Exception as e:
        current_app.logger.error(f"Avatar upload failed: {str(e)}")
        return jsonify({
            'error': 'File upload failed'
        }), 500


@users_bp.route('/<username>/friends', methods=['GET'])
def get_user_friends(username):
    """Получение списка друзей"""
    user = User.query.filter_by(username=username).first_or_404()

    friends = Friendship.query.filter(
        ((Friendship.user_id == user.id) | (Friendship.friend_id == user.id)),
        Friendship.status == 'accepted'
    ).limit(5).all()

    friends_list = []
    for f in friends:
        friend_id = f.friend_id if f.user_id == user.id else f.user_id
        friend = User.query.get(friend_id)
        friends_list.append({
            'id': friend.id,
            'username': friend.username,
            'avatar': friend.avatar_filename
        })

    return jsonify({
        'friends': friends_list
    }), 200


@users_bp.route('/search', methods=['GET'])
@auth_required
def search_users():
    """Поиск по пользователям"""
    query = request.args.get('q', '')
    users = User.query.filter(
        (User.username.ilike(f'%{query}%') | User.display_name.ilike(f'%{query}%'))
    ).limit(10).all()

    current_user = User.query.get(g.user_id)

    return jsonify([{
        'id': u.id,
        'username': u.username,
        'avatar': u.avatar_filename,
        'displayName': u.display_name,
        'status': Friendship.query.filter(
            ((Friendship.user_id == u.id) & (Friendship.friend_id == current_user.id)
             |
             (Friendship.friend_id == u.id) & (Friendship.user_id == current_user.id))
        ).first().status
        if Friendship.query.filter(
            ((Friendship.user_id == u.id) & (Friendship.friend_id == current_user.id)
             |
             (Friendship.friend_id == u.id) & (Friendship.user_id == current_user.id))
        ).first() else 'none',
        'isCurrentUser': u.id == current_user.id
    } for u in users]), 200
