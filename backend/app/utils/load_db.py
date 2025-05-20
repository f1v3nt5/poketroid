import json
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Enum, Float, Integer, String, Text
from sqlalchemy.orm import declarative_base, sessionmaker


Base = declarative_base()


class Media(Base):
    __tablename__ = 'media'

    id = Column(Integer, primary_key=True)
    title = Column(String(256), nullable=False)
    type = Column(Enum('book', 'movie', 'anime', name='media_type'), nullable=False)
    author = Column(String(256), nullable=True)
    release_year = Column(Integer)
    description = Column(Text)
    duration = Column(Integer)
    cover_url = Column(String(512))
    external_rating = Column(Float)
    external_rating_count = Column(Integer)


load_dotenv()

DATABASE_URI = os.getenv('DATABASE_URL')

engine = create_engine(DATABASE_URI)
Session = sessionmaker(bind=engine)
session = Session()


def fetch_books(data):
    books = []
    for item in data:
        book = Media(
            type='book',
            title=item.get('title'),
            author=item.get('author'),
            release_year=int(item.get('release_year')),
            external_rating=int(item.get('rating')),
            duration=int(item.get('pages')),
            description=item.get('description'),
            cover_url=item.get('cover')
        )
        books.append(book)
    return books


def fetch_movies(data):
    movies = []
    for item in data:
        movie = Media(
            type='movie',
            title=item.get('title'),
            release_year=int(item.get('release_year')),
            external_rating=int(item.get('external_rating')),
            external_rating_count=int(item.get('external_rating_count')),
            duration=int(item.get('duration')),
            description=item.get('description'),
            cover_url=item.get('cover_url')
        )
        movies.append(movie)
    return movies


def fetch_anime(data):
    anime = []
    for item in data:
        anime_item = Media(
            type='anime',
            title=item.get('title'),
            author=item.get('studio'),
            release_year=int(item.get('year')),
            external_rating=int(item.get('score')),
            duration=int(item.get('duration')) * int(item.get('episodes')),
            description=item.get('description'),
            cover_url=item.get('cover_url')
        )
        anime.append(anime_item)
    return anime


def import_from_json(json_file):
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    session.query(Media).delete()
    print(f"Таблица очищена")

    books = fetch_books(data['books'])
    try:
        session.bulk_save_objects(books)
        session.commit()
        print(f"Успешно добавлено {len(books)} книг")
    except Exception as e:
        session.rollback()
        print(f"Ошибка при добавлении книг: {str(e)}")

    movies = fetch_movies(data['movies'])
    try:
        session.bulk_save_objects(movies)
        session.commit()
        print(f"Успешно добавлено {len(movies)} фильмов")
    except Exception as e:
        session.rollback()
        print(f"Ошибка при добавлении фильмов: {str(e)}")

    anime = fetch_anime(data['anime'])
    try:
        session.bulk_save_objects(anime)
        session.commit()
        print(f"Успешно добавлено {len(movies)} аниме")
    except Exception as e:
        session.rollback()
        print(f"Ошибка при добавлении аниме: {str(e)}")

    finally:
        session.close()


if __name__ == "__main__":
    import_from_json('media_data.json')
