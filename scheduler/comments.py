from flask import Blueprint, request, jsonify
from .db import db
from .models import Comment

bp = Blueprint('comments', __name__, url_prefix='/api')

@bp.route('/project/<int:project_id>/comment', methods=['POST'])
def create_comment(project_id):
    data = request.get_json() or {}
    if not data.get('author_name') or not data.get('content'):
        return jsonify({"status": "error", "message": "author_name, content 필수"}), 400
    
    new_comment = Comment(project_id=project_id, author_name=data['author_name'], content=data['content'])
    db.session.add(new_comment)
    db.session.commit()
    return jsonify(new_comment.to_dict()), 201

@bp.route('/comment/<int:comment_id>', methods=['DELETE'])
def delete_comment(comment_id):
    comment = db.session.get(Comment, comment_id)
    if comment:
        db.session.delete(comment)
        db.session.commit()
    return jsonify({"status": "success"})
