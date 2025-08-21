import os
import psycopg2
import psycopg2.extras # 딕셔너리 형태로 결과를 받기 위해 추가
from dotenv import load_dotenv

# .env 파일이 있다면 환경변수를 불러옵니다.
load_dotenv()

def query_schedules():
    """Schedules 테이블의 모든 데이터를 조회하여 출력합니다."""
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("오류: DATABASE_URL 환경변수가 설정되지 않았습니다.")
        return

    conn = None
    try:
        # RealDictCursor를 사용하여 결과를 딕셔너리 형태로 받습니다.
        conn = psycopg2.connect(dsn, cursor_factory=psycopg2.extras.RealDictCursor)
        with conn.cursor() as cur:
            # Schedules 테이블과 Users 테이블을 조인하여 사용자 이름까지 함께 조회합니다.
            cur.execute("""
                SELECT s.id, s.user_id, u.name as user_name, s.content, s.schedule_date 
                FROM Schedules s
                JOIN Users u ON s.user_id = u.id
                ORDER BY s.schedule_date DESC;
            """)
            
            schedules = cur.fetchall()

            if not schedules:
                print("--- Schedules 테이블에 데이터가 없습니다. ---")
            else:
                print(f"--- 총 {len(schedules)}개의 일정을 찾았습니다. ---")
                for schedule in schedules:
                    # 각 일정을 보기 좋게 출력합니다.
                    print(dict(schedule))

    except psycopg2.Error as e:
        print(f"데이터베이스 작업 중 오류 발생: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    query_schedules()