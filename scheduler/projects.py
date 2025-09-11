from flask import Blueprint, request, jsonify
from .db import db
from .models import Project, Task, Comment, User, Schedule, Post

bp = Blueprint('projects', __name__, url_prefix='/api')

@bp.route('/data', methods=['GET'])
def get_all_data():
    # This endpoint now uses SQLAlchemy ORM for querying
    projects = db.session.scalars(db.select(Project).order_by(Project.status, Project.priority, Project.deadline.asc())).all()
    users = db.session.scalars(db.select(User).order_by(User.id.asc())).all()
    posts = db.session.scalars(db.select(Post).order_by(Post.created_at.desc())).all()
    schedules = db.session.scalars(db.select(Schedule).order_by(Schedule.schedule_date.asc())).all()

    # Note: This is a simplified representation. In a real app, you'd serialize this data carefully.
    # For example, using a library like Marshmallow.
    projects_data = [
        {
            'id': p.id, 'name': p.name, 'user_id': p.user_id, 'start_date': p.start_date, 
            'deadline': p.deadline, 'priority': p.priority, 'progress': p.progress, 
            'status': p.status, 'category': p.category,
            'tasks': [{'id': t.id, 'content': t.content, 'deadline': t.deadline, 'progress': t.progress} for t in p.tasks],
            'comments': [{'id': c.id, 'author_name': c.author_name, 'content': c.content, 'created_at': c.created_at} for c in p.comments]
        } for p in projects
    ]
    users_data = [{'id': u.id, 'name': u.name, 'position': u.position} for u in users]
    posts_data = [{'id': p.id, 'title': p.title, 'content': p.content, 'user_id': p.user_id, 'created_at': p.created_at} for p in posts]
    schedules_data = [{'id': s.id, 'user_id': s.user_id, 'content': s.content, 'schedule_date': s.schedule_date} for s in schedules]

    return jsonify({
        "projects": projects_data,
        "users": users_data,
        "posts": posts_data,
        "schedules": schedules_data,
        "has_new_posts": False # Simplified
    })

# Other project-related routes will be refactored similarly.
