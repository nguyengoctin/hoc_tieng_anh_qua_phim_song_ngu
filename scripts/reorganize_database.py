import os
import shutil

def reorganize():
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    videos_src = os.path.join(project_root, "data", "videos")
    videos_dest = os.path.join(project_root, "data", "videos", "friends", "season_01")
    
    subs_src = os.path.join(project_root, "data", "subtitles", "bilingual", "VTT")
    subs_dest = os.path.join(project_root, "data", "subtitles", "bilingual", "VTT", "friends", "season_01")
    
    os.makedirs(videos_dest, exist_ok=True)
    os.makedirs(subs_dest, exist_ok=True)
    
    # Reorganize videos
    if os.path.exists(videos_src):
        for item in os.listdir(videos_src):
            src_path = os.path.join(videos_src, item)
            if os.path.isfile(src_path) and item.endswith(".mp4") and "S01" in item:
                dest_path = os.path.join(videos_dest, item)
                print(f"Moving video: {item} -> friends/season_01/")
                shutil.move(src_path, dest_path)
                
    # Reorganize subtitles
    if os.path.exists(subs_src):
        for item in os.listdir(subs_src):
            src_path = os.path.join(subs_src, item)
            if os.path.isfile(src_path) and item.endswith(".vtt") and "S01" in item:
                dest_path = os.path.join(subs_dest, item)
                print(f"Moving subtitle: {item} -> friends/season_01/")
                shutil.move(src_path, dest_path)

if __name__ == "__main__":
    reorganize()
