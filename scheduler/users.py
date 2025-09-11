from flask import Blueprint, request, jsonify
from .db import get_db

bp = Blueprint('users', __name__, url_prefix='/api')

@bp.route('/user', methods=['POST'])
def create_user():
    data = request.get_json() or {}
    name = data.get('name')
    position = data.get('position')
    if not name:
        return jsonify({"status": "error", "message": "name is required"}), 400
    
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO Users(name, position) VALUES (%s, %s) ON CONFLICT (name) DO NOTHING RETURNING *",
                (name, position),
            )
            new_user = cur.fetchone()
            conn.commit()
        return jsonify(new_user), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@bp.route('/user/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    position = (request.get_json() or {}).get('position')
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE Users SET position=%s WHERE id=%s RETURNING *", (position, user_id))
            updated_user = cur.fetchone()
            conn.commit()
        return jsonify(updated_user)
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@bp.route('/user/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE Projects SET user_id=NULL WHERE user_id=%s", (user_id,))
            cur.execute("DELETE FROM Users WHERE id=%s", (user_id,))
            conn.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
