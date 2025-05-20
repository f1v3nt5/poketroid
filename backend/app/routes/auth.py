import jwt

from flask import Blueprint, g, jsonify, request
from functools import wraps

from app.models import db, User
from ..utils.auth import decode_token, generate_token
from ..utils.validators import validate_password, validate_username


auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    """Регистрация пользователя"""
    data = request.get_json()

    if not data or 'username' not in data or 'password' not in data:
        return jsonify({
            'error': 'Missing required fields'
        }), 400

    username = data['username'].strip()
    password = data['password']

    if not validate_username(username):
        return jsonify({
            'error': 'Invalid username. Only letters, numbers and _ allowed'
        }), 400

    if User.query.filter_by(username=username).first():
        return jsonify({
            'error': 'Username already exists'
        }), 409

    if not validate_password(password):
        return jsonify({
            'error': 'Password must be at least 8 characters'
        }), 400

    new_user = User(username=username)
    new_user.set_password(password)

    try:
        db.session.add(new_user)
        db.session.commit()
        return jsonify({
            'message': 'User created successfully',
            'user_id': new_user.id
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': 'Database error: ' + str(e)
        }), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """Авторизация пользователя"""
    data = request.get_json()
    user = User.query.filter_by(
        username=data.get('username')
    ).first()

    if not user or not user.check_password(data.get('password')):
        return jsonify({
            'error': 'Invalid credentials'
        }), 401

    token = generate_token(user.id)
    return jsonify({
        'token': token,
        'user_id': user.id,
        'username': user.username,
        'avatar_url': user.avatar_filename
    }), 200


def auth_required(func):
    @wraps(func)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token or not token.startswith('Bearer '):
            return jsonify({
                'error': 'Authorization header is missing or invalid'
            }), 401

        try:
            token = token.split()[1]
            g.user_id = decode_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({
                'error': 'Token expired'
            }), 401
        except (jwt.InvalidTokenError, KeyError):
            return jsonify({
                'error': 'Invalid token'
            }), 401

        return func(*args, **kwargs)
    return decorated_function


def auth_optional(func):
    @wraps(func)
    def decorated_function(*args, **kwargs):
        g.user_id = None
        token = request.headers.get('Authorization')

        if token and token.startswith('Bearer '):
            try:
                token = token.split()[1]
                g.user_id = decode_token(token)
            except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, KeyError):
                pass

        return func(*args, **kwargs)
    return decorated_function
