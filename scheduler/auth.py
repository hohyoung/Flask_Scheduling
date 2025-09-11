from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from scheduler.db import db
from scheduler.models import User

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('name') or not data.get('password'):
        return jsonify({"error": "Username and password are required"}), 400

    user = User.query.filter_by(name=data['name']).first()

    if user is None or not user.check_password(data['password']):
        return jsonify({"error": "Invalid username or password"}), 401

    login_user(user, remember=True)
    return jsonify(user.to_dict())

@bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Successfully logged out"}), 200

@bp.route('/status', methods=['GET'])
def status():
    if current_user.is_authenticated:
        return jsonify(current_user.to_dict())
    return jsonify(None), 200

# This is a temporary endpoint to set a password for existing users
# In a real app, this would be part of a sign-up or admin process
@bp.route('/set-password', methods=['POST'])
def set_password():
    data = request.get_json()
    if not data or not data.get('name') or not data.get('password'):
        return jsonify({"error": "Username and password are required"}), 400
    
    user = User.query.filter_by(name=data['name']).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    user.set_password(data['password'])
    db.session.commit()
    
    return jsonify({"message": f"Password for {user.name} has been set."}), 200
