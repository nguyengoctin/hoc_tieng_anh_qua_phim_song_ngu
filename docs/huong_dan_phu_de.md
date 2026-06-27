# Hướng dẫn Rà soát và Làm sạch Phụ đề (Subtitle Guidelines)

Tài liệu này hướng dẫn cách làm sạch các file phụ đề hiện tại và cách sử dụng AI để tự động rà soát, điều chỉnh phụ đề cho các tập phim mới.

## 1. Công cụ làm sạch tự động (Python Script)
Chúng ta có script `clean_subtitles.py` nằm tại thư mục [scripts/clean_subtitles.py](file:///home/ngoctin/hoc_tieng_anh_qua_friends/scripts/clean_subtitles.py). 

Script này tự động thực hiện:
- Loại bỏ các thẻ HTML lỗi/thừa như `<font color="...">` và `</font>`.
- Loại bỏ các đoạn văn bản quảng cáo của bên thứ ba (như quảng cáo của toomva).
- Đánh lại số thứ tự phân đoạn phụ đề tuần tự từ 1 đến hết.

Để chạy script này dọn dẹp toàn bộ các file VTT trong thư mục [bilingual/VTT](file:///home/ngoctin/hoc_tieng_anh_qua_friends/data/subtitles/bilingual/VTT/), sử dụng lệnh:
```bash
python3 scripts/clean_subtitles.py
```

---

## 2. Prompt mẫu dùng cho AI khi thêm tập mới
Khi bạn tải hoặc tạo phụ đề cho tập phim mới, hãy sử dụng prompt dưới đây để yêu cầu AI rà soát và tối ưu hóa bản dịch:

```markdown
Bạn là một chuyên gia hiệu đính phụ đề song ngữ Anh - Việt. Nhiệm vụ của bạn là rà soát, làm sạch và cải thiện chất lượng bản dịch của file phụ đề song ngữ (.vtt hoặc .srt) sau đây.

### QUY TẮC RÀ SOÁT & LÀM SẠCH:

1. **Loại bỏ rác định dạng:**
   - Xóa bỏ toàn bộ các thẻ HTML thừa như `<font color="...">`, `</font>`, `<b>`, `<i>`, v.v. Chỉ giữ lại văn bản thuần túy.
   - Xóa bỏ các dòng quảng cáo trang web (ví dụ: "toomva.com...", "Học tiếng Anh qua...", v.v.).

2. **Kiểm tra và chuẩn hóa bản dịch (Anh - Việt):**
   - Đảm bảo nghĩa tiếng Việt sát với ngữ cảnh giao tiếp thực tế của phim hài Mỹ (Friends), văn phong tự nhiên, gần gũi.
   - Sửa các lỗi dịch máy ngô nghê (Ví dụ: "clean, candles are lit" dịch thành "dọn dẹp xong, nến đã thắp" chứ không dịch sai từ "clean" thành "cửa sổ").
   - Giữ nguyên các đại từ xưng hô phù hợp với mối quan hệ các nhân vật (tớ - cậu, anh - em, cậu ấy, cô ấy...).

3. **Giữ nguyên cấu trúc File phụ đề:**
   - Đảm bảo cấu trúc định dạng chuẩn WebVTT hoặc SRT:
     [Số thứ tự]
     [Thời gian bắt đầu] --> [Thời gian kết thúc]
     [Dòng tiếng Anh]
     [Dòng tiếng Việt]
   - Không được gộp các phân cảnh lại với nhau, không làm thay đổi các mốc thời gian (timestamps).

Hãy xử lý file phụ đề dưới đây và trả về nội dung file hoàn chỉnh sau khi đã được làm sạch và chuẩn hóa:

[DÁN NỘI DUNG FILE PHỤ ĐỀ CỦA BẠN VÀO ĐÂY]
```
