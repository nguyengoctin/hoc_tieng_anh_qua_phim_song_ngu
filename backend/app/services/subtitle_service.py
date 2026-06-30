import os

def format_vtt_time(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    ms = int(round((seconds - int(seconds)) * 1000))
    if ms >= 1000:
        secs += 1
        ms -= 1000
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{ms:03d}"

def parse_vtt_seconds(t_str):
    parts = t_str.strip().replace(",", ".").split(":")
    seconds_parts = parts[2].split(".")
    h = int(parts[0])
    m = int(parts[1])
    s = int(seconds_parts[0])
    ms_val = int(seconds_parts[1]) if len(seconds_parts) > 1 else 0
    return h * 3600 + m * 60 + s + ms_val / 1000

def parse_vtt_content(content: str):
    blocks = content.replace("\ufeff", "").replace("\r\n", "\n").split("\n\n")
    header = blocks[0]
    
    parsed_blocks = []
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
        
        start = parse_vtt_seconds(start_str)
        end = parse_vtt_seconds(end_str)
        
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
    return header, parsed_blocks
