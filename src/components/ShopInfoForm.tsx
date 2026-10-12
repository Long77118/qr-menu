import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  AlertCircle,
  Palette,
  Image as ImageIcon,
  Sliders,
  CheckCircle2,
  Store,
  MapPin,
  Phone,
  FileText,
  Sparkles,
  Info,
  Check,
  Eye,
  Trash2,
} from 'lucide-react';
import { ShopSettings, HeaderBackgroundConfig } from '../types/menu';
import { compressImageFile } from '../utils/image';
import { HeaderBackgroundModal } from './HeaderBackgroundModal';

interface ShopInfoFormProps {
  shop: ShopSettings;
  onSave: (updatedShop: ShopSettings) => void;
  onOpenPreview?: () => void;
}

const THEME_PRESETS = [
  { name: 'Cam Rực Poster (Mặc định)', color: '#FF5A36' },
  { name: 'Tím Trẻ Trung', color: '#7447E8' },
  { name: 'Vàng Chanh Tươi', color: '#E5F76A' },
  { name: 'Hồng Năng Động', color: '#FF83B5' },
  { name: 'Vàng Bơ Nắng', color: '#F59E0B' },
  { name: 'Xanh Lá Mộc', color: '#1B4D3E' },
  { name: 'Nâu Cà Phê Gỗ', color: '#5C3A21' },
  { name: 'Tím Đen Tinh Tế', color: '#241E35' },
];

export const ShopInfoForm: React.FC<ShopInfoFormProps> = ({ shop, onSave, onOpenPreview }) => {
  const [name, setName] = useState(shop.name);
  const [tagline, setTagline] = useState(shop.tagline || '');
  const [description, setDescription] = useState(shop.description || '');
  const [address, setAddress] = useState(shop.address || '');
  const [phone, setPhone] = useState(shop.phone || '');
  const [themeColor, setThemeColor] = useState(shop.themeColor || '#FF5A36');
  const [logoUrl, setLogoUrl] = useState<string | undefined>(shop.logoUrl);
  const [coverUrl, setCoverUrl] = useState<string | undefined>(shop.coverUrl);
  const [headerBackground, setHeaderBackground] = useState<HeaderBackgroundConfig | undefined>(
    shop.headerBackground
  );
  const [isHeaderBgModalOpen, setIsHeaderBgModalOpen] = useState(false);

  const [loadingLogo, setLoadingLogo] = useState(false);
  const [loadingCover, setLoadingCover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state if prop changes from outside
  useEffect(() => {
    setName(shop.name);
    setTagline(shop.tagline || '');
    setDescription(shop.description || '');
    setAddress(shop.address || '');
    setPhone(shop.phone || '');
    setThemeColor(shop.themeColor || '#FF5A36');
    setLogoUrl(shop.logoUrl);
    setCoverUrl(shop.coverUrl);
    setHeaderBackground(shop.headerBackground);
  }, [shop]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadingLogo(true);
    setError(null);
    try {
      const compressed = await compressImageFile(file, 400, 0.8);
      setLogoUrl(compressed);
      setSuccessNotice('Đã tải và nén logo thành công. Hãy bấm "Lưu thông tin quán" để cập nhật nháp.');
    } catch (err: any) {
      setError(err.message || 'Không thể tải logo lên');
    } finally {
      setLoadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadingCover(true);
    setError(null);
    try {
      const compressed = await compressImageFile(file, 900, 0.75);
      setCoverUrl(compressed);
      setSuccessNotice('Đã tải ảnh khung trang trí thành công.');
    } catch (err: any) {
      setError(err.message || 'Không thể tải ảnh bìa lên');
    } finally {
      setLoadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Tên quán là bắt buộc và không được để trống!');
      return;
    }

    onSave({
      ...shop,
      name: name.trim(),
      tagline: tagline.trim() || undefined,
      description: description.trim() || undefined,
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      themeColor,
      logoUrl,
      coverUrl,
      headerBackground,
    });

    setSuccessNotice('Đã lưu thông tin quán vào bản nháp!');
    setError(null);
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-[28px] p-6 border border-[#EFE5D9] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#FF5A36] mb-1">
            <Store className="w-4 h-4" />
            <span>Hồ sơ & Nhận diện quán</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-[#241E35]">
            Thông tin và Giao diện quán
          </h2>
          <p className="text-xs text-[#6E6779] mt-1 font-medium">
            Mọi thay đổi tại đây được lưu vào <strong>Bản nháp</strong>. Bấm <em>Xuất bản ngay</em> ở góc trên để áp dụng ra menu cho khách quét QR.
          </p>
        </div>

        {onOpenPreview && (
          <button
            type="button"
            onClick={onOpenPreview}
            className="min-h-[42px] px-4 py-2 rounded-2xl bg-[#FFF9F3] border border-[#EFE5D9] text-[#241E35] text-xs font-bold hover:bg-[#E5F76A]/40 transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-[#FF5A36]" />
            <span>Xem trước Header khách</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Alerts */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-bold text-xs">{error}</span>
          </div>
        )}

        {successNotice && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-bold text-xs">{successNotice}</span>
          </div>
        )}

        {/* 1. Permanent ID Notice Card */}
        <div className="bg-white rounded-[28px] p-6 border border-[#EFE5D9] shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#241E35] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FF5A36]" />
              <span>Mã định danh bất biến (Shop ID)</span>
            </h3>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Giữ cố định đường dẫn &amp; QR
            </span>
          </div>

          <div className="p-4 bg-[#FFF9F3] rounded-2xl border border-[#EFE5D9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-mono text-sm font-black text-[#241E35]">{shop.id}</div>
              <p className="text-[11px] text-[#6E6779] mt-0.5 font-medium">
                Mã này được cố định từ khi tạo quán để bảo đảm mọi ấn phẩm QR, tem bàn và link đã in không bao giờ bị hỏng khi bạn sửa tên quán.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Basic Shop Information */}
        <div className="bg-white rounded-[28px] p-6 border border-[#EFE5D9] shadow-xs space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#241E35] flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#FF5A36]" />
            <span>Thông tin cơ bản</span>
          </h3>

          {/* Shop Name */}
          <div>
            <label className="block font-bold text-[#241E35] mb-1.5">
              Tên quán <span className="text-rose-600 font-black">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="VD: Bếp & Cà phê Mộc, Tiệm Trà Tháng Năm..."
              className="w-full px-4 py-2.5 rounded-2xl border border-[#EFE5D9] focus:outline-hidden focus:border-[#FF5A36] focus:ring-1 focus:ring-[#FF5A36] text-[#241E35] text-sm font-black"
            />
            <p className="text-[11px] text-[#6E6779] mt-1 font-medium">
              Hiển thị lớn ở đầu thực đơn và tiêu đề thẻ mạng xã hội khi chia sẻ.
            </p>
          </div>

          {/* Tagline */}
          <div>
            <label className="block font-bold text-[#241E35] mb-1.5">
              Khẩu hiệu / Giới thiệu ngắn (Tùy chọn)
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="VD: Hương vị mộc mạc — Đậm đà tình thân"
              className="w-full px-4 py-2.5 rounded-2xl border border-[#EFE5D9] focus:outline-hidden focus:border-[#FF5A36] text-[#241E35] text-xs font-medium"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-[#241E35] mb-1.5">
              Mô tả chi tiết quán (Tùy chọn)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Chuyên phục vụ món cơm tấm sườn nướng than hoa, cà phê rang củi và các dòng trà thảo mộc organic..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-2xl border border-[#EFE5D9] focus:outline-hidden focus:border-[#FF5A36] text-[#241E35] text-xs font-medium resize-none"
            />
          </div>

          {/* Address and Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block font-bold text-[#241E35] mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#FF5A36]" />
                <span>Địa chỉ quán (Tùy chọn)</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="VD: 48 Hàng Bông, Hoàn Kiếm, Hà Nội"
                className="w-full px-4 py-2.5 rounded-2xl border border-[#EFE5D9] focus:outline-hidden focus:border-[#FF5A36] text-[#241E35] text-xs font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-[#241E35] mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#FF5A36]" />
                <span>Số điện thoại / Hotline liên hệ</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="VD: 0912 345 678"
                className="w-full px-4 py-2.5 rounded-2xl border border-[#EFE5D9] focus:outline-hidden focus:border-[#FF5A36] text-[#241E35] text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* 3. Theme Color Selection */}
        <div className="bg-white rounded-[28px] p-6 border border-[#EFE5D9] shadow-xs space-y-4">
          <label className="block font-black text-xs uppercase tracking-wider text-[#241E35] flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-[#FF5A36]" />
            <span>Màu chủ đạo menu & Nhận diện</span>
          </label>
          <p className="text-[11px] text-[#6E6779] font-medium">
            Màu này được áp dụng cho các điểm nhấn chính: nút xem menu, viền nhãn, màu thương hiệu và biểu tượng của quán.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {THEME_PRESETS.map((preset) => {
              const isSelected = themeColor.toLowerCase() === preset.color.toLowerCase();
              return (
                <button
                  key={preset.color}
                  type="button"
                  onClick={() => setThemeColor(preset.color)}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                    isSelected
                      ? 'border-[#241E35] bg-[#FFF9F3] ring-2 ring-[#241E35]/20 shadow-xs'
                      : 'border-[#EFE5D9] hover:border-[#FF5A36]/50 bg-white'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full shrink-0 border border-black/10 shadow-2xs"
                    style={{ backgroundColor: preset.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-[#241E35] block truncate">
                      {preset.name}
                    </span>
                    <span className="text-[10px] text-[#6E6779] font-mono">
                      {preset.color}
                    </span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#241E35] shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <span className="text-xs font-bold text-[#6E6779]">Hoặc chọn mã màu tùy chỉnh:</span>
            <input
              type="color"
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              className="w-9 h-9 rounded-xl cursor-pointer border border-[#EFE5D9] p-0.5 bg-white"
            />
            <input
              type="text"
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              className="w-28 px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-xl border border-[#EFE5D9] text-[#241E35]"
            />
          </div>
        </div>

        {/* 4. Visual Assets: Logo & Header Cover & Full Background */}
        <div className="bg-white rounded-[28px] p-6 border border-[#EFE5D9] shadow-xs space-y-6">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[#241E35] flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-[#FF5A36]" />
              <span>Hình ảnh nhận diện & Trang trí Header</span>
            </h3>
            <p className="text-[11px] text-[#6E6779] mt-0.5 font-medium">
              Tải ảnh logo, ảnh khung trang trí hoặc cài đặt ảnh nền toàn diện cho banner quán.
            </p>
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-xs font-bold text-[#241E35] mb-2">
              1. Logo quán (Tùy chọn)
            </label>
            <input
              type="file"
              ref={logoInputRef}
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />

            {logoUrl ? (
              <div className="flex items-center gap-4 p-3.5 bg-[#FFF9F3] rounded-2xl border border-[#EFE5D9]">
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-2xl object-cover border border-[#EFE5D9] shadow-xs"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-[#241E35]">Logo đã tải lên</div>
                  <div className="text-[11px] text-[#6E6779] mt-0.5">
                    Hiển thị ở góc trái header quán cạnh tên thương hiệu
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={loadingLogo}
                    className="px-3 py-1.5 text-xs font-bold text-[#241E35] bg-white border border-[#EFE5D9] hover:bg-stone-50 rounded-xl cursor-pointer"
                  >
                    Thay ảnh
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoUrl(undefined)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
                    title="Xóa logo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={loadingLogo}
                className="w-full py-3 px-4 border border-dashed border-[#EFE5D9] rounded-2xl hover:bg-[#FFF9F3] flex items-center justify-center gap-2 text-[#6E6779] hover:text-[#241E35] transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-[#FF5A36]" />
                <span className="font-bold">
                  {loadingLogo ? 'Đang nén logo...' : 'Tải lên logo quán (Ảnh vuông hoặc tròn)'}
                </span>
              </button>
            )}
          </div>

          {/* Cover Photo Upload */}
          <div>
            <label className="block text-xs font-bold text-[#241E35] mb-2">
              2. Ảnh khung trang trí bên phải Header (Tùy chọn)
            </label>
            <input
              type="file"
              ref={coverInputRef}
              accept="image/*"
              onChange={handleCoverUpload}
              className="hidden"
            />

            {coverUrl ? (
              <div className="space-y-3 p-3.5 bg-[#FFF9F3] rounded-2xl border border-[#EFE5D9]">
                <div className="h-32 w-full rounded-xl overflow-hidden bg-stone-200 border border-[#EFE5D9]">
                  <img
                    src={coverUrl}
                    alt="Cover preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#6E6779] font-medium">
                    Ảnh nằm trong khung poster ghép lớp hiện đại ở phía bên phải
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={loadingCover}
                      className="px-3 py-1 text-xs font-bold text-[#241E35] bg-white border border-[#EFE5D9] rounded-lg"
                    >
                      Thay ảnh
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverUrl(undefined)}
                      className="px-3 py-1 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg font-bold"
                    >
                      Xóa ảnh
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={loadingCover}
                className="w-full py-3 px-4 border border-dashed border-[#EFE5D9] rounded-2xl hover:bg-[#FFF9F3] flex items-center justify-center gap-2 text-[#6E6779] hover:text-[#241E35] transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-[#FF5A36]" />
                <span className="font-bold">
                  {loadingCover ? 'Đang nén ảnh...' : 'Tải lên ảnh khung trang trí (Tỷ lệ ngang 16:9 hoặc 4:3)'}
                </span>
              </button>
            )}
          </div>

          {/* Full Header Background Photo Section */}
          <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#EFE5D9] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E5F76A] text-[#241E35] flex items-center justify-center font-black shrink-0 shadow-2xs">
                  <ImageIcon className="w-4 h-4 text-[#FF5A36]" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#241E35]">
                    3. Ảnh nền phủ toàn bộ Header
                  </h4>
                  <p className="text-[11px] text-[#6E6779] font-medium">
                    Ảnh chụp không gian quán phủ dưới banner kèm lớp màu gradient bảo vệ chữ
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsHeaderBgModalOpen(true)}
                className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#FF5A36] hover:bg-[#E6431F] text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer self-start sm:self-auto"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{headerBackground?.imageUrl ? 'Chỉnh sửa lớp phủ nền' : 'Cài đặt ảnh nền Header'}</span>
              </button>
            </div>

            {headerBackground?.imageUrl ? (
              <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#EFE5D9]">
                <img
                  src={headerBackground.imageUrl}
                  alt="Header background thumbnail"
                  className="w-20 h-12 rounded-lg object-cover border border-[#EFE5D9]"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-[#241E35] truncate">
                    Đã thiết lập ảnh nền Header
                  </div>
                  <div className="text-[11px] text-[#6E6779]">
                    Lớp phủ: {headerBackground.overlayType === 'dark' ? 'Tối' : 'Sáng'} {headerBackground.overlayOpacity}% · Chữ: {headerBackground.textColorMode === 'auto' ? 'Tự động thích ứng' : headerBackground.textColorMode}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHeaderBackground(undefined)}
                  className="px-2.5 py-1 text-xs text-rose-600 hover:text-rose-700 font-bold underline cursor-pointer"
                >
                  Gỡ ảnh
                </button>
              </div>
            ) : (
              <div className="text-[11px] text-[#6E6779] bg-white/80 p-3 rounded-xl border border-[#EFE5D9]/80 font-medium">
                Đang dùng màu nền sáng và hình khối poster Cam/Tím/Vàng chanh mặc định. Bạn có thể bấm nút phía trên để tải ảnh không gian quán hoặc chọn thư viện ảnh mẫu sẵn có.
              </div>
            )}
          </div>
        </div>

        {/* Submit Bar */}
        <div className="p-4 bg-white rounded-[24px] border border-[#EFE5D9] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-4 z-20">
          <div className="text-xs text-[#6E6779] font-medium flex items-center gap-2">
            <Info className="w-4 h-4 text-[#FF5A36] shrink-0" />
            <span>Thay đổi sẽ được lưu vào <strong>Bản nháp</strong> hiện tại của bạn.</span>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto min-h-[44px] px-7 py-2.5 rounded-2xl bg-[#FF5A36] text-white font-black hover:bg-[#E6431F] transition-all shadow-xs active:scale-[0.98] cursor-pointer"
          >
            Lưu thông tin quán
          </button>
        </div>
      </form>

      {/* Header Background Modal */}
      {isHeaderBgModalOpen && (
        <HeaderBackgroundModal
          isOpen={isHeaderBgModalOpen}
          shop={{ ...shop, headerBackground }}
          onSave={(newConfig) => {
            setHeaderBackground(newConfig);
            setIsHeaderBgModalOpen(false);
            setSuccessNotice('Đã cập nhật cấu hình ảnh nền. Hãy bấm "Lưu thông tin quán" để lưu vào nháp.');
          }}
          onClose={() => setIsHeaderBgModalOpen(false)}
        />
      )}
    </div>
  );
};
