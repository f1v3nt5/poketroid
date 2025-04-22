import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'postgresql://postgres:postgres@localhost/poketroid_db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-12345'
    API_KEYS = {
        'tmdb': os.environ.get('TMDB_API_KEY'),
        'mal': os.environ.get('MAL_API_KEY')
    }
    CORS_ALLOW_HEADERS = ['Authorization', 'Content-Type']
    CORS_EXPOSE_HEADERS = ['Content-Type', 'X-CSRFToken']
    CORS_SUPPORTS_CREDENTIALS = True
    CORS_ORIGIN_WHITELIST = ['http://localhost:3000']