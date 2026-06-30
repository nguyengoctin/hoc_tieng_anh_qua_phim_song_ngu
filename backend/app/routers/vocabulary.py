from fastapi import APIRouter, HTTPException
from app.models.schemas import VocabRequest
from app.database import db

router = APIRouter(prefix="/api/vocabulary", tags=["vocabulary"])

@router.get("")
def get_vocabulary():
    """Lấy danh sách từ vựng từ SQLite database"""
    return {"status": "ok", "data": db.get_all_vocab()}

@router.post("")
def save_vocabulary(req: VocabRequest):
    """Lưu từ vựng mới vào SQLite database"""
    success = db.add_vocab(req.word, req.ipa, req.translation)
    if not success:
        raise HTTPException(status_code=500, detail="Không thể lưu từ vựng vào SQLite")
    return {"status": "ok", "message": "Từ vựng được lưu thành công"}

@router.delete("/{word}")
def remove_vocabulary(word: str):
    """Xóa từ vựng khỏi SQLite database"""
    success = db.delete_vocab(word)
    if not success:
        raise HTTPException(status_code=500, detail="Không thể xóa từ vựng")
    return {"status": "ok", "message": "Từ vựng đã được xóa"}
