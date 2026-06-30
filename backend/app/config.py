import os
from dotenv import load_dotenv

# Tìm file .env ở thư mục gốc của dự án
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_PATH = os.path.join(PROJECT_ROOT, ".env")
load_dotenv(dotenv_path=ENV_PATH)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

VIDEOS_DIR = os.path.join(PROJECT_ROOT, "data", "videos")
SUBTITLES_DIR = os.path.join(PROJECT_ROOT, "data", "subtitles", "bilingual", "VTT")
DICT_DIR = os.path.join(PROJECT_ROOT, "data", "dict")
