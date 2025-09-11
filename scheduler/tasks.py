from flask import Blueprint, request, jsonify
from flask_login import login_required
from .db import db
from .models import Task

bp = Blueprint('tasks', __name__, url_prefix='/api')

@bp.route('/project/<int:project_id>/task', methods=['POST'])
@login_required
def create_task(project_id):
    new_task = Task(project_id=project_id, content="") # Empty content initially
    db.session.add(new_task)
    db.session.commit()
    return jsonify(new_task.to_dict()), 201

@bp.route('/task/<int:task_id>', methods=['PUT'])
@login_required
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
@login_required
def delete_task(task_id):
    task = db.session.get(Task, task_id)
    if task:
        db.session.delete(task)
        db.session.commit()
    return jsonify({"status": "success"})

@bp.route('/tasks/reorder', methods=['POST'])
@login_required
def reorder_tasks():
    data = request.get_json()
    task_ids = data.get('task_ids', [])
    for index, task_id in enumerate(task_ids):
        task = db.session.get(Task, task_id)
        if task:
            task.task_order = index
    db.session.commit()
    return jsonify({"status": "success"})
