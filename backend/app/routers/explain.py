import json

from app.config import GEMINI_API_KEY
from app.database import db
from app.models.schemas import ExplainRequest
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/explain", tags=["explain"])


@router.post("")
async def explain_sentence(req: ExplainRequest):
    """Dùng Gemini để giải thích ngữ pháp, idiom, slang của câu thoại (có Caching)."""
    # 1. Kiểm tra cache SQLite trước
    if not req.bypass_cache:
        cached_data = db.get_ai_cached_explanation(req.sentence)
        if cached_data:
            return {"status": "ok", "data": cached_data, "cached": True}

    # 2. Nếu chưa cache, gọi API Gemini
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY chưa được cấu hình")

    try:
        from google import genai

        client = genai.Client(api_key=GEMINI_API_KEY)

        focus_part = f'\nTừ/cụm từ đang chú ý trong câu thoại: "{req.word}"' if req.word else ""
        prev_part = f'\nCâu thoại trước đó (ngữ cảnh): "{req.prev_sentence}"' if req.prev_sentence else ""
        next_part = f'\nCâu thoại tiếp theo (ngữ cảnh): "{req.next_sentence}"' if req.next_sentence else ""
        viet_part = (
            f'\nBản dịch tiếng Việt gốc của câu thoại hiện tại: "{req.vietnamese}"' if req.vietnamese else ""
        )

        prompt = f"""Bạn là từ điển giải thích ngữ cảnh của Google. Hãy phân tích câu thoại hiện tại sau đây theo phong cách Google Dictionary (cực kỳ khoa học, rõ ràng, ngắn gọn):

Câu thoại hiện tại cần giải thích: "{req.sentence}"{viet_part}{prev_part}{next_part}{focus_part}

Hãy sử dụng các câu thoại trước đó và tiếp theo làm ngữ cảnh để hiểu chính xác ý nghĩa của câu thoại hiện tại.

Hãy trả về JSON thuần túy (không markdown codeblock) có cấu trúc sau:
{{
  "translation": "Bản dịch tiếng Việt tự nhiên nhất của câu thoại trong văn cảnh phim này.",
  "definition": "Nghĩa cốt lõi của câu thoại trong văn cảnh (ngắn gọn 1 câu).",
  "tone": "Sắc thái giao tiếp (ví dụ: Thân mật, Mỉa mai, Lịch sự, Suồng sã). Tối đa 3 từ.",
  "example": "Một câu ví dụ thực tế tương tự trong đời sống (bằng tiếng Anh).",
  "example_translation": "Bản dịch tiếng Việt của câu ví dụ trên.",
  "key_vocabulary": {{
    "từ hoặc cụm từ hoặc cấu trúc 1": "nghĩa tiếng Việt ngắn gọn của từ/cấu trúc 1",
    "từ hoặc cụm từ hoặc cấu trúc 2": "nghĩa tiếng Việt ngắn gọn của từ/cấu trúc 2"
  }} // Chứa danh sách các cụm từ, thành ngữ, tiếng lóng hoặc cấu trúc ngữ pháp cần lưu ý (linh hoạt từ 0 đến tối đa 5 mục tùy thuộc vào độ phức tạp của câu thoại; nếu câu đơn giản không có gì cần chú ý thì hãy đặt giá trị này là null).
}}"""

        response = client.models.generate_content(
            model="gemini-3.1-flash-lite", contents=prompt
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
        return {
            "status": "ok",
            "data": {
                "meaning": response.text,
                "grammar": None,
                "idiom_slang": None,
                "alternatives": [],
                "tip": None,
            },
        }
    except Exception as e:
        error_msg = str(e)
        if "RESOURCE_EXHAUSTED" in error_msg or "429" in error_msg:
            raise HTTPException(
                status_code=429,
                detail="Đã hết quota Gemini hôm nay, thử lại ngày mai nhé!",
            )
        raise HTTPException(status_code=500, detail=f"Lỗi Gemini API: {error_msg}")
