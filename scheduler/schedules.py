from flask import Blueprint, request, jsonify
from .db import get_db

bp = Blueprint('schedules', __name__, url_prefix='/api')

@bp.route('/schedule', methods=['POST'])
def create_schedule():
    data = request.get_json() or {}
    required = ["user_id", "content", "schedule_date", "schedule_type"]
    if any(k not in data for k in required):
        return jsonify({"status": "error", "message": "필수 정보가 누락되었습니다."}), 400

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO Schedules (user_id, content, schedule_date, schedule_type) VALUES (%s, %s, %s, %s) RETURNING id",
                (data["user_id"], data["content"], data["schedule_date"], data["schedule_type"])
            )
            schedule_id = cur.fetchone()['id']
            conn.commit()
            cur.execute("SELECT s.*, u.name as user_name FROM Schedules s JOIN Users u ON s.user_id = u.id WHERE s.id = %s", (schedule_id,))
            new_schedule = cur.fetchone()
        return jsonify(new_schedule), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@bp.route('/schedule/<int:schedule_id>', methods=['DELETE'])
def delete_schedule(schedule_id):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM Schedules WHERE id=%s", (schedule_id,))
            conn.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
