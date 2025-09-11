
import os
from flask import Flask
from json import JSONEncoder
from datetime import date, datetime

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
    
    # Load environment variables from .env file
    from dotenv import load_dotenv
    load_dotenv()

    app.config.from_mapping(
        SECRET_KEY='dev',
        SQLALCHEMY_DATABASE_URI=os.environ.get("DATABASE_URL"),
    )

    if test_config is None:
        app.config.from_pyfile('config.py', silent=True)
    else:
        app.config.from_mapping(test_config)

    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    # Initialize database with SQLAlchemy and Flask-Migrate
    from .db import db
    from flask_migrate import Migrate
    db.init_app(app)
    migrate = Migrate(app, db)

    # Register Blueprints
    from . import projects
    app.register_blueprint(projects.bp)

    # A simple route to test
    @app.route('/hello')
    def hello():
        return 'Hello, World!'

    return app
