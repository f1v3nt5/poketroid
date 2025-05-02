import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'postgresql://postgres:postgres@localhost/poketroid_db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-12345'
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'uploads')
    MAX_CONTENT_LENGTH = 2 * 1024 * 1024  # 2MB
