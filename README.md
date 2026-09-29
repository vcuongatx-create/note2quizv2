# 🎮 Note2Quiz

> **Học mà chơi — Chơi mà học**

Note2Quiz là nền tảng học tập thông minh giúp bạn biến **bất kỳ tài liệu nào** thành **trò chơi kiểm tra kiến thức** chỉ trong vài giây. Upload PDF, dán văn bản, hoặc chỉ cần gõ một chủ đề — AI sẽ tự động tạo đề trắc nghiệm có đáp án, giải thích, flashcard và phân tích điểm yếu của bạn.

---

## 🌟 Note2Quiz là gì?

Note2Quiz được xây dựng với mục tiêu **biến việc học nhàm chán thành trò chơi thú vị**. Thay vì ngồi đọc lại 20 trang sách giáo khoa, bạn chỉ cần:

1. **Upload** tài liệu (PDF, DOCX, TXT) hoặc **dán** văn bản hoặc **gõ** chủ đề
2. **Chọn** chế độ chơi và độ khó
3. **Chiến đấu** với các câu hỏi để giành điểm cao
4. **Xem phân tích** để biết mình yếu ở đâu

Tất cả chỉ mất **30 giây**.

---

## 🎯 Tính năng chính

### 📥 Đầu vào linh hoạt
- **Upload file**: PDF, DOCX, TXT
- **Dán văn bản**: Copy-paste trực tiếp từ tài liệu
- **Nhập chủ đề**: AI tự tra kiến thức (VD: "Định lý Pythagoras")

### 🎮 3 chế độ chơi

| Chế độ | Đặc điểm | Dành cho |
|---|---|---|
| 🎯 **Cổ điển** | Làm từ từ, không áp lực | Người mới học, muốn hiểu kỹ |
| 🔥 **Combo** | Đúng liên tiếp → x2, x3, x5 điểm | Người thích cạnh tranh, phá kỷ lục |
| ⏱️ **Sinh tồn** | 30 giây/câu, hết giờ = thua | Người muốn rèn phản xạ |

### 🧠 Phân tích thông minh
Sau khi chơi, hệ thống tự động:
- **Chấm điểm** và xếp hạng (Thiên tài / Giỏi / Khá / Cần cố / Mới bắt đầu)
- **Phát hiện chủ đề yếu**: Chỉ ra chính xác bạn đang hổng kiến thức ở đâu
- **Gợi ý ôn tập**: Đọc lại phần nào trước khi chơi lại

### 🃏 Flashcard tự động
Mỗi câu hỏi tự động chuyển thành flashcard 3D — nhấn để lật, xem đáp án + giải thích.

### 💬 Chat với AI gia sư
Hỏi bất cứ điều gì về kiến thức bạn đang học. AI trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu.

---

## 🚀 Nền tảng hoạt động

Note2Quiz là **web app 100% client-side** — chạy hoàn toàn trên trình duyệt, không cần server riêng. Điều này có nghĩa là:

- ✅ **Miễn phí mãi mãi** — không cần trả phí hosting
- ✅ **Nhanh** — không có độ trễ từ server
- ✅ **Riêng tư** — tài liệu của bạn không được upload lên server nào (trừ prompt gửi cho AI)
- ✅ **Dễ deploy** — chỉ cần 4 file, chạy được trên GitHub Pages

### 🔧 Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| **Giao diện** | HTML5 + CSS3 (gradient, animation, responsive) |
| **Logic** | Vanilla JavaScript (không framework) |
| **AI** | Pollinations.AI (miễn phí, không cần key) |
| **Đọc PDF** | PDF.js (Mozilla) |
| **Đọc DOCX** | Mammoth.js |
| **Lưu trữ** | LocalStorage (cho state tạm) |

### 🌐 Về Pollinations.AI

Note2Quiz sử dụng **Pollinations.AI** — nền tảng AI mã nguồn mở, miễn phí, cho phép:
- Tạo text bằng các model mạnh (OpenAI, Claude, Gemini, Mistral...)
- Không cần đăng ký, không cần API key cho endpoint công khai
- Không giới hạn cứng — có thể dùng thỏa mái cho mục đích học tập

Tìm hiểu thêm: https://pollinations.ai

---

## 📖 Cách sử dụng

### Bước 1: Tạo đề
1. Vào tab **📥 Tạo đề**
2. Chọn 1 trong 3 cách nhập kiến thức:
   - Upload file PDF/DOCX/TXT
   - Dán văn bản
   - Gõ chủ đề (VD: "Quang hợp ở thực vật")
3. Chọn số câu (3-20), độ khó, chế độ chơi
4. Bấm **✨ Tạo đề & Bắt đầu chơi**

### Bước 2: Chơi
- Đọc câu hỏi, chọn đáp án A/B/C/D
- Xem giải thích ngay sau khi chọn
- Theo dõi điểm và combo ở header
- Bấm **Câu tiếp** để sang câu mới

### Bước 3: Xem kết quả
- Điểm số + xếp hạng
- **Phân tích chủ đề yếu** — biết mình cần ôn phần nào
- Bấm **Chơi lại** hoặc **Tạo đề mới**

### Bước 4: Ôn tập
- **Flashcard**: Lật thẻ để nhớ nhanh
- **Chat AI**: Hỏi những chỗ chưa hiểu

---

## 🎨 Điểm nổi bật

| Đặc điểm | Note2Quiz | Web quiz thường |
|---|---|---|
| Tạo đề từ file | ✅ PDF, DOCX, TXT | ❌ Phải tự nhập tay |
| Tạo đề từ chủ đề | ✅ AI tự tra | ❌ Không có |
| Chế độ chơi | ✅ 3 chế độ | ❌ Chỉ 1 |
| Phân tích điểm yếu | ✅ Theo chủ đề | ❌ Chỉ điểm tổng |
| Flashcard | ✅ Tự động | ❌ Không có |
| Chat gia sư | ✅ Có | ❌ Không có |
| Miễn phí | ✅ 100% | ⚠️ Thường có phí |

---

## ⚠️ Lưu ý

- **AI có thể sai** — đôi khi tạo câu hỏi chưa chính xác 100%, hãy kiểm tra lại với tài liệu gốc
- **Cần internet** — để gọi AI, không thể dùng offline
- **Tài liệu dài** — nên chia nhỏ thành từng chương để AI xử lý tốt hơn
- **Pollinations có thể chậm** — đôi khi mất 10-30 giây, hãy kiên nhẫn

---

## 📄 License

MIT — Dùng thoải mái, sửa tùy thích, chia sẻ cho bạn bè.

---

## 🙏 Cảm ơn

- **Pollinations.AI** — cung cấp API AI miễn phí
- **PDF.js** — đọc PDF trong trình duyệt
- **Mammoth.js** — đọc file Word
- **Cộng đồng học sinh/sinh viên Việt Nam** — nguồn cảm hứng

---

**Made with ❤️ for students**

🎮 **Chúc bạn học vui!**
