from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import db

router = APIRouter(prefix="/api/progress", tags=["progress"])

class ProgressSaveRequest(BaseModel):
    episode_id: str
    last_position: float
    duration: float
    completed: int

@router.get("/watched")
def get_watched_episodes():
    """Lấy danh sách các tập đã hoàn thành từ database SQLite"""
    return {"status": "ok", "data": db.get_completed_episodes()}

@router.get("/{episode_id}")
def get_episode_progress(episode_id: str):
    """Lấy tiến độ cụ thể của tập phim"""
    progress = db.get_progress(episode_id)
    if progress:
        return {"status": "ok", "data": progress}
    return {"status": "ok", "data": None}

@router.post("")
def save_episode_progress(payload: ProgressSaveRequest):
    """Lưu tiến độ phát phim của tập hiện tại"""
    success = db.save_progress(
        payload.episode_id,
        payload.last_position,
        payload.duration,
        payload.completed
    )
    if not success:
        raise HTTPException(status_code=500, detail="Không thể lưu tiến độ xem phim")
    return {"status": "ok", "message": "Lưu tiến độ thành công"}
