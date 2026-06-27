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



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
