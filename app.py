import sqlite3
import click
from flask import Flask, jsonify, request, render_template
from flask.cli import with_appcontext

app = Flask(__name__)

# --- 데이터베이스 연결 및 초기화 ---

def get_db_connection():
    """데이터베이스에 연결하고, 결과를 딕셔너리 형태로 다룰 수 있도록 설정합니다."""
    conn = sqlite3.connect('schedule.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """데이터베이스 스키마에 따라 모든 테이블을 생성하고 초기 사용자를 추가합니다."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS Users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        );
        CREATE TABLE IF NOT EXISTS Projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            user_id INTEGER,
            start_date TEXT NOT NULL,
            deadline TEXT NOT NULL,
            priority INTEGER DEFAULT 2,
            progress INTEGER DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'active',
            FOREIGN KEY (user_id) REFERENCES Users (id)
        );
        CREATE TABLE IF NOT EXISTS Tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            content TEXT NOT NULL,
            deadline TEXT,
            progress INTEGER DEFAULT 0,
            is_current INTEGER DEFAULT 0,
            FOREIGN KEY (project_id) REFERENCES Projects (id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS Comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            author_name TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES Projects (id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS Posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES Users (id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS PostReadStatus (
            user_id INTEGER NOT NULL,
            post_id INTEGER NOT NULL,
            read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, post_id),
            FOREIGN KEY (user_id) REFERENCES Users (id) ON DELETE CASCADE,
            FOREIGN KEY (post_id) REFERENCES Posts (id) ON DELETE CASCADE
        );
    """)
    print("Initialized the database.")
    
    try:
        users_to_add = [('이재욱',), ('안호형',), ('안예준',)]
        cursor.executemany("INSERT OR IGNORE INTO Users (name) VALUES (?)", users_to_add)
        conn.commit()
        print("Initial users (이재욱, 안호형, 안예준) added.")
    except sqlite3.Error as e:
        print(f"Error adding initial users: {e}")
    finally:
        conn.close()

@click.command('init-db')
@with_appcontext
def init_db_command():
    """터미널에서 'flask init-db' 명령으로 DB를 초기화합니다."""
    init_db()
    click.echo('Initialized the database.')

app.cli.add_command(init_db_command)


# --- API 라우트 ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/data', methods=['GET'])
def get_all_data():
    current_user_id = request.headers.get('X-Current-User-ID')
    conn = get_db_connection()
    
    # --- [핵심 수정] 누락되었던 DB 조회 로직 전체 추가 ---
    # 1. 프로젝트 및 하위 데이터 조회
    projects_list = []
    projects = conn.execute('SELECT * FROM Projects ORDER BY status, priority, deadline ASC').fetchall()
    for project in projects:
        project_dict = dict(project)
        tasks = conn.execute('SELECT * FROM Tasks WHERE project_id = ?', (project['id'],)).fetchall()
        project_dict['tasks'] = [dict(task) for task in tasks]
        comments = conn.execute('SELECT * FROM Comments WHERE project_id = ? ORDER BY created_at ASC', (project['id'],)).fetchall()
        project_dict['comments'] = [dict(comment) for comment in comments]
        projects_list.append(project_dict)

    # 2. 사용자 조회
    users = conn.execute('SELECT * FROM Users').fetchall()
    
    # 3. 게시글 조회
    posts = conn.execute('SELECT p.*, u.name as author_name FROM Posts p JOIN Users u ON p.user_id = u.id ORDER BY p.created_at DESC').fetchall()
    # --- [여기까지] ---

    has_new_posts = False
    if current_user_id:
        unread_posts_count = conn.execute("""
            SELECT COUNT(p.id) FROM Posts p
            WHERE p.user_id != ? AND p.id NOT IN (
                SELECT prs.post_id FROM PostReadStatus prs WHERE prs.user_id = ?
            )
        """, (current_user_id, current_user_id)).fetchone()[0]
        
        if unread_posts_count > 0:
            has_new_posts = True
            
    conn.close()
    
    all_data = {
        'users': [dict(user) for user in users],
        'projects': projects_list,
        'posts': [dict(post) for post in posts],
        'has_new_posts': has_new_posts
    }
    return jsonify(all_data)

# --- 사용자 관리 API ---
@app.route('/api/user', methods=['POST'])
def add_user():
    user_data = request.get_json()
    name = user_data.get('name')
    if not name:
        return jsonify({'status': 'error', 'message': '사용자 이름이 필요합니다.'}), 400

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('INSERT INTO Users (name) VALUES (?)', (name,))
        conn.commit()
        return jsonify({'status': 'success', 'id': cursor.lastrowid}), 201
    except sqlite3.IntegrityError:
        return jsonify({'status': 'error', 'message': '이미 존재하는 사용자 이름입니다.'}), 409
    finally:
        conn.close()

@app.route('/api/user/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    conn = get_db_connection()
    try:
        conn.execute('UPDATE Projects SET user_id = NULL WHERE user_id = ?', (user_id,))
        conn.execute('DELETE FROM Users WHERE id = ?', (user_id,))
        conn.commit()
        return jsonify({'status': 'success'})
    except sqlite3.Error as e:
        conn.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        conn.close()

# --- 프로젝트/업무/코멘트 관리 API ---
@app.route('/api/project', methods=['POST'])
def add_project():
    data = request.get_json()
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('INSERT INTO Projects (name, user_id, start_date, deadline, priority) VALUES (?, ?, ?, ?, ?)', (data['name'], data['user_id'], data['start_date'], data['deadline'], data['priority']))
        project_id = cursor.lastrowid
        tasks_to_add = [(project_id, task['content'], task.get('deadline')) for task in data['tasks']]
        if tasks_to_add:
            cursor.executemany('INSERT INTO Tasks (project_id, content, deadline) VALUES (?, ?, ?)', tasks_to_add)
        conn.commit()
        return jsonify({'status': 'success', 'project_id': project_id}), 201
    except sqlite3.Error as e:
        conn.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/project/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    conn = get_db_connection()
    try:
        conn.execute('DELETE FROM Comments WHERE project_id = ?', (project_id,))
        conn.execute('DELETE FROM Tasks WHERE project_id = ?', (project_id,))
        conn.execute('DELETE FROM Projects WHERE id = ?', (project_id,))
        conn.commit()
        return jsonify({'status': 'success'})
    except sqlite3.Error as e:
        conn.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        conn.close()
        
@app.route('/api/project/<int:project_id>/status', methods=['PUT'])
def update_project_status(project_id):
    status = request.get_json().get('status')
    conn = get_db_connection()
    conn.execute('UPDATE Projects SET status = ? WHERE id = ?', (status, project_id))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

@app.route('/api/project/<int:project_id>', methods=['PUT'])
def update_project(project_id):
    data_to_update = request.get_json()
    conn = get_db_connection()

    if 'progress' in data_to_update:
        conn.execute('UPDATE Projects SET progress = ? WHERE id = ?', (data_to_update['progress'], project_id))
    if 'priority' in data_to_update:
        conn.execute('UPDATE Projects SET priority = ? WHERE id = ?', (data_to_update['priority'], project_id))
    if 'name' in data_to_update:
        conn.execute('UPDATE Projects SET name = ? WHERE id = ?', (data_to_update['name'], project_id))

    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'message': 'Project updated'})

@app.route('/api/project/<int:project_id>/task', methods=['POST'])
def add_task_to_project(project_id):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('INSERT INTO Tasks (project_id, content, progress) VALUES (?, ?, ?)', (project_id, '', 0))
        conn.commit()
        new_task_id = cursor.lastrowid
        return jsonify({'status': 'success', 'task_id': new_task_id}), 201
    except sqlite3.Error as e:
        conn.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/task/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.get_json()
    conn = get_db_connection()
    if 'progress' in data: conn.execute('UPDATE Tasks SET progress = ? WHERE id = ?', (data['progress'], task_id))
    if 'content' in data: conn.execute('UPDATE Tasks SET content = ? WHERE id = ?', (data['content'], task_id))
    if 'deadline' in data: conn.execute('UPDATE Tasks SET deadline = ? WHERE id = ?', (data['deadline'], task_id))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

@app.route('/api/task/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM Tasks WHERE id = ?', (task_id,))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

@app.route('/api/project/<int:project_id>/comment', methods=['POST'])
def add_comment(project_id):
    data = request.get_json()
    conn = get_db_connection()
    conn.execute('INSERT INTO Comments (project_id, author_name, content) VALUES (?, ?, ?)', (project_id, data['author'], data['text']))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'}), 201

@app.route('/api/comment/<int:comment_id>', methods=['PUT'])
def update_comment(comment_id):
    content = request.get_json().get('content')
    conn = get_db_connection()
    conn.execute('UPDATE Comments SET content = ? WHERE id = ?', (content, comment_id))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

@app.route('/api/comment/<int:comment_id>', methods=['DELETE'])
def delete_comment(comment_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM Comments WHERE id = ?', (comment_id,))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

# --- 게시판(Posts) 관리 API ---
@app.route('/api/post', methods=['POST'])
def add_post():
    data = request.get_json()
    if not data or 'title' not in data or 'content' not in data or 'user_id' not in data:
        return jsonify({'status': 'error', 'message': '필수 정보가 누락되었습니다.'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO Posts (title, content, user_id) VALUES (?, ?, ?)', (data['title'], data['content'], data['user_id']))
    
    # [핵심 수정] 방금 추가된 게시글의 ID를 가져옴
    post_id = cursor.lastrowid
    # [핵심 수정] 작성자 자신을 바로 '읽음' 처리
    cursor.execute('INSERT OR IGNORE INTO PostReadStatus (user_id, post_id) VALUES (?, ?)', (data['user_id'], post_id))

    conn.commit()
    conn.close()
    return jsonify({'status': 'success'}), 201

@app.route('/api/post/<int:post_id>', methods=['PUT'])
def update_post(post_id):
    data = request.get_json()
    if not data or 'title' not in data or 'content' not in data:
        return jsonify({'status': 'error', 'message': '필수 정보가 누락되었습니다.'}), 400
        
    conn = get_db_connection()
    conn.execute('UPDATE Posts SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', (data['title'], data['content'], post_id))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

@app.route('/api/post/<int:post_id>', methods=['DELETE'])
def delete_post(post_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM Posts WHERE id = ?', (post_id,))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

@app.route('/api/posts/mark-as-read', methods=['POST'])
def mark_posts_as_read():
    user_id = request.get_json().get('user_id')
    if not user_id:
        return jsonify({'status': 'error', 'message': 'User ID is required'}), 400

    conn = get_db_connection()
    
    unread_posts = conn.execute("SELECT id FROM Posts WHERE id NOT IN (SELECT post_id FROM PostReadStatus WHERE user_id = ?)", (user_id,)).fetchall()

    for post in unread_posts:
        conn.execute('INSERT OR IGNORE INTO PostReadStatus (user_id, post_id) VALUES (?, ?)', (user_id, post['id']))
    
    conn.commit()
    conn.close()
    
    return jsonify({'status': 'success'})

# if __name__ == '__main__':
#     app.run(debug=True)