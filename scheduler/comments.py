from flask import Blueprint, request, jsonify
from .db import get_db

bp = Blueprint('comments', __name__, url_prefix='/api')

@bp.route('/project/<int:project_id>/comment', methods=['POST'])
def create_comment(project_id):
    data = request.get_json() or {}
    author_name = data.get('author_name')
    content = data.get('content')
    if not author_name or not content:
        return jsonify({"status": "error", "message": "author_name, content 필수"}), 400
    
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("INSERT INTO Comments (project_id, author_name, content) VALUES (%s,%s,%s) RETURNING *", (project_id, author_name, content))
            new_comment = cur.fetchone()
            conn.commit()
        return jsonify(new_comment), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@bp.route('/comment/<int:comment_id>', methods=['PUT'])
def update_comment(comment_id):
    content = (request.get_json() or {}).get('content')
    if not content:
        return jsonify({"status": "error", "message": "내용이 필요합니다."}), 400
    
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE Comments SET content=%s WHERE id=%s RETURNING *", (content, comment_id))
            updated_comment = cur.fetchone()
            conn.commit()
        return jsonify(updated_comment)
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@bp.route('/comment/<int:comment_id>', methods=['DELETE'])
def delete_comment(comment_id):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM Comments WHERE id=%s", (comment_id,))
            conn.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
