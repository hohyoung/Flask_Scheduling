
import os
from flask import Flask, jsonify
from json import JSONEncoder
from datetime import date, datetime
from .config import Config  # Import Config
from .db import db
from flask_migrate import Migrate
from flask_login import LoginManager

class CustomJSONEncoder(JSONEncoder):
    def default(self, obj):
        try:
            if isinstance(obj, (date, datetime)):
                return obj.isoformat()
            iterable = iter(obj)
        except TypeError:
            pass
        else:
            return list(iterable)
        return JSONEncoder.default(self, obj)

def create_app(test_config=None):
    app = Flask(__name__, instance_relative_config=True)
    app.json_encoder = CustomJSONEncoder

    # Load config from config.py
    if test_config is None:
        app.config.from_object(Config)
    else:
        app.config.from_mapping(test_config)

    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    # Initialize extensions
    db.init_app(app)
    Migrate(app, db)
    login_manager = LoginManager()
    login_manager.init_app(app)

    from .models import User

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify(error="Authentication required"), 401

    # Register Blueprints
    from . import projects, users, tasks, comments, posts, schedules, auth
    app.register_blueprint(projects.bp)
    app.register_blueprint(users.bp)
    app.register_blueprint(tasks.bp)
    app.register_blueprint(comments.bp)
    app.register_blueprint(posts.bp)
    app.register_blueprint(schedules.bp)
    app.register_blueprint(auth.bp)

    # Initialize custom commands
    from . import commands
    commands.init_app(app)

    return app
