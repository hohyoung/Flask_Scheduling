from .db import db
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin

# Helper base class for serialization
class SerializableModel(db.Model):
    __abstract__ = True

    def to_dict(self):
        # This is a simple serialization. For complex cases, libraries like Marshmallow are better.
        d = {}
        for column in self.__table__.columns:
            # Skip password hash
            if column.name == 'password_hash':
                continue
            d[column.name] = getattr(self, column.name)
        return d

class User(UserMixin, SerializableModel):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    position = db.Column(db.String(80))
    password_hash = db.Column(db.String(128))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'position': self.position}

class Project(SerializableModel):
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

    def to_dict(self):
        d = super().to_dict()
        d['tasks'] = [task.to_dict() for task in self.tasks]
        d['comments'] = [comment.to_dict() for comment in self.comments]
        return d

class Task(SerializableModel):
    __tablename__ = 'tasks'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    deadline = db.Column(db.Date)
    progress = db.Column(db.Integer, default=0)
    is_current = db.Column(db.Integer, default=0)
    task_order = db.Column(db.Integer, default=0)

class Comment(SerializableModel):
    __tablename__ = 'comments'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    author_name = db.Column(db.String(80), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())

class Post(SerializableModel):
    __tablename__ = 'posts'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    content = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now(), onupdate=db.func.now())

class PostReadStatus(SerializableModel):
    __tablename__ = 'post_read_status'
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id'), primary_key=True)
    read_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())

class Schedule(SerializableModel):
    __tablename__ = 'schedules'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    schedule_date = db.Column(db.Date, nullable=False)
    schedule_type = db.Column(db.String(50), nullable=False, default='personal')
    schedule_time = db.Column(db.Time)
