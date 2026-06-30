import json
from fastapi import APIRouter, HTTPException
from app.models.schemas import ExplainRequest
from app.database import db
from app.config import GEMINI_API_KEY

router = APIRouter(prefix="/api/explain", tags=["explain"])

@router.post("")
async def explain_sentence(req: ExplainRequest):
    """Dùng Gemini để giải thích ngữ pháp, idiom, slang của câu thoại (có Caching)."""
    # 1. Kiểm tra cache SQLite trước
    cached_data = db.get_ai_cached_explanation(req.sentence)
    if cached_data:
        return {"status": "ok", "data": cached_data, "cached": True}

    # 2. Nếu chưa cache, gọi API Gemini
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY chưa được cấu hình")

    try:
        from google import genai
        client = genai.Client(api_key=GEMINI_API_KEY)

        focus_part = f'\nTừ/cụm từ đang chú ý: "{req.word}"' if req.word else ""
        viet_part = f'\nBản dịch tiếng Việt: "{req.vietnamese}"' if req.vietnamese else ""

        prompt = f"""Bạn là từ điển giải thích ngữ cảnh của Google. Hãy phân tích câu thoại sau theo phong cách Google Dictionary (cực kỳ khoa học, rõ ràng, ngắn gọn):

Câu thoại: "{req.sentence}"{viet_part}{focus_part}

Hãy trả về JSON thuần túy (không markdown codeblock) có cấu trúc sau:
{{
  "translation": "Bản dịch tiếng Việt tự nhiên nhất của câu thoại trong văn cảnh phim này.",
  "definition": "Nghĩa cốt lõi của câu thoại trong văn cảnh (ngắn gọn 1 câu).",
  "tone": "Sắc thái giao tiếp (ví dụ: Thân mật, Mỉa mai, Lịch sự, Suồng sã). Tối đa 3 từ.",
  "example": "Một câu ví dụ thực tế tương tự trong đời sống (bằng tiếng Anh).",
  "example_translation": "Bản dịch tiếng Việt của câu ví dụ trên.",
  "key_vocabulary": "Từ lóng hoặc cụm từ quan trọng nhất trong câu (nếu có, ví dụ: 'cụm từ' - 'nghĩa'), nếu không có ghi null."
}}"""

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        data = json.loads(text.strip())
        
        # 3. Lưu vào SQLite cache để dùng lần sau
        db.save_ai_explanation(req.sentence, data)
        
        return {"status": "ok", "data": data, "cached": False}

    except json.JSONDecodeError:
        return {"status": "ok", "data": {"meaning": response.text, "grammar": None, "idiom_slang": None, "alternatives": [], "tip": None}}
    except Exception as e:
        error_msg = str(e)
        if "RESOURCE_EXHAUSTED" in error_msg or "429" in error_msg:
            raise HTTPException(status_code=429, detail="Đã hết quota Gemini hôm nay, thử lại ngày mai nhé!")
        raise HTTPException(status_code=500, detail=f"Lỗi Gemini API: {error_msg}")
