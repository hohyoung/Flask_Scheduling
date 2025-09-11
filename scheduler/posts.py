from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from .db import db
from .models import Post, PostReadStatus

bp = Blueprint('posts', __name__, url_prefix='/api')

@bp.route('/post', methods=['POST'])
@login_required
def create_post():
    data = request.get_json() or {}
    required = ["title", "content", "user_id"]
    if any(k not in data for k in required):
        return jsonify({"status": "error", "message": "필수 정보가 누락되었습니다."}), 400
    
    new_post = Post(title=data['title'], content=data['content'], user_id=data['user_id'])
    db.session.add(new_post)
    db.session.commit()
    return jsonify(new_post.to_dict()), 201

@bp.route('/post/<int:post_id>', methods=['PUT'])
@login_required
def update_post(post_id):
    post = db.session.get(Post, post_id)
    if not post:
        return jsonify({"status": "error", "message": "게시글을 찾을 수 없습니다."}), 404
    # Add authorization check if needed, e.g. if current_user.id != post.user_id: abort(403)
    data = request.get_json() or {}
    if 'title' in data:
        post.title = data['title']
    if 'content' in data:
        post.content = data['content']
    db.session.commit()
    return jsonify(post.to_dict())

@bp.route('/post/<int:post_id>', methods=['DELETE'])
@login_required
def delete_post(post_id):
    post = db.session.get(Post, post_id)
    if post:
        db.session.delete(post)
        db.session.commit()
    return jsonify({"status": "success"})

@bp.route('/posts/mark-as-read', methods=['POST'])
@login_required
def mark_as_read():
    # Get all post IDs
    all_post_ids = {p[0] for p in db.session.query(Post.id).all()}
    # Get posts already read by the user
    read_post_ids = {p[0] for p in db.session.query(PostReadStatus.post_id).filter_by(user_id=current_user.id).all()}
    
    new_reads = []
    for post_id in all_post_ids - read_post_ids:
        new_reads.append(PostReadStatus(user_id=current_user.id, post_id=post_id))
    
    if new_reads:
        db.session.add_all(new_reads)
        db.session.commit()
        
    return jsonify({"status": "success"})
