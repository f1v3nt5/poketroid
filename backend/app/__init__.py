from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

from config import Config

db = SQLAlchemy()
migrate = Migrate()


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)

    from app.routes.auth import auth_bp
    from app.routes.media import media_bp
    from app.routes.friends import friends_bp
    from app.routes.users import users_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(media_bp, url_prefix='/api/media')
    app.register_blueprint(friends_bp, url_prefix='/api/friends')
    app.register_blueprint(users_bp, url_prefix='/api/users')

    app.url_map.strict_slashes = False

    CORS(app, resources={
        r"/api/*": {
            "origins": "http://localhost:3000",
            "allow_headers": ["Authorization", "Content-Type", "Cache-Control", "X-No-Cache"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "supports_credentials": True,
            "expose_headers": ["*"]
        }
    })

    @app.before_request
    def before_request():
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, X-No-Cache'
        }
        if request.method == 'OPTIONS' or request.method == 'options':
            return jsonify(headers), 200

    @app.route('/uploads/<filename>')
    def uploaded_file(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    return app
