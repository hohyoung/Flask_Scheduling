import sqlite3

def create_database():
    """
    schedule.db 데이터베이스와 테이블을 생성합니다.
    Users 테이블에서 profile_image 컬럼이 제거됩니다.
    초기 팀원 이름이 이재욱, 안호형, 안예준으로 설정됩니다.
    """
    conn = sqlite3.connect('schedule.db')
    cursor = conn.cursor()

    cursor.executescript("""
        DROP TABLE IF EXISTS Users;
        DROP TABLE IF EXISTS Projects;
        DROP TABLE IF EXISTS Tasks;
        DROP TABLE IF EXISTS Comments;
        DROP TABLE IF EXISTS Posts;
        DROP TABLE IF EXISTS PostReadStatus;

        CREATE TABLE Users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        );

        CREATE TABLE Projects (
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

        CREATE TABLE Tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            content TEXT NOT NULL,
            deadline TEXT,
            progress INTEGER DEFAULT 0,
            is_current INTEGER DEFAULT 0,
            FOREIGN KEY (project_id) REFERENCES Projects (id) ON DELETE CASCADE
        );

        CREATE TABLE Comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            author_name TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES Projects (id) ON DELETE CASCADE
        );

        CREATE TABLE Posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES Users (id) ON DELETE CASCADE
        );
                         
         CREATE TABLE PostReadStatus (
            user_id INTEGER NOT NULL,
            post_id INTEGER NOT NULL,
            read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, post_id),
            FOREIGN KEY (user_id) REFERENCES Users (id) ON DELETE CASCADE,
            FOREIGN KEY (post_id) REFERENCES Posts (id) ON DELETE CASCADE
        );
    """)

    print("테이블(Users, Projects, Tasks, Comments, Posts)이 성공적으로 생성되었습니다.")

    try:
        users_to_add = [
            ('이재욱',),
            ('안호형',),
            ('안예준',),
            ('DI 팀',)
        ]
        cursor.executemany("INSERT OR IGNORE INTO Users (name) VALUES (?)", users_to_add)
        print("초기 사용자 데이터(이재욱, 안호형, 안예준)가 추가되었습니다.")
    except sqlite3.Error as e:
        print(f"초기 사용자 데이터 추가 중 오류 발생: {e}")

    conn.commit()
    conn.close()

if __name__ == '__main__':
    create_database()