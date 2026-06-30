import os
from fastapi import APIRouter
from config import VIDEOS_DIR

router = APIRouter(prefix="/api/episodes", tags=["episodes"])

@router.get("")
def get_episodes():
    """Quét thư mục data/videos và trả về cấu trúc phân cấp Phim -> Season -> Episode"""
    structure = {}
    if not os.path.exists(VIDEOS_DIR):
        return structure

    for show_name in os.listdir(VIDEOS_DIR):
        show_path = os.path.join(VIDEOS_DIR, show_name)
        if not os.path.isdir(show_path):
            continue

        show_title = show_name.replace("_", " ").title()
        structure[show_name] = {
            "title": show_title,
            "seasons": {}
        }

        # Quét Seasons
        for season_name in os.listdir(show_path):
            season_path = os.path.join(show_path, season_name)
            if not os.path.isdir(season_path) or not season_name.startswith("season_"):
                continue

            season_num = int(season_name.replace("season_", ""))
            season_title = f"Season {season_num}"
            structure[show_name]["seasons"][season_name] = {
                "title": season_title,
                "episodes": []
            }

            # Quét Episodes (chỉ file mp4)
            for file in os.listdir(season_path):
                if file.endswith(".mp4"):
                    ep_id = os.path.splitext(file)[0]
                    # Format title sạch (bỏ prefix Show, SxxExx)
                    title_clean = ep_id.replace(f"{show_name.replace('_', '')}_", "")
                    title_clean = title_clean.replace(f"s{season_num:02d}e", "Ep ").replace("_", " ")
                    title_clean = " ".join([w.capitalize() for w in title_clean.split()])

                    video_url = f"/videos/{show_name}/{season_name}/{file}"
                    subtitle_url = f"/subtitles/{show_name}/{season_name}/{ep_id}.vtt"

                    structure[show_name]["seasons"][season_name]["episodes"].append({
                        "id": ep_id,
                        "title": title_clean,
                        "video_url": video_url,
                        "subtitle_url": subtitle_url
                    })

    return structure
