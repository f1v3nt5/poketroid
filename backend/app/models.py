import bcrypt
import re

from datetime import datetime

from app import db


class User(db.Model):
    __tablename__ = 'users'
    __table_args__ = (
        db.Index('ix_users_username', 'username', unique=True),
    )

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    display_name = db.Column(db.String(50), nullable=True)
    avatar_filename = db.Column(db.String(256), nullable=True)
    gender = db.Column(db.String(20), nullable=True)
    age = db.Column(db.Integer, nullable=True)
    about = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_modified = db.Column(db.DateTime, onupdate=datetime.utcnow)

    lists = db.relationship('UserMediaList', backref='user', lazy='dynamic')
    friends = db.relationship('Friendship', foreign_keys='Friendship.user_id', backref='user', lazy='dynamic')

    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    def check_password(self, password):
        return bcrypt.checkpw(password.encode(), self.password_hash.encode())

    @staticmethod
    def validate_username(username):
        return re.match(r'^\w+$', username) is not None


class Media(db.Model):
    __tablename__ = 'media'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(256), nullable=False)
    type = db.Column(db.Enum('book', 'movie', 'anime', name='media_type'), nullable=False)
    author = db.Column(db.String(256), nullable=True)
    release_year = db.Column(db.Integer)
    description = db.Column(db.Text)
    duration = db.Column(db.Integer)
    cover_url = db.Column(db.String(512))
    external_rating = db.Column(db.Float)
    external_rating_count = db.Column(db.Integer)


class UserMediaList(db.Model):
    __tablename__ = 'user_media_lists'

    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True, nullable=False)
    media_id = db.Column(db.Integer, db.ForeignKey('media.id'), primary_key=True, nullable=False)
    list_type = db.Column(
        db.Enum('planned', 'completed', 'favorite', name='list_type'),
        primary_key=True
    )
    added_at = db.Column(db.DateTime, default=datetime.utcnow)


class Friendship(db.Model):
    __tablename__ = 'friendships'

    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    friend_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    status = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
