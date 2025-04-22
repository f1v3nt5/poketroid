from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from config import Config

db = SQLAlchemy()
migrate = Migrate()


def create_app(config_class=Config):
    app = Flask(__name__)
    CORS(app, resources={
        r"/api/*": {
            "origins": "http://localhost:3000",
            "allow_headers": ["Authorization", "Content-Type"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "supports_credentials": True,
            "expose_headers": ["X-Total-Count"]
        }
    })
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)

    from app.routes.auth import auth_bp
    from app.routes.media import media_bp
    from app.routes.friends import friends_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(media_bp, url_prefix='/api/media')
    app.register_blueprint(friends_bp, url_prefix='/api/friends')

    return app
