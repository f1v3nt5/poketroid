import re


def validate_username(username):
    return re.match(r'^[a-zA-Z0-9_]+$', username) is not None


def validate_password(password):
    return len(password) >= 8