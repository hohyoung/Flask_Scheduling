import pytest
from scheduler import create_app
from scheduler.db import db
from scheduler.models import User

@pytest.fixture
def app():
    app = create_app({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'WTF_CSRF_ENABLED': False, # Disable CSRF for testing
        'SECRET_KEY': 'test'
    })

    with app.app_context():
        db.create_all()
        # Create a test user
        test_user = User(name='testuser')
        test_user.set_password('password')
        db.session.add(test_user)
        db.session.commit()

    yield app

    with app.app_context():
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def runner(app):
    return app.test_cli_runner()
