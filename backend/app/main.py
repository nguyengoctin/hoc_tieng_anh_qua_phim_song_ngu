import os
import csv
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from deep_translator import GoogleTranslator
from dotenv import load_dotenv

# Load API key từ .env (không bao giờ expose ra frontend)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env'))

from database import db

# Khởi tạo SQLite database
db.init_db()

app = FastAPI(title="Friends Language Learning Center API")

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VIDEOS_DIR = os.path.join(PROJECT_ROOT, "data", "videos")
SUBTITLES_DIR = os.path.join(PROJECT_ROOT, "data", "subtitles", "bilingual", "VTT")
DICT_DIR = os.path.join(PROJECT_ROOT, "data", "dict")

# Serve videos and subtitles as static files
if os.path.exists(VIDEOS_DIR):
    app.mount("/videos", StaticFiles(directory=VIDEOS_DIR), name="videos")
if os.path.exists(SUBTITLES_DIR):
    app.mount("/subtitles", StaticFiles(directory=SUBTITLES_DIR), name="subtitles")

import re

@app.get("/api/episodes")
def get_episodes():
    """Lists all available episodes structured by Show -> Season -> Episode."""
    data = {}
    
    # We will traverse VIDEOS_DIR to find all MP4s
    if os.path.exists(VIDEOS_DIR):
        for root, dirs, files in os.walk(VIDEOS_DIR):
            for file in sorted(files):
                if not file.endswith(".mp4"):
                    continue
                
                # Determine hierarchy based on paths or filenames
                # E.g., root = PROJECT_ROOT/data/videos/friends/season_01
                # Or root = PROJECT_ROOT/data/videos (old layout)
                rel_path = os.path.relpath(root, VIDEOS_DIR)
                
                show_id = "friends"
                show_title = "Friends"
                season_id = "season_01"
                season_title = "Season 1"
                
                # Parse filename to guess Show/Season
                filename_no_ext = os.path.splitext(file)[0] # e.g. Friends_S01E01
                
                match = re.search(r'S(\d+)E(\d+)', filename_no_ext, re.IGNORECASE)
                if match:
                    s_num = int(match.group(1))
                    e_num = int(match.group(2))
                    season_id = f"season_{s_num:02d}"
                    season_title = f"Season {s_num}"
                    episode_title = f"Episode {e_num}"
                else:
                    episode_title = filename_no_ext
                
                # If nested in directories
                parts = rel_path.split(os.sep)
                if len(parts) >= 2 and parts[0] != ".":
                    show_id = parts[0]
                    show_title = show_id.replace("_", " ").title()
                    season_id = parts[1]
                    s_match = re.search(r'\d+', season_id)
                    if s_match:
                        season_title = f"Season {int(s_match.group(0))}"
                    else:
                        season_title = season_id.replace("_", " ").title()
                
                # Find matching subtitle URL
                sub_rel_dir = "" if rel_path == "." else rel_path
                sub_filename = filename_no_ext + ".vtt"
                
                sub_path = os.path.join(SUBTITLES_DIR, sub_rel_dir, sub_filename)
                
                sub_url = None
                if os.path.exists(sub_path):
                    sub_url = f"http://localhost:8000/subtitles/{sub_rel_dir}/{sub_filename}" if sub_rel_dir else f"http://localhost:8000/subtitles/{sub_filename}"
                else:
                    if os.path.exists(SUBTITLES_DIR):
                        target_dir = os.path.join(SUBTITLES_DIR, sub_rel_dir)
                        if os.path.exists(target_dir):
                            for s in os.listdir(target_dir):
                                if s.lower() == sub_filename.lower():
                                    sub_url = f"http://localhost:8000/subtitles/{sub_rel_dir}/{s}" if sub_rel_dir else f"http://localhost:8000/subtitles/{s}"
                                    break
                
                video_url = f"http://localhost:8000/videos/{rel_path}/{file}" if rel_path != "." else f"http://localhost:8000/videos/{file}"
                
                if show_id not in data:
                    data[show_id] = {
                        "title": show_title,
                        "seasons": {}
                    }
                if season_id not in data[show_id]["seasons"]:
                    data[show_id]["seasons"][season_id] = {
                        "title": season_title,
                        "episodes": []
                    }
                
                data[show_id]["seasons"][season_id]["episodes"].append({
                    "id": filename_no_ext,
                    "title": episode_title,
                    "video_url": video_url,
                    "subtitle_url": sub_url
                })
                
    # Sort episodes and seasons
    for show_id in data:
        seasons = data[show_id]["seasons"]
        for season_id in seasons:
            seasons[season_id]["episodes"] = sorted(seasons[season_id]["episodes"], key=lambda x: x["id"])
            
    return data

import urllib.request
import urllib.parse
import json

def get_phonetic_and_pos(word: str):
    # Only try for single words
    if " " in word:
        return None, None, None
    try:
        url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{urllib.parse.quote(word)}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=1.2) as response:
            data = json.loads(response.read().decode())
            if data and isinstance(data, list):
                entry = data[0]
                ipa = entry.get("phonetic")
                if not ipa and entry.get("phonetics"):
                    for p in entry["phonetics"]:
                        if p.get("text"):
                            ipa = p["text"]
                            break
                audio = None
                if entry.get("phonetics"):
                    for p in entry["phonetics"]:
                        if p.get("audio"):
                            audio = p["audio"]
                            break
                
                pos = "word"
                if entry.get("meanings"):
                    pos = entry["meanings"][0].get("partOfSpeech", "word")
                
                return ipa, pos, audio
    except Exception:
        pass
    return None, None, None

@app.get("/api/translate")
def translate_word(word: str):
    """Translates a word or phrase from English to Vietnamese and returns details."""
    # Preserve space for phrases, but strip outer whitespace
    cleaned_word = "".join(c for c in word if c.isalnum() or c.isspace() or c == "'").strip()
    # Normalize spaces: multiple spaces to single space
    cleaned_word = " ".join(cleaned_word.split())
    if not cleaned_word:
        raise HTTPException(status_code=400, detail="Invalid word/phrase")
    
    try:
        translator = GoogleTranslator(source='en', target='vi')
        translation = translator.translate(cleaned_word)
        
        # Look up phonetic/pos/audio from Free Dictionary API if it is a single word
        ipa, pos, audio_url = get_phonetic_and_pos(cleaned_word.lower())
        
        # Fallbacks
        if not ipa:
            ipa = f"/{cleaned_word}/" if " " not in cleaned_word else ""
        if not pos:
            pos = "phrase" if " " in cleaned_word else "word"
            
        return {
            "word": cleaned_word,
            "translation": translation,
            "ipa": ipa,
            "part_of_speech": pos,
            "audio_url": audio_url
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from typing import Optional
from pydantic import BaseModel

class SubtitleUpdateSchema(BaseModel):
    episode_id: str
    segment_index: int
    new_start: float
    new_end: float
    new_english: Optional[str] = None
    new_vietnamese: Optional[str] = None

def format_vtt_time(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    ms = int(round((seconds - int(seconds)) * 1000))
    if ms >= 1000:
        secs += 1
        ms -= 1000
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{ms:03d}"

@app.post("/api/subtitles/update-segment")
def update_subtitle_segment(payload: SubtitleUpdateSchema):
    # Find the VTT file path inside SUBTITLES_DIR
    target_file = None
    for root, dirs, files in os.walk(SUBTITLES_DIR):
        for file in files:
            if os.path.splitext(file)[0].lower() == payload.episode_id.lower() and file.endswith(".vtt"):
                target_file = os.path.join(root, file)
                break
        if target_file:
            break
            
    if not target_file or not os.path.exists(target_file):
        raise HTTPException(status_code=404, detail="Subtitle file not found")

    # Read and parse VTT
    with open(target_file, "r", encoding="utf-8") as f:
        content = f.read().replace("\ufeff", "").replace("\r\n", "\n")

    blocks = content.split("\n\n")
    header = blocks[0]
    
    parsed_blocks = []
    # Identify subtitle entries
    for block in blocks[1:]:
        lines = [line.strip() for line in block.split("\n") if line.strip()]
        if not lines:
            continue
            
        timestamp_idx = -1
        for idx, line in enumerate(lines):
            if "-->" in line:
                timestamp_idx = idx
                break
                
        if timestamp_idx == -1:
            parsed_blocks.append({"type": "raw", "content": block})
            continue

        time_line = lines[timestamp_idx]
        start_str, end_str = time_line.split("-->")
        
        def parse_vtt_seconds(t_str):
            parts = t_str.strip().replace(",", ".").split(":")
            seconds_parts = parts[2].split(".")
            h = int(parts[0])
            m = int(parts[1])
            s = int(seconds_parts[0])
            ms_val = int(seconds_parts[1]) if len(seconds_parts) > 1 else 0
            return h * 3600 + m * 60 + s + ms_val / 1000

        start = parse_vtt_seconds(startStr := start_str)
        end = parse_vtt_seconds(endStr := end_str)
        
        index_val = int(lines[0]) if timestamp_idx > 0 and lines[0].isdigit() else (len(parsed_blocks) + 1)
        
        parsed_blocks.append({
            "type": "subtitle",
            "index": index_val,
            "start": start,
            "end": end,
            "lines_before": lines[:timestamp_idx],
            "lines_after": lines[timestamp_idx+1:],
            "original_block": block
        })

    # Find the target segment by index (1-based index)
    target_sub = None
    sub_indices = []
    for idx, block in enumerate(parsed_blocks):
        if block["type"] == "subtitle":
            sub_indices.append(idx)
            if block["index"] == payload.segment_index:
                target_sub = block

    if not target_sub:
        raise HTTPException(status_code=404, detail="Subtitle segment index not found")

    # Update current segment
    old_start = target_sub["start"]
    target_sub["start"] = payload.new_start
    target_sub["end"] = payload.new_end

    # Update text lines if provided
    if payload.new_english is not None:
        if len(target_sub["lines_after"]) > 0:
            target_sub["lines_after"][0] = payload.new_english
        else:
            target_sub["lines_after"].append(payload.new_english)
            
    if payload.new_vietnamese is not None:
        if len(target_sub["lines_after"]) > 1:
            target_sub["lines_after"][1] = payload.new_vietnamese
        else:
            while len(target_sub["lines_after"]) < 2:
                target_sub["lines_after"].append("")
            target_sub["lines_after"][1] = payload.new_vietnamese

    # Apply Cascade Update Rule to neighbors
    target_pos = sub_indices.index(parsed_blocks.index(target_sub))
    
    # 1. Update previous segment if they were adjacent (gap < 0.15s)
    if target_pos > 0:
        prev_sub = parsed_blocks[sub_indices[target_pos - 1]]
        # Check gap between previous end and old start of current
        prev_gap = old_start - prev_sub["end"]
        if prev_gap < 0.15:
            # Shift previous end automatically to maintain the seamless transition
            prev_sub["end"] = payload.new_start - 0.05

    # 2. Limit current end to avoid overlapping next segment
    if target_pos < len(sub_indices) - 1:
        next_sub = parsed_blocks[sub_indices[target_pos + 1]]
        if target_sub["end"] > next_sub["start"]:
            target_sub["end"] = next_sub["start"] - 0.05

    # Reconstruct VTT file
    new_blocks = [header]
    for block in parsed_blocks:
        if block["type"] == "raw":
            new_blocks.append(block["content"])
        else:
            time_line = f"{format_vtt_time(block['start'])} --> {format_vtt_time(block['end'])}"
            lines = []
            if block["lines_before"]:
                lines.extend(block["lines_before"])
            else:
                lines.append(str(block["index"]))
            lines.append(time_line)
            lines.extend(block["lines_after"])
            new_blocks.append("\n".join(lines))

    final_content = "\n\n".join(new_blocks) + "\n"
    with open(target_file, "w", encoding="utf-8") as f:
        f.write(final_content)

    return {"status": "success", "message": "Subtitle synced successfully"}

# ─── AI Explain endpoint ────────────────────────────────────────────────────

class ExplainRequest(BaseModel):
    sentence: str          # Câu thoại tiếng Anh
    vietnamese: str = ""  # Bản dịch tiếng Việt (tùy chọn, làm context)
    word: str = ""         # Từ/cụm đang focus (tùy chọn)

@app.post("/api/explain")
async def explain_sentence(req: ExplainRequest):
    """Dùng Gemini để giải thích ngữ pháp, idiom, slang của câu thoại (có Caching)."""
    # 1. Kiểm tra cache SQLite trước
    cached_data = db.get_ai_cached_explanation(req.sentence)
    if cached_data:
        return {"status": "ok", "data": cached_data, "cached": True}

    # 2. Nếu chưa cache, gọi API Gemini
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY chưa được cấu hình")

    try:
        from google import genai
        client = genai.Client(api_key=api_key)

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


# ─── Vocabulary DB API endpoints ──────────────────────────────────────────

class VocabRequest(BaseModel):
    word: str
    ipa: str = ""
    translation: str

@app.get("/api/vocabulary")
def get_vocabulary():
    """Lấy danh sách từ vựng từ SQLite database"""
    return {"status": "ok", "data": db.get_all_vocab()}

@app.post("/api/vocabulary")
def save_vocabulary(req: VocabRequest):
    """Lưu từ vựng mới vào SQLite database"""
    success = db.add_vocab(req.word, req.ipa, req.translation)
    if not success:
        raise HTTPException(status_code=500, detail="Không thể lưu từ vựng vào SQLite")
    return {"status": "ok", "message": "Từ vựng được lưu thành công"}

@app.delete("/api/vocabulary/{word}")
def remove_vocabulary(word: str):
    """Xóa từ vựng khỏi SQLite database"""
    success = db.delete_vocab(word)
    if not success:
        raise HTTPException(status_code=500, detail="Không thể xóa từ vựng")
    return {"status": "ok", "message": "Từ vựng đã được xóa"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
