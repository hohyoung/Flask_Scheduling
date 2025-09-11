from flask import Blueprint, request, jsonify
from .db import db
from .models import Project
from .schemas import ProjectCreate, ProjectUpdate, StatusUpdate
from pydantic import ValidationError
from datetime import date

bp = Blueprint('projects', __name__, url_prefix='/api')

# ... (get_all_data and other routes remain, we only modify CUD operations for now)

@bp.route('/project', methods=['POST'])
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
    return jsonify(project.to_dict())

@bp.route('/project/<int:project_id>/status', methods=['PUT'])
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
def delete_project(project_id):
    project = db.session.get(Project, project_id)
    if not project:
        return jsonify({"status": "error", "message": "프로젝트를 찾을 수 없습니다."}), 404
    
    db.session.delete(project)
    db.session.commit()
    return jsonify({"status": "success"})

# The get_all_data function needs to be included in the final file.
# For brevity in this replace operation, I am only showing the modified CUD endpoints.
# I will now add the get_all_data back.
