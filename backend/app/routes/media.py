from flask import Blueprint, request, jsonify, g
from flask_cors import cross_origin
from app.models import Media, Genre, MediaGenre, UserMediaList, db
from .auth import auth_required, auth_optional
from sqlalchemy import and_, or_, literal
from datetime import datetime


media_bp = Blueprint('media', __name__)


@media_bp.route('/', methods=['GET'])
@cross_origin(supports_credentials=True)
def get_media():
    try:
        # Получение параметров запроса
        media_type = request.args.get('type')
        sort_by = request.args.get('sort_by', 'popularity')
        search_query = request.args.get('query')
        page = int(request.args.get('page', 1))
        per_page = 20

        # Базовый запрос
        query = Media.query

        # Фильтрация по типу
        if media_type and media_type in ['movie', 'anime', 'book']:
            query = query.filter(Media.type == media_type)

        # Поиск по названию
        if search_query and search_query.strip():
            query = query.filter(Media.title.ilike(f'%{search_query}%'))

        # Сортировка
        if sort_by == 'popularity':
            query = query.order_by(Media.external_rating_count.desc())
        elif sort_by == 'newest':
            query = query.order_by(Media.release_year.desc())

        # Пагинация
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        # Получение статусов для авторизованных пользователей
        user_statuses = {}
        if 'Authorization' in request.headers:
            user_id = g.get('user_id')
            if user_id:
                user_media = UserMediaList.query.filter_by(user_id=user_id).all()
                user_statuses = {
                    item.media_id: {
                        'planned': item.list_type == 'planned',
                        'completed': item.list_type == 'completed',
                        'favorite': item.list_type == 'favorite'
                    }
                    for item in user_media
                }

        # Формирование ответа
        items = []
        for media in paginated.items:
            status = user_statuses.get(media.id, {})
            items.append({
                'id': media.id,
                'title': media.title,
                'type': media.type,
                'cover_url': media.cover_url,
                'rating': media.external_rating,
                'year': media.release_year,
                'is_planned': status.get('planned', False),
                'is_completed': status.get('completed', False),
                'is_favorite': status.get('favorite', False)
            })

        return jsonify({
            'items': items,
            'total_pages': paginated.pages,
            'current_page': page
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@media_bp.route('/list', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True)
@auth_required
def handle_media_list():
    try:
        data = request.get_json()
        user_id = g.user_id

        # Валидация входных данных
        if not data or 'media_id' not in data or 'list_type' not in data:
            return jsonify({'error': 'Missing required fields'}), 400

        media_id = data['media_id']
        list_type = data['list_type']
        operation = data.get('operation', 'toggle')

        # Проверка существования медиа
        media = Media.query.get(media_id)
        if not media:
            return jsonify({'error': 'Media not found'}), 404

        # Обработка взаимоисключающих статусов
        opposite_type = None
        if list_type in ['planned', 'completed']:
            opposite_type = 'completed' if list_type == 'planned' else 'planned'
            UserMediaList.query.filter_by(
                user_id=user_id,
                media_id=media_id,
                list_type=opposite_type
            ).delete()

        # Поиск существующей записи
        existing = UserMediaList.query.filter_by(
            user_id=user_id,
            media_id=media_id,
            list_type=list_type
        ).first()

        # Определение операции
        if operation == 'toggle':
            should_add = not existing
        else:
            should_add = operation == 'add'

        # Выполнение операции
        if should_add:
            if not existing:
                new_entry = UserMediaList(
                    user_id=user_id,
                    media_id=media_id,
                    list_type=list_type,
                    added_at=datetime.utcnow()
                )
                db.session.add(new_entry)
        else:
            if existing:
                db.session.delete(existing)

        db.session.commit()

        # Получение актуального статуса
        updated_status = {
            'is_planned': False,
            'is_completed': False,
            'is_favorite': False
        }

        entries = UserMediaList.query.filter_by(
            user_id=user_id,
            media_id=media_id
        ).all()

        for entry in entries:
            key = f'is_{entry.list_type}'
            if key in updated_status:
                updated_status[key] = True

        return jsonify(updated_status), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# Получение списка пользователя
@media_bp.route('/user/<int:user_id>', methods=['GET'])
def get_user_media(user_id):
    list_type = request.args.get('list_type')

    if not list_type or list_type not in ['favorite', 'completed', 'planned']:
        return jsonify({'error': 'Invalid list type'}), 400

    items = UserMediaList.query.filter_by(
        user_id=user_id,
        list_type=list_type
    ).join(Media).all()

    return jsonify([{
        'media_id': item.media_id,
        'title': item.media.title,
        'added_at': item.added_at.isoformat()
    } for item in items]), 200
