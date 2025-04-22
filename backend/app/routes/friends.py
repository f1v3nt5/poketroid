from flask import Blueprint, request, jsonify
from app.models import Friendship, User, db
from .auth import auth_required
from sqlalchemy import or_, and_

friends_bp = Blueprint('friends', __name__)


# Поиск пользователей
@friends_bp.route('/search', methods=['GET'])
def search_users():
    username = request.args.get('username')
    if not username or len(username) < 3:
        return jsonify({'error': 'Minimum 3 characters required'}), 400

    users = User.query.filter(
        User.username.ilike(f'%{username}%')
    ).limit(10).all()

    return jsonify([{
        'id': user.id,
        'username': user.username
    } for user in users]), 200


# Отправка запроса на дружбу
@friends_bp.route('/request', methods=['POST'])
def send_friend_request():
    data = request.get_json()
    user_id = data.get('user_id')
    friend_id = data.get('friend_id')

    if user_id == friend_id:
        return jsonify({'error': 'Cannot add yourself'}), 400

    existing = Friendship.query.filter(
        or_(
            and_(Friendship.user_id == user_id, Friendship.friend_id == friend_id),
            and_(Friendship.user_id == friend_id, Friendship.friend_id == user_id)
        )
    ).first()

    if existing:
        return jsonify({'error': 'Request already exists'}), 409

    new_request = Friendship(
        user_id=user_id,
        friend_id=friend_id,
        status='pending'
    )

    try:
        db.session.add(new_request)
        db.session.commit()
        return jsonify({'message': 'Friend request sent'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@friends_bp.route('/requests', methods=['GET'])
@auth_required
def get_friend_requests(user_id):
    requests = Friendship.query.filter(
        Friendship.friend_id == user_id,
        Friendship.status == 'pending'
    ).all()

    return jsonify([{
        'request_id': r.id,
        'user_id': r.user_id,
        'username': User.query.get(r.user_id).username,
        'created_at': r.created_at.isoformat()
    } for r in requests]), 200


# Управление запросами
@friends_bp.route('/requests/<int:request_id>', methods=['PATCH'])
def handle_request(request_id):
    data = request.get_json()
    new_status = data.get('status')

    if new_status not in ['accepted', 'rejected']:
        return jsonify({'error': 'Invalid status'}), 400

    request_entry = Friendship.query.get(request_id)
    if not request_entry:
        return jsonify({'error': 'Request not found'}), 404

    request_entry.status = new_status
    try:
        db.session.commit()
        return jsonify({'message': f'Request {new_status}'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# Получение списка друзей
@friends_bp.route('/<int:user_id>', methods=['GET'])
def get_friends(user_id):
    friends = Friendship.query.filter(
        Friendship.user_id == user_id,
        Friendship.status == 'accepted'
    ).all()

    return jsonify([{
        'friend_id': f.friend_id,
        'username': User.query.get(f.friend_id).username,
        'friends_since': f.created_at.isoformat()
    } for f in friends]), 200
