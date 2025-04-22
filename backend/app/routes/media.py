from flask import Blueprint, request, jsonify, g
from app.models import Media, Genre, MediaGenre, UserMediaList, db
from sqlalchemy import and_, or_, literal
from .auth import auth_required, auth_optional
from datetime import datetime


media_bp = Blueprint('media', __name__)


# Получение каталога с фильтрами
@media_bp.route('/', methods=['GET'])
@auth_optional
def get_media_catalog():
    try:
        user_id = getattr(g, 'user_id', None)

        query = Media.query

        # Фильтрация по типу
        media_type = request.args.get('type')
        if media_type and media_type in ['movie', 'anime', 'book']:
            query = query.filter(Media.type == media_type)

        # Поиск по названию
        search_query = request.args.get('query')
        if search_query:
            query = query.filter(Media.title.ilike(f'%{search_query}%'))

        # Сортировка
        sort_by = request.args.get('sort_by', 'popularity')
        if sort_by == 'popularity':
            query = query.order_by(Media.external_rating_count.desc())
        elif sort_by == 'newest':
            query = query.order_by(Media.release_year.desc())

        if user_id:
            query = query.outerjoin(
                UserMediaList,
                and_(
                    UserMediaList.media_id == Media.id,
                    UserMediaList.user_id == user_id
                )
            ).add_columns(UserMediaList.list_type)
        else:
            query = query.add_columns(literal(None).label('list_type'))

        # Пагинация
        page = int(request.args.get('page', 1))
        per_page = 20
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        result = {
            'items': [{
                'id': media.id,
                'title': media.title,
                'type': media.type,
                'cover_url': media.cover_url,
                'rating': media.external_rating,
                'release_year': media.release_year,
                'user_list': list_type
            } for media, list_type in paginated.items],
            'total_pages': paginated.pages,
            'current_page': page
        }

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Добавление в список пользователя
@media_bp.route('/list', methods=['POST'])
@auth_required
def add_to_list():
    user_id = g.user_id

    data = request.get_json()

    # Проверка входных данных
    if not data or 'media_id' not in data or 'list_type' not in data:
        return jsonify({'error': 'Missing required fields'}), 400

    if data['list_type'] not in ['planned', 'completed', 'favorite']:
        return jsonify({'error': 'Invalid list type'}), 400

    if not user_id:
        return jsonify({'error': 'User not authenticated'}), 401

    # Проверка существования медиа
    media = Media.query.get(data['media_id'])
    if not media:
        return jsonify({'error': 'Media not found'}), 404

    # Обновление или создание записи
    existing = UserMediaList.query.filter_by(
        user_id=user_id,
        media_id=data['media_id']
    ).first()

    if existing:
        if existing.list_type == data['list_type']:
            return jsonify({'error': 'Already in this list'}), 409
        existing.list_type = data['list_type']
    else:
        new_entry = UserMediaList(
            user_id=user_id,
            media_id=data['media_id'],
            list_type=data['list_type']
        )
        db.session.add(new_entry)

    try:
        db.session.commit()
        return jsonify({'message': 'List updated'}), 200
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
