import os
import time
from flask import Blueprint, request, jsonify, g, current_app
from flask_cors import cross_origin
from werkzeug.utils import secure_filename
from app.models import User, db, UserMediaList, Media
from app.routes.auth import auth_required, auth_optional
from app.schemas import ProfileUpdateSchema
from datetime import datetime

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
    user = User.query.filter_by(username=username).first()

    if not user:
        return jsonify({'error': 'User not found'}), 404

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
            user_media_entries = UserMediaList.query.filter_by(user_id=g.user_id).all()

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

    # Получаем статистику через отдельные запросы
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

    return jsonify({
        'id': user.id,
        'username': user.username,
        'display_name': user.display_name or user.username,
        'avatar_url': user.avatar_filename,
        'gender': user.gender,
        'age': user.age,
        'about': user.about,
        'registered_at': user.created_at.isoformat(),
        'stats': stats,
        'is_current_user': g.user_id == user.id
    }), 200


@users_bp.route('/me', methods=['PUT'])
@auth_required
def update_profile():
    schema = ProfileUpdateSchema()
    errors = schema.validate(request.json)
    if errors:
        return jsonify({'errors': errors}), 400

    user = User.query.get(g.user_id)
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
            return jsonify({'error': 'Invalid age format'}), 400
    if 'about' in data:
        update_fields['about'] = data['about'].strip()

    try:
        User.query.filter_by(id=g.user_id).update(update_fields)
        db.session.commit()
        return jsonify({'message': 'Profile updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@users_bp.route('/avatar', methods=['POST'])
@auth_required
def upload_avatar():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type'}), 400

    if len(file.read()) > 2 * 1024 * 1024:
        return jsonify({'error': 'File size exceeds 2MB limit'}), 400
    file.seek(0)

    filename = secure_filename(
        f"user_{g.user_id}_{datetime.now().timestamp()}.{file.filename.rsplit('.', 1)[1].lower()}")
    upload_folder = current_app.config['UPLOAD_FOLDER']
    os.makedirs(upload_folder, exist_ok=True)
    file_path = os.path.join(upload_folder, filename)

    try:
        file.save(file_path)
        user = User.query.get(g.user_id)
        user.avatar_filename = filename
        db.session.commit()
        return jsonify({'avatar_url': f'{filename}'}), 200
    except Exception as e:
        current_app.logger.error(f"Avatar upload failed: {str(e)}")
        return jsonify({'error': 'File upload failed'}), 500
