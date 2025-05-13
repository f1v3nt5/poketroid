from flask import Blueprint, jsonify, g
from app.models import Friendship, User, db
from .auth import auth_required

friends_bp = Blueprint('friends', __name__)


@friends_bp.route('/<int:friend_id>/request', methods=['POST'])
@auth_required
def send_request(friend_id):
    # Проверка на самого себя
    if g.user_id == friend_id:
        return jsonify({'error': 'Cannot add yourself'}), 400

    # Проверка существующих запросов
    exists = Friendship.query.filter(
        ((Friendship.user_id == g.user_id) & (Friendship.friend_id == friend_id)) |
        ((Friendship.user_id == friend_id) & (Friendship.friend_id == g.user_id))
    ).first()

    if exists:
        return jsonify({'error': 'Request already exists'}), 409

    # Создание нового запроса
    new_request = Friendship(
        user_id=g.user_id,
        friend_id=friend_id,
        status='pending'
    )

    db.session.add(new_request)
    db.session.commit()

    return jsonify({'message': 'Friend request sent'}), 201


@friends_bp.route('/requests', methods=['GET'])
@auth_required
def get_requests():
    # Входящие запросы
    incoming = Friendship.query.filter_by(
        friend_id=g.user_id,
        status='pending'
    ).all()

    # Исходящие запросы
    outgoing = Friendship.query.filter_by(
        user_id=g.user_id,
        status='pending'
    ).all()

    return jsonify({
        'incoming': [serialize_request(r) for r in incoming],
        'outgoing': [serialize_request(r) for r in outgoing]
    }), 200


def serialize_request(request):
    user = User.query.get(request.user_id if request.user_id != g.user_id else request.friend_id)
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
    # Находим запрос
    request = Friendship.query.filter_by(
        user_id=friend_id,
        friend_id=g.user_id,
        status='pending'
    ).first_or_404()

    # Обновляем статус
    request.status = 'accepted'
    db.session.commit()

    return jsonify({'message': 'Request accepted'}), 200


@friends_bp.route('/requests/<int:friend_id>/reject', methods=['POST'])
@auth_required
def reject_request(friend_id):
    Friendship.query.filter_by(
        user_id=friend_id,
        friend_id=g.user_id,
        status='pending'
    ).delete()

    db.session.commit()

    return jsonify({'message': 'Request rejected'}), 200


@friends_bp.route('/requests/<int:friend_id>', methods=['DELETE'])
@auth_required
def cancel_request(friend_id):
    Friendship.query.filter_by(
        user_id=g.user_id,
        friend_id=friend_id,
        status='pending'
    ).delete()

    db.session.commit()

    return jsonify({'message': 'Request rejected'}), 200


@friends_bp.route('/<int:friend_id>', methods=['DELETE'])
@auth_required
def remove_friend(friend_id):
    # Удаляем обе связи
    Friendship.query.filter(
        ((Friendship.user_id == g.user_id) & (Friendship.friend_id == friend_id)) |
        ((Friendship.user_id == friend_id) & (Friendship.friend_id == g.user_id))
    ).delete()

    db.session.commit()
    return jsonify({'message': 'Friendship removed'}), 200


@friends_bp.route('/', methods=['GET'])
@auth_required
def get_friends():
    # Получаем все подтвержденные связи
    friendships = Friendship.query.filter(
        ((Friendship.user_id == g.user_id) | (Friendship.friend_id == g.user_id)),
        Friendship.status == 'accepted'
    ).all()

    # Собираем ID всех друзей
    friend_ids = set()
    for f in friendships:
        if f.user_id == g.user_id:
            friend_ids.add(f.friend_id)
        else:
            friend_ids.add(f.user_id)

    # Получаем данные пользователей
    friends = User.query.filter(User.id.in_(friend_ids)).all()

    # Форматируем ответ
    return jsonify([{
        'id': u.id,
        'username': u.username,
        'avatar': u.avatar_filename
    } for u in friends]), 200


@friends_bp.route('/status/<int:user_id>', methods=['GET'])
@auth_required
def get_status(user_id):
    relation = Friendship.query.filter(
        ((Friendship.user_id == g.user_id) & (Friendship.friend_id == user_id)) |
        ((Friendship.user_id == user_id) & (Friendship.friend_id == g.user_id))
    ).first()

    if not relation:
        return jsonify({'status': 'not_friends'}), 200

    status_map = {
        'pending': 'request_sent' if relation.user_id == g.user_id else 'request_received',
        'accepted': 'friends',
        'rejected': 'rejected'
    }

    return jsonify({'status': status_map[relation.status]}), 200
