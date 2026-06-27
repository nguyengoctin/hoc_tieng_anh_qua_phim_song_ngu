#!/bin/bash

# Thư mục gốc dự án
PROJECT_ROOT=$(pwd)

# Hàm tắt các tiến trình con khi nhấn Ctrl+C
cleanup() {
    echo "Đang dừng các server..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}
trap cleanup SIGINT SIGTERM

echo "============================================="
echo "KHỞI CHẠY DỰ ÁN HỌC TIẾNG ANH QUA FRIENDS"
echo "============================================="

# 1. Chạy Backend (FastAPI)
echo "1. Đang khởi chạy Backend (Port: 8000)..."
cd "$PROJECT_ROOT"
source venv/bin/activate
cd backend/app
python3 main.py &
BACKEND_PID=$!

# 2. Chạy Frontend (Vite)
echo "2. Đang khởi chạy Frontend (Port: 5173)..."
cd "$PROJECT_ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo "============================================="
echo "Dự án đã được khởi chạy thành công!"
echo "- Backend API: http://localhost:8000"
echo "- Frontend URL: http://localhost:5173"
echo "Nhấn [Ctrl+C] để dừng toàn bộ dự án."
echo "============================================="

# Đợi các tiến trình chạy ngầm
wait
