# IELTS Listening — phiên luyện hai màu mực

Web app chạy ở máy bạn, luyện Listening theo đúng quy trình sửa tay:
**Scan đề → Nghe lần 1 (mực xanh) → Nghe lần 2 (mực đỏ) → Check → Transcript → Chép chính tả → Rút kinh nghiệm.**

## Chạy lần đầu
```bash
npm install
npm run dev
```
Mở http://localhost:3000

## Nhắc ôn thẻ qua Gmail
1. Sao chép `.env.example` thành `.env`, điền Gmail + App Password (tạo tại myaccount.google.com/apppasswords).
2. Gửi thử ngay: `npm run remind`
3. Tự gửi mỗi sáng: `npm run remind:watch` (giữ cửa sổ chạy).

## Ghi chú
- App **không kèm đề/audio Cambridge** — bạn dán link audio trực tiếp (mp3/m4a) hoặc chọn file từ máy; file được lưu trong `data/audio/`.
- Toàn bộ dữ liệu nằm trong `data/db.json` — muốn sao lưu chỉ cần copy file này.
- Đáp án đúng hỗ trợ nhiều phương án: `colour / color`, phần tuỳ chọn trong ngoặc: `(the) library`.
- Đóng máy giữa phiên không mất bài: phiên đang dở tự lưu nháp, mở lại là tiếp tục.
