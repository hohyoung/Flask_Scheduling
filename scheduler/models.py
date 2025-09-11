from .db import db

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    position = db.Column(db.String(80))

class Project(db.Model):
    __tablename__ = 'projects'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    start_date = db.Column(db.Date, nullable=False)
    deadline = db.Column(db.Date)
    priority = db.Column(db.Integer, default=2)
    progress = db.Column(db.Integer, default=0)
    status = db.Column(db.String(50), nullable=False, default='scheduled')
    category = db.Column(db.String(50), nullable=False, default='기타')
    tasks = db.relationship('Task', backref='project', lazy=True, cascade="all, delete-orphan")
    comments = db.relationship('Comment', backref='project', lazy=True, cascade="all, delete-orphan")

class Task(db.Model):
    __tablename__ = 'tasks'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    deadline = db.Column(db.Date)
    progress = db.Column(db.Integer, default=0)
    is_current = db.Column(db.Integer, default=0)
    task_order = db.Column(db.Integer, default=0)

class Comment(db.Model):
    __tablename__ = 'comments'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    author_name = db.Column(db.String(80), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())

class Post(db.Model):
    __tablename__ = 'posts'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    content = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now(), onupdate=db.func.now())

class PostReadStatus(db.Model):
    __tablename__ = 'post_read_status'
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id'), primary_key=True)
    read_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())

class Schedule(db.Model):
    __tablename__ = 'schedules'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    schedule_date = db.Column(db.Date, nullable=False)
    schedule_type = db.Column(db.String(50), nullable=False, default='personal')
    schedule_time = db.Column(db.Time)
