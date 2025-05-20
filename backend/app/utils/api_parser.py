import json
import os
import requests

from bs4 import BeautifulSoup
from dotenv import load_dotenv
from fake_useragent import UserAgent
from gql import Client, gql
from gql.transport.requests import RequestsHTTPTransport
from pathlib import Path


load_dotenv()

MAX_RESULTS = 100


def parse_livelib_books():
    """Парсинг книг с LiveLib"""
    books = []
    try:
        with open('livelib_raw.txt', encoding='utf-8') as f:
            page_raw = f.read()

        soup = BeautifulSoup(page_raw, 'lxml')
        items = soup.find_all('div', class_='brow-inner rback')

        for item in items[:100]:
            title = item.find('a', class_='brow-book-name with-cycle').text.strip()
            author = item.select_one('a.brow-book-author').text.strip()
            rating = item.find('span', class_='rating-value stars-color-orange').text
            release_year = item.find('table', class_='compact').find_all('tr')[1].find_all('td')[1].text
            description = item.find('div', class_='brow-marg').find('p').text.strip()
            cover = item.find('div', class_='cover-wrapper').find('img')
            cover_url = cover['data-pagespeed-lazy-src']

            books.append({
                'title': title,
                'author': author,
                'rating': round(float(rating) * 2, 1),
                'release_year': release_year,
                'description': description,
                'cover': cover_url
            })

    except Exception as e:
        print(f'Ошибка при парсинге: {e}')

    return books[:100]


def fetch_kinopoisk_movies(api_key):
    """Получение фильмов из Kinopoiskdev"""

    movies = []
    url = "https://api.kinopoisk.dev/v1.4/movie"

    headers = {
        'X-API-KEY': api_key
    }

    params = {
        'limit': MAX_RESULTS,
        'type': 'movie',
        'sortField': 'votes.kp',
        'sortType': '-1',
        'selectFields': ['name', 'description', 'year', 'rating', 'votes', 'movieLength', 'poster']
    }

    try:
        response = requests.get(url, headers=headers, params=params)
        if response.status_code == 200:
            data = response.json()
            for movie in data.get('docs', []):
                movies.append({
                    'title': movie.get('name', 'Без названия'),
                    'description': movie.get('description', ''),
                    'release_year': movie.get('year', ''),
                    'external_rating': movie.get('rating', {}).get('kp', 0),
                    'external_rating_count': movie.get('votes', {}).get('kp', 0),
                    'duration': movie.get('movieLength', 0),
                    'cover_url': movie.get('poster', {}).get('url', '')
                })
    except Exception as e:
        print(f"Ошибка при запросе к Кинопоиску: {e}")

    return movies[:MAX_RESULTS]


def fetch_shikimori_graphql(api_key):
    """Получение аниме из Shikimori"""
    anime_list = []
    transport = RequestsHTTPTransport(
        url="https://shikimori.one/api/graphql",
        headers={
            'User-Agent': 'Api Test',
            'Authorization': f'Bearer {api_key}'
        },
        verify=True,
        retries=3,
    )
    client = Client(
        transport=transport,
        fetch_schema_from_transport=True,
    )
    query_path = Path("query.gql")
    query = gql(query_path.read_text())
    result = client.execute(query)
    animes = result['animes']
    for anime in animes:
        anime_list.append(
            {
                'title': anime['russian'],
                'description': anime['description'],
                'year': anime['releasedOn']['year'],
                'score': round(anime['score'], 1),
                'episodes': anime['episodes'],
                'duration': anime['duration'],
                'cover_url': anime['poster']['originalUrl'],
                'studio': anime['studios'][0]['name']
            }
        )
    return anime_list[:MAX_RESULTS]


def save_to_json(data):
    """Сохранение данных в JSON файл"""
    with open('media_data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


def main():
    """Основная функция сбора данных"""

    print("Сбор данных о книгах...")
    books = parse_livelib_books()

    print("\nСбор данных о фильмах...")
    kinopoisk_api_key = os.getenv('KINOPOISKDEV_API_KEY')
    movies = fetch_kinopoisk_movies(kinopoisk_api_key)

    print("\nСбор данных об аниме...")
    shikimori_api_key = os.getenv('SHIKIMORI_API_KEY')
    anime = fetch_shikimori_graphql(shikimori_api_key)

    result = {
       'books': books,
       'movies': movies,
       'anime': anime
    }

    save_to_json(result)
    print("\nДанные успешно сохранены в media_data.json")


if __name__ == '__main__':
    main()
