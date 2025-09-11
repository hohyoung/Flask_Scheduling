import pytest
from scheduler.models import User

def test_login_logout(client):
    # Test successful login
    res = client.post('/api/auth/login', json={
        'name': 'testuser',
        'password': 'password'
    })
    assert res.status_code == 200
    assert res.json['name'] == 'testuser'

    # Test status check while logged in
    res = client.get('/api/auth/status')
    assert res.status_code == 200
    assert res.json['name'] == 'testuser'

    # Test logout
    res = client.post('/api/auth/logout')
    assert res.status_code == 200

    # Test status check while logged out
    res = client.get('/api/auth/status')
    assert res.status_code == 200
    assert res.json is None

def test_login_failure(client):
    # Test login with wrong password
    res = client.post('/api/auth/login', json={
        'name': 'testuser',
        'password': 'wrongpassword'
    })
    assert res.status_code == 401
    assert 'error' in res.json

    # Test login with non-existent user
    res = client.post('/api/auth/login', json={
        'name': 'nonexistent',
        'password': 'password'
    })
    assert res.status_code == 401
    assert 'error' in res.json
