from flask import Blueprint, request, jsonify
from .db import db
from .models import Task

bp = Blueprint('tasks', __name__, url_prefix='/api')

@bp.route('/project/<int:project_id>/task', methods=['POST'])
def create_task(project_id):
    new_task = Task(project_id=project_id, content="") # Empty content initially
    db.session.add(new_task)
    db.session.commit()
    return jsonify(new_task.to_dict()), 201

@bp.route('/task/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    task = db.session.get(Task, task_id)
    if not task:
        return jsonify({"status": "error", "message": "업무를 찾을 수 없습니다."}), 404
    data = request.get_json() or {}
    for key in ('content', 'deadline', 'progress'):
        if key in data:
            setattr(task, key, data[key])
    db.session.commit()
    return jsonify(task.to_dict())

@bp.route('/task/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = db.session.get(Task, task_id)
    if task:
        db.session.delete(task)
        db.session.commit()
    return jsonify({"status": "success"})
