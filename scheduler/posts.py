from flask import Blueprint, request, jsonify
from .db import get_db

bp = Blueprint('posts', __name__, url_prefix='/api')

@bp.route('/post', methods=['POST'])
def create_post():
    data = request.get_json() or {}
    required = ["title", "content", "user_id"]
    if any(k not in data for k in required):
        return jsonify({"status": "error", "message": "필수 정보가 누락되었습니다."}), 400
    
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("INSERT INTO Posts (title, content, user_id) VALUES (%s,%s,%s) RETURNING id", (data["title"], data["content"], data["user_id"]))
            post_id = cur.fetchone()['id']
            cur.execute("INSERT INTO PostReadStatus (user_id, post_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (data["user_id"], post_id))
            conn.commit()
            cur.execute("SELECT p.*, u.name as author_name FROM Posts p JOIN Users u ON p.user_id = u.id WHERE p.id = %s", (post_id,))
            new_post = cur.fetchone()
        return jsonify(new_post), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@bp.route('/post/<int:post_id>', methods=['PUT'])
def update_post(post_id):
    data = request.get_json() or {}
    # ... (update logic)
    conn = get_db()
    # ...
    conn.commit()
    return jsonify({}), 200

@bp.route('/post/<int:post_id>', methods=['DELETE'])
def delete_post(post_id):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM Posts WHERE id=%s", (post_id,))
            conn.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@bp.route('/posts/mark-as-read', methods=['POST'])
def mark_posts_as_read():
    user_id = (request.get_json() or {}).get('user_id')
    if not user_id:
        return jsonify({"status": "error", "message": "user_id is required"}), 400
    
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO PostReadStatus (user_id, post_id)
                SELECT %s, p.id FROM Posts p
                WHERE NOT EXISTS (
                    SELECT 1 FROM PostReadStatus r WHERE r.post_id = p.id AND r.user_id = %s
                )
            """, (user_id, user_id))
            conn.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
