# Kinh Thánh Mỗi Ngày

Ứng dụng web học Kinh Thánh bằng tiếng Việt — thần học Cải Chánh, giải nghĩa sâu nhiệm mà áp dụng được mỗi ngày.

Static site (HTML/CSS/JS thuần túy, không cần build), deploy trên Vercel.

## Tính năng

- **Đọc Kinh Thánh**: toàn bộ Kinh Thánh 1934 (public domain) — 66 sách, 31.102 câu; chạm vào câu để sao chép/chia sẻ
- **Ghi chú học Kinh Thánh**: bối cảnh, giải nghĩa, áp dụng, cầu nguyện cho các đoạn then chốt
- **Suy ngẫm hằng ngày**: 365 bài suy ngẫm của C. H. Spurgeon (*Sổ Séc Của Đức Tin*)
- **Kế hoạch đọc 1 năm**: đọc trọn Kinh Thánh trong 365 ngày, theo dõi tiến độ
- **Tìm kiếm toàn văn**: không phân biệt dấu tiếng Việt
- PWA (đọc offline), dark mode, mobile-first

## Cấu trúc

```
index.html      Trang chủ — bài suy ngẫm hôm nay, câu Kinh Thánh hôm nay, kế hoạch đọc
doc.html        Đọc Kinh Thánh theo sách/chương (?b=<sách>&c=<chương>)
tim-kiem.html   Tìm kiếm toàn văn
ke-hoach.html   Kế hoạch đọc Kinh Thánh 1 năm
suy-ngam.html   Suy ngẫm hằng ngày
data/books.json     Metadata 66 sách (tên, số đoạn)
data/bible/<id>.json  Văn bản từng sách (tải theo nhu cầu)
data/votd.json        366 câu Kinh Thánh mỗi ngày
data/suyngam.json   365 bài suy ngẫm Spurgeon
data/kehoach.json   Kế hoạch 365 ngày
data/notes.json     Ghi chú giải nghĩa (mở rộng dần)
```

## Ghi chú về nội dung

- Bản dịch Kinh Thánh 1934 thuộc public domain.
- Các ghi chú giải nghĩa do AI soạn, **chưa được mục sư duyệt** — đang được bổ sung và hiệu đính dần.
