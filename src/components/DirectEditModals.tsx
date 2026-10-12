import React, { useState, useRef } from 'react';
import { X, Check, Upload, Plus, Trash2, Camera, DollarSign, Edit3, AlertCircle } from 'lucide-react';
import { MenuItem, PriceOption, ShopSettings } from '../types/menu';
import { formatVND, parseVND } from '../utils/format';
import { compressImageFile } from '../utils/image';

interface EditShopNameModalProps {
  isOpen: boolean;
  shop: ShopSettings;
  onSave: (name: string, tagline?: string) => void;
  onClose: () => void;
}

export const EditShopNameModal: React.FC<EditShopNameModalProps> = ({
  isOpen,
  shop,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(shop.name);
  const [tagline, setTagline] = useState(shop.tagline || '');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Tên quán không được để trống!');
      return;
    }
    onSave(name.trim(), tagline.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-sm rounded-[28px] shadow-2xl overflow-hidden border border-[#EFE5D9]">
        <div className="p-5 border-b border-[#EFE5D9] flex items-center justify-between bg-[#FFF9F3]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E5F76A] text-[#241E35] flex items-center justify-center font-bold">
              <Edit3 className="w-4 h-4 text-[#FF5A36]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#241E35]">Chỉnh sửa tên quán</h3>
              <p className="text-[11px] text-[#6E6779]">Cập nhật tiêu đề poster menu</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-[#6E6779] hover:bg-[#FFF0EB] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block font-bold text-[#241E35] mb-1">
              Tên quán <span className="text-[#FF5A36]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="VD: Bếp & Cà phê Mộc"
              autoFocus
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-[#EFE5D9] focus:outline-hidden focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/20 text-sm font-bold text-[#241E35]"
            />
          </div>

          <div>
            <label className="block font-bold text-[#241E35] mb-1">
              Khẩu hiệu / Giới thiệu ngắn
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="VD: Hương vị mộc mạc — Đậm đà tình thân"
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-[#EFE5D9] focus:outline-hidden focus:border-[#FF5A36] text-xs text-[#241E35]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EFE5D9]">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[38px] px-4 py-2 rounded-xl text-[#6E6779] hover:bg-[#FFF9F3] font-semibold"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="min-h-[38px] px-5 py-2 rounded-xl bg-[#FF5A36] text-white font-black hover:bg-[#E6431F] transition-colors shadow-xs"
            >
              Xác nhận
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EditItemPriceModalProps {
  isOpen: boolean;
  item: MenuItem | null;
  onSave: (updatedItem: MenuItem) => void;
  onClose: () => void;
}

export const EditItemPriceModal: React.FC<EditItemPriceModalProps> = ({
  isOpen,
  item,
  onSave,
  onClose,
}) => {
  if (!isOpen || !item) return null;

  const [pricingMode, setPricingMode] = useState<MenuItem['pricingMode']>(item.pricingMode);
  const [singlePrice, setSinglePrice] = useState<number>(item.price || 0);
  const [singlePriceInput, setSinglePriceInput] = useState<string>(
    item.price ? item.price.toString() : ''
  );
  const [options, setOptions] = useState<PriceOption[]>(
    item.options && item.options.length > 0
      ? JSON.parse(JSON.stringify(item.options))
      : [
          { id: 'opt-new-1', name: 'Size M', price: 30000 },
          { id: 'opt-new-2', name: 'Size L', price: 38000 },
        ]
  );
  const [error, setError] = useState<string | null>(null);

  const handleAddOption = () => {
    const newId = 'opt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
    setOptions([...options, { id: newId, name: '', price: 0 }]);
  };

  const handleUpdateOption = (id: string, field: 'name' | 'price', value: any) => {
    setOptions(
      options.map((opt) => {
        if (opt.id === id) {
          return {
            ...opt,
            [field]: field === 'price' ? parseVND(value) : value,
          };
        }
        return opt;
      })
    );
  };

  const handleRemoveOption = (id: string) => {
    if (options.length <= 1) {
      setError('Món nhiều lựa chọn cần có ít nhất 1 lựa chọn giá!');
      return;
    }
    setOptions(options.filter((opt) => opt.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pricingMode === 'single') {
      if (isNaN(singlePrice) || singlePrice < 0) {
        setError('Giá món phải là số hợp lệ không âm!');
        return;
      }
      onSave({
        ...item,
        pricingMode: 'single',
        price: singlePrice,
      });
    } else {
      if (options.length === 0) {
        setError('Vui lòng thêm ít nhất một lựa chọn giá!');
        return;
      }
      for (const opt of options) {
        if (!opt.name.trim()) {
          setError('Tên của mọi lựa chọn không được để trống!');
          return;
        }
        if (isNaN(opt.price) || opt.price < 0) {
          setError(`Giá của "${opt.name}" phải là số không âm!`);
          return;
        }
      }
      const minPrice = Math.min(...options.map((o) => o.price));
      onSave({
        ...item,
        pricingMode: 'multiple',
        price: minPrice,
        options,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden border border-[#EFE5D9]">
        <div className="p-5 border-b border-[#EFE5D9] flex items-center justify-between bg-[#FFF9F3]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E5F76A] text-[#241E35] flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4 text-[#FF5A36]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#241E35]">Chỉnh sửa giá món</h3>
              <p className="text-[11px] text-[#6E6779] truncate max-w-[200px]">{item.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-[#6E6779] hover:bg-[#FFF0EB] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-medium">
              {error}
            </div>
          )}

          {/* Pricing mode switch */}
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#241E35]">Chế độ giá:</span>
            <div className="inline-flex rounded-xl p-0.5 bg-[#FFF9F3] border border-[#EFE5D9]">
              <button
                type="button"
                onClick={() => setPricingMode('single')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  pricingMode === 'single'
                    ? 'bg-white text-[#FF5A36] shadow-xs'
                    : 'text-[#6E6779] hover:text-[#241E35]'
                }`}
              >
                Một giá
              </button>
              <button
                type="button"
                onClick={() => setPricingMode('multiple')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  pricingMode === 'multiple'
                    ? 'bg-white text-[#FF5A36] shadow-xs'
                    : 'text-[#6E6779] hover:text-[#241E35]'
                }`}
              >
                Nhiều lựa chọn
              </button>
            </div>
          </div>

          {pricingMode === 'single' ? (
            <div className="bg-[#FFF9F3] p-4 rounded-2xl border border-[#EFE5D9]">
              <label className="block text-xs font-bold text-[#241E35] mb-1.5">
                Đơn giá bán (VNĐ)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={singlePriceInput}
                  onChange={(e) => {
                    setSinglePriceInput(e.target.value);
                    setSinglePrice(parseVND(e.target.value));
                    setError(null);
                  }}
                  autoFocus
                  placeholder="VD: 45000"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#EFE5D9] text-base font-bold text-[#241E35] pr-20 bg-white"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-[#FF5A36]">
                  {formatVND(singlePrice)}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-[#FFF9F3] p-3.5 rounded-2xl border border-[#EFE5D9] space-y-2.5">
              <div className="flex items-center justify-between font-bold text-[#241E35]">
                <span>Các lựa chọn &amp; Giá</span>
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="text-xs text-[#FF5A36] font-bold hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm dòng
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {options.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt.name}
                      onChange={(e) => handleUpdateOption(opt.id, 'name', e.target.value)}
                      placeholder={`Lựa chọn ${idx + 1}`}
                      className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl border border-[#EFE5D9] bg-white text-xs font-medium"
                    />
                    <div className="w-32 relative">
                      <input
                        type="text"
                        value={opt.price ? opt.price.toString() : ''}
                        onChange={(e) => handleUpdateOption(opt.id, 'price', e.target.value)}
                        placeholder="Giá"
                        className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-[#EFE5D9] bg-white text-xs font-mono pr-6"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#6E6779]">
                        đ
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(opt.id)}
                      className="w-8 h-8 rounded-lg text-[#6E6779] hover:text-rose-600 flex items-center justify-center shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EFE5D9]">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[38px] px-4 py-2 rounded-xl text-[#6E6779] hover:bg-[#FFF9F3] font-semibold"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="min-h-[38px] px-5 py-2 rounded-xl bg-[#FF5A36] text-white font-black hover:bg-[#E6431F] transition-colors shadow-xs"
            >
              Xác nhận
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EditItemTitleModalProps {
  isOpen: boolean;
  item: MenuItem | null;
  onSave: (updatedItem: MenuItem) => void;
  onClose: () => void;
}

export const EditItemTitleModal: React.FC<EditItemTitleModalProps> = ({
  isOpen,
  item,
  onSave,
  onClose,
}) => {
  if (!isOpen || !item) return null;

  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description || '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Tên món không được để trống!');
      return;
    }
    onSave({
      ...item,
      name: name.trim(),
      description: description.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-sm rounded-[28px] shadow-2xl overflow-hidden border border-[#EFE5D9]">
        <div className="p-5 border-b border-[#EFE5D9] flex items-center justify-between bg-[#FFF9F3]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E5F76A] text-[#241E35] flex items-center justify-center font-bold">
              <Edit3 className="w-4 h-4 text-[#FF5A36]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#241E35]">Chỉnh sửa tên món</h3>
              <p className="text-[11px] text-[#6E6779]">Cập nhật tiêu đề và mô tả nhanh</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-[#6E6779] hover:bg-[#FFF0EB] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block font-bold text-[#241E35] mb-1">
              Tên món ăn / đồ uống <span className="text-[#FF5A36]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              autoFocus
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-[#EFE5D9] focus:outline-hidden focus:border-[#FF5A36] text-sm font-bold text-[#241E35]"
            />
          </div>

          <div>
            <label className="block font-bold text-[#241E35] mb-1">Mô tả ngắn</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full p-3 rounded-xl border border-[#EFE5D9] focus:outline-hidden focus:border-[#FF5A36] text-xs text-[#241E35] resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EFE5D9]">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[38px] px-4 py-2 rounded-xl text-[#6E6779] hover:bg-[#FFF9F3] font-semibold"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="min-h-[38px] px-5 py-2 rounded-xl bg-[#FF5A36] text-white font-black hover:bg-[#E6431F] transition-colors shadow-xs"
            >
              Xác nhận
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ChangeImageModalProps {
  isOpen: boolean;
  title: string;
  currentImageUrl?: string;
  onSave: (imageUrl?: string) => void;
  onClose: () => void;
}

export const ChangeImageModal: React.FC<ChangeImageModalProps> = ({
  isOpen,
  title,
  currentImageUrl,
  onSave,
  onClose,
}) => {
  if (!isOpen) return null;

  const [preview, setPreview] = useState<string | undefined>(currentImageUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const compressed = await compressImageFile(file, 800, 0.75);
      setPreview(compressed);
    } catch (err: any) {
      setError(err.message || 'Lỗi tải ảnh');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirm = () => {
    onSave(preview);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-sm rounded-[28px] shadow-2xl overflow-hidden border border-[#EFE5D9]">
        <div className="p-5 border-b border-[#EFE5D9] flex items-center justify-between bg-[#FFF9F3]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E5F76A] text-[#241E35] flex items-center justify-center font-bold">
              <Camera className="w-4 h-4 text-[#FF5A36]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#241E35]">{title}</h3>
              <p className="text-[11px] text-[#6E6779]">Chọn tệp từ điện thoại / máy tính</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-[#6E6779] hover:bg-[#FFF0EB] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-medium">
              {error}
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />

          {preview ? (
            <div className="space-y-3">
              <div className="w-full h-44 rounded-2xl overflow-hidden bg-black/10 border border-[#EFE5D9] relative">
                <img
                  src={preview}
                  alt="Xem trước"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl border border-[#EFE5D9] text-[#241E35] font-bold hover:bg-[#FFF9F3]"
                >
                  Chọn ảnh khác
                </button>
                <button
                  type="button"
                  onClick={() => setPreview(undefined)}
                  className="px-3 py-1.5 rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 font-semibold"
                >
                  Xóa ảnh
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full h-36 border-2 border-dashed border-[#EFE5D9] rounded-2xl hover:border-[#FF5A36] hover:bg-[#FFF9F3] flex flex-col items-center justify-center gap-2 text-[#6E6779] transition-colors"
            >
              <Upload className="w-6 h-6 text-[#FF5A36]" />
              <span className="font-bold">
                {loading ? 'Đang nén ảnh...' : 'Nhấn để chọn ảnh từ máy'}
              </span>
              <span className="text-[11px] text-[#6E6779]">PNG, JPG dung lượng tối đa 5MB</span>
            </button>
          )}

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EFE5D9]">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[38px] px-4 py-2 rounded-xl text-[#6E6779] hover:bg-[#FFF9F3] font-semibold"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="min-h-[38px] px-5 py-2 rounded-xl bg-[#FF5A36] text-white font-black hover:bg-[#E6431F] transition-colors shadow-xs"
            >
              Lưu ảnh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
