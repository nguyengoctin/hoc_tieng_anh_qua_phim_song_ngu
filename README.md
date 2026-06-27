# Dự Án Học Tiếng Anh Qua Phim Friends (Friends English Center)

Chào mừng bạn đến với dự án **Học Tiếng Anh Qua Phim Friends**. Đây là một ứng dụng web giúp người dùng vừa xem phim Friends vừa học tiếng Anh thông qua hệ thống phụ đề song ngữ tương tác, tra từ điển nhanh và lưu trữ từ vựng.

---

## 📂 Cấu Trúc Dự Án (Project Structure)

Dự án được chia thành hai phần chính: **Backend (FastAPI)** và **Frontend (React/Vite)** cùng với các tài nguyên phim và phụ đề đi kèm.

```text
hoc_tieng_anh_qua_friends/
├── backend/                  # FastAPI Backend code
│   └── app/
│       └── main.py           # File chạy chính của server API
├── frontend/                 # React + Vite Frontend code
│   ├── src/                  # Mã nguồn ứng dụng giao diện
│   └── package.json
├── data/                     # Thư mục chứa tài nguyên phim & phụ đề
│   ├── videos/
│   │   └── friends/
│   │       ├── season_01/    # Chứa video Season 1 (.mp4)
│   │       └── season_02/    # Chứa video Season 2 (.mp4)
│   └── subtitles/
│       └── bilingual/
│           └── VTT/
│               └── friends/
│                   ├── season_01/ # Phụ đề song ngữ Season 1 (.vtt)
│                   └── season_02/ # Phụ đề song ngữ Season 2 (.vtt)
├── scripts/                  # Các script tự động hóa tiện ích
│   ├── download_season.py    # Script duy nhất tải phim và phụ đề
│   └── clean_subtitles.py    # Dọn dẹp & chuẩn hóa định dạng phụ đề
├── run_project.sh            # Script khởi chạy nhanh toàn bộ dự án
└── README.md                 # Hướng dẫn này
```

---

## 🛠️ Cài Đặt Ban Đầu (Setup & Installation)

Yêu cầu hệ thống: Máy tính chạy Linux/macOS, đã cài đặt **Python 3** và **Node.js**.

### 1. Cài đặt Python Virtual Environment (Backend)
```bash
# Tạo môi trường ảo venv
python3 -m venv venv

# Kích hoạt môi trường ảo
source venv/bin/activate

# Cài đặt các thư viện cần thiết
pip install fastapi uvicorn deep-translator
```

### 2. Cài đặt các dependencies cho Frontend
```bash
cd frontend
npm install
cd ..
```

---

## 🚀 Khởi Chạy Ứng Dụng (Running the App)

Chỉ cần chạy một script duy nhất ở thư mục gốc để khởi động đồng thời cả Backend và Frontend:

```bash
# Cấp quyền thực thi nếu chạy lần đầu
chmod +x run_project.sh

# Chạy dự án
./run_project.sh
```

Sau khi chạy thành công:
* **Giao diện người dùng (Frontend)**: [http://localhost:5173](http://localhost:5173)
* **Backend API**: [http://localhost:8000](http://localhost:8000)
* Nhấn `Ctrl + C` tại cửa sổ Terminal để dừng cả hai server một cách an toàn.

---

## 📥 Hướng Dẫn Tải Phim Và Phụ Đề Song Ngữ Tự Động (Movie Downloader Guide)

Chúng ta có một script duy nhất chịu trách nhiệm cào (scrape) dữ liệu từ nguồn học tiếng Anh Toomva, tự động ghép phụ đề Anh-Việt và tải video chất lượng cao về máy.

### Cách sử dụng script `download_season.py`

Kích hoạt môi trường ảo trước khi chạy:
```bash
source venv/bin/activate
```

Chạy script với các tùy chọn tương ứng:

#### 1. Tải và tiếp tục tải cho Season 2 (Mặc định)
Nếu quá trình tải bị gián đoạn, script sẽ tự động bỏ qua các tập đã tải xong và chỉ tải tiếp các tập còn thiếu.
```bash
python3 scripts/download_season.py -s 2
```

#### 2. Tải toàn bộ phim của Season 1
```bash
python3 scripts/download_season.py -s 1
```

#### 3. Tải tất cả các Season sẵn có (1 và 2)
```bash
python3 scripts/download_season.py -s all
```

#### 4. Tải một mùa phim bất kỳ bằng URL Toomva
Bạn có thể tải bất kỳ mùa phim nào khác của bất kỳ bộ phim nào từ Toomva bằng cách tìm URL của tập đầu tiên thuộc mùa đó, chỉ định tên phim và số mùa tương ứng:
```bash
python3 scripts/download_season.py -w <tên_phim> -s <số_mùa> -u "<url_tập_đầu_tiên>"
```

**Ví dụ tải Friends Season 3:**
```bash
python3 scripts/download_season.py -w friends -s 3 -u "https://toomva.com/video/friends-season-3-1-the-one-with-the-princess-leia-fantasy=593"
```

**Ví dụ tải Silicon Valley Season 1:**
```bash
python3 scripts/download_season.py -w silicon_valley -s 1 -u "https://toomva.com/video/silicon-valley-season-1=16740"
```

### Nguyên lý hoạt động của script:
1. **Lấy HTML**: Truy cập trang web tập phim trên Toomva để trích xuất liên kết video `.mp4` và hai file phụ đề gốc (Tiếng Anh & Tiếng Việt).
2. **Gộp phụ đề song ngữ**:
   - Tải file phụ đề tiếng Anh và tiếng Việt `.vtt` thô về bộ nhớ tạm.
   - Ghép cặp từng câu nói tiếng Anh với câu dịch tiếng Việt có mốc thời gian (timestamp) trùng khớp nhất.
   - Ghi file phụ đề song ngữ hoàn chỉnh trực tiếp vào thư mục dữ liệu tương ứng.
3. **Tải video**: Tải file video `.mp4` trực tiếp từ máy chủ đám mây của Toomva về thư mục video tương ứng của Season đó.

---

## 🧼 Dọn Dẹp Và Làm Sạch Phụ Đề (Subtitle Cleaner)

Để loại bỏ các quảng cáo chèn trong phụ đề hoặc loại bỏ các thẻ HTML lỗi định dạng làm xấu giao diện xem phim, bạn có thể chạy script dọn dẹp phụ đề:

```bash
python3 scripts/clean_subtitles.py
```
Script này sẽ quét qua toàn bộ thư mục phụ đề `.vtt`, định dạng lại và đánh số thứ tự phân đoạn từ 1 đến hết một cách chuẩn hóa.
