from flask import Blueprint, request, jsonify, g, current_app
from flask_cors import cross_origin
from sqlalchemy import or_
from sqlalchemy.orm import aliased
from app.models import Media, UserMediaList, db, User
from datetime import datetime
from .auth import auth_required, auth_optional

media_bp = Blueprint('media', __name__)


@media_bp.route('/', methods=['GET'])
@cross_origin(supports_credentials=True)
@auth_optional
def get_media():
    try:
        # Параметры запроса
        media_type = request.args.get('type')
        sort_by = request.args.get('sort_by', 'popularity')
        search_query = request.args.get('query')
        page = int(request.args.get('page', 1))
        per_page = 20

        # Базовый запрос
        query = Media.query

        # Фильтрация
        if media_type and media_type in ['movie', 'anime', 'book']:
            query = query.filter(Media.type == media_type)
        if search_query:
            query = query.filter(or_(Media.title.ilike(f'%{search_query}%'), Media.author.ilike(f'%{search_query}%')))

        # Сортировка
        if sort_by == 'popularity':
            query = query.order_by(Media.external_rating_count.desc())
        elif sort_by == 'newest':
            query = query.order_by(Media.release_year.desc())

        # Пагинация
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        # Получение статусов пользователя
        user_statuses = {}
        if g.get('user_id'):
            user_media_entries = UserMediaList.query.filter_by(user_id=g.user_id).all()

            # Собираем все статусы для каждого media_id
            for entry in user_media_entries:
                media_id = entry.media_id
                if media_id not in user_statuses:
                    user_statuses[media_id] = {
                        'planned': False,
                        'completed': False,
                        'favorite': False
                    }
                # Обновляем соответствующий статус
                user_statuses[media_id][entry.list_type] = True

        # Формирование ответа
        items = [{
            'id': media.id,
            'title': media.title,
            'type': media.type,
            'author': media.author,
            'cover_url': media.cover_url,
            'rating': media.external_rating,
            'year': media.release_year,
            'is_planned': user_statuses.get(media.id, {}).get('planned', False),
            'is_completed': user_statuses.get(media.id, {}).get('completed', False),
            'is_favorite': user_statuses.get(media.id, {}).get('favorite', False)
        } for media in paginated.items]

        return jsonify({
            'items': items,
            'total_pages': paginated.pages,
            'current_page': page
        }), 200

    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500


@media_bp.route('/list', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True)
@auth_required
def handle_media_list():
    try:
        data = request.get_json()
        user_id = g.user_id

        # Валидация
        if not data or 'media_id' not in data or 'list_type' not in data:
            return jsonify({'error': 'Missing required fields'}), 400

        media_id = data['media_id']
        list_type = data['list_type']
        operation = data.get('operation', 'toggle')

        # Проверка существования медиа
        media = Media.query.get(media_id)
        if not media:
            return jsonify({'error': 'Media not found'}), 404

        # Удаление из противоположного списка
        if list_type in ['planned', 'completed']:
            opposite_type = 'completed' if list_type == 'planned' else 'planned'
            # Удаляем ВСЕ записи противоположного типа
            UserMediaList.query.filter_by(
                user_id=user_id,
                media_id=media_id,
                list_type=opposite_type
            ).delete(synchronize_session=False)
            db.session.commit()

        # Обработка операции
        existing = UserMediaList.query.filter_by(
            user_id=user_id,
            media_id=media_id,
            list_type=list_type
        ).first()

        if operation == 'toggle':
            should_add = not existing
        else:
            should_add = operation == 'add'

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

        # Возвращаем обновленные статусы
        current_status = {
            'is_planned': UserMediaList.query.filter_by(
                user_id=user_id,
                media_id=media_id,
                list_type='planned'
            ).first() is not None,
            'is_completed': UserMediaList.query.filter_by(
                user_id=user_id,
                media_id=media_id,
                list_type='completed'
            ).first() is not None,
            'is_favorite': UserMediaList.query.filter_by(
                user_id=user_id,
                media_id=media_id,
                list_type='favorite'
            ).first() is not None
        }

        return jsonify(current_status), 200

    except Exception as e:
        print(e)
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@media_bp.route('/favorites', methods=['GET'])
@auth_optional
def get_favorites():
    user_id = request.args.get('user_id')
    if not user_id:
        username = request.args.get('username')
        if not username:
            return jsonify({'error': 'Missing user parameters'}), 400
        user = User.query.filter_by(username=username).first()
        user_id = user.id

    try:
        favorites = db.session.query(
            UserMediaList,
            Media
        ).join(
            Media,
            UserMediaList.media_id == Media.id
        ).filter(
            UserMediaList.user_id == user_id,
            UserMediaList.list_type == 'favorite'
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

        result = []
        for user_media_entry, media_entry in favorites:
            result.append({
                "media": {
                    "id": media_entry.id,
                    "title": media_entry.title,
                    "type": media_entry.type,
                    "cover_url": media_entry.cover_url,
                    'rating': media_entry.external_rating,
                    'year': media_entry.release_year,
                    'is_planned': user_statuses.get(media_entry.id, {}).get('planned', False),
                    'is_completed': user_statuses.get(media_entry.id, {}).get('completed', False),
                    'is_favorite': user_statuses.get(media_entry.id, {}).get('favorite', False)
                },
                "added_at": user_media_entry.added_at.isoformat()
            })

        return jsonify({"items": result}), 200

    except Exception as e:
        current_app.logger.error(f"Error fetching favorites: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


@media_bp.route('/<int:media_id>', methods=['GET'])
def get_media_details(media_id):
    media = Media.query.get_or_404(media_id)
    return jsonify({
        'id': media.id,
        'title': media.title,
        'type': media.type,
        'author': media.author,
        'release_year': media.release_year,
        'description': media.description,
        'cover_url': media.cover_url,
        'external_rating': media.external_rating,
        'external_rating_count': media.external_rating_count,
        'genres': [genre.name for genre in media.genres]
    })


@media_bp.route('/<int:media_id>/status', methods=['GET'])
@auth_optional
def get_media_status(media_id):
    if not g.user_id:
        return jsonify({}), 200

    status = {
        'planned': False,
        'completed': False,
        'favorite': False
    }

    for list_type in status.keys():
        exists = UserMediaList.query.filter_by(
            user_id=g.user_id,
            media_id=media_id,
            list_type=list_type
        ).first()
        status[list_type] = exists is not None

    return jsonify(status)
