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
import { OperationResult } from '../types/operations';
import { COUNTRY_OPTIONS, validCountry } from '../utils/countries';

interface ShopInfoFormProps {
  shop: ShopSettings;
  onSave: (updatedShop: ShopSettings) => Promise<OperationResult>;
  onOpenPreview?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

const THEME_PRESETS = [
  { name: 'Cam ấm', color: '#FF5A36' },
  { name: 'Tím Trẻ Trung', color: '#7054AE' },
  { name: 'Xanh Ngọc Nhẹ', color: '#E0F1E9' },
  { name: 'Hồng Năng Động', color: '#FF83B5' },
  { name: 'Vàng Bơ Nắng', color: '#F59E0B' },
  { name: 'Xanh Lá Mộc', color: '#1B4D3E' },
  { name: 'Nâu Cà Phê Gỗ', color: '#5C3A21' },
  { name: 'Xanh Ngọc Đậm', color: '#163E37' },
];

export const ShopInfoForm: React.FC<ShopInfoFormProps> = ({ shop, onSave, onOpenPreview, onDirtyChange }) => {
  const [name, setName] = useState(shop.name);
  const [tagline, setTagline] = useState(shop.tagline || '');
  const [description, setDescription] = useState(shop.description || '');
  const [address, setAddress] = useState(shop.address || '');
  const [countryCode, setCountryCode] = useState(shop.countryCode || '');
  const [discoveryImageUrl, setDiscoveryImageUrl] = useState(shop.discoveryImageUrl);
  const [loadingDiscovery, setLoadingDiscovery] = useState(false);
  const discoveryInputRef = useRef<HTMLInputElement | null>(null);
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
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const currentFields = {name,tagline,description,address,countryCode,phone,themeColor,logoUrl,coverUrl,headerBackground,discoveryImageUrl};
  const savedFields = {name:shop.name,tagline:shop.tagline || '',description:shop.description || '',address:shop.address || '',countryCode:shop.countryCode || '',phone:shop.phone || '',themeColor:shop.themeColor || '#FF5A36',logoUrl:shop.logoUrl,coverUrl:shop.coverUrl,headerBackground:shop.headerBackground,discoveryImageUrl:shop.discoveryImageUrl};
  const dirty = JSON.stringify(currentFields) !== JSON.stringify(savedFields);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty,onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload',warn);
    return () => window.removeEventListener('beforeunload',warn);
  }, [dirty]);
  // Retain unsaved fields when an unrelated draft update changes the shop object.
  useEffect(() => {
    if (dirty) return;
    setName(shop.name);
    setTagline(shop.tagline || '');
    setDescription(shop.description || '');
    setAddress(shop.address || '');
    setCountryCode(shop.countryCode || '');
    setDiscoveryImageUrl(shop.discoveryImageUrl);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    if (loadingDiscovery || loadingCover || loadingLogo) { setError('Vui lòng đợi ảnh xử lý xong trước khi lưu.'); return; }
    if (!name.trim()) {
      setError('Tên quán là bắt buộc và không được để trống!');
      return;
    }
    if (!validCountry(countryCode)) { setError('Vui lòng chọn quốc gia hợp lệ.'); return; }

    setName(name.trim()); setTagline(tagline.trim()); setDescription(description.trim()); setAddress(address.trim()); setPhone(phone.trim());
    savingRef.current = true;
    setIsSaving(true);
    setSuccessNotice(null);
    try {
    const result = await onSave({
      ...shop,
      name: name.trim(),
      tagline: tagline.trim() || undefined,
      description: description.trim() || undefined,
      address: address.trim() || undefined,
      countryCode: countryCode || undefined,
      discoveryImageUrl,
      phone: phone.trim() || undefined,
      themeColor,
      logoUrl,
      coverUrl,
      headerBackground,
    });

    if (!result.success) {
      setError(result.error || 'Không thể lưu thông tin quán.');
      return;
    }
    if(result.savedDraft){
      const saved=result.savedDraft.shop;
      setLogoUrl(current=>current===logoUrl?saved.logoUrl:current);
      setCoverUrl(current=>current===coverUrl?saved.coverUrl:current);
      setDiscoveryImageUrl(current=>current===discoveryImageUrl?saved.discoveryImageUrl:current);
      setHeaderBackground(current=>JSON.stringify(current)===JSON.stringify(headerBackground)?saved.headerBackground:current);
    }
    setSuccessNotice(result.storage === 'cloud' ? 'Đã lưu thông tin quán lên đám mây!' : 'Đã lưu thông tin quán trên trình duyệt này.');
    setError(null);
    setTimeout(() => setSuccessNotice(null), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Không thể lưu thông tin quán.');
    } finally { savingRef.current = false; setIsSaving(false); }
  };

  return (
    <div className="owner-info max-w-4xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="bg-[#FFFCF7] rounded-[28px] p-6 border border-[#E2D8CF] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#7054AE] mb-1">
            <Store className="w-4 h-4" />
            <span>Hồ sơ & Nhận diện quán</span>
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-[#163E37]">
            Thông tin và Giao diện quán
          </h2>
          <p className="text-xs text-[#746E79] mt-1 font-medium">
            Bấm lưu để ghi thay đổi vào <strong>Bản nháp</strong>. Bấm <em>Xuất bản ngay</em> ở góc trên để áp dụng ra menu cho khách quét QR.
          </p>
        </div>

        {onOpenPreview && (
          <button
            type="button"
            onClick={onOpenPreview}
            className="min-h-[42px] px-4 py-2 rounded-2xl bg-[#F4ECDF] border border-[#E2D8CF] text-[#163E37] text-xs font-bold hover:bg-[#E0F1E9]/40 transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-[#7054AE]" />
            <span>Xem trước Header khách</span>
          </button>
        )}
      </div>

      <form id="owner-shop-info-form" onSubmit={handleSubmit} className="space-y-6 text-xs">
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
        <div className="bg-[#FFFCF7] rounded-[28px] p-6 border border-[#E2D8CF] shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#163E37] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#7054AE]" />
              <span>Mã định danh bất biến (Shop ID)</span>
            </h3>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Giữ cố định đường dẫn &amp; QR
            </span>
          </div>

          <div className="p-4 bg-[#F4ECDF] rounded-2xl border border-[#E2D8CF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-mono text-sm font-semibold text-[#163E37]">{shop.id}</div>
              <p className="text-[11px] text-[#746E79] mt-0.5 font-medium">
                Mã này được cố định từ khi tạo quán để bảo đảm mọi ấn phẩm QR, tem bàn và link đã in không bao giờ bị hỏng khi bạn sửa tên quán.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Basic Shop Information */}
        <div className="bg-[#FFFCF7] rounded-[28px] p-6 border border-[#E2D8CF] shadow-xs space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#163E37] flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#7054AE]" />
            <span>Thông tin cơ bản</span>
          </h3>

          {/* Shop Name */}
          <div>
            <label htmlFor="shopinfoform-1" className="block font-bold text-[#163E37] mb-1.5">
              Tên quán <span className="text-rose-600 font-semibold">*</span>
            </label>
            <input id="shopinfoform-1"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="VD: Bếp & Cà phê Mộc, Tiệm Trà Tháng Năm..."
              className="w-full px-4 py-2.5 rounded-2xl border border-[#E2D8CF] focus:outline-hidden focus:border-[#7054AE] focus:ring-1 focus:ring-[#7054AE] text-[#163E37] text-sm font-semibold"
            />
            <p className="text-[11px] text-[#746E79] mt-1 font-medium">
              Hiển thị lớn ở đầu thực đơn và tiêu đề thẻ mạng xã hội khi chia sẻ.
            </p>
          </div>

          {/* Tagline */}
          <div>
            <label htmlFor="shopinfoform-2" className="block font-bold text-[#163E37] mb-1.5">
              Khẩu hiệu / Giới thiệu ngắn (Tùy chọn)
            </label>
            <input id="shopinfoform-2"
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="VD: Hương vị mộc mạc — Đậm đà tình thân"
              className="w-full px-4 py-2.5 rounded-2xl border border-[#E2D8CF] focus:outline-hidden focus:border-[#7054AE] text-[#163E37] text-xs font-medium"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="shopinfoform-3" className="block font-bold text-[#163E37] mb-1.5">
              Mô tả chi tiết quán (Tùy chọn)
            </label>
            <textarea id="shopinfoform-3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Chuyên phục vụ món cơm tấm sườn nướng than hoa, cà phê rang củi và các dòng trà thảo mộc organic..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-2xl border border-[#E2D8CF] focus:outline-hidden focus:border-[#7054AE] text-[#163E37] text-xs font-medium resize-none"
            />
          </div>

          <div>
            <label htmlFor="shop-country" className="block font-bold text-[#163E37] mb-1.5">Quốc gia / vùng lãnh thổ</label>
            <select id="shop-country" value={countryCode} onChange={event => setCountryCode(event.target.value)} className="w-full border border-[#E2D8CF] rounded-xl px-3 py-3 bg-[#F4ECDF]">
              <option value="">Chưa chọn quốc gia</option>
              {COUNTRY_OPTIONS.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}
            </select>
            <p className="text-[11px] text-[#746E79] mt-2">Giúp khách tìm quán theo quốc gia. Lưu rồi xuất bản để cập nhật danh sách khám phá.</p>
          </div>
          {/* Address and Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label htmlFor="shopinfoform-4" className="block font-bold text-[#163E37] mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#7054AE]" />
                <span>Địa chỉ quán (Tùy chọn)</span>
              </label>
              <input id="shopinfoform-4"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="VD: 48 Hàng Bông, Hoàn Kiếm, Hà Nội"
                className="w-full px-4 py-2.5 rounded-2xl border border-[#E2D8CF] focus:outline-hidden focus:border-[#7054AE] text-[#163E37] text-xs font-medium"
              />
            </div>
            <div>
              <label htmlFor="shopinfoform-5" className="block font-bold text-[#163E37] mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#7054AE]" />
                <span>Số điện thoại / Hotline liên hệ</span>
              </label>
              <input id="shopinfoform-5"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="VD: 0912 345 678"
                className="w-full px-4 py-2.5 rounded-2xl border border-[#E2D8CF] focus:outline-hidden focus:border-[#7054AE] text-[#163E37] text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* 3. Theme Color Selection */}
        <div className="bg-[#FFFCF7] rounded-[28px] p-6 border border-[#E2D8CF] shadow-xs space-y-4">
          <h3 className="block font-semibold text-xs uppercase tracking-wider text-[#163E37] flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-[#7054AE]" />
            <span>Màu logo chữ</span>
          </h3>
          <p className="text-[11px] text-[#746E79] font-medium">
            Dùng cho logo chữ khi chưa có ảnh logo. Nền menu giữ bộ màu beige, lavender và xanh ngọc.
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
                      ? 'border-[#163E37] bg-[#F4ECDF] ring-2 ring-[#163E37]/20 shadow-xs'
                      : 'border-[#E2D8CF] hover:border-[#7054AE]/50 bg-[#FFFCF7]'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full shrink-0 border border-black/10 shadow-2xs"
                    style={{ backgroundColor: preset.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-[#163E37] block truncate">
                      {preset.name}
                    </span>
                    <span className="text-[10px] text-[#746E79] font-mono">
                      {preset.color}
                    </span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#163E37] shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <span className="text-xs font-bold text-[#746E79]">Hoặc chọn mã màu tùy chỉnh:</span>
            <input
              type="color" aria-label="Chọn màu logo chữ"
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              className="w-9 h-9 rounded-xl cursor-pointer border border-[#E2D8CF] p-0.5 bg-[#FFFCF7]"
            />
            <input
              type="text" aria-label="Mã màu logo chữ" pattern="#[0-9a-fA-F]{6}"
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              className="w-28 px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-xl border border-[#E2D8CF] text-[#163E37]"
            />
          </div>
        </div>

        {/* 4. Visual Assets: Logo & Header Cover & Full Background */}
        <div className="bg-[#FFFCF7] rounded-[28px] p-6 border border-[#E2D8CF] shadow-xs space-y-6">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#163E37] flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-[#7054AE]" />
              <span>Hình ảnh của quán</span>
            </h3>
            <p className="text-[11px] text-[#746E79] mt-0.5 font-medium">
              Chọn logo, ảnh bìa và ảnh khám phá. Ảnh danh mục được quản lý trong phần Thực đơn.
            </p>
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-xs font-bold text-[#163E37] mb-2">
              1. Logo quán (Tùy chọn)
            </label>
            <input id="shopinfoform-6"
              type="file"
              ref={logoInputRef}
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />

            {logoUrl ? (
              <div className="flex items-center gap-4 p-3.5 bg-[#F4ECDF] rounded-2xl border border-[#E2D8CF]">
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-2xl object-cover border border-[#E2D8CF] shadow-xs"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[#163E37]">Logo đã tải lên</div>
                  <div className="text-[11px] text-[#746E79] mt-0.5">
                    Hiển thị ở góc trái header quán cạnh tên thương hiệu
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={loadingLogo}
                    className="px-3 py-1.5 text-xs font-bold text-[#163E37] bg-[#FFFCF7] border border-[#E2D8CF] hover:bg-stone-50 rounded-xl cursor-pointer"
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
                className="w-full py-3 px-4 border border-dashed border-[#E2D8CF] rounded-2xl hover:bg-[#F4ECDF] flex items-center justify-center gap-2 text-[#746E79] hover:text-[#163E37] transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-[#7054AE]" />
                <span className="font-bold">
                  {loadingLogo ? 'Đang nén logo...' : 'Tải logo (ảnh vuông 512 × 512 px; tối đa 5 MB)'}
                </span>
              </button>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-[#F2EDFF] border border-[#DDD2FF] space-y-3">
            <h4 className="font-semibold text-[#163E37]">Ảnh đại diện trên trang khám phá</h4>
            <p className="text-[11px] text-[#746E79]">Gợi ý ảnh ngang 4:3, 1200 × 900 px; JPG, PNG, WebP, tối đa 5 MB. Nếu chưa chọn, thẻ quán dùng ảnh bìa, nền Header hoặc logo đã xuất bản.</p>
            <input ref={discoveryInputRef} type="file" accept="image/*" className="hidden" aria-label="Tải ảnh đại diện khám phá" onChange={async event => {
              const file = event.target.files?.[0]; if (!file) return;
              setLoadingDiscovery(true); setError(null);
              try {
                let compressed = await compressImageFile(file, 480, 0.7);
                if (compressed.length > 160000) compressed = await compressImageFile(file, 320, 0.6);
                if (compressed.length > 160000) throw new Error('Ảnh quá lớn sau khi nén. Hãy chọn ảnh khác.');
                setDiscoveryImageUrl(compressed);
                setSuccessNotice('Đã chọn ảnh khám phá. Lưu thông tin quán rồi xuất bản để cập nhật.');
              } catch (failure) { setError(failure instanceof Error ? failure.message : 'Không tải được ảnh.'); }
              finally { setLoadingDiscovery(false); if (discoveryInputRef.current) discoveryInputRef.current.value = ''; }
            }} />
            {discoveryImageUrl && <img src={discoveryImageUrl} alt="Ảnh đại diện khám phá của quán" className="w-full max-w-sm aspect-[4/3] object-contain rounded-2xl" />}
            <div className="flex gap-3">
              <button type="button" disabled={loadingDiscovery} onClick={() => discoveryInputRef.current?.click()} className="px-4 py-2 rounded-xl bg-[#7054AE] text-white font-bold disabled:opacity-50">{loadingDiscovery ? 'Đang xử lý ảnh…' : discoveryImageUrl ? 'Đổi ảnh khám phá' : 'Tải ảnh khám phá'}</button>
              {discoveryImageUrl && <button type="button" disabled={loadingDiscovery} onClick={() => setDiscoveryImageUrl(undefined)} className="px-4 py-2 rounded-xl bg-[#FFFCF7] font-bold">Gỡ ảnh</button>}
            </div>
          </div>
          {/* Cover Photo Upload */}
          <div>
            <label htmlFor="shopinfoform-7" className="block text-xs font-bold text-[#163E37] mb-2">
              2. Ảnh bìa dự phòng của menu
            </label>
            <input id="shopinfoform-7"
              type="file"
              ref={coverInputRef}
              accept="image/*"
              onChange={handleCoverUpload}
              className="hidden"
            />

            {coverUrl ? (
              <div className="space-y-3 p-3.5 bg-[#F4ECDF] rounded-2xl border border-[#E2D8CF]">
                <div className="h-32 w-full rounded-xl overflow-hidden bg-stone-200 border border-[#E2D8CF]">
                  <img
                    src={coverUrl}
                    alt="Cover preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#746E79] font-medium">
                    Gợi ý ảnh bìa ngang 16:9, 1600 × 900 px. JPG, PNG, WebP; tối đa 5 MB.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={loadingCover}
                      className="px-3 py-1 text-xs font-bold text-[#163E37] bg-[#FFFCF7] border border-[#E2D8CF] rounded-lg"
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
                className="w-full py-3 px-4 border border-dashed border-[#E2D8CF] rounded-2xl hover:bg-[#F4ECDF] flex items-center justify-center gap-2 text-[#746E79] hover:text-[#163E37] transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-[#7054AE]" />
                <span className="font-bold">
                  {loadingCover ? 'Đang nén ảnh...' : 'Tải ảnh bìa (gợi ý 1600 × 900 px)'}
                </span>
              </button>
            )}
          </div>

          {/* Full Header Background Photo Section */}
          <div className="p-4 rounded-2xl bg-[#F4ECDF] border border-[#E2D8CF] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E0F1E9] text-[#163E37] flex items-center justify-center font-semibold shrink-0 shadow-2xs">
                  <ImageIcon className="w-4 h-4 text-[#7054AE]" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#163E37]">
                    3. Ảnh bìa chính của menu
                  </h4>
                  <p className="text-[11px] text-[#746E79] font-medium">
                    Ảnh này hiển thị trong khung cong lớn. Khung vòm cạnh tên quán dùng ảnh món đầu tiên có ảnh.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsHeaderBgModalOpen(true)}
                className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#7054AE] hover:bg-[#624598] text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer self-start sm:self-auto"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{headerBackground?.imageUrl ? 'Chỉnh sửa lớp phủ nền' : 'Cài đặt ảnh nền Header'}</span>
              </button>
            </div>

            {headerBackground?.imageUrl ? (
              <div className="flex items-center gap-3 p-3 bg-[#FFFCF7] rounded-xl border border-[#E2D8CF]">
                <img
                  src={headerBackground.imageUrl}
                  alt="Header background thumbnail"
                  className="w-20 h-12 rounded-lg object-cover border border-[#E2D8CF]"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[#163E37] truncate">
                    Đã thiết lập ảnh nền Header
                  </div>
                  <div className="text-[11px] text-[#746E79]">
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
              <div className="text-[11px] text-[#746E79] bg-[#FFFCF7]/80 p-3 rounded-xl border border-[#E2D8CF]/80 font-medium">
                Chưa chọn ảnh bìa chính. Menu dùng ảnh bìa dự phòng hoặc ảnh khám phá nếu có.
              </div>
            )}
          </div>
        </div>

        {/* Submit Bar */}
        <div className="p-4 bg-[#FFFCF7] rounded-[24px] border border-[#E2D8CF] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-4 z-20">
          <div className="text-xs text-[#746E79] font-medium flex items-center gap-2">
            <Info className="w-4 h-4 text-[#7054AE] shrink-0" />
            <span>Thay đổi sẽ được lưu vào <strong>Bản nháp</strong> hiện tại của bạn.</span>
          </div>

          <button
            type="submit"
            disabled={isSaving || loadingDiscovery || loadingCover || loadingLogo}
            className="w-full sm:w-auto min-h-[44px] px-7 py-2.5 rounded-2xl bg-[#7054AE] text-white font-semibold hover:bg-[#624598] transition-all shadow-xs active:scale-[0.98] cursor-pointer"
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
