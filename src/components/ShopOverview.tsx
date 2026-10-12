import React from 'react';
import {
  UtensilsCrossed,
  Layers,
  CheckCircle2,
  AlertCircle,
  EyeOff,
  Palette,
  Store,
  QrCode,
  ExternalLink,
  Save,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Share2,
} from 'lucide-react';
import { ShopData, UserProfile } from '../types/menu';

interface ShopOverviewProps {
  user: UserProfile;
  shopData: ShopData;
  isPublished: boolean;
  hasUnsavedChanges: boolean;
  onNavigateTab: (tab: 'editor' | 'menu' | 'info' | 'qr') => void;
  onPublish: () => void;
  onSaveDraft: () => void;
  onOpenGuestUrl: (shopId: string) => void;
}

export const ShopOverview: React.FC<ShopOverviewProps> = ({
  user,
  shopData,
  isPublished,
  hasUnsavedChanges,
  onNavigateTab,
  onPublish,
  onSaveDraft,
  onOpenGuestUrl,
}) => {
  const { shop, categories, items } = shopData;

  // Compute key metrics
  const totalItems = items.length;
  const availableItems = items.filter((i) => i.status === 'available').length;
  const outOfStockItems = items.filter((i) => i.status === 'out_of_stock').length;
  const hiddenItems = items.filter((i) => i.status === 'hidden').length;
  const totalCategories = categories.length;

  const baseUrl = window.location.origin + window.location.pathname;
  const guestUrl = `${baseUrl.replace(/\/$/, '')}#/menu/${shop.id}`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Header Banner & Current Active Shop Identity */}
      <div className="bg-white rounded-[28px] p-6 sm:p-7 border border-[#EFE5D9] shadow-xs relative overflow-hidden">
        {/* Background decorative tint */}
        <div
          className="absolute -right-16 -top-16 w-64 h-64 rounded-full opacity-10 blur-2xl pointer-events-none"
          style={{ backgroundColor: shop.themeColor || '#FF5A36' }}
        />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            {shop.logoUrl ? (
              <img
                src={shop.logoUrl}
                alt={shop.name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[#EFE5D9] shadow-xs shrink-0"
              />
            ) : (
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-white font-black text-2xl shrink-0 shadow-xs"
                style={{ backgroundColor: shop.themeColor || '#FF5A36' }}
              >
                {shop.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#FF5A36] bg-[#FFF0EB] px-2.5 py-0.5 rounded-full border border-[#FF5A36]/20">
                  Đang quản lý quán
                </span>
                {user.isFirebaseUser ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Đồng bộ Cloud Firestore
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    Bản Demo trình duyệt
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-[#241E35] mt-1.5 truncate">
                {shop.name}
              </h1>

              {shop.tagline ? (
                <p className="text-xs sm:text-sm text-[#6E6779] mt-0.5 line-clamp-1 font-medium">
                  {shop.tagline}
                </p>
              ) : (
                <p className="text-xs text-[#6E6779] mt-0.5 italic">
                  Chưa cài đặt khẩu hiệu quán
                </p>
              )}

              <div className="flex items-center gap-3 mt-2 text-xs text-[#6E6779] font-mono">
                <span>Mã định danh: <strong className="text-[#241E35] font-bold">{shop.id}</strong></span>
                {shop.phone && <span>· Hotline: {shop.phone}</span>}
              </div>
            </div>
          </div>

          {/* Quick Publish / Status CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#EFE5D9]">
            <button
              onClick={onSaveDraft}
              className="min-h-[44px] px-4 py-2.5 rounded-2xl border border-[#EFE5D9] bg-white text-[#241E35] text-xs font-bold hover:bg-[#FFF9F3] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <Save className="w-4 h-4 text-[#FF5A36]" />
              <span>{hasUnsavedChanges ? 'Lưu nháp ngay' : 'Đã lưu nháp'}</span>
            </button>

            <button
              onClick={onPublish}
              className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-[#FF5A36] text-white text-xs font-black hover:bg-[#E6431F] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Xuất bản menu khách</span>
            </button>
          </div>
        </div>

        {/* Status Callout Bar */}
        <div className="mt-5 pt-4 border-t border-[#EFE5D9] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                hasUnsavedChanges
                  ? 'bg-[#FF5A36] animate-ping'
                  : isPublished
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
              }`}
            />
            <span className="font-bold text-[#241E35]">
              {hasUnsavedChanges ? (
                <span className="text-[#FF5A36]">
                  Có chỉnh sửa chưa lưu vào bản nháp. Bấm "Lưu nháp" hoặc tiếp tục chỉnh sửa.
                </span>
              ) : isPublished ? (
                <span className="text-emerald-700">
                  Thực đơn đã xuất bản thành công! Khách quét QR sẽ xem được thực đơn mới nhất.
                </span>
              ) : (
                <span className="text-amber-800">
                  Đang ở bản nháp. Chưa xuất bản bản công khai cho khách xem.
                </span>
              )}
            </span>
          </div>

          <button
            onClick={() => onOpenGuestUrl(shop.id)}
            className="text-xs font-black text-[#FF5A36] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>Mở menu khách</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Items */}
        <div
          onClick={() => onNavigateTab('menu')}
          className="bg-white rounded-[24px] p-5 border border-[#EFE5D9] shadow-xs hover:border-[#FF5A36]/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-[#6E6779] uppercase tracking-wider">Tổng số món</span>
            <div className="w-8 h-8 rounded-xl bg-[#FFF0EB] text-[#FF5A36] flex items-center justify-center group-hover:scale-110 transition-transform">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#241E35] tabular-nums">
            {totalItems}
          </div>
          <div className="text-[11px] text-[#6E6779] mt-1 flex items-center gap-1">
            <span>Bấm để quản lý danh sách</span>
            <ArrowRight className="w-3 h-3 text-[#FF5A36]" />
          </div>
        </div>

        {/* Categories */}
        <div
          onClick={() => onNavigateTab('menu')}
          className="bg-white rounded-[24px] p-5 border border-[#EFE5D9] shadow-xs hover:border-[#FF5A36]/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-[#6E6779] uppercase tracking-wider">Số nhóm món</span>
            <div className="w-8 h-8 rounded-xl bg-[#FFF9F3] text-[#7447E8] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#241E35] tabular-nums">
            {totalCategories}
          </div>
          <div className="text-[11px] text-[#6E6779] mt-1">
            Phân loại rõ ràng cho khách
          </div>
        </div>

        {/* Available Items */}
        <div
          onClick={() => onNavigateTab('menu')}
          className="bg-white rounded-[24px] p-5 border border-[#EFE5D9] shadow-xs hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">Đang bán</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 tabular-nums">
            {availableItems}
          </div>
          <div className="text-[11px] text-emerald-800 mt-1">
            Sẵn sàng phục vụ khách
          </div>
        </div>

        {/* Out of Stock & Hidden */}
        <div
          onClick={() => onNavigateTab('menu')}
          className="bg-white rounded-[24px] p-5 border border-[#EFE5D9] shadow-xs hover:border-amber-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-[#6E6779] uppercase tracking-wider">Tạm hết / Ẩn</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <EyeOff className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700 tabular-nums">
            {outOfStockItems + hiddenItems}
          </div>
          <div className="text-[11px] text-[#6E6779] mt-1">
            {outOfStockItems} tạm hết · {hiddenItems} ẩn
          </div>
        </div>
      </div>

      {/* 3. Quick Action Hub */}
      <div className="bg-white rounded-[28px] p-6 border border-[#EFE5D9] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-[#241E35]">
              Lối tắt quản lý nhanh
            </h2>
            <p className="text-xs text-[#6E6779] mt-0.5">
              Truy cập nhanh các phân khu chính của quán để tùy chỉnh
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Quick Hub 1: Quản lý thực đơn */}
          <button
            onClick={() => onNavigateTab('menu')}
            className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#EFE5D9] hover:border-[#FF5A36] hover:bg-[#FFF0EB]/40 transition-all text-left flex flex-col justify-between h-36 cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#EFE5D9] flex items-center justify-center text-[#FF5A36] group-hover:scale-105 transition-transform shadow-2xs">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
              <ArrowRight className="w-4 h-4 text-[#6E6779] group-hover:text-[#FF5A36] group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <div className="text-xs font-black text-[#241E35]">Quản lý thực đơn</div>
              <div className="text-[11px] text-[#6E6779] mt-0.5 line-clamp-2">
                Thêm món, phân nhóm, đổi trạng thái Còn/Hết và sắp xếp thứ tự
              </div>
            </div>
          </button>

          {/* Quick Hub 2: Chỉnh poster trực tiếp */}
          <button
            onClick={() => onNavigateTab('editor')}
            className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#EFE5D9] hover:border-[#7447E8] hover:bg-purple-50/40 transition-all text-left flex flex-col justify-between h-36 cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#EFE5D9] flex items-center justify-center text-[#7447E8] group-hover:scale-105 transition-transform shadow-2xs">
                <Palette className="w-4 h-4" />
              </div>
              <ArrowRight className="w-4 h-4 text-[#6E6779] group-hover:text-[#7447E8] group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <div className="text-xs font-black text-[#241E35]">Chỉnh menu trực tiếp</div>
              <div className="text-[11px] text-[#6E6779] mt-0.5 line-clamp-2">
                Sửa chữ, đổi giá và thay ảnh trực quan ngay trên giao diện poster
              </div>
            </div>
          </button>

          {/* Quick Hub 3: Thông tin quán */}
          <button
            onClick={() => onNavigateTab('info')}
            className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#EFE5D9] hover:border-[#FF5A36] hover:bg-[#FFF0EB]/40 transition-all text-left flex flex-col justify-between h-36 cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#EFE5D9] flex items-center justify-center text-[#FF5A36] group-hover:scale-105 transition-transform shadow-2xs">
                <Store className="w-4 h-4" />
              </div>
              <ArrowRight className="w-4 h-4 text-[#6E6779] group-hover:text-[#FF5A36] group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <div className="text-xs font-black text-[#241E35]">Thông tin quán</div>
              <div className="text-[11px] text-[#6E6779] mt-0.5 line-clamp-2">
                Đổi tên, địa chỉ, hotline, màu chủ đạo và ảnh nền header
              </div>
            </div>
          </button>

          {/* Quick Hub 4: QR & Chia sẻ */}
          <button
            onClick={() => onNavigateTab('qr')}
            className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#EFE5D9] hover:border-[#241E35] hover:bg-stone-50 transition-all text-left flex flex-col justify-between h-36 cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#EFE5D9] flex items-center justify-center text-[#241E35] group-hover:scale-105 transition-transform shadow-2xs">
                <QrCode className="w-4 h-4" />
              </div>
              <ArrowRight className="w-4 h-4 text-[#6E6779] group-hover:text-[#241E35] group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <div className="text-xs font-black text-[#241E35]">Mã QR &amp; Chia sẻ</div>
              <div className="text-[11px] text-[#6E6779] mt-0.5 line-clamp-2">
                Tải ảnh QR in để bàn, sao chép link và xem hướng dẫn in ấn
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 4. Link & QR Preview Widget */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Menu Link Card */}
        <div className="bg-white rounded-[28px] p-6 border border-[#EFE5D9] shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#FF5A36]">
              <Share2 className="w-4 h-4" />
              <span>Đường dẫn thực đơn cho khách</span>
            </div>
            <p className="text-xs text-[#6E6779] mt-1 font-medium">
              Đường dẫn cố định duy nhất của quán. Mọi lần bạn bấm xuất bản thì link này tự động cập nhật ngay lập tức:
            </p>
            <div className="mt-3 p-3 bg-[#FFF9F3] rounded-2xl border border-[#EFE5D9] font-mono text-xs text-[#241E35] break-all select-all font-semibold">
              {guestUrl}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => onOpenGuestUrl(shop.id)}
              className="flex-1 min-h-[42px] px-4 py-2 rounded-2xl bg-[#E5F76A] hover:bg-[#d6ea56] text-[#241E35] text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-[#FF5A36]" />
              <span>Mở xem menu khách</span>
            </button>
            <button
              onClick={() => onNavigateTab('qr')}
              className="min-h-[42px] px-4 py-2 rounded-2xl border border-[#EFE5D9] text-[#241E35] text-xs font-bold hover:bg-[#FFF9F3] transition-colors cursor-pointer"
            >
              Tải mã QR
            </button>
          </div>
        </div>

        {/* Workflow & Safety Summary */}
        <div className="bg-[#FFF9F3] rounded-[28px] p-6 border border-[#EFE5D9] shadow-xs space-y-3 text-xs text-[#6E6779]">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#241E35]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Quy trình bảo vệ thực đơn</span>
          </div>

          <ul className="space-y-2 mt-2 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A36] mt-1.5 shrink-0" />
              <span>
                <strong>Bản nháp độc lập:</strong> Mọi thao tác đổi giá, thêm món, ẩn món hoặc đổi màu đều chỉ lưu ở bản nháp của bạn.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <span>
                <strong>Chỉ xuất bản khi sẵn sàng:</strong> Khách quét mã chỉ nhìn thấy bản đã xuất bản, đảm bảo không làm gián đoạn việc bán hàng.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7447E8] mt-1.5 shrink-0" />
              <span>
                <strong>Mã định danh bất biến:</strong> Mã QR và đường dẫn không đổi, bạn in tem để bàn một lần và dùng mãi mãi.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
