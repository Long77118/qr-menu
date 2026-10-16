# Khám phá menu công khai

Route `/#/discover` mở cho mọi người, kể cả chưa đăng nhập. Có liên kết từ trang chủ, menu khách và sidebar quản lý. Mỗi thẻ gồm tên, tagline, địa chỉ, liên kết menu và Google Maps theo địa chỉ quán đã nhập. Không tự định vị GPS hoặc thêm địa chỉ giả. Quán thiếu địa chỉ có thông báo riêng và không có nút bản đồ.

## Dữ liệu và quyền

- `menu_directory/{shopId}` chỉ chứa `shopId`, `name`, `tagline`, `address`, `countryCode`, `imageUrl`, `publishedAt`, `active`. Không chứa email, UID chủ quán, nháp hoặc audit. Ảnh công khai có thể là URL hoặc ảnh được nhúng từ bản đã xuất bản.
- Xuất bản ghi public menu, directory và private status trong cùng batch. Lưu nháp không làm thay đổi danh sách.
- Rules đối chiếu summary với public menu sau batch; không cho thêm dữ liệu riêng hoặc giả địa chỉ.
- Tạm ngưng/mở lại cập nhật control, audit và cờ directory trong cùng transaction. Rules từ chối thay đổi control làm directory lệch trạng thái. Owner không tự mở lại quán bị ngưng.
- Guest query phải lọc `active == true` và có limit tối đa 25. `shops`, `users`, `admin_logs` tiếp tục riêng tư. Không cho list toàn bộ payload `published_menus`.
- Khi xóa menu public hoặc shop có directory, phải xóa directory trong cùng batch. UI hiện chưa có tính năng xóa quán/menu cloud.
- Demo local không đưa vào directory cloud.

## Phân trang và tìm kiếm

Mỗi trang 24 quán, đọc thêm một bản ghi để biết còn trang sau. Sort theo document ID để không cần composite index. Listener cập nhật trang hiện tại khi trạng thái hoặc dữ liệu đổi. Tìm tên/địa chỉ hỗ trợ bỏ dấu tiếng Việt, áp dụng cho trang hiện tại; không phải tìm kiếm toàn cơ sở dữ liệu. Trong danh sách thay đổi liên tục, ranh giới trang có thể dịch chuyển; trở về trang đầu để duyệt lại.

Quốc gia dùng ISO 3166-1 alpha-2 (249 quốc gia/vùng lãnh thổ), tập mã chung trong `src/data/countryCodes.json`, tên tiếng Việt bằng Intl.DisplayNames. Chủ quán chọn trong Thông tin quán rồi lưu và xuất bản. Không đoán quốc gia từ địa chỉ hoặc mặc định mọi quán ở Việt Nam. Lọc quốc gia dùng where ở Firestore trước khi phân trang, gồm lựa chọn Tất cả và Chưa cập nhật. Đổi bộ lọc đặt lại trang đầu. Query hai equality filters và document ID sử dụng index merging; đã kiểm tra cả query thật và emulator.

Ảnh thẻ ưu tiên `shop.discoveryImageUrl`, sau đó ảnh bìa, nền Header, logo. Ảnh riêng tải trong form được nén tối đa 480px, kiểm tra giới hạn 160.000 ký tự và giảm thêm nếu cần. Các ảnh cũ fallback giữ nguồn gốc public, không tự nén lại trên server. Thẻ tải ảnh lazy/async, tỷ lệ khung cố định, ảnh thiếu/lỗi có placeholder rõ ràng. Rules đối chiếu ảnh/quốc gia với bản public sau batch; lưu nháp không thay đổi ảnh hoặc quốc gia công khai. SVG mẫu vẫn là ảnh minh họa mẫu, không tạo ảnh chụp quán giả.

Giao diện khám phá có CSS riêng, màu tím/vàng chanh, chữ lớn, thẻ bo tròn, sticker, country chips vuốt ngang trên điện thoại. Không thay giao diện menu khách hoặc owner dashboard ngoài các trường cấu hình mới. Có focus outline và tôn trọng reduced-motion từ CSS chung.

Discovery chỉ hiển thị kết quả được xác nhận từ server, không khôi phục quán đã tạm ngưng từ cache offline. Nội dung đã tải về trước đó vẫn có thể tồn tại trên thiết bị.

## Kích hoạt và dữ liệu cũ

Source cấu hình project `polished-edge-xcf5x`, database `ai-studio-qrmenu-3b8de5ca-6ac7-451c-b226-266a1030b7cd`.

Chạy lint, rules suite và production build trước khi deploy. Sau khi người vận hành đồng ý triển khai:

```powershell
bun run --bun firebase deploy --only firestore:rules --project polished-edge-xcf5x
node scripts/backfill-menu-directory.mjs
node scripts/backfill-menu-directory.mjs --apply
```

Script mặc định chỉ xem trước số bản ghi. Chế độ apply dùng transaction riêng từng quán để đọc lại public menu, owner liên kết, control và directory trước khi ghi. Không lấy thông tin summary từ draft. Bỏ qua dữ liệu sai/thiếu liên kết và không tự tạo public menu. Tôn trọng trạng thái suspended và chạy lại được. Nếu có xung đột transaction, script dừng báo lỗi; chạy lại sau khi kiểm tra. Script dùng Firebase CLI đã đăng nhập, không thuộc bundle browser. Không đổi dependency/lockfile.

## Kết quả triển khai ngày 13/10/2026

- Bản cập nhật ảnh/quốc gia/Gen Z: 66 tests pass, 0 fail, 313 assertions; TypeScript và build pass.
- CLI deploy bị từ chối tại Service Usage preflight vì thiếu `serviceusage.services.use`. Sau khi người dùng đồng ý triển khai, đã dùng Rules API cùng phiên CLI để compile, upload có attachment point đúng named database, cập nhật release và đọc lại xác nhận source live khớp hoàn toàn. Không thay đổi IAM.
- Ruleset active sau cập nhật: `projects/polished-edge-xcf5x/rulesets/5706e003-e2cc-4900-9394-d5c728b7d308`.
- Backfill cập nhật 1 menu cũ; chạy xem trước lại có 0 bản ghi cần thay đổi. Không đổi public menu hoặc private draft.
- REST không có Authorization: query directory HTTP 200 (1 quán), đọc public menu HTTP 200, query private shops HTTP 403.
- Browser: danh sách có tên và địa chỉ, tìm `ha noi` khớp Hà Nội, tìm không khớp có empty state, mở menu khách có 12 món/4 nhóm.
- Ảnh đại diện hiện tải thành công. Query quốc gia VN HTTP 200 (0 quán vì chủ quán chưa chọn), quốc gia chưa cập nhật HTTP 200 (1 quán). Browser xác nhận chip/select bộ lọc. Desktop 1280px và mobile 390px không tràn ngang; console không có error/warning.
- Có backup release/source rules cũ trong workspace của chat để khôi phục khi cần. Chưa push/commit hoặc triển khai hosting. Tạm ngưng/mở lại kiểm thử trên emulator, không thao tác khóa quán thật để kiểm thử.

Nguồn thiết kế rules: [Firebase query rules](https://firebase.google.com/docs/firestore/security/rules-query), [atomic writes/getAfter](https://firebase.google.com/docs/firestore/manage-data/transactions).

Index merging: [Firebase index overview](https://firebase.google.com/docs/firestore/query-data/index-overview).
