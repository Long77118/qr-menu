import { OperationResult } from '../types/operations';
import { CategoryPhotoField } from './CategoryPhotoField';
import React, { useState } from 'react';
import {
  X,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Check,
  FolderOpen,
} from 'lucide-react';
import { MenuCategory, MenuItem } from '../types/menu';

interface CategoryManagerModalProps {
  isOpen: boolean;
  categories: MenuCategory[];
  items: MenuItem[];
  onSaveCategory: (name: string, id?: string, imageUrl?: string | null) => void | Promise<OperationResult>;
  onMoveCategoryOrder: (catId: string, direction: 'up' | 'down') => void;
  onDeleteCategory: (categoryId: string, targetCategoryId?: string) => void;
  onClose: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  categories,
  items,
  onSaveCategory,
  onMoveCategoryOrder,
  onDeleteCategory,
  onClose,
}) => {
  // New category creation state
  const [newCatName, setNewCatName] = useState('');
  const [newCatError, setNewCatError] = useState<string | null>(null);

  // In-place rename state
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Deletion prompt state
  const [deletingCat, setDeletingCat] = useState<MenuCategory | null>(null);
  const [targetTransferCatId, setTargetTransferCatId] = useState<string>('');

  if (!isOpen) return null;

  // Check duplicate category name (case-insensitive trim)
  const isDuplicateName = (name: string, excludeId?: string) => {
    const normalized = name.trim().toLowerCase();
    return categories.some(
      (c) => c.id !== excludeId && c.name.trim().toLowerCase() === normalized
    );
  };

  // Handle adding new category
  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setNewCatError('Vui lòng nhập tên nhóm món');
      return;
    }
    if (isDuplicateName(trimmed)) {
      setNewCatError(`Nhóm "${trimmed}" đã tồn tại trong quán. Vui lòng chọn tên khác!`);
      return;
    }
    onSaveCategory(trimmed);
    setNewCatName('');
    setNewCatError(null);
  };

  // Start inline rename
  const handleStartEdit = (cat: MenuCategory) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
    setEditError(null);
  };

  // Submit inline rename
  const handleSaveEdit = (catId: string) => {
    const trimmed = editingCatName.trim();
    if (!trimmed) {
      setEditError('Tên nhóm không được để trống');
      return;
    }
    if (isDuplicateName(trimmed, catId)) {
      setEditError(`Tên nhóm "${trimmed}" đã tồn tại trong quán`);
      return;
    }
    onSaveCategory(trimmed, catId);
    setEditingCatId(null);
    setEditingCatName('');
    setEditError(null);
  };

  // Cancel inline rename
  const handleCancelEdit = () => {
    setEditingCatId(null);
    setEditingCatName('');
    setEditError(null);
  };

  // Trigger delete dialog
  const handleInitiateDelete = (cat: MenuCategory) => {
    const remainingCats = categories.filter((c) => c.id !== cat.id);
    setDeletingCat(cat);
    setTargetTransferCatId(remainingCats[0]?.id || '');
  };

  // Confirm delete with item transfer if needed
  const handleConfirmDelete = () => {
    if (!deletingCat) return;
    const itemsInCat = items.filter((i) => i.categoryId === deletingCat.id);
    if (itemsInCat.length > 0 && !targetTransferCatId) {
      return;
    }
    onDeleteCategory(deletingCat.id, itemsInCat.length > 0 ? targetTransferCatId : undefined);
    setDeletingCat(null);
  };

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-[#FFFCF7] w-full max-w-lg rounded-[28px] shadow-xl overflow-hidden my-4 sm:my-6 flex flex-col max-h-[90vh] border border-[#E2D8CF]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E2D8CF] flex items-center justify-between bg-[#F4ECDF] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#7054AE] text-white flex items-center justify-center shrink-0">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#163E37]">Quản lý nhóm món</h2>
              <p className="text-xs text-[#746E79] font-medium">
                Hiện có {categories.length} nhóm · Thứ tự phản ánh ngay ngoài menu
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-[#746E79] hover:text-[#163E37] hover:bg-[#FFFCF7] flex items-center justify-center transition-colors border border-transparent hover:border-[#E2D8CF] cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Add New Group Card */}
          <div className="bg-[#F4ECDF] p-4 rounded-2xl border border-[#E2D8CF]">
            <label className="block font-semibold text-[#163E37] mb-1.5">
              Thêm nhóm món mới <span className="text-[#7054AE]">*</span>
            </label>
            <form onSubmit={handleAddNew} className="flex gap-2">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => {
                  setNewCatName(e.target.value);
                  setNewCatError(null);
                }}
                placeholder="VD: Cơm & Mì, Trà hoa quả, Đồ uống..."
                className={`flex-1 min-h-[42px] px-3.5 py-2 rounded-xl border bg-[#FFFCF7] text-sm text-[#163E37] font-bold focus:outline-hidden focus:ring-2 ${
                  newCatError
                    ? 'border-rose-400 focus:ring-rose-200'
                    : 'border-[#E2D8CF] focus:border-[#7054AE] focus:ring-[#7054AE]/20'
                }`}
              />
              <button
                type="submit"
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#7054AE] text-white font-semibold hover:bg-[#624598] transition-colors inline-flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm</span>
              </button>
            </form>
            {newCatError && (
              <p className="text-xs text-rose-600 mt-1.5 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {newCatError}
              </p>
            )}
          </div>

          {/* Group List & Ordering */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#163E37]">
                Danh sách nhóm &amp; Thứ tự hiển thị
              </span>
              <span className="text-[11px] text-[#746E79]">
                Dùng mũi tên để thay đổi vị trí
              </span>
            </div>

            {sortedCategories.length === 0 ? (
              <div className="p-6 text-center text-[#746E79] bg-[#F4ECDF] rounded-2xl border border-dashed border-[#E2D8CF]">
                Chưa có nhóm nào. Vui lòng thêm nhóm món ở ô bên trên!
              </div>
            ) : (
              <div className="space-y-2">
                {sortedCategories.map((cat, idx) => {
                  const itemsCount = items.filter((i) => i.categoryId === cat.id).length;
                  const isEditingThis = editingCatId === cat.id;

                  return (
                    <div
                      key={cat.id}
                      className="p-3 bg-[#FFFCF7] rounded-2xl border border-[#E2D8CF] flex flex-wrap items-center justify-between gap-3 hover:border-[#7054AE]/40 transition-colors shadow-2xs"
                    >
                      {/* Name or inline edit form */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="w-6 text-[11px] font-mono font-bold text-[#746E79] shrink-0 text-center">
                          #{idx + 1}
                        </span>

                        {isEditingThis ? (
                          <div className="flex-1 flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={editingCatName}
                                onChange={(e) => {
                                  setEditingCatName(e.target.value);
                                  setEditError(null);
                                }}
                                autoFocus
                                className="flex-1 px-2.5 py-1 rounded-lg border border-[#7054AE] text-xs font-bold text-[#163E37] focus:outline-hidden"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(cat.id)}
                                className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                                title="Lưu tên"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="p-1.5 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 cursor-pointer"
                                title="Hủy"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {editError && (
                              <p className="text-[11px] text-rose-600 font-medium">{editError}</p>
                            )}
                          </div>
                        ) : (
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-[#163E37] truncate">
                              {cat.name}
                            </div>
                            <div className="text-[10px] text-[#746E79] flex items-center gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.2 bg-[#F4ECDF] border border-[#E2D8CF] rounded-md font-bold">
                                {itemsCount} món
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Controls: Reorder, Rename, Delete */}
                      {!isEditingThis && (
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Move Up */}
                          <button
                            type="button"
                            onClick={() => onMoveCategoryOrder(cat.id, 'up')}
                            disabled={idx === 0}
                            className="p-1.5 rounded-lg text-[#746E79] hover:text-[#163E37] hover:bg-[#F4ECDF] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                            title="Di chuyển lên trên"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>

                          {/* Move Down */}
                          <button
                            type="button"
                            onClick={() => onMoveCategoryOrder(cat.id, 'down')}
                            disabled={idx === sortedCategories.length - 1}
                            className="p-1.5 rounded-lg text-[#746E79] hover:text-[#163E37] hover:bg-[#F4ECDF] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                            title="Di chuyển xuống dưới"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Rename */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(cat)}
                            className="p-1.5 rounded-lg text-[#746E79] hover:text-[#163E37] hover:bg-[#F4ECDF] cursor-pointer"
                            title="Đổi tên nhóm"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleInitiateDelete(cat)}
                            className="p-1.5 rounded-lg text-[#746E79] hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Xóa nhóm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <CategoryPhotoField category={cat} items={items} onSave={onSaveCategory} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#E2D8CF] flex items-center justify-end bg-[#F4ECDF] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-5 py-2 rounded-xl bg-[#163E37] text-white font-bold hover:bg-black transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Embedded Deletion Dialog */}
      {deletingCat && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-[#FFFCF7] w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-stone-200">
            <div className="p-5 text-xs space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    Xóa nhóm &quot;{deletingCat.name}&quot;
                  </h3>
                  {items.filter((i) => i.categoryId === deletingCat.id).length > 0 ? (
                    <p className="text-stone-600 mt-1 leading-relaxed">
                      Nhóm này hiện đang có{' '}
                      <span className="font-bold text-rose-700">
                        {items.filter((i) => i.categoryId === deletingCat.id).length} món
                      </span>
                      . Để không bị mất dữ liệu, vui lòng chọn nhóm mới để chuyển các món này sang:
                    </p>
                  ) : (
                    <p className="text-stone-600 mt-1 leading-relaxed">
                      Nhóm này hiện không có món nào. Bạn có chắc chắn muốn xóa khỏi thực đơn?
                    </p>
                  )}
                </div>
              </div>

              {/* Has items transfer selection */}
              {items.filter((i) => i.categoryId === deletingCat.id).length > 0 && (
                <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200/80 space-y-2">
                  {categories.filter((c) => c.id !== deletingCat.id).length === 0 ? (
                    <div className="text-amber-900 font-medium">
                      Đây là nhóm món duy nhất hiện có trong quán! Bạn cần tạo thêm một nhóm mới trước khi có thể xóa nhóm này, để tránh làm mất các món hiện có.
                    </div>
                  ) : (
                    <>
                      <label className="block font-semibold text-amber-950">
                        Chuyển tất cả món sang nhóm:
                      </label>
                      <select
                        value={targetTransferCatId}
                        onChange={(e) => setTargetTransferCatId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-[#FFFCF7] text-stone-900 focus:outline-hidden font-bold"
                      >
                        {categories
                          .filter((c) => c.id !== deletingCat.id)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setDeletingCat(null)}
                  className="px-4 py-2 rounded-xl text-stone-700 hover:bg-stone-100 font-medium transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={
                    items.filter((i) => i.categoryId === deletingCat.id).length > 0 &&
                    categories.filter((c) => c.id !== deletingCat.id).length === 0
                  }
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
                >
                  {items.filter((i) => i.categoryId === deletingCat.id).length > 0
                    ? 'Chuyển món & Xóa nhóm'
                    : 'Xác nhận xóa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Backward-compatible single category creation/edit modal
export const CategoryModal: React.FC<{
  isOpen: boolean;
  category: MenuCategory | null;
  onSave: (name: string, id?: string) => void;
  onClose: () => void;
}> = ({ isOpen, category, onSave, onClose }) => {
  const [name, setName] = useState(category?.name || '');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Tên nhóm món không được để trống!');
      return;
    }
    onSave(name.trim(), category?.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#FFFCF7] w-full max-w-sm rounded-[28px] shadow-xl overflow-hidden border border-[#E2D8CF]">
        <div className="px-5 py-4 border-b border-[#E2D8CF] flex items-center justify-center relative bg-[#F4ECDF]">
          <h2 className="text-sm font-semibold text-[#163E37]">
            {category ? 'Đổi tên nhóm món' : 'Thêm nhóm món mới'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full text-[#746E79] hover:text-[#163E37] hover:bg-[#FFFCF7] flex items-center justify-center transition-colors border border-transparent hover:border-[#E2D8CF] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-[#163E37] mb-1">
              Tên nhóm món <span className="text-[#7054AE]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="VD: Cơm, Mì, Món ăn thêm, Cà phê, Trà..."
              autoFocus
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-[#E2D8CF] focus:outline-hidden focus:border-[#7054AE] focus:ring-2 focus:ring-[#7054AE]/20 text-sm text-[#163E37] font-bold"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E2D8CF]">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-4 py-2 rounded-xl text-[#746E79] hover:bg-[#F4ECDF] font-bold transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-5 py-2 rounded-2xl bg-[#7054AE] text-white font-semibold hover:bg-[#624598] transition-colors shadow-xs cursor-pointer"
            >
              {category ? 'Cập nhật' : 'Tạo nhóm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const DeleteCategoryDialog: React.FC<{
  isOpen: boolean;
  category: MenuCategory | null;
  allItems: MenuItem[];
  allCategories: MenuCategory[];
  onConfirmDelete: (categoryId: string, targetCategoryId?: string) => void;
  onClose: () => void;
}> = ({
  isOpen,
  category,
  allItems,
  allCategories,
  onConfirmDelete,
  onClose,
}) => {
  if (!isOpen || !category) return null;

  const itemsInCat = allItems.filter((i) => i.categoryId === category.id);
  const otherCategories = allCategories.filter((c) => c.id !== category.id);

  const [targetCatId, setTargetCatId] = useState<string>(otherCategories[0]?.id || '');
  const hasItems = itemsInCat.length > 0;
  const isOnlyCategory = otherCategories.length === 0;

  const handleConfirm = () => {
    if (hasItems && !targetCatId) {
      return;
    }
    onConfirmDelete(category.id, hasItems ? targetCatId : undefined);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-[#FFFCF7] w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-stone-200">
        <div className="p-5 text-xs space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Xóa nhóm &quot;{category.name}&quot;
              </h3>
              <p className="text-stone-600 mt-1 leading-relaxed">
                {hasItems
                  ? `Nhóm này hiện có ${itemsInCat.length} món ăn/đồ uống. Hệ thống không xóa dây chuyền các món.`
                  : 'Bạn có chắc chắn muốn xóa nhóm này khỏi menu?'}
              </p>
            </div>
          </div>

          {hasItems && (
            <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200/80 space-y-2">
              {isOnlyCategory ? (
                <div className="text-amber-900 font-medium">
                  Đây là nhóm món duy nhất hiện có. Bạn cần tạo một nhóm món mới khác trước khi có thể xóa nhóm này!
                </div>
              ) : (
                <>
                  <label className="block font-semibold text-amber-950">
                    Vui lòng chọn nhóm mới để chuyển {itemsInCat.length} món sang:
                  </label>
                  <select
                    value={targetCatId}
                    onChange={(e) => setTargetCatId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-[#FFFCF7] text-stone-900 focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-bold"
                  >
                    {otherCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        Chuyển sang: {c.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-stone-700 hover:bg-stone-100 font-medium transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={hasItems && isOnlyCategory}
              onClick={handleConfirm}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
            >
              {hasItems ? `Chuyển món & Xóa nhóm` : 'Xác nhận xóa'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
