import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Upload,
  AlertCircle,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { MenuItem, MenuCategory, PricingMode, MenuItemStatus, PriceOption } from '../types/menu';
import { formatVND, parseVND, formatThousands } from '../utils/format';
import { compressImageFile } from '../utils/image';

interface ItemModalProps {
  isOpen: boolean;
  item: MenuItem | null; // null if creating new
  categories: MenuCategory[];
  defaultCategoryId?: string;
  onSave: (itemData: Omit<MenuItem, 'id' | 'order'> & { id?: string }) => void;
  onClose: () => void;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  item,
  categories,
  defaultCategoryId,
  onSave,
  onClose,
}) => {
  const isEditing = !!item;

  // Form states
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [pricingMode, setPricingMode] = useState<PricingMode>('single');
  const [singlePrice, setSinglePrice] = useState<number>(0);
  const [singlePriceInput, setSinglePriceInput] = useState<string>('');
  
  // Multiple options
  const [options, setOptions] = useState<Array<{ id: string; name: string; price: number; priceInput: string }>>([]);
  
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<MenuItemStatus>('available');

  const [imageLoading, setImageLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize or reset form state when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(item?.name || '');
      setCategoryId(item?.categoryId || defaultCategoryId || categories[0]?.id || '');
      setPricingMode(item?.pricingMode || 'single');
      
      const currentPrice = item?.price || 0;
      setSinglePrice(currentPrice);
      setSinglePriceInput(currentPrice > 0 ? formatThousands(currentPrice) : '');

      if (item?.options && item.options.length > 0) {
        setOptions(
          item.options.map((opt) => ({
            id: opt.id,
            name: opt.name,
            price: opt.price,
            priceInput: opt.price > 0 ? formatThousands(opt.price) : '',
          }))
        );
      } else {
        setOptions([
          { id: 'opt-new-1', name: 'Size M', price: 30000, priceInput: formatThousands(30000) },
          { id: 'opt-new-2', name: 'Size L', price: 38000, priceInput: formatThousands(38000) },
        ]);
      }

      setDescription(item?.description || '');
      setImageUrl(item?.imageUrl);
      setStatus(item?.status || 'available');
      setFieldErrors({});
      setShowDiscardPrompt(false);
      setIsSubmitting(false);
    }
  }, [isOpen, item, defaultCategoryId, categories]);

  if (!isOpen) return null;

  // Dirty state detection
  const isDirty =
    name !== (item?.name || '') ||
    categoryId !== (item?.categoryId || defaultCategoryId || categories[0]?.id || '') ||
    pricingMode !== (item?.pricingMode || 'single') ||
    (pricingMode === 'single' && singlePrice !== (item?.price || 0)) ||
    (pricingMode === 'multiple' &&
      JSON.stringify(options.map((o) => ({ name: o.name, price: o.price }))) !==
        JSON.stringify((item?.options || []).map((o) => ({ name: o.name, price: o.price })))) ||
    description !== (item?.description || '') ||
    imageUrl !== item?.imageUrl ||
    status !== (item?.status || 'available');

  const handleRequestClose = () => {
    if (isDirty) {
      setShowDiscardPrompt(true);
    } else {
      onClose();
    }
  };

  // Handle single price typing
  const handleSinglePriceChange = (val: string) => {
    const rawNumber = parseVND(val);
    setSinglePrice(rawNumber);
    setSinglePriceInput(rawNumber > 0 ? formatThousands(rawNumber) : val === '' ? '' : '0');
    
    if (fieldErrors.price) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.price;
        return next;
      });
    }
  };

  // Multiple option handlers
  const handleAddOption = () => {
    const newId = 'opt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    setOptions((prev) => [
      ...prev,
      { id: newId, name: '', price: 0, priceInput: '' },
    ]);
  };

  const handleUpdateOptionName = (id: string, newName: string) => {
    setOptions((prev) =>
      prev.map((opt) => (opt.id === id ? { ...opt, name: newName } : opt))
    );
    if (fieldErrors.options) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.options;
        return next;
      });
    }
  };

  const handleUpdateOptionPrice = (id: string, val: string) => {
    const rawNumber = parseVND(val);
    setOptions((prev) =>
      prev.map((opt) =>
        opt.id === id
          ? {
              ...opt,
              price: rawNumber,
              priceInput: rawNumber > 0 ? formatThousands(rawNumber) : val === '' ? '' : '0',
            }
          : opt
      )
    );
    if (fieldErrors.options) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.options;
        return next;
      });
    }
  };

  const handleRemoveOption = (id: string) => {
    if (options.length <= 1) {
      setFieldErrors((prev) => ({
        ...prev,
        options: 'Món nhiều lựa chọn cần có ít nhất 1 dòng lựa chọn giá!',
      }));
      return;
    }
    setOptions((prev) => prev.filter((opt) => opt.id !== id));
  };

  // Image upload handler with client compression
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageLoading(true);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.image;
      return next;
    });

    try {
      const compressedDataUrl = await compressImageFile(file, 800, 0.75);
      setImageUrl(compressedDataUrl);
    } catch (err: any) {
      setFieldErrors((prev) => ({
        ...prev,
        image: err.message || 'Không thể tải ảnh lên, vui lòng thử lại ảnh khác',
      }));
    } finally {
      setImageLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setImageUrl(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit validation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    const trimmedName = name.trim();
    if (!trimmedName) {
      errors.name = 'Vui lòng nhập tên món ăn / đồ uống';
    }

    if (!categoryId) {
      errors.categoryId = 'Vui lòng chọn nhóm món cho món này';
    }

    if (pricingMode === 'single') {
      if (isNaN(singlePrice) || singlePrice <= 0) {
        errors.price = 'Giá bán phải là số tiền lớn hơn 0 VNĐ';
      }
    } else {
      if (options.length === 0) {
        errors.options = 'Vui lòng thêm ít nhất một lựa chọn giá (size/loại)';
      } else {
        for (let i = 0; i < options.length; i++) {
          const opt = options[i];
          if (!opt.name.trim()) {
            errors.options = `Lựa chọn thứ ${i + 1} chưa có tên (VD: Size M, Đùi gà...)`;
            break;
          }
          if (isNaN(opt.price) || opt.price <= 0) {
            errors.options = `Giá của lựa chọn "${opt.name}" phải lớn hơn 0 VNĐ`;
            break;
          }
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    const cleanedOptions: PriceOption[] =
      pricingMode === 'multiple'
        ? options.map((o) => ({
            id: o.id,
            name: o.name.trim(),
            price: Math.max(0, Math.floor(o.price)),
          }))
        : [];

    const finalPrice =
      pricingMode === 'single'
        ? Math.max(0, Math.floor(singlePrice))
        : Math.min(...cleanedOptions.map((o) => o.price));

    setTimeout(() => {
      onSave({
        id: item?.id,
        name: trimmedName,
        categoryId,
        pricingMode,
        price: finalPrice,
        options: cleanedOptions,
        description: description.trim() || undefined,
        imageUrl,
        imageSources:item?.imageSources?.original===imageUrl ? item?.imageSources : undefined,
        status,
      });
      setIsSubmitting(false);
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-[#FFFCF7] w-full max-w-lg rounded-[28px] shadow-xl overflow-hidden my-4 sm:my-6 flex flex-col max-h-[92vh] border border-[#E2D8CF]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E2D8CF] flex items-center justify-between bg-[#F4ECDF] shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[#163E37]">
              {isEditing ? 'Chỉnh sửa món' : 'Thêm món mới'}
            </h2>
            <p className="text-xs text-[#746E79] mt-0.5 font-medium">
              Cập nhật tên, nhóm món, giá và trạng thái bán
            </p>
          </div>
          <button
            type="button"
            onClick={handleRequestClose}
            className="w-8 h-8 rounded-full text-[#746E79] hover:text-[#163E37] hover:bg-[#FFFCF7] flex items-center justify-center transition-colors border border-transparent hover:border-[#E2D8CF] cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Discard changes warning banner */}
        {showDiscardPrompt && (
          <div className="p-3.5 bg-amber-50 border-b border-amber-200 text-xs flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 text-amber-950 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Bạn có thay đổi chưa lưu. Bạn có chắc muốn đóng?</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowDiscardPrompt(false)}
                className="px-2.5 py-1 rounded-xl bg-[#FFFCF7] border border-amber-300 text-stone-700 font-bold hover:bg-stone-50 cursor-pointer"
              >
                Tiếp tục sửa
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-2.5 py-1 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 cursor-pointer"
              >
                Bỏ thay đổi
              </button>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* 1. Name */}
          <div>
            <label htmlFor="itemmodal-1" className="block font-bold text-[#163E37] mb-1">
              Tên món ăn / đồ uống <span className="text-[#7054AE]">*</span>
            </label>
            <input id="itemmodal-1"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.name;
                    return next;
                  });
                }
              }}
              placeholder="VD: Cơm gà xé Hội An, Trà đào cam sả..."
              className={`w-full min-h-[42px] px-3.5 py-2 rounded-xl border text-sm text-[#163E37] placeholder:text-[#8E8799] focus:outline-hidden focus:ring-2 font-bold ${
                fieldErrors.name
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20'
                  : 'border-[#E2D8CF] focus:border-[#7054AE] focus:ring-[#7054AE]/20 bg-[#FFFCF7]'
              }`}
            />
            {fieldErrors.name && (
              <p className="text-xs text-rose-600 mt-1 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {fieldErrors.name}
              </p>
            )}
          </div>

          {/* 2. Category & Status in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="itemmodal-2" className="block font-bold text-[#163E37] mb-1">
                Nhóm món <span className="text-[#7054AE]">*</span>
              </label>
              <select id="itemmodal-2"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  if (fieldErrors.categoryId) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.categoryId;
                      return next;
                    });
                  }
                }}
                className={`w-full min-h-[42px] px-3.5 py-2 rounded-xl border text-sm text-[#163E37] bg-[#FFFCF7] font-bold focus:outline-hidden focus:ring-2 ${
                  fieldErrors.categoryId
                    ? 'border-rose-400 focus:ring-rose-200'
                    : 'border-[#E2D8CF] focus:border-[#7054AE] focus:ring-[#7054AE]/20'
                }`}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {fieldErrors.categoryId && (
                <p className="text-xs text-rose-600 mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {fieldErrors.categoryId}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="itemmodal-3" className="block font-bold text-[#163E37] mb-1">Trạng thái bán</label>
              <select id="itemmodal-3"
                value={status}
                onChange={(e) => setStatus(e.target.value as MenuItemStatus)}
                className={`w-full min-h-[42px] px-3.5 py-2 rounded-xl border text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-[#7054AE]/20 ${
                  status === 'available'
                    ? 'border-emerald-300 bg-emerald-50/50 text-emerald-950'
                    : status === 'out_of_stock'
                    ? 'border-[#E2D8CF] bg-[#E6DCF1] text-[#7054AE]'
                    : 'border-stone-300 bg-stone-100 text-stone-700'
                }`}
              >
                <option value="available">Còn bán (Hiển thị bình thường)</option>
                <option value="out_of_stock">Tạm hết (Khách thấy nhãn Tạm hết)</option>
                <option value="hidden">Đang ẩn (Không xuất hiện trên menu khách)</option>
              </select>
            </div>
          </div>

          {/* 3. Pricing Section */}
          <div className="space-y-2.5 pt-2 border-t border-[#E2D8CF]">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#163E37]">
                Cấu hình giá bán <span className="text-[#7054AE]">*</span>
              </h3>

              {/* Pricing mode pills */}
              <div className="inline-flex rounded-xl p-0.5 bg-[#F4ECDF] border border-[#E2D8CF]">
                <button
                  type="button"
                  onClick={() => setPricingMode('single')} aria-pressed={pricingMode === 'single'}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    pricingMode === 'single'
                      ? 'bg-[#FFFCF7] text-[#7054AE] shadow-xs'
                      : 'text-[#746E79] hover:text-[#163E37]'
                  }`}
                >
                  Một mức giá
                </button>
                <button
                  type="button"
                  onClick={() => setPricingMode('multiple')} aria-pressed={pricingMode === 'multiple'}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    pricingMode === 'multiple'
                      ? 'bg-[#FFFCF7] text-[#7054AE] shadow-xs'
                      : 'text-[#746E79] hover:text-[#163E37]'
                  }`}
                >
                  Nhiều mức giá (Size/Loại)
                </button>
              </div>
            </div>

            {/* Single Price Input */}
            {pricingMode === 'single' ? (
              <div className="bg-[#F4ECDF] p-3.5 rounded-2xl border border-[#E2D8CF]">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#746E79]">
                    Đơn giá bán tiêu chuẩn (VNĐ)
                  </label>
                  {singlePrice > 0 && (
                    <span className="text-xs font-semibold text-[#7054AE]">
                      {formatVND(singlePrice)}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label="Đơn giá bán tiêu chuẩn (VNĐ)" value={singlePriceInput}
                    onChange={(e) => handleSinglePriceChange(e.target.value)}
                    placeholder="VD: 35.000"
                    className={`w-full min-h-[42px] px-3.5 py-2 rounded-xl border font-mono text-sm text-[#163E37] pr-12 bg-[#FFFCF7] font-bold focus:outline-hidden focus:ring-2 ${
                      fieldErrors.price
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                        : 'border-[#E2D8CF] focus:border-[#7054AE] focus:ring-[#7054AE]/20'
                    }`}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#746E79]">
                    VNĐ
                  </span>
                </div>
                {fieldErrors.price ? (
                  <p className="text-xs text-rose-600 mt-1.5 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {fieldErrors.price}
                  </p>
                ) : (
                  <p className="text-[11px] text-[#746E79] mt-1.5">
                    Giá được lưu trữ chính xác dạng số nguyên, tự động hiển thị dấu phân cách nghìn.
                  </p>
                )}
              </div>
            ) : (
              /* Multiple Options List */
              <div className="bg-[#F4ECDF] p-3.5 rounded-2xl border border-[#E2D8CF] space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-[#746E79]">
                  <span className="flex items-center gap-1.5 text-[#163E37]">
                    <Layers className="w-3.5 h-3.5 text-[#7054AE]" />
                    <span>Danh sách phân loại (Size / Loại)</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="inline-flex items-center gap-1 text-xs text-[#7054AE] font-semibold hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm lựa chọn
                  </button>
                </div>

                <div className="space-y-2">
                  {options.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <div className="w-6 text-[10px] font-bold text-[#746E79] text-center shrink-0">
                        #{idx + 1}
                      </div>
                      <input
                        type="text"
                        value={opt.name}
                        onChange={(e) => handleUpdateOptionName(opt.id, e.target.value)}
                        placeholder={`Tên lựa chọn (VD: Size M, Đùi)`}
                        className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl border border-[#E2D8CF] focus:outline-hidden focus:border-[#7054AE] text-[#163E37] text-xs bg-[#FFFCF7] font-bold"
                      />
                      <div className="w-32 relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          aria-label={`Giá ${opt.name || 'lựa chọn'}`} value={opt.priceInput}
                          onChange={(e) => handleUpdateOptionPrice(opt.id, e.target.value)}
                          placeholder="Số tiền"
                          className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-[#E2D8CF] focus:outline-hidden focus:border-[#7054AE] font-mono text-[#163E37] text-xs bg-[#FFFCF7] pr-7 font-bold text-right"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#746E79]">
                          đ
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(opt.id)}
                        className="w-8 h-8 rounded-lg text-[#746E79] hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                        title="Xóa lựa chọn này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {fieldErrors.options && (
                  <p className="text-xs text-rose-600 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {fieldErrors.options}
                  </p>
                )}

                <div className="p-2.5 rounded-xl bg-[#FFFCF7] border border-[#E2D8CF] flex items-center justify-between text-[11px] text-[#746E79]">
                  <span>Hiển thị trên menu khách:</span>
                  <span className="font-bold text-[#163E37]">
                    Từ {formatVND(Math.min(...options.map((o) => o.price || 0)))}{' '}
                    <span className="text-[#7054AE] font-semibold">
                      ({options.length} mức giá)
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 4. Description */}
          <div className="pt-2 border-t border-[#E2D8CF]">
            <label className="block font-bold text-[#163E37] mb-1">
              Mô tả món (Tùy chọn)
            </label>
            <textarea id="itemmodal-4" aria-label="Mô tả món (Tùy chọn)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Thành phần tươi ngon, gia vị độc quyền, lưu ý độ cay hoặc đường đá..."
              rows={2}
              className="w-full p-3 rounded-xl border border-[#E2D8CF] focus:outline-hidden focus:border-[#7054AE] focus:ring-2 focus:ring-[#7054AE]/20 text-xs text-[#163E37] placeholder:text-[#8E8799] resize-none bg-[#FFFCF7] font-medium"
            />
          </div>

          {/* 5. Image Upload */}
          <div className="pt-2 border-t border-[#E2D8CF]">
            <label className="block font-bold text-[#163E37] mb-1">
              Hình ảnh món (Tùy chọn)
            </label>
            <p className="text-[11px] text-[#746E79] mb-2 font-medium">
              Gợi ý ảnh ngang 4:3, 1200 × 900 px. Ảnh vuông hoặc dọc vẫn được giữ trọn, không cắt món. JPG, PNG, WebP; tối đa 5 MB.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            {imageUrl ? (
              <div className="flex items-center gap-3 p-3 bg-[#F4ECDF] rounded-2xl border border-[#E2D8CF]">
                <img
                  src={imageUrl}
                  alt="Xem trước ảnh món"
                  referrerPolicy="no-referrer"
                  className="w-24 aspect-[4/3] rounded-xl object-contain border border-[#E2D8CF] shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-[#163E37] truncate flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Đã chọn ảnh món</span>
                  </div>
                  <div className="text-[11px] text-[#746E79] mt-0.5">
                    Ảnh đã được nén tối ưu hiển thị nhanh
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 text-xs text-[#163E37] bg-[#FFFCF7] border border-[#E2D8CF] hover:bg-[#F4ECDF] rounded-xl font-bold transition-colors cursor-pointer"
                  >
                    Đổi ảnh
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="px-2.5 py-1.5 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl font-bold transition-colors cursor-pointer"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={imageLoading}
                className="w-full min-h-[44px] py-3 px-4 border-2 border-dashed border-[#E2D8CF] rounded-2xl hover:border-[#7054AE] hover:bg-[#E6DCF1]/40 flex items-center justify-center gap-2 text-[#746E79] transition-colors cursor-pointer"
              >
                {imageLoading ? (
                  <span className="flex items-center gap-2 font-medium">
                    <Loader2 className="w-4 h-4 animate-spin text-[#7054AE]" />
                    Đang xử lý nén ảnh...
                  </span>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-[#7054AE]" />
                    <span className="font-bold text-xs">Tải ảnh từ máy (JPG, PNG)</span>
                  </>
                )}
              </button>
            )}
            {fieldErrors.image && (
              <p className="text-xs text-rose-600 mt-1 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {fieldErrors.image}
              </p>
            )}
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-[#E2D8CF] flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleRequestClose}
              className="min-h-[40px] px-4 py-2 rounded-2xl text-[#746E79] hover:bg-[#E6DCF1] font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[40px] px-5 py-2 rounded-2xl bg-[#7054AE] text-white font-semibold hover:bg-[#624598] transition-colors shadow-xs active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEditing ? 'Lưu thay đổi' : 'Thêm vào menu'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
