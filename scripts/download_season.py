import os
import re
import time
import argparse
import urllib.request
import urllib.error

# Hardcoded data for Friends as a fallback
FRIENDS_SEASONS = {
    1: [
        "https://toomva.com/video/phim-friends-hoc-tieng-anh=872",
        "https://toomva.com/video/friends-season-1-2-the-one-where-monica-gets-a-roommate=72",
        "https://toomva.com/video/friends-season-1-3-the-one-with-the-thumb=73",
        "https://toomva.com/video/friends-season-1-4-the-one-with-george-stephanopoulos=289",
        "https://toomva.com/video/friends-season-1-5-the-one-with-the-east-german-laundry-detergent=283",
        "https://toomva.com/video/friends-season-1-6-the-one-with-the-butt=284",
        "https://toomva.com/video/friends-season-1-7-the-one-with-the-blackout=285",
        "https://toomva.com/video/friends-season-1-8-the-one-where-nana-dies-twice=286",
        "https://toomva.com/video/friends-season-1-9-the-one-where-underdog-gets-away=287",
        "https://toomva.com/video/friends-season-1-10-the-one-with-the-monkey=288",
        "https://toomva.com/video/friends-season-1-11-the-one-with-mrs-bing=293",
        "https://toomva.com/video/friends-season-1-12-the-one-with-the-dozen-lasagnas=294",
        "https://toomva.com/video/friends-season-1-13-the-one-with-the-boobies=295",
        "https://toomva.com/video/friends-season-1-14-the-one-with-the-candy-hearts=296",
        "https://toomva.com/video/friends-season-1-15-the-one-with-the-stoned-guy=297",
        "https://toomva.com/video/friends-season-1-16-the-one-with-two-parts=298",
        "https://toomva.com/video/friends-season1-17-the-one-with-two-parts-part-2=299",
        "https://toomva.com/video/friends-season-1-18-the-one-with-all-the-poker=300",
        "https://toomva.com/video/friends-season-1-19-the-one-where-the-monkey-gets-away=301",
        "https://toomva.com/video/friends-season-1-20-the-one-with-the-evil-orthodontist=302",
        "https://toomva.com/video/friends-season-1-21-the-one-with-the-fake-monica=303",
        "https://toomva.com/video/friends-season-1-22-the-one-with-the-ick-factor=308",
        "https://toomva.com/video/friends-season-1-23-the-one-with-the-birth=309",
        "https://toomva.com/video/friends-season1-24-the-one-where-rachel-finds-out=311"
    ],
    2: [
        "https://toomva.com/video/friends-season2-1-the-one-with-ross-s-new-girlfriend=313",
        "https://toomva.com/video/friends-season2-2-the-one-with-the-breast-milk=314",
        "https://toomva.com/video/friends-season-2-3-the-one-where-heckles-dies=361",
        "https://toomva.com/video/friends-season-2-4-the-one-with-phoebe-s-husband=317",
        "https://toomva.com/video/friends-season-2-5-the-one-with-five-steaks-and-an-eggplant=318",
        "https://toomva.com/video/friends-season-2-6-the-one-with-the-baby-on-the-bus=505",
        "https://toomva.com/video/friends-season-2-7-the-one-where-ross-finds-out=506",
        "https://toomva.com/video/friends-season-2-8-the-one-with-the-list=507",
        "https://toomva.com/video/friends-season-2-9-the-one-with-phoebe-s-dad=508",
        "https://toomva.com/video/friends-season-2-10-the-one-with-russ=509",
        "https://toomva.com/video/friends-season-2-11-the-one-with-the-lesbian-wedding=511",
        "https://toomva.com/video/friends-season-2-12-the-one-after-the-super-bowl=512",
        "https://toomva.com/video/friends-season-2-13-the-one-after-the-super-bowl-part-2=513",
        "https://toomva.com/video/friends-season-2-14-the-one-with-the-prom-video=514",
        "https://toomva.com/video/friends-season-2-15-the-one-where-ross-and-rachel-you-know=515",
        "https://toomva.com/video/friends-season-2-16-the-one-where-joey-moves-out=516",
        "https://toomva.com/video/friends-season-2-17-the-one-where-eddie-moves-in=517",
        "https://toomva.com/video/friends-season-2-18-the-one-where-dr-ramoray-dies=518",
        "https://toomva.com/video/friends-season-2-19-the-one-where-eddie-won-t-go=519",
        "https://toomva.com/video/friends-season-2-20-the-one-where-old-yeller-dies=520",
        "https://toomva.com/video/friends-season-2-21-the-one-with-the-bullies=521",
        "https://toomva.com/video/friends-season-2-22-the-one-with-the-two-parties=522",
        "https://toomva.com/video/friends-season-2-23-the-one-with-the-chicken-pox=523",
        "https://toomva.com/video/friends-season-2-24-the-one-with-barry-and-mindy-s-wedding=524"
    ]
}

SHOW_SEASON_START_URLS = {
    "friends": {
        3: "https://toomva.com/video/friends-season-3-1-the-one-with-the-princess-leia-fantasy=593",
        4: "https://toomva.com/video/friends-season-4-1-the-one-with-the-jellyfish=618",
        5: "https://toomva.com/video/friends-season-5-1-the-one-after-ross-says-rachel-=642",
        6: "https://toomva.com/video/friends-season-6-1-the-one-after-vegas=666",
        7: "https://toomva.com/video/friends-season-7-1-the-one-with-monica-s-thunder=692",
        8: "https://toomva.com/video/friends-season-8-1-the-one-after-i-do=713",
        9: "https://toomva.com/video/friends-season-9-1-the-one-after-joey-and-rachel-kiss=746",
        10: "https://toomva.com/video/friends-season-10-1-the-one-after-joey-and-rachel-kiss=786"
    },
    "silicon_valley": {
        1: "https://toomva.com/video/silicon-valley-season-1=16740",
        2: "https://toomva.com/video/silicon-valley-season-2=16748",
        3: "https://toomva.com/video/silicon-valley-season-3=16762",
        4: "https://toomva.com/video/silicon-valley-season-4=16773",
        5: "https://toomva.com/video/silicon-valley-season-5-=16783"
    },
    "the_office": {
        1: "https://toomva.com/video/the-office-season-1-chuyen-van-phong-phan-1=5174",
        2: "https://toomva.com/video/the-office-season-2-chuyen-van-phong-phan-2=16120",
        3: "https://toomva.com/video/the-office-season-3-chuyen-van-phong-phan-3=15985",
        4: "https://toomva.com/video/the-office-season-4-chuyen-van-phong-phan-4=16026",
        5: "https://toomva.com/video/the-office-season-5-chuyen-van-phong-phan-5=19178",
        6: "https://toomva.com/video/the-office-season-6-chuyen-van-phong-phan-6=19205",
        7: "https://toomva.com/video/the-office-season-7-chuyen-van-phong-phan-7=19229",
        8: "https://toomva.com/video/the-office-season-8-chuyen-van-phong-phan-8=19297",
        9: "https://toomva.com/video/the-office-season-9-chuyen-van-phong-phan-9=19321"
    }
}


def fetch_html(url):
    """Fetches the page HTML."""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            return response.read().decode('utf-8')
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def extract_episode_urls(html):
    """Dynamically extracts all episode URLs from a Toomva page's episode list."""
    if not html:
        return []
    # Search for all episode links (represented as buttons in the list)
    links = re.findall(r'href="([^"]+)"[^>]*class="[^"]*btn-episode[^"]*"', html)
    if not links:
        links = re.findall(r'class="[^"]*btn-episode[^"]*"[^>]*href="([^"]+)"', html)
    
    # Ensure they are absolute URLs
    absolute_links = []
    for link in links:
        if link.startswith("/"):
            absolute_links.append("https://toomva.com" + link)
        else:
            absolute_links.append(link)
    
    # Return unique and sorted by order
    seen = set()
    result = []
    for l in absolute_links:
        if l not in seen:
            seen.add(l)
            result.append(l)
    return result

def get_video_url(html):
    """Finds first mp4 or m3u8 URL in the HTML page source."""
    if not html:
        return None
    urls = re.findall(r'https?://[^\s\'"]+?\.(?:mp4|m3u8)', html)
    for url in urls:
        if 'toomva' in url or '/friends/' in url or '/siliconvalley/' in url or 'The-Office' in url:
            return url
    return None

def download_video(video_url, output_path):
    """Downloads a video file (supporting mp4 direct download and m3u8 HLS streams via ffmpeg)."""
    if '.m3u8' in video_url:
        print(f"Downloading HLS stream using ffmpeg: {video_url}")
        import subprocess
        # Set socket read/write timeout to 15 seconds (15,000,000 microseconds)
        cmd = [
            'ffmpeg', '-y', 
            '-rw_timeout', '15000000', 
            '-i', video_url, 
            '-c', 'copy', 
            '-bsf:a', 'aac_adtstoasc', 
            output_path
        ]
        
        for attempt in range(1, 4):
            try:
                if attempt > 1:
                    print(f"Retrying HLS stream download... (Attempt {attempt}/3)")
                subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
                if os.path.exists(output_path) and os.path.getsize(output_path) > 1000000:
                    return True
            except Exception as e:
                print(f"\nAttempt {attempt} failed: {e}")
                if os.path.exists(output_path):
                    os.remove(output_path)
                if attempt < 3:
                    import time
                    time.sleep(5)
        return False

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    req = urllib.request.Request(video_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            total_size = int(response.info().get('Content-Length', 0))
            block_size = 1024 * 1024  # 1MB blocks
            downloaded = 0
            
            with open(output_path, 'wb') as f:
                while True:
                    buffer = response.read(block_size)
                    if not buffer:
                        break
                    f.write(buffer)
                    downloaded += len(buffer)
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        print(f"\rDownloading: {percent:.2f}% ({downloaded // (1024*1024)}MB / {total_size // (1024*1024)}MB)", end='', flush=True)
                print()
            return True
    except Exception as e:
        print(f"\nError downloading video from {video_url}: {e}")
        if os.path.exists(output_path):
            os.remove(output_path)
    return False

def download_sub(vtt_url):
    """Downloads subtitle file and decodes it."""
    full_url = "https://toomva.com" + vtt_url if vtt_url.startswith("/") else vtt_url
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    req = urllib.request.Request(full_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            raw_data = response.read()
            for encoding in ['utf-8', 'utf-16', 'latin-1']:
                try:
                    return raw_data.decode(encoding)
                except UnicodeDecodeError:
                    continue
            raise UnicodeDecodeError("Could not decode subtitle data")
    except Exception as e:
        print(f"Error downloading subtitle {full_url}: {e}")
        return None

def parse_vtt(vtt_text):
    """Parses subtitle VTT block into structured dictionaries."""
    vtt_text = vtt_text.replace("\ufeff", "").replace("\r\n", "\n").replace("\r", "\n")
    blocks = vtt_text.split("\n\n")
    parsed = []
    for block in blocks:
        lines = [l.strip() for l in block.split("\n") if l.strip()]
        if not lines:
            continue
        
        time_line_idx = -1
        for idx, line in enumerate(lines):
            if "-->" in line:
                time_line_idx = idx
                break
                
        if time_line_idx != -1:
            time_line = lines[time_line_idx]
            start_str, end_str = time_line.split("-->")
            text_content = " ".join(lines[time_line_idx + 1:])
            
            # Clean styling tags
            text_content = re.sub(r'</?font[^>]*>', '', text_content)
            
            # Skip advertisement subtitles
            if "toomva.com" in text_content.lower() or "học tiếng anh online qua video" in text_content.lower():
                continue
                
            parsed.append({
                "start": start_str.strip(),
                "end": end_str.strip(),
                "text": text_content.strip()
            })
    return parsed

def merge_vtt_subs(en_subs, vi_subs):
    """Merges English and Vietnamese subtitles based on closest timestamp matches."""
    merged = []
    
    def to_ms(t_str):
        try:
            t_str = t_str.replace(",", ".")
            parts = t_str.split(":")
            sec_parts = parts[2].split(".")
            h = int(parts[0])
            m = int(parts[1])
            s = int(sec_parts[0])
            ms = int(sec_parts[1])
            return (h * 3600 + m * 60 + s) * 1000 + ms
        except Exception as e:
            return 0

    for idx, en in enumerate(en_subs):
        en_start = to_ms(en["start"])
        en_end = to_ms(en["end"])
        
        best_vi = ""
        best_overlap = 0
        
        for vi in vi_subs:
            vi_start = to_ms(vi["start"])
            vi_end = to_ms(vi["end"])
            
            overlap_start = max(en_start, vi_start)
            overlap_end = min(en_end, vi_end)
            if overlap_start < overlap_end:
                overlap = overlap_end - overlap_start
                if overlap > best_overlap:
                    best_overlap = overlap
                    best_vi = vi["text"]
            else:
                if best_overlap == 0 and abs(en_start - vi_start) < 1000:
                    best_vi = vi["text"]
                    
        vi_text = best_vi.strip()
        merged_text = en["text"]
        if vi_text:
            merged_text += "\n" + vi_text
            
        merged.append(f"{idx + 1}\n{en['start']} --> {en['end']}\n{merged_text}")
        
    return "WEBVTT\n\n" + "\n\n".join(merged) + "\n"

def process_episode(idx, url, dest_video_dir, dest_vtt_dir, season, show_prefix):
    video_filename = f"{show_prefix}_S{season:02d}E{idx:02d}.mp4"
    sub_filename = f"{show_prefix}_S{season:02d}E{idx:02d}.vtt"
    
    video_path = os.path.join(dest_video_dir, video_filename)
    sub_path = os.path.join(dest_vtt_dir, sub_filename)
    
    print(f"\n[{idx}] Processing Episode: {url}")
    
    html = None
    
    # 1. Download and merge Subtitles if not exists
    if not os.path.exists(sub_path):
        if not html:
            html = fetch_html(url)
        if html:
            enpath_match = re.search(r"enpath\s*=\s*'([^']+)'", html)
            vipath_match = re.search(r"vipath\s*=\s*'([^']+)'", html)
            
            if enpath_match and vipath_match:
                en_url = enpath_match.group(1)
                vi_url = vipath_match.group(1)
                
                print("Downloading subtitles...")
                en_vtt = download_sub(en_url)
                vi_vtt = download_sub(vi_url)
                
                if en_vtt and vi_vtt:
                    en_parsed = parse_vtt(en_vtt)
                    vi_parsed = parse_vtt(vi_vtt)
                    
                    merged_vtt = merge_vtt_subs(en_parsed, vi_parsed)
                    with open(sub_path, "w", encoding="utf-8") as f:
                        f.write(merged_vtt)
                    print(f"Bilingual subtitle saved to {sub_filename}")
                else:
                    print("Failed to download or merge subtitles.")
            else:
                print("Could not find subtitle paths in page HTML.")
        else:
            print("Failed to fetch HTML for Episode subtitle extraction.")
    else:
        print(f"Subtitle {sub_filename} already exists. Skipping.")

    # 2. Download Video if not exists
    if not os.path.exists(video_path):
        if not html:
            html = fetch_html(url)
        if html:
            video_url = get_video_url(html)
            if video_url:
                print(f"Found video link: {video_url}")
                print(f"Downloading video to {video_filename}...")
                success = download_video(video_url, video_path)
                if success:
                    print(f"Successfully downloaded {video_filename}")
                else:
                    print(f"Failed to download video {video_filename}")
            else:
                print(f"Could not find video URL for Episode {idx}")
        else:
            print("Failed to fetch HTML for Episode video extraction.")
    else:
        print(f"Video {video_filename} already exists. Skipping.")
        
    time.sleep(1)

def main():
    parser = argparse.ArgumentParser(description="Unified Show & Season Downloader")
    parser.add_argument("-w", "--show", type=str, default="friends", help="Show directory name (default: 'friends')")
    parser.add_argument("-s", "--season", type=str, default="2", help="Season number (default: '2')")
    parser.add_argument("-u", "--url", type=str, default=None, help="Optional URL to automatically scrape episode links from")
    parser.add_argument("-p", "--prefix", type=str, default=None, help="Filename prefix (e.g. 'Friends' or 'SiliconValley')")
    args = parser.parse_args()
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    show_name = args.show.strip().lower().replace(" ", "_")
    show_prefix = args.prefix if args.prefix else show_name.replace("_", " ").title().replace(" ", "")
    
    # Resolve episode URLs
    episodes = []
    
    # Auto-resolve start URL if not provided
    if not args.url:
        try:
            s_num = int(args.season)
            if show_name in SHOW_SEASON_START_URLS and s_num in SHOW_SEASON_START_URLS[show_name]:
                args.url = SHOW_SEASON_START_URLS[show_name][s_num]
        except ValueError:
            pass

    if args.url:
        print(f"Scraping episode URLs from: {args.url}")
        html = fetch_html(args.url)
        if html:
            episodes = extract_episode_urls(html)
            print(f"Dynamically discovered {len(episodes)} episodes.")
        else:
            print("Failed to fetch the main URL for episode scraping.")
            return
    else:
        # Fallback to hardcoded friends data
        if show_name == "friends":
            try:
                s_num = int(args.season)
                episodes = FRIENDS_SEASONS.get(s_num, [])
            except ValueError:
                if args.season == "all":
                    # Download both S1 and S2
                    for s in [1, 2]:
                        dest_video_dir = os.path.join(project_root, "data", "videos", show_name, f"season_{s:02d}")
                        dest_vtt_dir = os.path.join(project_root, "data", "subtitles", "bilingual", "VTT", show_name, f"season_{s:02d}")
                        os.makedirs(dest_video_dir, exist_ok=True)
                        os.makedirs(dest_vtt_dir, exist_ok=True)
                        for idx, url in enumerate(FRIENDS_SEASONS[s], start=1):
                            process_episode(idx, url, dest_video_dir, dest_vtt_dir, s, show_prefix)
                    return
        
    if not episodes:
        print("Error: No episode URLs provided or discovered. Please supply a valid Toomva URL using -u/--url flag.")
        return
        
    try:
        season_num = int(args.season)
    except ValueError:
        season_num = 1
        
    dest_video_dir = os.path.join(project_root, "data", "videos", show_name, f"season_{season_num:02d}")
    dest_vtt_dir = os.path.join(project_root, "data", "subtitles", "bilingual", "VTT", show_name, f"season_{season_num:02d}")
    
    os.makedirs(dest_video_dir, exist_ok=True)
    os.makedirs(dest_vtt_dir, exist_ok=True)
    
    print(f"=== Downloading {show_prefix} Season {season_num} ===")
    print(f"Saving videos to: {dest_video_dir}")
    print(f"Saving subtitles to: {dest_vtt_dir}")
    
    for idx, url in enumerate(episodes, start=1):
        process_episode(idx, url, dest_video_dir, dest_vtt_dir, season_num, show_prefix)

if __name__ == "__main__":
    main()
