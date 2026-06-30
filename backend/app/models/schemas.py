from pydantic import BaseModel
from typing import Optional

class ExplainRequest(BaseModel):
    sentence: str          # Câu thoại tiếng Anh
    vietnamese: Optional[str] = ""  # Bản dịch tiếng Việt làm context
    word: Optional[str] = ""         # Từ/cụm từ đang focus

class SubtitleUpdateSchema(BaseModel):
    episode_id: str
    segment_index: int
    new_start: float
    new_end: float
    new_english: Optional[str] = None
    new_vietnamese: Optional[str] = None

class VocabRequest(BaseModel):
    word: str
    ipa: Optional[str] = ""
    translation: str
    part_of_speech: Optional[str] = None
    audio_url: Optional[str] = None
