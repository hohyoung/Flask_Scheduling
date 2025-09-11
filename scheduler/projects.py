from flask import Blueprint, request, jsonify
from flask_login import login_required
from .db import db
from .models import Project, User, Task, Comment, Post, Schedule, PostReadStatus
from .schemas import ProjectCreate, ProjectUpdate, StatusUpdate
from pydantic import ValidationError
from datetime import date

bp = Blueprint('projects', __name__, url_prefix='/api')

@bp.route('/data')
@login_required
def get_all_data():
    projects = Project.query.order_by(Project.priority, Project.deadline.is_(None), Project.deadline).all()
    users = User.query.all()
    posts = Post.query.order_by(Post.created_at.desc()).all()
    schedules = Schedule.query.all()

    # 이 부분은 current_user가 설정된 후에 제대로 동작합니다.
    from flask_login import current_user
    if current_user.is_authenticated:
        read_posts = db.session.query(PostReadStatus.post_id).filter_by(user_id=current_user.id).all()
        read_post_ids = {p[0] for p in read_posts}
        has_new_posts = any(p.id not in read_post_ids for p in posts)
    else:
        has_new_posts = False # 혹은 True, 정책에 따라

    return jsonify({
        'projects': [p.to_dict() for p in projects],
        'users': [u.to_dict() for u in users],
        'posts': [p.to_dict() for p in posts],
        'schedules': [s.to_dict() for s in schedules],
        'has_new_posts': has_new_posts
    })


@bp.route('/project', methods=['POST'])
@login_required
def create_project():
    try:
        project_data = ProjectCreate.parse_obj(request.get_json())
    except ValidationError as e:
        return jsonify(e.errors()), 422

    new_project = Project(**project_data.dict())
    db.session.add(new_project)
    db.session.commit()
    return jsonify(new_project.to_dict()), 201

@bp.route('/project/<int:project_id>', methods=['PUT'])
@login_required
def update_project(project_id):
    project = db.session.get(Project, project_id)
    if not project:
        return jsonify({"status": "error", "message": "프로젝트를 찾을 수 없습니다."}), 404
    
    try:
        update_data = ProjectUpdate.parse_obj(request.get_json())
    except ValidationError as e:
        return jsonify(e.errors()), 422

    for key, value in update_data.dict(exclude_unset=True).items():
        setattr(project, key, value)
            
    db.session.commit()
    # Return the updated project with all its relationships
    return jsonify(project.to_dict())

@bp.route('/project/<int:project_id>/status', methods=['PUT'])
@login_required
def set_project_status(project_id):
    project = db.session.get(Project, project_id)
    if not project:
        return jsonify({"status": "error", "message": "프로젝트를 찾을 수 없습니다."}), 404

    try:
        status_data = StatusUpdate.parse_obj(request.get_json())
    except ValidationError as e:
        return jsonify(e.errors()), 422
    
    project.status = status_data.status
    db.session.commit()
    return jsonify({"status": "success"})

@bp.route('/project/<int:project_id>', methods=['DELETE'])
@login_required
def delete_project(project_id):
    project = db.session.get(Project, project_id)
    if not project:
        return jsonify({"status": "error", "message": "프로젝트를 찾을 수 없습니다."}), 404
    
    db.session.delete(project)
    db.session.commit()
    return jsonify({"status": "success"})
