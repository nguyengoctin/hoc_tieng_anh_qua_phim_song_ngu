import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import VIDEOS_DIR, SUBTITLES_DIR
from app.database import db
from app.routers import episodes, vocabulary, subtitles, explain

# Khởi tạo SQLite database
db.init_db()

app = FastAPI(title="Friends Language Learning Center API")

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve videos and subtitles as static files
if os.path.exists(VIDEOS_DIR):
    app.mount("/videos", StaticFiles(directory=VIDEOS_DIR), name="videos")
if os.path.exists(SUBTITLES_DIR):
    app.mount("/subtitles", StaticFiles(directory=SUBTITLES_DIR), name="subtitles")

# Đăng ký các router chức năng
app.include_router(episodes.router)
app.include_router(vocabulary.router)
app.include_router(subtitles.router)
app.include_router(explain.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
