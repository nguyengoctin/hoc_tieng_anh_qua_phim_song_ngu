import os
from fastapi import APIRouter, HTTPException
from models.schemas import SubtitleUpdateSchema
from config import SUBTITLES_DIR
from services.subtitle_service import parse_vtt_content, format_vtt_time

router = APIRouter(prefix="/api/subtitles", tags=["subtitles"])

@router.post("/update-segment")
def update_subtitle_segment(payload: SubtitleUpdateSchema):
    # Find the VTT file path inside SUBTITLES_DIR
    target_file = None
    for root, _, files in os.walk(SUBTITLES_DIR):
        for file in files:
            if os.path.splitext(file)[0].lower() == payload.episode_id.lower() and file.endswith(".vtt"):
                target_file = os.path.join(root, file)
                break
        if target_file:
            break
            
    if not target_file or not os.path.exists(target_file):
        raise HTTPException(status_code=404, detail="Subtitle file not found")

    # Read and parse VTT using the service
    with open(target_file, "r", encoding="utf-8") as f:
        content = f.read()

    header, parsed_blocks = parse_vtt_content(content)

    # Find the target segment by index (1-based index)
    target_sub = None
    sub_indices = []
    for idx, block in enumerate(parsed_blocks):
        if block["type"] == "subtitle":
            sub_indices.append(idx)
            if block["index"] == payload.segment_index:
                target_sub = block

    if not target_sub:
        raise HTTPException(status_code=404, detail="Segment index not found in subtitle")

    # Target position in sub_indices
    target_pos = sub_indices.index(parsed_blocks.index(target_sub))

    # Apply changes
    old_start = target_sub["start"]
    target_sub["start"] = payload.new_start
    target_sub["end"] = payload.new_end

    # Cập nhật nội dung English & Vietnamese
    lines_after = []
    if payload.new_english is not None:
        lines_after.append(payload.new_english)
    if payload.new_vietnamese is not None:
        lines_after.append(payload.new_vietnamese)
    target_sub["lines_after"] = lines_after

    # 1. Maintain adjacent segment rules dynamically
    if target_pos > 0:
        prev_sub = parsed_blocks[sub_indices[target_pos - 1]]
        prev_gap = old_start - prev_sub["end"]
        if prev_gap < 0.15:
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
