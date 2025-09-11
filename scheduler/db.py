import psycopg2
import psycopg2.extras
import click
from flask import current_app, g
from flask.cli import with_appcontext

def get_db():
    if 'db' not in g:
        dsn = current_app.config['DATABASE_URL']
        if not dsn:
            raise RuntimeError("DATABASE_URL is not set.")
        g.db = psycopg2.connect(dsn, cursor_factory=psycopg2.extras.RealDictCursor)
    return g.db

def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()

# This init_db_command is now deprecated and will be replaced by Flask-Migrate
@click.command('init-db')
@with_appcontext
def init_db_command():
    """This command is deprecated. Use 'flask db upgrade' after setting up Flask-Migrate."""
    click.echo("This command is deprecated and will be replaced by Flask-Migrate.")

def init_app(app):
    app.teardown_appcontext(close_db)
    app.cli.add_command(init_db_command)
