from flask import Blueprint, request, jsonify
from flask_login import login_required
from .db import db
from .models import Comment

bp = Blueprint('comments', __name__, url_prefix='/api')

@bp.route('/project/<int:project_id>/comment', methods=['POST'])
@login_required
def create_comment(project_id):
    data = request.get_json() or {}
    if not data.get('author_name') or not data.get('content'):
        return jsonify({"status": "error", "message": "author_name, content 필수"}), 400
    
    new_comment = Comment(project_id=project_id, author_name=data['author_name'], content=data['content'])
    db.session.add(new_comment)
    db.session.commit()
    return jsonify(new_comment.to_dict()), 201

@bp.route('/comment/<int:comment_id>', methods=['PUT'])
@login_required
def update_comment(comment_id):
    comment = db.session.get(Comment, comment_id)
    if not comment:
        return jsonify({"status": "error", "message": "코멘트를 찾을 수 없습니다."}), 404
    data = request.get_json() or {}
    if 'content' in data:
        comment.content = data['content']
    db.session.commit()
    return jsonify(comment.to_dict())

@bp.route('/comment/<int:comment_id>', methods=['DELETE'])
@login_required
def delete_comment(comment_id):
    comment = db.session.get(Comment, comment_id)
    if comment:
        db.session.delete(comment)
        db.session.commit()
    return jsonify({"status": "success"})
