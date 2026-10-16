# Quản trị hệ thống — đợt 6

URL local: `http://localhost:3000/#/admin`. Trang chủ có liên kết “Quản trị hệ thống”.

Quyền bắt buộc: custom claim `qrAdmin: true` trong Firebase Auth token. Trường trong `users` hoặc localStorage không cấp quyền. Client không có API cấp quyền admin.

## Tài khoản đầu tiên

Email được chủ dự án chỉ định: `julianlaix@gmail.com`.

Project hiện trong cấu hình: `polished-edge-xcf5x`. Database Firestore được app sử dụng là database có tên `ai-studio-qrmenu-3b8de5ca-6ac7-451c-b226-266a1030b7cd`, không phải `(default)`.

1. Đảm bảo email này đã có trong Firebase Authentication của đúng project và đã xác minh email. Trang admin không tạo quán. Đăng nhập Google lần đầu có thể tạo tài khoản Authentication theo hành vi của provider; tài khoản đó vẫn bị từ chối quản trị đến khi được cấp claim.
2. Người vận hành có IAM `firebaseauth.users.get` và `firebaseauth.users.update` đăng nhập công cụ bằng `bun run --bun firebase login`. Có thể dùng Firebase Admin SDK; hoặc script REST không cần dependency mới trong `scripts/set-admin-claim.mjs`.
3. Script dùng phiên Firebase CLI đã đăng nhập qua bridge tương thích với bản được pin `firebase-tools@15.33.0`. Nếu dùng credential riêng, có thể đặt OAuth access token trong `QR_ADMIN_ACCESS_TOKEN`; không cần gửi token qua chat. Chạy từ source:

```powershell
node scripts/set-admin-claim.mjs --project=polished-edge-xcf5x --email=julianlaix@gmail.com --grant
```

Lệnh trên chỉ lookup và xem trước UID/thao tác. Sau khi kiểm tra đúng tài khoản/project, thêm `--apply` để ghi. Script giữ các custom claims khác, không in access token, không lưu token vào file, và kiểm tra lại sau ghi. Thu hồi dùng `--revoke --apply`.

4. `firebase.json` đã chỉ rõ database có tên. Deploy rules mới vào project đã xác minh bằng `bun run --bun firebase deploy --only firestore:rules --project polished-edge-xcf5x`, rồi đăng nhập lại tại `/#/admin`. Nút “Kiểm tra lại quyền” force-refresh ID token. Không giả định rules cho `(default)` tự áp dụng cho database có tên. Lệnh deploy chưa được chạy.

Chưa thực hiện cấp quyền, xác minh tài khoản hay deploy production trong đợt này. CLI hiện chưa đăng nhập tài khoản quản lý Firebase. Không gửi service-account key/access token qua chat; đăng nhập công cụ quản trị trên máy hoặc dùng credential ở môi trường tin cậy.

Claims được áp dụng theo ID token đang có; thu hồi claim không tự vô hiệu hóa mọi token cũ tức thì. Cần xử lý session/token lifecycle riêng nếu yêu cầu thu hồi quyền ngay lập tức.

Nguồn: [Firebase custom claims](https://firebase.google.com/docs/auth/admin/custom-claims), [lookup REST](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v1/projects.accounts/lookup), [update REST](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v1/projects.accounts/update).

## Dữ liệu và quyền

- Admin đọc `shops`, hồ sơ `users`, `admin_logs`; không có quyền sửa nội dung menu/owner của quán khác.
- Danh sách phân trang 50 bản ghi; tìm kiếm áp dụng cho danh sách đã tải. Có lookup mã quán chính xác để tìm ngoài trang hiện tại. Hồ sơ Firestore không tương đương danh sách toàn bộ tài khoản Authentication.
- `shop_controls/{shopId}` chứa trạng thái `active`/`suspended`, thời gian và ID log gần nhất. Thiếu control thì coi là active để giữ tương thích quán cũ.
- Trạng thái và audit log được ghi chung transaction. Rules yêu cầu log đi kèm khớp actor, quán, trạng thái và thời gian. Không cho sửa/xóa log hoặc xóa control.
- Tạm ngưng chặn guest đọc public menu và chủ quán xuất bản mới. Chủ quán vẫn đọc/lưu private draft. Mở lại cho đọc bản public đã có; không tự xuất bản nháp.
- Guest không dùng cache fallback khi server trả permission-denied. Listener theo dõi control để gỡ menu khi tạm ngưng và đăng ký lại khi mở lại.
- Dữ liệu đã từng tải xuống thiết bị không thể thu hồi tuyệt đối khi thiết bị offline; chặn trạng thái tại server áp dụng cho request mới.

## Kiểm tra trước khi đưa lên hosting

Chạy `bun run lint`, `bun run test:rules`, `bun run build`. Test admin dùng emulator và Firebase token claims giả lập, không dùng Auth/Firestore production.

Nghiệm thu thực tế: admin được cấp claim; tài khoản thường bị từ chối; admin tạm ngưng/mở lại quán; owner giữ nháp và không xuất bản được khi ngưng; khách đang mở menu bị gỡ nội dung; nhật ký khớp thao tác.
