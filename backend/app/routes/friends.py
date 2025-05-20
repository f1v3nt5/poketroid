from flask import Blueprint, g, jsonify

from app.models import db, Friendship, User
from .auth import auth_required


friends_bp = Blueprint('friends', __name__)


@friends_bp.route('/<int:friend_id>/request', methods=['POST'])
@auth_required
def send_request(friend_id):
    """Отправка запроса дружбы пользователю"""
    if g.user_id == friend_id:
        return jsonify({
            'error': 'Cannot add yourself'
        }), 400

    exists = Friendship.query.filter(
        ((Friendship.user_id == g.user_id) & (Friendship.friend_id == friend_id)) |
        ((Friendship.user_id == friend_id) & (Friendship.friend_id == g.user_id))
    ).first()

    if exists:
        return jsonify({
            'error': 'Request already exists'
        }), 409

    new_request = Friendship(
        user_id=g.user_id,
        friend_id=friend_id,
        status='pending'
    )

    db.session.add(new_request)
    db.session.commit()

    return jsonify({
        'message': 'Friend request sent'
    }), 201


@friends_bp.route('/requests', methods=['GET'])
@auth_required
def get_requests():
    """Получить все входящие и исходящие запросы в друзья"""
    incoming = Friendship.query.filter_by(
        friend_id=g.user_id,
        status='pending'
    ).all()

    outgoing = Friendship.query.filter_by(
        user_id=g.user_id,
        status='pending'
    ).all()

    return jsonify({
        'incoming': [serialize_request(r) for r in incoming],
        'outgoing': [serialize_request(r) for r in outgoing]
    }), 200


def serialize_request(request):
    """Сериализация запроса"""
    user = User.query.get(
        request.user_id
        if request.user_id != g.user_id
        else request.friend_id
    )
    return {
        'user': {
            'id': user.id,
            'username': user.username,
            'avatar': user.avatar_filename,
            'displayName': user.display_name
        },
        'created_at': request.created_at.isoformat()
    }


@friends_bp.route('/requests/<int:friend_id>/accept', methods=['POST'])
@auth_required
def accept_request(friend_id):
    """Принять входящий запрос"""
    request = Friendship.query.filter_by(
        user_id=friend_id,
        friend_id=g.user_id,
        status='pending'
    ).first_or_404()

    request.status = 'accepted'
    db.session.commit()

    return jsonify({
        'message': 'Request accepted'
    }), 200


@friends_bp.route('/requests/<int:friend_id>/reject', methods=['POST'])
@auth_required
def reject_request(friend_id):
    """Отклонить входящий запрос"""
    Friendship.query.filter_by(
        user_id=friend_id,
        friend_id=g.user_id,
        status='pending'
    ).delete()

    db.session.commit()

    return jsonify({
        'message': 'Request rejected'
    }), 200


@friends_bp.route('/requests/<int:friend_id>', methods=['DELETE'])
@auth_required
def cancel_request(friend_id):
    """Отменить исходящий запрос"""
    Friendship.query.filter_by(
        user_id=g.user_id,
        friend_id=friend_id,
        status='pending'
    ).delete()

    db.session.commit()

    return jsonify({
        'message': 'Request canceled'
    }), 200


@friends_bp.route('/<int:friend_id>', methods=['DELETE'])
@auth_required
def remove_friend(friend_id):
    """Удалить пользователя из друзей"""
    Friendship.query.filter(
        ((Friendship.user_id == g.user_id) & (Friendship.friend_id == friend_id)) |
        ((Friendship.user_id == friend_id) & (Friendship.friend_id == g.user_id))
    ).delete()

    db.session.commit()
    return jsonify({
        'message': 'Friendship removed'
    }), 200


@friends_bp.route('/', methods=['GET'])
@auth_required
def get_friends():
    """Получить список всех друзей"""
    friendships = Friendship.query.filter(
        ((Friendship.user_id == g.user_id) | (Friendship.friend_id == g.user_id)),
        Friendship.status == 'accepted'
    ).all()

    friend_ids = set()
    for f in friendships:
        if f.user_id == g.user_id:
            friend_ids.add(f.friend_id)
        else:
            friend_ids.add(f.user_id)

    friends = User.query.filter(
        User.id.in_(friend_ids)
    ).all()

    return jsonify([{
        'id': u.id,
        'username': u.username,
        'avatar': u.avatar_filename
    } for u in friends]), 200


@friends_bp.route('/status/<int:user_id>', methods=['GET'])
@auth_required
def get_status(user_id):
    """Получить статус дружбы с пользователем"""
    relation = Friendship.query.filter(
        ((Friendship.user_id == g.user_id) & (Friendship.friend_id == user_id)) |
        ((Friendship.user_id == user_id) & (Friendship.friend_id == g.user_id))
    ).first()

    if not relation:
        return jsonify({
            'status': 'not_friends'
        }), 200

    status_map = {
        'pending': 'request_sent' if relation.user_id == g.user_id else 'request_received',
        'accepted': 'friends',
        'rejected': 'rejected'
    }

    return jsonify({
        'status': status_map[relation.status]
    }), 200
