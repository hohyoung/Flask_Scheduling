from flask import Blueprint, request, jsonify
from .db import db
from .models import User

bp = Blueprint('users', __name__, url_prefix='/api')

@bp.route('/user', methods=['POST'])
def create_user():
    data = request.get_json() or {}
    if not data.get('name'):
        return jsonify({"status": "error", "message": "name is required"}), 400
    
    new_user = User(name=data['name'], position=data.get('position'))
    db.session.add(new_user)
    db.session.commit()
    return jsonify(new_user.to_dict()), 201

@bp.route('/user/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"status": "error", "message": "사용자를 찾을 수 없습니다."}), 404
    
    position = (request.get_json() or {}).get('position')
    user.position = position
    db.session.commit()
    return jsonify(user.to_dict())

@bp.route('/user/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    user = db.session.get(User, user_id)
    if user:
        db.session.delete(user)
        db.session.commit()
    return jsonify({"status": "success"})
