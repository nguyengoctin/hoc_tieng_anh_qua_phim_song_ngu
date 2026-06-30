import os
import csv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from deep_translator import GoogleTranslator

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

@app.get("/api/translate")
def translate_word(word: str):
    """Translates a word from English to Vietnamese and returns details."""
    cleaned_word = "".join(c for c in word if c.isalnum() or c == "'").strip().lower()
    if not cleaned_word:
        raise HTTPException(status_code=400, detail="Invalid word")
    
    try:
        translator = GoogleTranslator(source='en', target='vi')
        translation = translator.translate(cleaned_word)
        
        # In a full-blown app, we can also include pronunciation and word info
        return {
            "word": cleaned_word,
            "translation": translation,
            "ipa": f"/{cleaned_word}/", # Simplification or we can mock IPA/fetch it
            "part_of_speech": "word"
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
