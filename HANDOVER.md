# QR Menu — Tài liệu kỹ thuật & Bàn giao dự án (Bước 4)

Tài liệu này tổng hợp toàn bộ kiến trúc, mô hình dữ liệu, quy trình bảo vệ thực đơn và danh mục kiểm thử kỹ thuật phục vụ việc đưa mã nguồn lên GitHub và giao Codex rà soát, hoàn thiện.

---

## 1. Tổng quan Dự án

- **Mục tiêu:** Ứng dụng **QR Menu Điện Tử** phục vụ các quán ăn, nhà hàng, quán cà phê và trà sữa có cả đồ ăn và đồ uống.
- **Trải nghiệm khách:** Khách chỉ quét mã QR hoặc mở link để xem menu; **không cần đăng nhập, không cần cài app**.
- **Trải nghiệm chủ quán:** Đăng nhập an toàn, quản lý nhóm/món, chỉnh sửa poster trực tiếp, điều chỉnh thông tin quán và xuất bản thực đơn tức thì.
- **Thiết kế chủ đạo:** Phong cách Poster hiện đại trẻ trung, hệ màu **Cam (#FF5A36) – Tím (#7447E8) – Vàng Chanh (#E5F76A) – Hồng (#FF83B5)**, card món góc khuyết độc đáo, ảnh nền header tùy biến với gradient bảo vệ độ tương phản.

---

## 2. Kiến trúc & Công nghệ (Tech Stack)

| Thành phần | Công nghệ sử dụng | Vai trò |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 + TypeScript | UI đơn trang (SPA), component hóa linh hoạt |
| **Styling** | Tailwind CSS v4 | Thiết kế responsive, layout hiện đại, không phụ thuộc CSS ngoại vi |
| **Icons** | Lucide React | Hệ thống biểu tượng trực quan, chuẩn UI |
| **QR Code Engine** | `qrcode` | Sinh mã QR client-side chuẩn Canvas/PNG có Quiet Zone |
| **Backend & Database** | Firebase Cloud Firestore | Cơ sở dữ liệu NoSQL lưu trữ bản nháp (`shops`) và bản công khai (`published_menus`) |
| **Authentication** | Firebase Authentication | Xác thực chủ quán (Email/Password & Google Sign-in) |
| **Offline Fallback** | LocalStorage (`qr_menu_shops_v1`) | Dự phòng khi offline hoặc cho tài khoản thử nghiệm nhanh (Demo) |
| **Build & Dev Tool** | Vite + TSX / Express | Hỗ trợ phát triển và chạy production |

---

## 3. Cấu trúc Mô hình Dữ liệu (Firestore & TypeScript)

### 3.1. Collection `shops/{shopId}` (Dành cho Chủ quán & Bản nháp)
Mỗi quán gắn với một document duy nhất:
```typescript
interface ShopDocument {
  id: string;             // Ví dụ: 'moc-bep-cafe', 'tra-chanh-pho' (Cố định, không đổi)
  ownerId: string;        // Firebase Auth UID của chủ quán
  name: string;           // Tên quán hiển thị
  draft: ShopData;        // Dữ liệu bản nháp (gồm shop, categories, items)
  hasPublished: boolean;  // Đã từng xuất bản ít nhất một lần hay chưa
  createdAt: Timestamp;   // Thời gian khởi tạo quán
  updatedAt: Timestamp;   // Thời gian cập nhật gần nhất
}
```

### 3.2. Collection `published_menus/{shopId}` (Dành cho Khách xem menu công khai)
Document công khai cho khách quét mã QR:
```typescript
interface PublishedMenuDocument {
  shopId: string;         // Mã định danh quán
  ownerId: string;        // UID của chủ quán
  shop: ShopSettings;     // Tên, hotline, địa chỉ, màu chủ đạo, logo, ảnh nền header
  categories: Category[]; // Danh sách nhóm món (đã sắp xếp theo order)
  items: MenuItem[];      // Danh sách món (đã phân loại và có trạng thái Còn/Hết)
  publishedAt: string;    // ISO timestamp thời điểm bấm "Xuất bản ngay"
}
```

### 3.3. Các Kiểu Dữ liệu Cốt lõi (`src/types/menu.ts`)
- **`PricingMode`**: `'single'` (1 mức giá duy nhất) hoặc `'multiple'` (Nhiều lựa chọn kích cỡ/loại, ví dụ: Nhỏ / Vừa / Lớn).
- **`MenuItemStatus`**: `'available'` (Còn bán), `'out_of_stock'` (Tạm hết - hiển thị nhãn cho khách), `'hidden'` (Đang ẩn - chỉ hiển thị trong trang quản lý, ẩn hoàn toàn với khách).
- **`HeaderBackgroundConfig`**: Cấu hình ảnh nền header (URL ảnh, kiểu phủ sáng/tối, độ mờ overlay %, chế độ chữ sáng/tối).

---

## 4. Cơ chế Phân quyền & Bảo vệ Thực đơn (Safety Guard)

1. **Bản nháp độc lập (`Draft Isolation`):**
   - Mọi thao tác thêm/sửa/xóa món, đổi giá, đổi màu nhận diện hoặc thay ảnh nền chỉ ghi vào `shops/{shopId}.draft`.
   - Khách quét mã chỉ đọc từ `published_menus/{shopId}`. Không bao giờ xuất hiện tình trạng khách thấy giá dở dang hoặc món đang sửa.
2. **Quy tắc Xuất bản (`Publish Workflow`):**
   - Khi chủ quán bấm **"Xuất bản ngay"**, hệ thống kiểm tra điều kiện (tên quán hợp lệ, có ít nhất 1 món không bị ẩn).
   - Dữ liệu từ bản nháp được sao chép sang `published_menus/{shopId}` kèm dấu thời gian `publishedAt`.
3. **Mã định danh quán bất biến (`Immutable Shop ID`):**
   - URL khách có định dạng `#/menu/{shopId}`.
   - Mã QR được tạo từ URL này và không thay đổi qua các lần xuất bản. Chủ quán chỉ in tem để bàn 1 lần.
4. **Quy tắc Firestore Rules (`firestore.rules`):**
   - `/published_menus/{shopId}`: Cho phép `read` công khai (`allow read: if true;`), chỉ cho phép chủ quán (`request.auth.uid == resource.data.ownerId`) ghi.
   - `/shops/{shopId}`: Chỉ chủ sở hữu được đọc và ghi.

---

## 5. Cấu trúc Thư mục Mã nguồn

```
/
├── firestore.rules               # Quy tắc bảo mật Firestore
├── firebase-blueprint.json       # Blueprint kiến trúc Firestore
├── metadata.json                 # Cấu hình dự án AI Studio
├── package.json                  # Dependencies (React, Vite, Lucide, QRCode)
├── src/
│   ├── App.tsx                   # Điều phối URL hash, router, Firebase Auth listener
│   ├── main.tsx                  # Điểm khởi động React
│   ├── index.css                 # Import Tailwind CSS v4 & font Be Vietnam Pro
│   ├── components/
│   │   ├── OwnerDashboard.tsx    # Điều hướng chủ quán (Tổng quan, Thực đơn, Thông tin, QR, Chỉnh trực tiếp)
│   │   ├── ShopOverview.tsx      # Màn hình Tổng quan quán (Thống kê món/nhóm, trạng thái, lối tắt nhanh)
│   │   ├── ShopInfoForm.tsx      # Form quản lý thông tin quán, màu chủ đạo, logo, ảnh nền header
│   │   ├── QRView.tsx            # Trang QR code, tải ảnh PNG chuẩn in standee, hướng dẫn in ấn
│   │   ├── GuestMenuView.tsx     # Giao diện menu khách (Poster, bộ lọc nhóm, tìm kiếm, modal món)
│   │   ├── ItemModal.tsx         # Modal tạo/sửa món, format giá VND hàng nghìn, đa mức giá
│   │   ├── CategoryModal.tsx     # Modal quản lý nhóm món, di chuyển thứ tự, chuyển món an toàn khi xóa
│   │   ├── HeaderBackgroundModal.tsx # Cài đặt ảnh nền header & lớp phủ tương phản
│   │   ├── DirectEditModals.tsx  # Modal chỉnh sửa nhanh trực tiếp trên poster
│   │   ├── AuthModal.tsx         # Đăng nhập / Đăng ký Firebase Auth & chế độ Demo
│   │   ├── LandingPage.tsx       # Trang giới thiệu ngoài cho khách & chủ quán mới
│   │   └── Toast.tsx             # Thông báo trạng thái người dùng
│   ├── services/
│   │   ├── firebase.ts           # Cấu hình Firebase SDK & test kết nối
│   │   ├── onlineStorage.ts      # Tích hợp Firestore (saveDraft, publishShop, subscribeToPublishedMenu)
│   │   └── storage.ts            # LocalStorage engine cho chế độ offline/demo
│   ├── types/
│   │   └── menu.ts               # Định nghĩa TypeScript toàn diện
│   └── utils/
│       ├── format.ts             # Định dạng tiền tệ VND & số có dấu chấm hàng nghìn
│       └── image.ts              # Nén ảnh client-side qua Canvas trước khi lưu
```

---

## 6. Checklist Kiểm thử & Rà soát (Dành cho Codex)

- [x] **Điều hướng chủ quán:** 4 phân khu chính (Tổng quan, Quản lý thực đơn, Thông tin quán, Mã QR & Chia sẻ) hoạt động trơn tru trên cả Desktop & Mobile.
- [x] **Màn hình Tổng quan (`ShopOverview`):** Đếm chính xác tổng món, số món đang bán, số món tạm hết/ẩn, số nhóm; có lối tắt truy cập các phân khu.
- [x] **Trang Thông tin quán (`ShopInfoForm`):** Sửa tên, khẩu hiệu, hotline, địa chỉ, mã màu chủ đạo, logo và ảnh nền header; lưu nháp an toàn.
- [x] **Trang Mã QR (`QRView`):** Canvas vẽ QR code sắc nét, có lề trắng (quiet zone), tải ảnh PNG hoàn chỉnh tên quán và hướng dẫn quét để bàn.
- [x] **Menu Khách (`GuestMenuView`):** Khách xem menu không cần tài khoản, tự động cập nhật thời gian thực khi chủ quán xuất bản.
- [x] **Bảo toàn giao diện poster:** Giữ vững card góc khuyết, độ tương phản chữ trên nền sáng, ảnh món sáng rõ.
