from flask import Blueprint, request, jsonify
from .db import db
from .models import Schedule
from datetime import date

bp = Blueprint('schedules', __name__, url_prefix='/api')

def _parse_date(val):
    if not val: return None
    try: return date.fromisoformat(val)
    except (TypeError, ValueError): return val

@bp.route('/schedule', methods=['POST'])
def create_schedule():
    data = request.get_json() or {}
    required = ["user_id", "content", "schedule_date"]
    if any(k not in data for k in required):
        return jsonify({"status": "error", "message": "필수 정보가 누락되었습니다."}), 400

    new_schedule = Schedule(
        user_id=data['user_id'],
        content=data['content'],
        schedule_date=_parse_date(data['schedule_date']),
        schedule_type=data.get('schedule_type', 'personal')
    )
    db.session.add(new_schedule)
    db.session.commit()
    return jsonify(new_schedule.to_dict()), 201

@bp.route('/schedule/<int:schedule_id>', methods=['DELETE'])
def delete_schedule(schedule_id):
    schedule = db.session.get(Schedule, schedule_id)
    if schedule:
        db.session.delete(schedule)
        db.session.commit()
    return jsonify({"status": "success"})
