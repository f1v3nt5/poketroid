import requests
from app import db
from app.models import Media, Genre


class BaseImporter:
    MEDIA_TYPE = None
    GENRE_MAP = {}

    def __init__(self, api_key):
        self.api_key = api_key

    def _get_or_create_genre(self, name):
        genre = Genre.query.filter_by(name=name).first()
        if not genre:
            genre = Genre(name=name)
            db.session.add(genre)
        return genre

    def import_popular(self):
        raise NotImplementedError


class TMDBImporter(BaseImporter):
    MEDIA_TYPE = 'movie'
    GENRE_MAP = {
        28: 'Action', 12: 'Adventure', 16: 'Animation',
        35: 'Comedy', 80: 'Crime', 99: 'Documentary'
    }

    def import_popular(self):
        response = requests.get(
            'https://api.themoviedb.org/3/movie/popular',
            params={'api_key': self.api_key}
        )

        for item in response.json()['results']:
            media = Media(
                title=item['title'],
                type=self.MEDIA_TYPE,
                release_year=item['release_date'][:4] if item['release_date'] else None,
                description=item['overview'],
                cover_url=f"https://image.tmdb.org/t/p/w500{item['poster_path']}",
                external_rating=item['vote_average'],
                external_rating_count=item['vote_count']
            )

            # Обработка жанров
            for genre_id in item['genre_ids']:
                genre_name = self.GENRE_MAP.get(genre_id)
                if genre_name:
                    genre = self._get_or_create_genre(genre_name)
                    media.genres.append(genre)

            db.session.add(media)

        db.session.commit()


class MALImporter(BaseImporter):
    MEDIA_TYPE = 'anime'

    def import_popular(self):
        response = requests.get(
            'https://api.myanimelist.net/v2/anime/ranking',
            headers={'X-MAL-CLIENT-ID': self.api_key},
            params={'ranking_type': 'all', 'limit': 50}
        )

        for item in response.json()['data']:
            details = requests.get(
                f"https://api.myanimelist.net/v2/anime/{item['node']['id']}",
                headers={'X-MAL-CLIENT-ID': self.api_key},
                params={'fields': 'synopsis,start_date,mean,genres,num_scoring_users'}
            ).json()

            media = Media(
                title=item['node']['title'],
                type=self.MEDIA_TYPE,
                release_year=details['start_date'][:4] if 'start_date' in details else None,
                description=details.get('synopsis'),
                cover_url=item['node']['main_picture']['large'],
                external_rating=details.get('mean'),
                external_rating_count=details.get('num_scoring_users')
            )

            # Обработка жанров
            for genre_info in details.get('genres', []):
                genre = self._get_or_create_genre(genre_info['name'])
                media.genres.append(genre)

            db.session.add(media)

        db.session.commit()
