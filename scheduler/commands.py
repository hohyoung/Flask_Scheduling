import click
import csv
import os
from flask.cli import with_appcontext
from .db import db
from .models import User, Project, Task, Comment, Post, PostReadStatus, Schedule
from datetime import datetime, date


def to_date(s):
    return date.fromisoformat(s) if s else None

@click.command('import-data')
@with_appcontext
def import_data_command():
    """Imports data from CSV files in the 'tables' directory."""
    
    # The order of import is important due to foreign key constraints
    # User -> Project -> Task -> Comment
    # User -> Post -> PostReadStatus
    # User -> Schedule
    
    # More robust way to find the project root and then the tables directory
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    base_path = os.path.join(project_root, 'tables')

    # Clear existing data to prevent duplicates
    db.session.execute(db.text('DELETE FROM post_read_status'))
    db.session.execute(db.text('DELETE FROM comments'))
    db.session.execute(db.text('DELETE FROM tasks'))
    db.session.execute(db.text('DELETE FROM posts'))
    db.session.execute(db.text('DELETE FROM schedules'))
    db.session.execute(db.text('DELETE FROM projects'))
    db.session.execute(db.text('DELETE FROM users'))
    db.session.commit()

    # 1. Users
    with open(os.path.join(base_path, 'users.csv'), 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            user = User(id=int(row['id']), name=row['name'], position=row.get('position'))
            # Set a default password for all imported users
            user.set_password('1234')
            db.session.add(user)
    db.session.commit()
    click.echo('Users imported.')

    # 2. Projects
    with open(os.path.join(base_path, 'projects.csv'), 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            project = Project(
                id=int(row['id']),
                name=row['name'],
                user_id=int(row['user_id']),
                start_date=to_date(row['start_date']),
                deadline=to_date(row.get('deadline')),
                priority=int(row.get('priority', 2)),
                progress=int(row.get('progress', 0)),
                status=row.get('status', 'scheduled'),
                category=row.get('category', '기타')
            )
            db.session.add(project)
    db.session.commit()
    click.echo('Projects imported.')

    # 3. Tasks
    with open(os.path.join(base_path, 'tasks.csv'), 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            task = Task(
                id=int(row['id']),
                project_id=int(row['project_id']),
                content=row['content'],
                deadline=to_date(row.get('deadline')),
                progress=int(row.get('progress', 0)),
                is_current=int(row.get('is_current', 0)),
                task_order=int(row.get('task_order', 0))
            )
            db.session.add(task)
    db.session.commit()
    click.echo('Tasks imported.')

    # 4. Comments
    with open(os.path.join(base_path, 'comments.csv'), 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            comment = Comment(
                id=int(row['id']),
                project_id=int(row['project_id']),
                author_name=row['author_name'],
                content=row['content'],
                created_at=datetime.fromisoformat(row['created_at'])
            )
            db.session.add(comment)
    db.session.commit()
    click.echo('Comments imported.')

    # 5. Posts
    with open(os.path.join(base_path, 'posts.csv'), 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            post = Post(
                id=int(row['id']),
                title=row['title'],
                content=row['content'],
                user_id=int(row['user_id']),
                created_at=datetime.fromisoformat(row['created_at']),
                updated_at=datetime.fromisoformat(row['updated_at'])
            )
            db.session.add(post)
    db.session.commit()
    click.echo('Posts imported.')

    # 6. PostReadStatus
    with open(os.path.join(base_path, 'postreadstatus.csv'), 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            status = PostReadStatus(
                user_id=int(row['user_id']),
                post_id=int(row['post_id']),
                read_at=datetime.fromisoformat(row['read_at'])
            )
            db.session.add(status)
    db.session.commit()
    click.echo('PostReadStatus imported.')

    # 7. Schedules
    with open(os.path.join(base_path, 'schedules.csv'), 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            schedule = Schedule(
                id=int(row['id']),
                user_id=int(row['user_id']),
                content=row['content'],
                schedule_date=to_date(row['schedule_date']),
                schedule_type=row.get('schedule_type', 'personal'),
                schedule_time=None # Assuming time is not in csv
            )
            db.session.add(schedule)
    db.session.commit()
    click.echo('Schedules imported.')

    click.echo('Data import completed successfully!')

def init_app(app):
    app.cli.add_command(import_data_command)
