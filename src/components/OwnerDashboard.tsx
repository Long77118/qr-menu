import React, { useState } from 'react';
import {
  Palette,
  UtensilsCrossed,
  Store,
  QrCode,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  RotateCcw,
  LogOut,
  Save,
  CheckCircle2,
  Eye,
  AlertTriangle,
  Copy,
  Search,
  ArrowUpDown,
  FolderOpen,
  X,
  ChevronsUp,
  ChevronsDown,
  Sparkles,
  Layers,
  Check,
  LayoutDashboard,
} from 'lucide-react';
import { ShopData, MenuItem, MenuCategory, ShopSettings, UserProfile, HeaderBackgroundConfig, MenuItemStatus } from '../types/menu';
import { formatVND } from '../utils/format';
import { ItemModal } from './ItemModal';
import { CategoryManagerModal, CategoryModal, DeleteCategoryDialog } from './CategoryModal';
import { ShopInfoForm } from './ShopInfoForm';
import { QRView } from './QRView';
import { GuestMenuView } from './GuestMenuView';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { ShopOverview } from './ShopOverview';

interface OwnerDashboardProps {
  user: UserProfile;
  shopData: ShopData;
  isPublished: boolean;
  onUpdateDraft: (newData: ShopData) => void;
  onPublish: () => void;
  onResetDemo: () => void;
  onLogout: () => void;
  onOpenGuestUrl: (shopId: string) => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  user,
  shopData,
  isPublished,
  onUpdateDraft,
  onPublish,
  onResetDemo,
  onLogout,
  onOpenGuestUrl,
  showToast,
}) => {
  // Navigation Tabs: 'overview' (Tổng quan), 'menu' (Quản lý thực đơn), 'editor' (Chỉnh menu trực tiếp), 'info' (Thông tin quán), 'qr' (Mã QR)
  const [activeTab, setActiveTab] = useState<'overview' | 'editor' | 'menu' | 'info' | 'qr'>('overview');

  // Sub-mode in 'editor' tab: 'edit' (Chế độ chỉnh sửa trực tiếp) vs 'preview' (Xem như khách)
  const [editorMode, setEditorMode] = useState<'edit' | 'preview'>('edit');

  // Track unsaved changes in draft
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingTabSwitch, setPendingTabSwitch] = useState<string | null>(null);

  // Search & Filters in Menu Management tab
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | MenuItemStatus>('all');

  // Reorder Mode state
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [reorderCatId, setReorderCatId] = useState<string>('');

  // Item Modal state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [modalDefaultCategoryId, setModalDefaultCategoryId] = useState<string | undefined>(undefined);

  // Category Manager Modal state
  const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);

  // Item Deletion Confirm Modal
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null);

  // Reset Demo Confirm Modal
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const { shop, categories, items } = shopData;
  const themeColor = shop.themeColor || '#FF5A36';

  // --- SAFE NAVIGATION GUARD FOR UNSAVED CHANGES ---
  const handleSwitchTab = (targetTab: 'overview' | 'editor' | 'menu' | 'info' | 'qr') => {
    if (activeTab === targetTab) return;
    if (hasUnsavedChanges && activeTab === 'editor') {
      setPendingTabSwitch(targetTab);
    } else {
      setActiveTab(targetTab);
    }
  };

  // --- DIRECT IN-PLACE EDIT HANDLERS (Invoked directly from GuestMenuView) ---
  const handleDirectUpdateItem = (updatedItem: MenuItem) => {
    const updatedItems = items.map((i) => (i.id === updatedItem.id ? updatedItem : i));
    const nextData = {
      ...shopData,
      items: updatedItems,
    };
    onUpdateDraft(nextData);
    setHasUnsavedChanges(true);
    showToast('success', `Đã cập nhật món "${updatedItem.name}" trên bản nháp`);
  };

  const handleDirectUpdateShop = (
    name: string,
    tagline?: string,
    coverUrl?: string,
    logoUrl?: string
  ) => {
    const nextData = {
      ...shopData,
      shop: {
        ...shop,
        name,
        tagline,
        coverUrl,
        logoUrl,
      },
    };
    onUpdateDraft(nextData);
    setHasUnsavedChanges(true);
    showToast('success', 'Đã cập nhật thông tin quán trên bản nháp');
  };

  const handleDirectUpdateHeaderBg = (headerBackground: HeaderBackgroundConfig) => {
    const nextData = {
      ...shopData,
      shop: {
        ...shop,
        headerBackground,
      },
    };
    onUpdateDraft(nextData);
    setHasUnsavedChanges(true);
    showToast('success', 'Đã lưu cấu hình nền header vào bản nháp!');
  };

  // --- FULL ITEM MODAL ACTIONS ---
  const handleOpenAddItem = (catId?: string) => {
    setEditingItem(null);
    setModalDefaultCategoryId(catId || (selectedCatFilter !== 'all' ? selectedCatFilter : undefined));
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (itemPayload: Omit<MenuItem, 'id' | 'order'> & { id?: string }) => {
    let updatedItems = [...items];

    if (itemPayload.id) {
      updatedItems = updatedItems.map((item) => {
        if (item.id === itemPayload.id) {
          return {
            ...item,
            ...itemPayload,
          } as MenuItem;
        }
        return item;
      });
      showToast('success', `Đã cập nhật món "${itemPayload.name}"`);
    } else {
      const newId = 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      const catItems = items.filter((i) => i.categoryId === itemPayload.categoryId);
      const newOrder = catItems.length + 1;

      const newItem: MenuItem = {
        ...itemPayload,
        id: newId,
        order: newOrder,
      };
      updatedItems.push(newItem);
      showToast('success', `Đã thêm món "${itemPayload.name}" vào menu`);
    }

    onUpdateDraft({
      ...shopData,
      items: updatedItems,
    });
    setHasUnsavedChanges(true);
    setIsItemModalOpen(false);
  };

  // Duplicate item
  const handleDuplicateItem = (item: MenuItem) => {
    const catItems = items.filter((i) => i.categoryId === item.categoryId);
    const newOrder = catItems.length + 1;
    const duplicated: MenuItem = {
      ...item,
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: `${item.name} (Bản sao)`,
      status: 'hidden', // Mặc định Đang ẩn để chủ quán rà soát trước khi bán
      order: newOrder,
      options: item.options
        ? item.options.map((opt) => ({
            ...opt,
            id: 'opt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          }))
        : [],
    };

    onUpdateDraft({
      ...shopData,
      items: [...items, duplicated],
    });
    setHasUnsavedChanges(true);
    showToast('success', `Đã nhân bản "${item.name}" (trạng thái: Đang ẩn)`);
  };

  // Delete item confirm
  const handleDeleteItemConfirm = () => {
    if (!deletingItem) return;
    const itemName = deletingItem.name;
    const updatedItems = items.filter((i) => i.id !== deletingItem.id);
    onUpdateDraft({
      ...shopData,
      items: updatedItems,
    });
    setHasUnsavedChanges(true);
    setDeletingItem(null);
    showToast('info', `Đã xóa món "${itemName}" khỏi thực đơn`);
  };

  // Quick Status Change on List
  const handleQuickStatusChange = (itemId: string, newStatus: MenuItemStatus) => {
    const target = items.find((i) => i.id === itemId);
    const updatedItems = items.map((i) => {
      if (i.id === itemId) return { ...i, status: newStatus };
      return i;
    });
    onUpdateDraft({
      ...shopData,
      items: updatedItems,
    });
    setHasUnsavedChanges(true);
    const statusLabels: Record<MenuItemStatus, string> = {
      available: 'Còn bán',
      out_of_stock: 'Tạm hết',
      hidden: 'Đang ẩn',
    };
    showToast('info', `"${target?.name || ''}" chuyển sang: ${statusLabels[newStatus]}`);
  };

  // Reorder Item within its Category
  const handleMoveItemOrder = (
    itemId: string,
    direction: 'up' | 'down' | 'top' | 'bottom'
  ) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const catItems = items
      .filter((i) => i.categoryId === item.categoryId)
      .sort((a, b) => a.order - b.order);

    const currentIndex = catItems.findIndex((i) => i.id === itemId);
    if (currentIndex < 0) return;

    let targetIndex = currentIndex;
    if (direction === 'up') targetIndex = currentIndex - 1;
    else if (direction === 'down') targetIndex = currentIndex + 1;
    else if (direction === 'top') targetIndex = 0;
    else if (direction === 'bottom') targetIndex = catItems.length - 1;

    if (targetIndex < 0 || targetIndex >= catItems.length || targetIndex === currentIndex) return;

    const reorderedList = [...catItems];
    const [moved] = reorderedList.splice(currentIndex, 1);
    reorderedList.splice(targetIndex, 0, moved);

    // Re-index orders 1..N
    const orderMap = new Map<string, number>();
    reorderedList.forEach((it, idx) => {
      orderMap.set(it.id, idx + 1);
    });

    const updatedItems = items.map((i) => {
      if (orderMap.has(i.id)) {
        return { ...i, order: orderMap.get(i.id)! };
      }
      return i;
    });

    onUpdateDraft({
      ...shopData,
      items: updatedItems,
    });
    setHasUnsavedChanges(true);
  };

  // --- CATEGORY ACTIONS (Via CategoryManagerModal) ---
  const handleSaveCategory = (name: string, id?: string) => {
    let updatedCategories = [...categories];

    if (id) {
      updatedCategories = updatedCategories.map((c) => (c.id === id ? { ...c, name } : c));
      showToast('success', `Đã đổi tên nhóm thành "${name}"`);
    } else {
      const newCat: MenuCategory = {
        id: 'cat-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        name,
        order: categories.length + 1,
      };
      updatedCategories.push(newCat);
      showToast('success', `Đã thêm nhóm món "${name}"`);
    }

    onUpdateDraft({
      ...shopData,
      categories: updatedCategories,
    });
    setHasUnsavedChanges(true);
  };

  const handleMoveCategoryOrder = (catId: string, direction: 'up' | 'down') => {
    const sorted = [...categories].sort((a, b) => a.order - b.order);
    const currentIndex = sorted.findIndex((c) => c.id === catId);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const currentCat = sorted[currentIndex];
    const targetCat = sorted[targetIndex];

    const updated = categories.map((c) => {
      if (c.id === currentCat.id) return { ...c, order: targetCat.order };
      if (c.id === targetCat.id) return { ...c, order: currentCat.order };
      return c;
    });

    onUpdateDraft({
      ...shopData,
      categories: updated,
    });
    setHasUnsavedChanges(true);
  };

  const handleDeleteCategory = (categoryId: string, targetCategoryId?: string) => {
    let updatedItems = [...items];

    if (targetCategoryId) {
      updatedItems = updatedItems.map((item) => {
        if (item.categoryId === categoryId) {
          return { ...item, categoryId: targetCategoryId };
        }
        return item;
      });
    }

    const updatedCategories = categories.filter((c) => c.id !== categoryId);

    onUpdateDraft({
      ...shopData,
      categories: updatedCategories,
      items: updatedItems,
    });
    setHasUnsavedChanges(true);
    showToast('info', 'Đã xóa nhóm món và bảo toàn dữ liệu');
  };

  // --- MANUAL DRAFT SAVE & PUBLISH ---
  const handleManualSaveDraft = () => {
    onUpdateDraft(shopData);
    setHasUnsavedChanges(false);
    showToast(
      'success',
      user.isFirebaseUser
        ? 'Đã lưu bản nháp lên đám mây Firestore!'
        : 'Đã lưu bản nháp thành công!'
    );
  };

  const handlePublishMenu = () => {
    onPublish();
    setHasUnsavedChanges(false);
  };

  // Active Category for Reorder Mode
  const activeReorderCat =
    categories.find((c) => c.id === (reorderCatId || categories[0]?.id)) || categories[0];

  const itemsForReorder = activeReorderCat
    ? items
        .filter((i) => i.categoryId === activeReorderCat.id)
        .sort((a, b) => a.order - b.order)
    : [];

  // Filtered Items for standard list
  const filteredItems = items.filter((item) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }
    // Category filter
    if (selectedCatFilter !== 'all' && item.categoryId !== selectedCatFilter) {
      return false;
    }
    // Status filter
    if (statusFilter !== 'all' && item.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const displayedItems = [...filteredItems].sort((a, b) => {
    const catA = categories.find((c) => c.id === a.categoryId)?.order || 0;
    const catB = categories.find((c) => c.id === b.categoryId)?.order || 0;
    if (catA !== catB) return catA - catB;
    return a.order - b.order;
  });

  return (
    <div className="min-h-screen bg-[#FFF9F3] text-[#241E35] flex flex-col md:flex-row">
      {/* ================= DESKTOP LEFT SIDEBAR ================= */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-white border-r border-[#EFE5D9] min-h-screen sticky top-0 h-screen overflow-y-auto">
        {/* Brand & Workspace Title */}
        <div className="p-5 border-b border-[#EFE5D9]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-[#FF5A36] text-white flex items-center justify-center font-black text-sm shadow-xs">
              QR
            </div>
            <div>
              <div className="text-base font-black text-[#241E35] font-serif leading-tight">
                QR Menu
              </div>
              <div className="text-[11px] text-[#6E6779]">Quản lý thực đơn</div>
            </div>
          </div>

          {/* Shop Card */}
          <div className="mt-4 p-3 rounded-2xl bg-[#FFF9F3] border border-[#EFE5D9]">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0 shadow-xs"
                style={{ backgroundColor: themeColor }}
              >
                {shop.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black text-[#241E35] truncate">{shop.name}</div>
                <div className="text-[10px] text-[#6E6779] truncate font-mono">
                  {user.email || `Mã: ${shop.id}`}
                </div>
                {user.isFirebaseUser && (
                  <div className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded-md mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Đồng bộ Cloud</span>
                  </div>
                )}
              </div>
            </div>

            {/* Metrics count */}
            <div className="mt-2.5 pt-2 border-t border-[#EFE5D9] flex items-center justify-between text-[11px] text-[#6E6779]">
              <span>{items.length} món</span>
              <span>·</span>
              <span>{categories.length} nhóm</span>
              <span>·</span>
              <span
                className={`font-black ${
                  hasUnsavedChanges
                    ? 'text-[#FF5A36]'
                    : isPublished
                    ? 'text-emerald-700'
                    : 'text-amber-800'
                }`}
              >
                {hasUnsavedChanges
                  ? 'Chưa lưu nháp'
                  : isPublished
                  ? 'Đã xuất bản'
                  : 'Bản nháp'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="p-3 space-y-1.5 flex-1">
          <button
            onClick={() => handleSwitchTab('overview')}
            className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#E5F76A] text-[#241E35] shadow-xs'
                : 'text-[#6E6779] hover:bg-[#FFF9F3] hover:text-[#241E35]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-[#FF5A36]" />
            <span className="flex-1 text-left">Tổng quan</span>
          </button>

          <button
            onClick={() => handleSwitchTab('menu')}
            className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'menu'
                ? 'bg-[#E5F76A] text-[#241E35] shadow-xs'
                : 'text-[#6E6779] hover:bg-[#FFF9F3] hover:text-[#241E35]'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4 text-[#FF5A36]" />
            <span className="flex-1 text-left">Quản lý thực đơn</span>
            <span className="text-[11px] bg-white px-2 py-0.5 rounded-full border border-[#EFE5D9] text-[#6E6779] font-mono">
              {items.length}
            </span>
          </button>

          <button
            onClick={() => handleSwitchTab('editor')}
            className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'editor'
                ? 'bg-[#E5F76A] text-[#241E35] shadow-xs'
                : 'text-[#6E6779] hover:bg-[#FFF9F3] hover:text-[#241E35]'
            }`}
          >
            <Palette className="w-4 h-4 text-[#FF5A36]" />
            <span className="flex-1 text-left">Chỉnh menu trực tiếp</span>
            <span className="text-[10px] bg-[#FF5A36] text-white px-2 py-0.5 rounded-full font-black">
              Mới
            </span>
          </button>

          <button
            onClick={() => handleSwitchTab('info')}
            className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'info'
                ? 'bg-[#E5F76A] text-[#241E35] shadow-xs'
                : 'text-[#6E6779] hover:bg-[#FFF9F3] hover:text-[#241E35]'
            }`}
          >
            <Store className="w-4 h-4 text-[#FF5A36]" />
            <span className="flex-1 text-left">Thông tin quán</span>
          </button>

          <button
            onClick={() => handleSwitchTab('qr')}
            className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-[#E5F76A] text-[#241E35] shadow-xs'
                : 'text-[#6E6779] hover:bg-[#FFF9F3] hover:text-[#241E35]'
            }`}
          >
            <QrCode className="w-4 h-4 text-[#FF5A36]" />
            <span className="flex-1 text-left">Mã QR &amp; Chia sẻ</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[#EFE5D9] space-y-2">
          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="w-full px-3 py-2 rounded-xl text-[11px] text-[#6E6779] hover:text-[#241E35] hover:bg-[#FFF9F3] flex items-center gap-2 transition-colors font-medium cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi phục dữ liệu mẫu</span>
          </button>

          <button
            onClick={onLogout}
            className="w-full px-3 py-2 rounded-xl text-[11px] text-[#6E6779] hover:text-rose-700 hover:bg-rose-50 flex items-center gap-2 transition-colors font-medium cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất tài khoản</span>
          </button>
        </div>
      </aside>

      {/* ================= RIGHT MAIN WORKSPACE ================= */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#EFE5D9]">
          <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="md:hidden w-8 h-8 rounded-xl bg-[#FF5A36] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                QR
              </div>
              <div className="min-w-0">
                <div className="text-sm sm:text-base font-black text-[#241E35] truncate flex items-center gap-2">
                  <span>{shop.name}</span>
                  {hasUnsavedChanges && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#FF5A36] bg-[#FFF0EB] px-2 py-0.5 rounded-full border border-[#FF5A36]/30">
                      Chưa lưu nháp
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#6E6779] hidden sm:block truncate">
                  Bản nháp được lưu độc lập · Khách chỉ xem bản đã xuất bản
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleManualSaveDraft}
                className="min-h-[40px] px-3 sm:px-4 py-2 rounded-2xl border border-[#EFE5D9] bg-white text-[#241E35] text-xs font-bold hover:bg-[#FFF9F3] transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Lưu bản nháp"
              >
                <Save className="w-3.5 h-3.5 text-[#FF5A36]" />
                <span className="hidden sm:inline">Lưu nháp</span>
              </button>

              <button
                onClick={handlePublishMenu}
                className="min-h-[40px] px-3.5 sm:px-5 py-2 rounded-2xl bg-[#FF5A36] text-white text-xs font-black hover:bg-[#E6431F] transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-[0.98]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Xuất bản ngay</span>
              </button>
            </div>
          </div>

          {/* Mobile Bottom Navigation Strip */}
          <div className="md:hidden px-3 border-t border-[#EFE5D9] flex items-center justify-between overflow-x-auto scrollbar-none bg-[#FFF9F3]">
            <button
              onClick={() => handleSwitchTab('overview')}
              className={`min-h-[42px] px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-[#FF5A36] text-[#241E35]'
                  : 'border-transparent text-[#6E6779]'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-[#FF5A36]" />
              <span>Tổng quan</span>
            </button>

            <button
              onClick={() => handleSwitchTab('menu')}
              className={`min-h-[42px] px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'menu'
                  ? 'border-[#FF5A36] text-[#241E35]'
                  : 'border-transparent text-[#6E6779]'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Thực đơn</span>
            </button>

            <button
              onClick={() => handleSwitchTab('editor')}
              className={`min-h-[42px] px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'editor'
                  ? 'border-[#FF5A36] text-[#241E35]'
                  : 'border-transparent text-[#6E6779]'
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-[#FF5A36]" />
              <span>Chỉnh trực tiếp</span>
            </button>

            <button
              onClick={() => handleSwitchTab('info')}
              className={`min-h-[42px] px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'info'
                  ? 'border-[#FF5A36] text-[#241E35]'
                  : 'border-transparent text-[#6E6779]'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Thông tin quán</span>
            </button>

            <button
              onClick={() => handleSwitchTab('qr')}
              className={`min-h-[42px] px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'qr'
                  ? 'border-[#FF5A36] text-[#241E35]'
                  : 'border-transparent text-[#6E6779]'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Mã QR</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="p-4 sm:p-6 max-w-7xl w-full mx-auto flex-1">
          {/* ================= TAB 0: TỔNG QUAN (SHOP OVERVIEW) ================= */}
          {activeTab === 'overview' && (
            <ShopOverview
              user={user}
              shopData={shopData}
              isPublished={isPublished}
              hasUnsavedChanges={hasUnsavedChanges}
              onNavigateTab={handleSwitchTab}
              onPublish={handlePublishMenu}
              onSaveDraft={handleManualSaveDraft}
              onOpenGuestUrl={onOpenGuestUrl}
            />
          )}

          {/* ================= TAB 1: DIRECT EDIT / LIVE POSTER EDITOR ================= */}
          {activeTab === 'editor' && (
            <div className="space-y-4">
              {/* Direct Edit Top Switcher */}
              <div className="bg-white rounded-[28px] p-4 border border-[#EFE5D9] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black uppercase tracking-wider text-[#FF5A36]">
                    Chế độ xem:
                  </span>
                  <div className="inline-flex rounded-2xl p-1 bg-[#FFF9F3] border border-[#EFE5D9]">
                    <button
                      onClick={() => setEditorMode('edit')}
                      className={`min-h-[34px] px-3.5 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                        editorMode === 'edit'
                          ? 'bg-[#FF5A36] text-white shadow-xs'
                          : 'text-[#6E6779] hover:text-[#241E35]'
                      }`}
                    >
                      <Palette className="w-3.5 h-3.5" />
                      <span>Chỉnh sửa trực tiếp ✏️</span>
                    </button>

                    <button
                      onClick={() => setEditorMode('preview')}
                      className={`min-h-[34px] px-3.5 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                        editorMode === 'preview'
                          ? 'bg-white text-[#241E35] shadow-xs'
                          : 'text-[#6E6779] hover:text-[#241E35]'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem như khách 👁️</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {editorMode === 'edit' ? (
                    <span className="text-[11px] font-bold text-[#FF5A36] bg-[#FFF0EB] px-3 py-1 rounded-full border border-[#FF5A36]/30">
                      Bấm vào tên, ảnh hoặc giá trên menu để sửa ngay
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-[#6E6779]">
                      Menu đang hiển thị chính xác như khách quét QR
                    </span>
                  )}
                  <button
                    onClick={() => onOpenGuestUrl(shop.id)}
                    className="text-[#6E6779] hover:text-[#241E35] text-xs font-bold underline cursor-pointer"
                  >
                    Mở tab riêng
                  </button>
                </div>
              </div>

              {/* Live Menu Renderer */}
              <GuestMenuView
                shopData={shopData}
                isPreview={true}
                isDirectEditMode={editorMode === 'edit'}
                onDirectUpdateItem={handleDirectUpdateItem}
                onDirectUpdateShop={handleDirectUpdateShop}
                onDirectUpdateHeaderBg={handleDirectUpdateHeaderBg}
                onOpenFullAddItem={handleOpenAddItem}
                onOpenFullEditItem={handleOpenEditItem}
                onOpenAddCategory={() => setIsCatManagerOpen(true)}
              />
            </div>
          )}

          {/* ================= TAB 2: QUẢN LÝ THỰC ĐƠN (MENU MANAGEMENT) ================= */}
          {activeTab === 'menu' && (
            <div className="space-y-5">
              {/* 1. Header Action Card */}
              <div className="bg-white rounded-[28px] p-5 sm:p-6 border border-[#EFE5D9] shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-[#241E35] tracking-tight">
                    Quản lý thực đơn
                  </h1>
                  <p className="text-xs sm:text-sm text-[#6E6779] mt-1 font-medium">
                    Tổng cộng <span className="font-bold text-[#241E35]">{items.length} món</span> trong{' '}
                    <span className="font-bold text-[#241E35]">{categories.length} nhóm món</span>
                    {searchQuery.trim() || selectedCatFilter !== 'all' || statusFilter !== 'all' ? (
                      <span className="ml-2 text-[#FF5A36] font-bold">
                        (Đang hiển thị {displayedItems.length} kết quả)
                      </span>
                    ) : null}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                  {/* Category Management Button */}
                  <button
                    onClick={() => setIsCatManagerOpen(true)}
                    className="min-h-[42px] px-3.5 py-2 rounded-2xl border border-[#EFE5D9] text-[#241E35] text-xs font-bold hover:bg-[#FFF9F3] transition-colors inline-flex items-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <FolderOpen className="w-4 h-4 text-[#FF5A36]" />
                    <span>Quản lý nhóm ({categories.length})</span>
                  </button>

                  {/* Reorder Mode Toggle Button */}
                  <button
                    onClick={() => {
                      setIsReorderMode(!isReorderMode);
                      if (!isReorderMode && categories.length > 0) {
                        setReorderCatId(selectedCatFilter !== 'all' ? selectedCatFilter : categories[0].id);
                      }
                    }}
                    className={`min-h-[42px] px-3.5 py-2 rounded-2xl text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer ${
                      isReorderMode
                        ? 'bg-[#241E35] text-white shadow-xs'
                        : 'border border-[#EFE5D9] bg-white text-[#241E35] hover:bg-[#FFF9F3]'
                    }`}
                  >
                    <ArrowUpDown className="w-4 h-4 text-[#FF5A36]" />
                    <span>{isReorderMode ? 'Xong sắp xếp' : 'Sắp xếp thứ tự'}</span>
                  </button>

                  {/* Primary Add Item Button */}
                  <button
                    onClick={() => handleOpenAddItem()}
                    className="min-h-[42px] px-4 sm:px-5 py-2 rounded-2xl bg-[#FF5A36] text-white text-xs font-black hover:bg-[#E6431F] transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-[0.98] ml-auto lg:ml-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm món mới</span>
                  </button>
                </div>
              </div>

              {/* ================= REORDER MODE VIEW ================= */}
              {isReorderMode ? (
                <div className="bg-white rounded-[28px] p-5 sm:p-6 border-2 border-[#241E35] shadow-md space-y-4 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EFE5D9]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#241E35] text-white flex items-center justify-center shrink-0">
                        <ArrowUpDown className="w-4 h-4 text-[#E5F76A]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-[#241E35]">
                          Chế độ sắp xếp thứ tự món
                        </h3>
                        <p className="text-xs text-[#6E6779]">
                          Chọn nhóm món bên dưới và dùng mũi tên để chỉnh vị trí hiển thị ngoài menu
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsReorderMode(false)}
                      className="px-4 py-2 rounded-xl bg-[#241E35] text-white text-xs font-black hover:bg-black transition-colors self-start sm:self-auto cursor-pointer"
                    >
                      Hoàn tất sắp xếp
                    </button>
                  </div>

                  {/* Category Pills for Reorder */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {categories.map((c) => {
                      const count = items.filter((i) => i.categoryId === c.id).length;
                      const isSelected = (reorderCatId || categories[0]?.id) === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => setReorderCatId(c.id)}
                          className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#FF5A36] text-white shadow-xs'
                              : 'bg-[#FFF9F3] text-[#241E35] border border-[#EFE5D9] hover:border-[#FF5A36]'
                          }`}
                        >
                          {c.name} ({count})
                        </button>
                      );
                    })}
                  </div>

                  {/* Reorder List for selected Category */}
                  {itemsForReorder.length === 0 ? (
                    <div className="p-8 text-center text-[#6E6779] bg-[#FFF9F3] rounded-2xl border border-dashed border-[#EFE5D9]">
                      Nhóm này chưa có món nào để sắp xếp.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {itemsForReorder.map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-3 sm:p-3.5 bg-[#FFF9F3] rounded-2xl border border-[#EFE5D9] flex items-center justify-between gap-3 hover:border-[#FF5A36]/60 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="w-7 text-xs font-mono font-black text-[#FF5A36] text-center shrink-0">
                              #{idx + 1}
                            </span>

                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-10 h-10 rounded-xl object-cover border border-[#EFE5D9] shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-white border border-[#EFE5D9] flex items-center justify-center text-[10px] text-[#6E6779] shrink-0 font-bold">
                                Không ảnh
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-black text-[#241E35] truncate">
                                {item.name}
                              </div>
                              <div className="text-[11px] text-[#6E6779]">
                                {item.pricingMode === 'single'
                                  ? formatVND(item.price)
                                  : `Từ ${formatVND(Math.min(...item.options.map((o) => o.price || 0)))}`}
                              </div>
                            </div>
                          </div>

                          {/* Reorder Arrows */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleMoveItemOrder(item.id, 'top')}
                              disabled={idx === 0}
                              className="p-1.5 rounded-lg text-[#6E6779] hover:text-[#241E35] hover:bg-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                              title="Lên đầu danh sách"
                            >
                              <ChevronsUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleMoveItemOrder(item.id, 'up')}
                              disabled={idx === 0}
                              className="p-1.5 rounded-lg text-[#6E6779] hover:text-[#241E35] hover:bg-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                              title="Lên trên 1 vị trí"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleMoveItemOrder(item.id, 'down')}
                              disabled={idx === itemsForReorder.length - 1}
                              className="p-1.5 rounded-lg text-[#6E6779] hover:text-[#241E35] hover:bg-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                              title="Xuống dưới 1 vị trí"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleMoveItemOrder(item.id, 'bottom')}
                              disabled={idx === itemsForReorder.length - 1}
                              className="p-1.5 rounded-lg text-[#6E6779] hover:text-[#241E35] hover:bg-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                              title="Xuống cuối danh sách"
                            >
                              <ChevronsDown className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* ================= STANDARD FILTER & SEARCH TOOLBAR ================= */
                <>
                  <div className="bg-white rounded-[28px] p-4 sm:p-5 border border-[#EFE5D9] shadow-xs space-y-3.5">
                    {/* Search & Status Filters */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                      {/* Search Input */}
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-[#6E6779] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Tìm món theo tên hoặc mô tả..."
                          className="w-full min-h-[42px] pl-10 pr-9 py-2 rounded-2xl border border-[#EFE5D9] bg-[#FFF9F3] text-xs text-[#241E35] font-bold focus:outline-hidden focus:border-[#FF5A36] focus:bg-white transition-colors placeholder:text-[#8E8799]"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E6779] hover:text-[#241E35] cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Status Filter Selector */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                        <span className="text-[11px] font-bold text-[#6E6779] shrink-0 mr-1">
                          Trạng thái:
                        </span>
                        {(
                          [
                            { id: 'all', label: 'Tất cả' },
                            { id: 'available', label: 'Còn bán' },
                            { id: 'out_of_stock', label: 'Tạm hết' },
                            { id: 'hidden', label: 'Đang ẩn' },
                          ] as const
                        ).map((st) => (
                          <button
                            key={st.id}
                            onClick={() => setStatusFilter(st.id)}
                            className={`min-h-[34px] px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                              statusFilter === st.id
                                ? 'bg-[#241E35] text-white shadow-xs'
                                : 'bg-[#FFF9F3] text-[#6E6779] border border-[#EFE5D9] hover:text-[#241E35]'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Category Filter Horizontal Pills */}
                    <div className="pt-3 border-t border-[#EFE5D9] flex items-center gap-2 overflow-x-auto scrollbar-none">
                      <span className="text-[11px] font-bold text-[#6E6779] shrink-0">
                        Nhóm món:
                      </span>
                      <button
                        onClick={() => setSelectedCatFilter('all')}
                        className={`min-h-[32px] px-3.5 py-1 rounded-full text-xs font-black whitespace-nowrap transition-colors cursor-pointer ${
                          selectedCatFilter === 'all'
                            ? 'bg-[#FF5A36] text-white shadow-xs'
                            : 'bg-[#FFF9F3] border border-[#EFE5D9] text-[#6E6779] hover:text-[#241E35]'
                        }`}
                      >
                        Tất cả ({items.length})
                      </button>
                      {categories.map((c) => {
                        const count = items.filter((i) => i.categoryId === c.id).length;
                        return (
                          <button
                            key={c.id}
                            onClick={() => setSelectedCatFilter(c.id)}
                            className={`min-h-[32px] px-3.5 py-1 rounded-full text-xs font-black whitespace-nowrap transition-colors cursor-pointer ${
                              selectedCatFilter === c.id
                                ? 'bg-[#FF5A36] text-white shadow-xs'
                                : 'bg-[#FFF9F3] border border-[#EFE5D9] text-[#6E6779] hover:text-[#241E35]'
                            }`}
                          >
                            {c.name} ({count})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ================= ITEMS LIST & MANAGEMENT TABLE ================= */}
                  {displayedItems.length === 0 ? (
                    <div className="bg-white rounded-[28px] p-10 text-center border border-[#EFE5D9] shadow-xs space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#FFF9F3] text-[#FF5A36] flex items-center justify-center mx-auto">
                        <UtensilsCrossed className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-black text-[#241E35]">
                        Không tìm thấy món ăn nào
                      </h3>
                      <p className="text-xs text-[#6E6779] max-w-sm mx-auto">
                        {searchQuery
                          ? `Không có món nào khớp với từ khóa "${searchQuery}". Hãy thử tìm từ khác hoặc xóa bộ lọc.`
                          : 'Chưa có món trong danh mục này. Hãy thêm món mới để bắt đầu.'}
                      </p>
                      <div className="pt-2 flex items-center justify-center gap-2">
                        {searchQuery || selectedCatFilter !== 'all' || statusFilter !== 'all' ? (
                          <button
                            onClick={() => {
                              setSearchQuery('');
                              setSelectedCatFilter('all');
                              setStatusFilter('all');
                            }}
                            className="px-4 py-2 rounded-xl border border-[#EFE5D9] text-xs font-bold text-[#241E35] hover:bg-[#FFF9F3] cursor-pointer"
                          >
                            Xóa bộ lọc
                          </button>
                        ) : null}
                        <button
                          onClick={() => handleOpenAddItem()}
                          className="px-4 py-2 rounded-xl bg-[#FF5A36] text-white text-xs font-bold hover:bg-[#E6431F] cursor-pointer"
                        >
                          Thêm món mới ngay
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-[28px] border border-[#EFE5D9] shadow-xs overflow-hidden divide-y divide-[#EFE5D9]">
                      {displayedItems.map((item) => {
                        const cat = categories.find((c) => c.id === item.categoryId);
                        const catName = cat ? cat.name : 'Chưa phân nhóm';

                        return (
                          <div
                            key={item.id}
                            className="p-4 sm:p-4.5 hover:bg-[#FFF9F3]/60 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5"
                          >
                            {/* Left: Thumbnail & Item Meta */}
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              {item.imageUrl ? (
                                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[#241E35] shrink-0 border border-[#EFE5D9]">
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-14 h-14 rounded-2xl bg-[#FFF9F3] text-[#6E6779] shrink-0 border border-[#EFE5D9] flex items-center justify-center text-[10px] font-bold text-center p-1">
                                  Không ảnh
                                </div>
                              )}

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-sm font-black text-[#241E35] truncate">
                                    {item.name}
                                  </h3>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF9F3] text-[#6E6779] border border-[#EFE5D9]">
                                    {catName}
                                  </span>
                                </div>

                                {item.description && (
                                  <p className="text-[11px] text-[#6E6779] line-clamp-1 mt-0.5 font-medium">
                                    {item.description}
                                  </p>
                                )}

                                {/* Price Representation */}
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <div className="text-xs font-black text-[#FF5A36] tabular-nums">
                                    {item.pricingMode === 'single' ? (
                                      formatVND(item.price)
                                    ) : (
                                      <span>
                                        Từ {formatVND(Math.min(...item.options.map((o) => o.price || 0)))}
                                      </span>
                                    )}
                                  </div>

                                  {item.pricingMode === 'multiple' && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-[#E5F76A] text-[#241E35] border border-[#d6ea56]">
                                      <Layers className="w-3 h-3 text-[#241E35]" />
                                      <span>Nhiều mức giá ({item.options.length} lựa chọn)</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: Quick Controls (Status selector, Duplicate, Edit, Delete) */}
                            <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-center justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-[#EFE5D9]/70">
                              {/* Quick Status Dropdown */}
                              <select
                                value={item.status}
                                onChange={(e) =>
                                  handleQuickStatusChange(
                                    item.id,
                                    e.target.value as MenuItemStatus
                                  )
                                }
                                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-xl border focus:outline-hidden cursor-pointer ${
                                  item.status === 'available'
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                    : item.status === 'out_of_stock'
                                    ? 'bg-[#E5F76A] border-[#d6ea56] text-[#241E35]'
                                    : 'bg-stone-100 border-stone-300 text-stone-700'
                                }`}
                              >
                                <option value="available">Còn bán</option>
                                <option value="out_of_stock">Tạm hết</option>
                                <option value="hidden">Đang ẩn</option>
                              </select>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-1">
                                {/* Duplicate Button */}
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateItem(item)}
                                  className="min-h-[36px] min-w-[36px] p-2 rounded-xl border border-[#EFE5D9] text-[#6E6779] hover:text-[#241E35] hover:bg-[#FFF9F3] transition-colors flex items-center justify-center cursor-pointer"
                                  title="Nhân bản món này (tạo bản sao)"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>

                                {/* Edit Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditItem(item)}
                                  className="min-h-[36px] min-w-[36px] p-2 rounded-xl border border-[#EFE5D9] text-[#6E6779] hover:text-[#241E35] hover:bg-[#FFF9F3] transition-colors flex items-center justify-center cursor-pointer"
                                  title="Chỉnh sửa chi tiết"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete Button */}
                                <button
                                  type="button"
                                  onClick={() => setDeletingItem(item)}
                                  className="min-h-[36px] min-w-[36px] p-2 rounded-xl border border-[#EFE5D9] text-[#6E6779] hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center cursor-pointer"
                                  title="Xóa món"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ================= TAB 3: SHOP INFO ================= */}
          {activeTab === 'info' && (
            <ShopInfoForm
              shop={shop}
              onSave={(updated) => {
                onUpdateDraft({
                  ...shopData,
                  shop: updated,
                });
                setHasUnsavedChanges(true);
                showToast('success', 'Đã lưu thông tin quán vào bản nháp!');
              }}
            />
          )}

          {/* ================= TAB 4: QR CODE ================= */}
          {activeTab === 'qr' && (
            <QRView shop={shop} onOpenGuestView={onOpenGuestUrl} />
          )}
        </main>
      </div>

      {/* --- MODALS --- */}
      {/* 1. Full Item Modal */}
      <ItemModal
        isOpen={isItemModalOpen}
        item={editingItem}
        categories={categories}
        defaultCategoryId={modalDefaultCategoryId}
        onSave={handleSaveItem}
        onClose={() => setIsItemModalOpen(false)}
      />

      {/* 2. Full Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCatManagerOpen}
        categories={categories}
        items={items}
        onSaveCategory={handleSaveCategory}
        onMoveCategoryOrder={handleMoveCategoryOrder}
        onDeleteCategory={handleDeleteCategory}
        onClose={() => setIsCatManagerOpen(false)}
      />

      {/* 3. Delete Item Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingItem}
        title={`Xóa món "${deletingItem?.name}"?`}
        description="Món này sẽ bị xóa khỏi thực đơn bản nháp. Khách quét QR sẽ không thấy món này sau khi bạn bấm Xuất bản."
        confirmLabel="Xác nhận xóa món"
        cancelLabel="Giữ lại"
        isDanger={true}
        onConfirm={handleDeleteItemConfirm}
        onClose={() => setDeletingItem(null)}
      />

      {/* 4. Reset Demo Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isResetConfirmOpen}
        title="Khôi phục thực đơn mẫu ban đầu"
        description='Hành động này sẽ đặt lại toàn bộ quán "Bếp & Cà phê Mộc" về trạng thái chuẩn ban đầu.'
        confirmLabel="Khôi phục dữ liệu mẫu"
        cancelLabel="Giữ nguyên"
        isDanger={false}
        onConfirm={() => {
          onResetDemo();
          setIsResetConfirmOpen(false);
          setHasUnsavedChanges(false);
        }}
        onClose={() => setIsResetConfirmOpen(false)}
      />

      {/* 5. Unsaved Changes Navigation Guard Modal */}
      {pendingTabSwitch && (
        <DeleteConfirmModal
          isOpen={true}
          title="Bạn có thay đổi chưa lưu trên bản nháp"
          description="Bạn đang có chỉnh sửa trực tiếp chưa lưu nháp. Bạn có muốn lưu bản nháp ngay hay bỏ thay đổi để chuyển trang?"
          confirmLabel="Lưu bản nháp & Chuyển trang"
          cancelLabel="Bỏ thay đổi & Chuyển"
          isDanger={false}
          onConfirm={() => {
            handleManualSaveDraft();
            setActiveTab(pendingTabSwitch as any);
            setPendingTabSwitch(null);
          }}
          onClose={() => {
            setHasUnsavedChanges(false);
            setActiveTab(pendingTabSwitch as any);
            setPendingTabSwitch(null);
          }}
        />
      )}
    </div>
  );
};
