from fastapi import APIRouter, HTTPException
from app.models.schemas import VocabRequest, ReviewRequest
from app.database import db
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/vocabulary", tags=["vocabulary"])

@router.get("")
def get_vocabulary():
    """Lấy danh sách từ vựng từ SQLite database"""
    return {"status": "ok", "data": db.get_all_vocab()}

@router.post("")
def save_vocabulary(req: VocabRequest):
    """Lưu từ vựng mới vào SQLite database"""
    success = db.add_vocab(req.word, req.ipa, req.translation, req.part_of_speech, req.audio_url)
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

@router.post("/{word}/review")
def review_vocabulary(word: str, req: ReviewRequest):
    """Cập nhật trạng thái lặp lại ngắt quãng (SRS) cho từ vựng"""
    vocab_list = db.get_all_vocab()
    target = None
    for v in vocab_list:
        if v["word"] == word:
            target = v
            break
            
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy từ vựng này trong sổ tay")
        
    repetitions = target.get("repetitions") or 0
    interval_days = target.get("interval_days") or 0
    efactor = target.get("efactor") or 2.5
    
    q = req.quality
    if q == 1: # Again
        repetitions = 0
        interval_days = 1
        efactor = max(1.3, efactor - 0.2)
    elif q == 2: # Hard
        if repetitions == 0:
            interval_days = 1
        elif repetitions == 1:
            interval_days = 3
        else:
            interval_days = int(interval_days * 1.5)
        repetitions += 1
        efactor = max(1.3, efactor - 0.15)
    else: # Easy
        if repetitions == 0:
            interval_days = 3
        elif repetitions == 1:
            interval_days = 6
        else:
            interval_days = int(interval_days * efactor)
        repetitions += 1
        efactor = min(2.5, efactor + 0.15)
        
    next_review = (datetime.now() + timedelta(days=interval_days)).isoformat()
    
    success = db.update_vocab_srs(word, next_review, interval_days, repetitions, efactor)
    if not success:
        raise HTTPException(status_code=500, detail="Không thể cập nhật tiến trình SRS vào SQLite")
        
    return {
        "status": "ok",
        "data": {
            "word": word,
            "next_review": next_review,
            "interval_days": interval_days,
            "repetitions": repetitions,
            "efactor": efactor
        }
    }
