import jwt
from datetime import datetime, timedelta
from flask import current_app


def generate_token(user_id):
    payload = {
        'exp': datetime.utcnow() + timedelta(hours=8),
        'iat': datetime.utcnow(),
        'sub': str(user_id)
    }
    return jwt.encode(
        payload,
        current_app.config['SECRET_KEY'],
        algorithm='HS256'
    )


def decode_token(token):
    try:
        payload = jwt.decode(
            token,
            current_app.config['SECRET_KEY'],
            algorithms=['HS256']
        )
        return payload['sub']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
