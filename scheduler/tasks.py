from flask import Blueprint, request, jsonify
from .db import get_db
import psycopg2.extras

bp = Blueprint('tasks', __name__, url_prefix='/api')

# Utility function from projects.py, consider moving to a utils.py
def _parse_date(val):
    if not val:
        return None
    try:
        from datetime import date
        return date.fromisoformat(val)
    except (TypeError, ValueError):
        return val

@bp.route('/project/<int:project_id>/task', methods=['POST'])
def create_task(project_id):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COALESCE(MAX(task_order), 0) + 1 AS new_order FROM Tasks WHERE project_id = %s", (project_id,))
            new_order = cur.fetchone()['new_order']
            cur.execute("INSERT INTO Tasks (project_id, content, task_order) VALUES (%s,%s,%s) RETURNING *", (project_id, "", new_order))
            new_task = cur.fetchone()
            conn.commit()
        return jsonify(new_task), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@bp.route('/task/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.get_json() or {}
    fields, params = [], []
    for key in ("content", "deadline", "progress"):
        if key in data:
            fields.append(f"{key}=%s")
            val = data[key]
            if key == "deadline":
                val = _parse_date(val)
            params.append(val)
    
    if not fields:
        return jsonify({"status": "error", "message": "수정할 값이 없습니다."}), 400
    
    params.append(task_id)
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(f"UPDATE Tasks SET {', '.join(fields)} WHERE id=%s RETURNING *", tuple(params))
            updated_task = cur.fetchone()
            conn.commit()
        return jsonify(updated_task)
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@bp.route('/tasks/reorder', methods=['POST'])
def reorder_tasks():
    ordered_ids = (request.get_json() or {}).get('task_ids')
    if not ordered_ids:
        return jsonify({"status": "error", "message": "task_ids가 필요합니다."}), 400
    
    conn = get_db()
    try:
        with conn.cursor() as cur:
            update_data = [(i + 1, task_id) for i, task_id in enumerate(ordered_ids)]
            psycopg2.extras.execute_batch(cur, "UPDATE Tasks SET task_order=%s WHERE id=%s", update_data)
            conn.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

@bp.route('/task/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM Tasks WHERE id=%s", (task_id,))
            conn.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
