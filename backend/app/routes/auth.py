import jwt

from flask import Blueprint, request, jsonify, g, current_app
from functools import wraps
from app.models import User, db
from app.utils.validators import validate_username, validate_password
from ..utils.auth import generate_token, decode_token

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    if not data or 'username' not in data or 'password' not in data:
        return jsonify({'error': 'Missing required fields'}), 400

    username = data['username'].strip()
    password = data['password']

    if not validate_username(username):
        return jsonify({'error': 'Invalid username. Only letters, numbers and _ allowed'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 409

    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400

    new_user = User(username=username)
    new_user.set_password(password)

    try:
        db.session.add(new_user)
        db.session.commit()
        return jsonify({'message': 'User created successfully', 'user_id': new_user.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Database error: ' + str(e)}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()

    if not user or not user.check_password(data.get('password')):
        return jsonify({'error': 'Invalid credentials'}), 401

    token = generate_token(user.id)
    return jsonify({
        'token': token,
        'user_id': user.id,
        'username': user.username
    }), 200


# Middleware для проверки аутентификации
def auth_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token or not token.startswith('Bearer '):
            return jsonify({'error': 'Authorization header is missing or invalid'}), 401

        try:
            token = token.split()[1]
            payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            g.user_id = int(payload['sub'])
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except (jwt.InvalidTokenError, KeyError):
            return jsonify({'error': 'Invalid token'}), 401

        return f(*args, **kwargs)
    return decorated_function


def auth_optional(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if token and token.startswith('Bearer '):
            g.user_id = decode_token(token.split()[1])
        return f(*args, **kwargs)
    return decorated_function
