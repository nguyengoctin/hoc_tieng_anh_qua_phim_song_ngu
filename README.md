# 🎓 Friends English Center (Học Tiếng Anh Qua Phim Song Ngữ)

Ứng dụng web tương tác thông minh hỗ trợ học tiếng Anh giao tiếp thông qua phim bộ truyền hình sitcom đình đám *Friends*. Dự án tích hợp các công nghệ xử lý luồng đa phương tiện (Video/Audio streaming), đồng bộ hóa phụ đề thời gian thực (Subtitle Synchronization Engine), phương pháp đục lỗ từ vựng (Cloze Test) và trợ lý giáo viên AI (Gemini 2.5 Flash API).

---

## 🏗️ Kiến Trúc Hệ Thống (System Architecture)

Dự án được xây dựng theo mô hình Client-Server tách biệt, tối ưu cho việc truyền phát đa phương tiện nội bộ (Local Media Center) với hiệu suất cực cao.

```text
                           [ CLIENT SIDE (React + Vite) ]
                                         │
        ┌────────────────────────────────┴────────────────────────────────┐
        ▼ (UI Controls)                                                   ▼ (Static Assets)
  [ UI Components ]                                              [ Media HTML5 Player ]
  ├── Sidebar (Script / Vocab / Saved)                                    │
  ├── AiExplainPanel (Google Dict UI)                                     │
  ├── DictionaryPopover (Instant Translation)                             │
  └── StudyControls (Cloze / Resume Delay)                                │
        │                                                                 │
        └───────────────┬───────────────────────────────┐                 │
                        │ HTTP Requests (JSON)          │ Direct Video Stream  
                        ▼                               ▼                 ▼
             [ BACKEND API (FastAPI) ] ◄────────────────┴────────► [ Media Assets ]
                        │                                          ├── Videos (.mp4)
         ┌──────────────┴──────────────┐                           └── Subtitles (.vtt)
         ▼ Read / Write Cache          ▼ AI Agent Prompt
   [ SQLite Database ]         [ Gemini Model 2.5 Flash ]
   (learning.db)
```

### 1. Kiến trúc mã nguồn Backend (FastAPI)
*   **`backend/app/main.py`**: Điểm khởi chạy API và khai báo các Router. Mount trực tiếp static folder `/videos` và `/subtitles` để truyền luồng media chất lượng cao về client thông qua cơ chế hỗ trợ Range Requests của HTTP/1.1 (tua video cực mượt).
*   **`backend/app/database/db.py`**: Service điều phối database SQLite (`learning.db`). Chịu trách nhiệm khởi tạo bảng và thực hiện các giao thức CRUD cho từ vựng và bộ nhớ đệm AI.

### 2. Kiến trúc mã nguồn Frontend (React)
Frontend được chia nhỏ thành các component độc lập (Modular Components) giúp tăng khả năng bảo trì:
*   **`frontend/src/App.jsx`**: Controller trung tâm quản lý State, điều phối video player và xử lý hệ thống phím tắt bàn phím (Keyboard Shortcuts).
*   **`frontend/src/components/Sidebar.jsx`**: Sidebar chứa danh sách kịch bản (Script), từ vựng đã lưu (Vocab), các câu thoại ghi nhớ (Saved Sentences), và bộ chọn Phim/Season/Tập.
*   **`frontend/src/components/AiExplainPanel.jsx`**: Panel hiển thị phân tích cấu trúc câu, nghĩa lóng (slang), ví dụ thực tế và nút thay thế phụ đề phim của Gemini.
*   **`frontend/src/components/DictionaryPopover.jsx`**: Khung tra từ nhanh tích hợp phát âm IPA và audio khi nhấp chọn hoặc kéo thả bôi đen từ.
*   **`frontend/src/components/StudyControls.jsx`**: Thanh cấu hình chế độ đục lỗ (Blanking) và thời gian ngưng tự nói (Shadowing Delay).

---

## 💡 Mổ Xẻ Các Tính Năng Đặc Biệt & Thuật Toán

### 1. Thuật toán Đồng bộ Phụ đề (Subtitle Sync Adjuster)
Hệ thống cho phép người dùng điều chỉnh độ lệch (offset) thời gian bắt đầu/kết thúc của từng câu thoại trực tiếp khi xem phim để sửa lỗi lệch phụ đề (vốn rất phổ biến ở các file phụ đề trên mạng):
*   Khi người dùng bấm tăng/giảm thời gian (`+0.1s`, `-0.3s`, v.v.), client gửi payload tới API `/api/subtitles/update-segment`.
*   Backend tiến hành phân tích file phụ đề WebVTT gốc bằng Python, điều chỉnh timestamp của dòng phụ đề đích, đồng thời **tự động co dãn thời gian** của câu thoại liền trước và liền sau để tránh tình trạng chồng lấn (Overlapping).
*   File VTT được ghi đè trên ổ đĩa và client tự động re-parse nội dung mới để cập nhật UI tức thời không cần load lại.

### 2. Hệ thống đục lỗ thông minh (Smart Cloze Test)
*   Từ vựng được ẩn (đục lỗ thành dấu gạch dưới `_____`) một cách ngẫu nhiên có trọng số dựa trên độ khó thiết lập (`30%`, `50%`, `70%`, `100%`).
*   **Quy tắc loại trừ thông minh**: Thuật toán tự động nhận diện và bỏ qua không đục lỗ đối với:
    *   Tên nhân vật/danh từ riêng (Nhận diện bằng chữ viết hoa không nằm ở đầu câu).
    *   Các từ cảm thán, đệm giao tiếp vô nghĩa (ví dụ: *oh, hey, um, uh, yeah, wow*).
    *   Các âm thanh diễn hoạt trong ngoặc vuông (ví dụ: *[coughing], [screaming]*).
*   Người dùng có thể nhấn phím `Tab` để lật mở từng từ bị đục lỗ một cách tuần tự.

### 3. Caching kết quả giải thích AI (Gemini Cache)
*   Để giảm tối đa thời gian chờ mạng và tiết kiệm quota gọi API Gemini (vốn giới hạn ở tài khoản miễn phí), ứng dụng sử dụng SQLite để làm Proxy Cache.
*   Mỗi truy vấn giải thích câu thoại được mã hóa và lưu trữ trong bảng `ai_cache` với khóa chính là nội dung câu thoại tiếng Anh thô.
*   Lần nhấn nút **✨ AI** tiếp theo cho cùng một câu thoại sẽ truy vấn SQLite và trả về kết quả ngay lập tức trong vòng `< 5ms`.

---

## 🛠️ Cài Đặt Ban Đầu (Setup & Installation)

Yêu cầu máy cài sẵn: **Python 3** và **Node.js (phiên bản 18 trở lên)**.

### 1. Cài đặt Python Virtual Environment (Backend)
```bash
# Tạo môi trường ảo venv
python3 -m venv venv

# Kích hoạt môi trường ảo
# Trên Linux/macOS:
source venv/bin/activate
# Trên Windows (cmd):
venv\Scripts\activate.bat

# Cài đặt các thư viện phụ thuộc
pip install fastapi uvicorn deep-translator google-genai python-dotenv
```

### 2. Cài đặt các thư viện Frontend
```bash
cd frontend
npm install
cd ..
```

### 3. Thiết lập API Key cho Trợ lý AI
Tạo một file `.env` ở thư mục gốc của dự án (cùng cấp với thư mục `backend/` và `frontend/`) và điền API Key Gemini của bạn:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 🚀 Khởi Chạy Ứng Dụng (Quick Start)

Dự án cung cấp các script tự động hóa khởi động đồng thời cả frontend và backend trên cả hai nền tảng:

### 💻 Trên Windows
Chỉ cần nhấp đúp (Double-click) vào file hoặc chạy qua CMD:
```cmd
run_project.bat
```

### 🍎 Trên Linux / macOS
Cấp quyền và khởi chạy file shell:
```bash
chmod +x run_project.sh
./run_project.sh
```

*   **Giao diện ứng dụng**: [http://localhost:5173](http://localhost:5173)
*   **Backend API**: [http://localhost:8000](http://localhost:8000)

---

## ⌨️ Phím Tắt Tiện Dụng Khi Học (Keyboard Shortcuts)

Để tối ưu hóa phản xạ nghe nói (Shadowing) mà không cần chạm vào chuột:

| Phím Tắt | Chức Năng | Mô tả |
| :--- | :--- | :--- |
| **`Space`** | Play / Pause | Dừng hoặc phát tiếp video. |
| **`S`** / **`R`** | Repeat Sentence | Phát lại từ đầu câu thoại đang hiển thị. |
| **`A`** | Previous Sentence | Nhảy lùi về câu thoại phía trước. |
| **`D`** | Next Sentence | Nhảy tiến đến câu thoại kế tiếp. |
| **`Tab`** | Reveal Cloze | Lật mở nhanh từ bị đục lỗ hiện tại khi video đang dừng. |
| **`←` / `→`** | Seek 10s | Tua lùi / Tua tiến nhanh 10 giây. |
