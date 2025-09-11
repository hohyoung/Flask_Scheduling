from flask import Blueprint, request, jsonify
from .db import db
from .models import Post

bp = Blueprint('posts', __name__, url_prefix='/api')

@bp.route('/post', methods=['POST'])
def create_post():
    data = request.get_json() or {}
    required = ["title", "content", "user_id"]
    if any(k not in data for k in required):
        return jsonify({"status": "error", "message": "필수 정보가 누락되었습니다."}), 400
    
    new_post = Post(title=data['title'], content=data['content'], user_id=data['user_id'])
    db.session.add(new_post)
    db.session.commit()
    return jsonify(new_post.to_dict()), 201

@bp.route('/post/<int:post_id>', methods=['DELETE'])
def delete_post(post_id):
    post = db.session.get(Post, post_id)
    if post:
        db.session.delete(post)
        db.session.commit()
    return jsonify({"status": "success"})
