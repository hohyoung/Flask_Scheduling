from flask import Blueprint, request, jsonify
from flask_login import login_required
from .db import db
from .models import User

bp = Blueprint('users', __name__, url_prefix='/api')

# User creation should be handled by a dedicated registration/admin process
# that includes password setting. The old endpoint is removed for security.

@bp.route('/user/<int:user_id>', methods=['PUT'])
@login_required
def update_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"status": "error", "message": "사용자를 찾을 수 없습니다."}), 404
    
    data = request.get_json() or {}
    if 'position' in data:
        user.position = data['position']
    
    db.session.commit()
    return jsonify(user.to_dict())

@bp.route('/user/<int:user_id>', methods=['DELETE'])
@login_required
def delete_user(user_id):
    user = db.session.get(User, user_id)
    if user:
        # Add check to prevent users from deleting themselves, if needed
        db.session.delete(user)
        db.session.commit()
    return jsonify({"status": "success"})
