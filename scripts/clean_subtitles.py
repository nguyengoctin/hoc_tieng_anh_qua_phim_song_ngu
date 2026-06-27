import os
import re

def clean_vtt_file(filepath):
    print(f"Cleaning {os.path.basename(filepath)}...")
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Remove font tags like <font color="#ffff000"> and </font>
    cleaned = re.sub(r'</?font[^>]*>', '', content)
    
    # 2. Split content into blocks by double newlines
    # Normalize line endings first
    cleaned = cleaned.replace("\r\n", "\n").replace("\r", "\n")
    blocks = cleaned.split("\n\n")
    
    new_blocks = []
    block_counter = 1
    
    for block in blocks:
        lines = [line.strip() for line in block.split("\n")]
        # Filter out empty lines
        lines = [line for line in lines if line]
        
        if not lines:
            continue
            
        # If it's the header block WEBVTT
        if len(lines) == 1 and lines[0] == "WEBVTT":
            new_blocks.append("WEBVTT")
            continue
            
        # Check if the block is a subtitle entry
        # Typically:
        # [Optional number]
        # Timestamp line (contains -->)
        # Subtitle lines...
        
        timestamp_idx = -1
        for idx, line in enumerate(lines):
            if "-->" in line:
                timestamp_idx = idx
                break
                
        if timestamp_idx == -1:
            # Not a standard subtitle entry, could be metadata or header
            # Keep it as is but joined
            new_blocks.append("\n".join(lines))
            continue
            
        timestamp_line = lines[timestamp_idx]
        text_lines = lines[timestamp_idx+1:]
        
        # Check if this block contains advertisement
        is_advertisement = False
        cleaned_text_lines = []
        for line in text_lines:
            if "toomva.com" in line.lower() or "học tiếng anh online qua video" in line.lower():
                is_advertisement = True
                break
            cleaned_text_lines.append(line)
            
        if is_advertisement:
            continue
            
        if not cleaned_text_lines:
            continue
            
        # Reconstruct block with clean sequential numbering
        new_block = f"{block_counter}\n{timestamp_line}\n" + "\n".join(cleaned_text_lines)
        new_blocks.append(new_block)
        block_counter += 1
        
    final_content = "\n\n".join(new_blocks) + "\n"
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(final_content)

import sys

def main():
    vtt_dir = "/home/ngoctin/hoc_tieng_anh_qua_friends/data/subtitles/bilingual/VTT"
    if len(sys.argv) > 1:
        vtt_dir = sys.argv[1]
        
    for root, dirs, files in os.walk(vtt_dir):
        for filename in sorted(files):
            if filename.endswith(".vtt"):
                clean_vtt_file(os.path.join(root, filename))
            
if __name__ == "__main__":
    main()
