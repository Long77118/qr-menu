import './ownerDashboard.css';
import './ownerWorkspace.css';
import { CategoryTabs } from './CategoryTabs';
import React, { useState, useRef, useEffect } from 'react';
import { OperationResult } from '../types/operations';
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
  isSyncing?: boolean;
  hasPendingDraft?: boolean;
  onUpdateDraft: (newData: ShopData) => Promise<OperationResult>;
  onPublish: (snapshot: ShopData) => Promise<OperationResult>;
  onLogout: () => void;
  onOpenGuestUrl: (shopId: string) => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  user,
  shopData,
  isPublished,
  isSyncing = false,
  hasPendingDraft = false,
  onUpdateDraft: updateDraft,
  onPublish,
  onLogout,
  onOpenGuestUrl,
  showToast,
}) => {
  // Navigation Tabs: 'overview' (Tổng quan), 'menu' (Quản lý thực đơn), 'editor' (Thiết kế menu), 'info' (Thông tin quán), 'qr' (Mã QR)
  const [activeTab, setActiveTab] = useState<'overview' | 'editor' | 'menu' | 'info' | 'qr'>('overview');

  // Sub-mode in 'editor' tab: 'edit' (Chế độ chỉnh sửa trực tiếp) vs 'preview' (Xem như khách)
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('mobile');
  const [infoDirty, setInfoDirty] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'cloud' | 'local' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');
  const [editorMode, setEditorMode] = useState<'edit' | 'preview'>('edit');

  // Track unsaved changes in draft
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(hasPendingDraft);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(hasPendingDraft);
  useEffect(() => {
    if (!infoDirty && !hasUnsavedChanges && !hasPendingDraft) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue=''; };
    window.addEventListener('beforeunload',warn); return () => window.removeEventListener('beforeunload',warn);
  }, [infoDirty,hasUnsavedChanges,hasPendingDraft]);
  const previousPending = useRef(hasPendingDraft);
  useEffect(() => {
    if (hasPendingDraft) { setHasUnsavedChanges(true); setHasUnpublishedChanges(true); }
    else if (previousPending.current) { setHasUnsavedChanges(false); setSaveState('cloud'); setSaveError(''); }
    previousPending.current = hasPendingDraft;
  }, [hasPendingDraft]);
  const draftRevision = useRef(0);
  const busyRef = useRef(false);
  const [isBusy, setIsBusy] = useState(false);
  const onUpdateDraft = (data: ShopData) => {
    draftRevision.current++;
    const revision = draftRevision.current;
    setHasUnsavedChanges(true);
    setHasUnpublishedChanges(true);
    setSaveState('saving');
    setSaveError('');
    return updateDraft(data).catch((error): OperationResult => ({success:false,error:error instanceof Error ? error.message : 'Không lưu được bản nháp.'})).then((result) => {
      if (revision === draftRevision.current) {
        if (result.success) {
          setHasUnsavedChanges(!!result.pending);
          setSaveState(result.storage === 'cloud' ? 'cloud' : 'local');
          showToast(result.storage === 'cloud' ? 'success' : 'info', result.storage === 'cloud' ? 'Đã lưu bản nháp. Xuất bản để khách thấy thay đổi.' : 'Đã lưu trên thiết bị này; đang chờ đồng bộ.');
        } else { setSaveState('error'); setSaveError(result.error || 'Không lưu được bản nháp.'); }
      }
      return result;
    });
  };
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


  const { shop, categories, items } = shopData;
  const themeColor = shop.themeColor || '#FF5A36';
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const measure = () => setHeaderHeight(header.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  // --- SAFE NAVIGATION GUARD FOR UNSAVED CHANGES ---
  const handleSwitchTab = (targetTab: 'overview' | 'editor' | 'menu' | 'info' | 'qr') => {
    if (activeTab === targetTab) return;
    if (hasUnsavedChanges && activeTab === 'editor') {
      setPendingTabSwitch(targetTab);
    } else {
      setActiveTab(targetTab);
    }
  };

  const openPublishedMenu = (shopId:string) => {
    if (infoDirty) { setActiveTab('info'); showToast('info','Lưu thông tin quán trước khi mở trang khác.'); return; }
    onOpenGuestUrl(shopId);
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
  const handleSaveCategory = (name: string, id?: string, imageUrl?: string | null) => {
    let updatedCategories = [...categories];

    if (id) {
      updatedCategories = updatedCategories.map((c) => (c.id === id ? { ...c, name, ...(imageUrl !== undefined ? {imageUrl:imageUrl ?? undefined} : {}) } : c));
    } else {
      const newCat: MenuCategory = {
        id: 'cat-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        name,
        order: categories.length + 1,
      };
      updatedCategories.push(newCat);
    }

    const save = onUpdateDraft({
      ...shopData,
      categories: updatedCategories,
    });
    setHasUnsavedChanges(true);
    return save;
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
  };

  // --- MANUAL DRAFT SAVE & PUBLISH ---
  const handleManualSaveDraft = async (): Promise<boolean> => {
    if (infoDirty) { (document.getElementById('owner-shop-info-form') as HTMLFormElement | null)?.requestSubmit(); setActiveTab('info'); return false; }
    if (busyRef.current) return false;
    busyRef.current = true;
    setIsBusy(true);
    try {
      const saved = onUpdateDraft(shopData);
      const revision = draftRevision.current;
      const result = await saved;
      if (!result.success) return false;
      if (draftRevision.current === revision) setHasUnsavedChanges(false);
      return draftRevision.current === revision;
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Không thể lưu bản nháp.');
      return false;
    } finally { busyRef.current = false; setIsBusy(false); }
  };

  const handlePublishMenu = async () => {
    if (saveState === 'saving' || saveState === 'local' || hasPendingDraft) { showToast('info','Đợi bản nháp lưu và đồng bộ xong trước khi xuất bản.'); return; }
    if (infoDirty) { setActiveTab('info'); showToast('info','Lưu thông tin quán đang nhập trước khi xuất bản.'); return; }
    if (busyRef.current) return;
    busyRef.current = true;
    setIsBusy(true);
    const revision = draftRevision.current;
    try {
      const result = await onPublish(shopData);
      if (result.success && draftRevision.current === revision) {
        setHasUnsavedChanges(false);
        setHasUnpublishedChanges(false);
        setSaveState('cloud'); setSaveError('');
      }
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Không thể xuất bản.');
    } finally { busyRef.current = false; setIsBusy(false); }
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
    <div style={{'--owner-header-height':`${headerHeight}px`} as React.CSSProperties} onClickCapture={event => {
      if (infoDirty && (event.target as HTMLElement).closest?.('a[href^="#"]')) { event.preventDefault(); event.stopPropagation(); setActiveTab('info'); showToast('info','Lưu thông tin quán trước khi mở trang khác.'); }
    }} className="owner-dashboard min-h-screen bg-[#F4ECDF] text-[#163E37] flex flex-col md:flex-row">
      {/* ================= DESKTOP LEFT SIDEBAR ================= */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-[#FFFCF7] border-r border-[#E2D8CF] min-h-screen sticky top-0 h-screen overflow-y-auto">
        {/* Brand & Workspace Title */}
        <div className="p-5 border-b border-[#E2D8CF]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-[#7054AE] text-white flex items-center justify-center font-semibold text-sm shadow-xs">
              QR
            </div>
            <div>
              <div className="text-base font-semibold text-[#163E37] font-serif leading-tight">
                QR Menu
              </div>
              <div className="text-[11px] text-[#746E79]">Quản lý thực đơn</div>
            </div>
          </div>

          {/* Shop Card */}
          <div className="mt-4 p-3 rounded-2xl bg-[#F4ECDF] border border-[#E2D8CF]">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-semibold text-xs shrink-0 shadow-xs"
                style={{ backgroundColor: themeColor }}
              >
                {shop.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-[#163E37] truncate">{shop.name}</div>
                <div className="text-[10px] text-[#746E79] truncate font-mono">
                  {user.email || `Mã: ${shop.id}`}
                </div>
                {user.isFirebaseUser && (
                  <div className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded-md mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Tài khoản trực tuyến</span>
                  </div>
                )}
              </div>
            </div>

            {/* Metrics count */}
            <div className="mt-2.5 pt-2 border-t border-[#E2D8CF] flex items-center justify-between text-[11px] text-[#746E79]">
              <span>{items.length} món</span>
              <span>·</span>
              <span>{categories.length} nhóm</span>
              <span>·</span>
              <span
                className={`font-semibold ${
                  hasUnsavedChanges
                    ? 'text-[#7054AE]'
                    : isPublished
                    ? 'text-emerald-700'
                    : 'text-amber-800'
                }`}
              >
                {hasUnsavedChanges
                  ? 'Chưa lưu nháp'
                  : hasUnpublishedChanges
                  ? 'Nháp chưa xuất bản'
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
            aria-current={activeTab === 'overview' ? 'page' : undefined}
            className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#E0F1E9] text-[#163E37] shadow-xs'
                : 'text-[#746E79] hover:bg-[#F4ECDF] hover:text-[#163E37]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-[#7054AE]" />
            <span className="flex-1 text-left">Tổng quan</span>
          </button>

          <button
            onClick={() => handleSwitchTab('menu')}
            aria-current={activeTab === 'menu' ? 'page' : undefined}
            className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'menu'
                ? 'bg-[#E0F1E9] text-[#163E37] shadow-xs'
                : 'text-[#746E79] hover:bg-[#F4ECDF] hover:text-[#163E37]'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4 text-[#7054AE]" />
            <span className="flex-1 text-left">Quản lý thực đơn</span>
            <span className="text-[11px] bg-[#FFFCF7] px-2 py-0.5 rounded-full border border-[#E2D8CF] text-[#746E79] font-mono">
              {items.length}
            </span>
          </button>

          <button
            onClick={() => handleSwitchTab('editor')}
            aria-current={activeTab === 'editor' ? 'page' : undefined}
            className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'editor'
                ? 'bg-[#E0F1E9] text-[#163E37] shadow-xs'
                : 'text-[#746E79] hover:bg-[#F4ECDF] hover:text-[#163E37]'
            }`}
          >
            <Palette className="w-4 h-4 text-[#7054AE]" />
            <span className="flex-1 text-left">Thiết kế menu</span>
            <span className="text-[10px] bg-[#7054AE] text-white px-2 py-0.5 rounded-full font-semibold">
              Mới
            </span>
          </button>

          <button
            onClick={() => handleSwitchTab('info')}
            aria-current={activeTab === 'info' ? 'page' : undefined}
            className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'info'
                ? 'bg-[#E0F1E9] text-[#163E37] shadow-xs'
                : 'text-[#746E79] hover:bg-[#F4ECDF] hover:text-[#163E37]'
            }`}
          >
            <Store className="w-4 h-4 text-[#7054AE]" />
            <span className="flex-1 text-left">Thông tin quán</span>
          </button>

          <button
            onClick={() => handleSwitchTab('qr')}
            aria-current={activeTab === 'qr' ? 'page' : undefined}
            className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-[#E0F1E9] text-[#163E37] shadow-xs'
                : 'text-[#746E79] hover:bg-[#F4ECDF] hover:text-[#163E37]'
            }`}
          >
            <QrCode className="w-4 h-4 text-[#7054AE]" />
            <span className="flex-1 text-left">Mã QR &amp; Chia sẻ</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[#E2D8CF] space-y-2">
          <a href="#/discover" className="block px-3 py-2 rounded-xl text-xs font-bold text-[#7054AE]">Khám phá các quán</a>
          <p className="px-3 text-[11px] text-[#746E79]">Xuất bản sẽ công khai menu và địa chỉ quán trong danh sách khám phá.</p>


          <button
            onClick={() => { if (infoDirty) { setActiveTab('info'); showToast('info','Lưu thông tin quán trước khi đăng xuất.'); return; } onLogout(); }}
            className="w-full px-3 py-2 rounded-xl text-[11px] text-[#746E79] hover:text-rose-700 hover:bg-rose-50 flex items-center gap-2 transition-colors font-medium cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất tài khoản</span>
          </button>
        </div>
      </aside>

      {/* ================= RIGHT MAIN WORKSPACE ================= */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header data-owner-header ref={headerRef} className="sticky top-0 z-30 bg-[#FFFCF7]/95 backdrop-blur-md border-b border-[#E2D8CF]">
          <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="md:hidden w-8 h-8 rounded-xl bg-[#7054AE] text-white flex items-center justify-center font-semibold text-xs shrink-0 shadow-xs">
                QR
              </div>
              <div className="min-w-0">
                <div className="text-sm sm:text-base font-semibold text-[#163E37] truncate flex items-center gap-2">
                  <span>{shop.name}</span>
                  {hasUnsavedChanges && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#7054AE] bg-[#E6DCF1] px-2 py-0.5 rounded-full border border-[#7054AE]/30">
                      Chưa lưu nháp
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#746E79] hidden sm:block truncate">
                  Bản nháp được lưu độc lập · Khách chỉ xem bản đã xuất bản
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="owner-status" data-state={saveState} role="status" aria-live="polite">{isBusy || isSyncing || saveState === 'saving' ? 'Đang lưu…' : infoDirty ? 'Thông tin chưa lưu' : saveState === 'error' ? saveError : hasPendingDraft || saveState === 'local' ? 'Chờ đồng bộ' : hasUnpublishedChanges ? 'Nháp chưa xuất bản' : hasUnsavedChanges ? 'Chưa lưu nháp' : isPublished ? 'Menu đang công khai' : 'Chưa xuất bản'}</span>
              <button
                onClick={handleManualSaveDraft}
                disabled={isBusy}
                className="min-h-[40px] px-3 sm:px-4 py-2 rounded-2xl border border-[#E2D8CF] bg-[#FFFCF7] text-[#163E37] text-xs font-bold hover:bg-[#F4ECDF] transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                aria-label="Lưu bản nháp" title="Lưu bản nháp"
              >
                <Save className="w-3.5 h-3.5 text-[#7054AE]" />
                <span className="hidden sm:inline">Lưu nháp</span>
              </button>

              <button
                onClick={handlePublishMenu}
                disabled={isBusy || isSyncing || saveState === 'saving' || saveState === 'local' || hasPendingDraft}
                className="min-h-[40px] px-3.5 sm:px-5 py-2 rounded-2xl bg-[#7054AE] text-white text-xs font-semibold hover:bg-[#624598] transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-[0.98]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Xuất bản ngay</span>
              </button>
            </div>
          </div>

          {/* Mobile Bottom Navigation Strip */}
          <nav aria-label="Quản lý quán" className="owner-mobile-nav md:hidden px-3 border-t border-[#E2D8CF] flex items-center justify-between overflow-x-auto scrollbar-none bg-[#F4ECDF]">
            <button
              onClick={() => handleSwitchTab('overview')}
            aria-current={activeTab === 'overview' ? 'page' : undefined}
              className={`min-h-[42px] px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-[#7054AE] text-[#163E37]'
                  : 'border-transparent text-[#746E79]'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-[#7054AE]" />
              <span>Tổng quan</span>
            </button>

            <button
              onClick={() => handleSwitchTab('menu')}
            aria-current={activeTab === 'menu' ? 'page' : undefined}
              className={`min-h-[42px] px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'menu'
                  ? 'border-[#7054AE] text-[#163E37]'
                  : 'border-transparent text-[#746E79]'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Thực đơn</span>
            </button>

            <button
              onClick={() => handleSwitchTab('editor')}
            aria-current={activeTab === 'editor' ? 'page' : undefined}
              className={`min-h-[42px] px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'editor'
                  ? 'border-[#7054AE] text-[#163E37]'
                  : 'border-transparent text-[#746E79]'
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-[#7054AE]" />
              <span>Thiết kế</span>
            </button>

            <button
              onClick={() => handleSwitchTab('info')}
            aria-current={activeTab === 'info' ? 'page' : undefined}
              className={`min-h-[42px] px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'info'
                  ? 'border-[#7054AE] text-[#163E37]'
                  : 'border-transparent text-[#746E79]'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Quán</span>
            </button>

            <button
              onClick={() => handleSwitchTab('qr')}
            aria-current={activeTab === 'qr' ? 'page' : undefined}
              className={`min-h-[42px] px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'qr'
                  ? 'border-[#7054AE] text-[#163E37]'
                  : 'border-transparent text-[#746E79]'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Mã QR</span>
            </button>
          </nav>
        </header>

        {/* Content Body */}
        <main className="owner-content p-4 sm:p-6 max-w-7xl w-full mx-auto flex-1">
          {/* ================= TAB 0: TỔNG QUAN (SHOP OVERVIEW) ================= */}
          {activeTab === 'overview' && (
            <ShopOverview
              user={user}
              shopData={shopData}
              isPublished={isPublished}
              hasUnsavedChanges={hasUnsavedChanges}
              hasUnpublishedChanges={hasUnpublishedChanges}
              isBusy={isBusy || isSyncing}
              onNavigateTab={handleSwitchTab}
              onPublish={handlePublishMenu}
              onSaveDraft={handleManualSaveDraft}
              onOpenGuestUrl={openPublishedMenu}
            />
          )}

          {/* ================= TAB 1: DIRECT EDIT / LIVE POSTER EDITOR ================= */}
          {activeTab === 'editor' && (
            <div className="space-y-4">
              {/* Direct Edit Top Switcher */}
              <div className="owner-editor-switch bg-[#FFFCF7] rounded-[28px] p-4 border border-[#E2D8CF] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#7054AE]">
                    Chế độ xem:
                  </span>
                    <div role="group" aria-label="Chế độ thiết kế menu" className="inline-flex rounded-2xl p-1 bg-[#F4ECDF] border border-[#E2D8CF]">
                    <button
                      onClick={() => setEditorMode('edit')}
                        aria-pressed={editorMode === 'edit'}
                      className={`min-h-[34px] px-3.5 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                        editorMode === 'edit'
                          ? 'bg-[#7054AE] text-white shadow-xs'
                          : 'text-[#746E79] hover:text-[#163E37]'
                      }`}
                    >
                      <Palette className="w-3.5 h-3.5" />
                      <span>Chỉnh trực tiếp</span>
                    </button>

                    <button
                      onClick={() => setEditorMode('preview')}
                        aria-pressed={editorMode === 'preview'}
                      className={`min-h-[34px] px-3.5 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                        editorMode === 'preview'
                          ? 'bg-[#FFFCF7] text-[#163E37] shadow-xs'
                          : 'text-[#746E79] hover:text-[#163E37]'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem như khách</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {editorMode === 'edit' ? (
                    <span className="text-[11px] font-bold text-[#7054AE] bg-[#E6DCF1] px-3 py-1 rounded-full border border-[#7054AE]/30">
                      Bấm vào tên, ảnh hoặc giá trên menu để sửa ngay
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-[#746E79]">
                      Xem trước bản nháp; khách chỉ thấy bản đã xuất bản
                    </span>
                  )}
                  <button
                    onClick={() => openPublishedMenu(shop.id)}
                    className="text-[#746E79] hover:text-[#163E37] text-xs font-bold underline cursor-pointer"
                  >
                    Mở tab riêng
                  </button>
                </div>
              </div>

              {/* Shared guest renderer with optional editing controls. */}
              <div className="owner-device-picker" role="group" aria-label="Kích thước xem trước">
                <button type="button" aria-pressed={previewDevice === 'desktop'} onClick={() => setPreviewDevice('desktop')}>Màn hình lớn</button>
                <button type="button" aria-pressed={previewDevice === 'mobile'} onClick={() => setPreviewDevice('mobile')}>Điện thoại</button>
              </div>
                <p className="owner-preview-caption">{previewDevice === 'mobile' ? 'Khung điện thoại 390 px · Tự co theo màn hình của bạn' : 'Bố cục màn hình lớn · Co theo không gian làm việc'}</p>
                <div className="owner-preview-canvas"><div className="owner-preview-frame" data-device={previewDevice}><GuestMenuView
                shopData={shopData}
                isPreview={true}
                previewDevice={previewDevice}
                isDirectEditMode={editorMode === 'edit'}
                onDirectUpdateItem={handleDirectUpdateItem}
                onDirectUpdateShop={handleDirectUpdateShop}
                onDirectUpdateHeaderBg={handleDirectUpdateHeaderBg}
                onOpenFullAddItem={handleOpenAddItem}
                onOpenFullEditItem={handleOpenEditItem}
                onOpenAddCategory={() => setIsCatManagerOpen(true)}
                /></div></div>
            </div>
          )}

          {/* ================= TAB 2: QUẢN LÝ THỰC ĐƠN (MENU MANAGEMENT) ================= */}
          {activeTab === 'menu' && (
            <div className="space-y-5">
              {/* 1. Header Action Card */}
              <div className="bg-[#FFFCF7] rounded-[28px] p-5 sm:p-6 border border-[#E2D8CF] shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-semibold text-[#163E37] tracking-tight">
                    Quản lý thực đơn
                  </h1>
                  <p className="text-xs sm:text-sm text-[#746E79] mt-1 font-medium">
                    Tổng cộng <span className="font-bold text-[#163E37]">{items.length} món</span> trong{' '}
                    <span className="font-bold text-[#163E37]">{categories.length} nhóm món</span>
                    {searchQuery.trim() || selectedCatFilter !== 'all' || statusFilter !== 'all' ? (
                      <span className="ml-2 text-[#7054AE] font-bold">
                        (Đang hiển thị {displayedItems.length} kết quả)
                      </span>
                    ) : null}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                  {/* Category Management Button */}
                  <button
                    onClick={() => setIsCatManagerOpen(true)}
                    className="min-h-[42px] px-3.5 py-2 rounded-2xl border border-[#E2D8CF] text-[#163E37] text-xs font-bold hover:bg-[#F4ECDF] transition-colors inline-flex items-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <FolderOpen className="w-4 h-4 text-[#7054AE]" />
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
                        ? 'bg-[#163E37] text-white shadow-xs'
                        : 'border border-[#E2D8CF] bg-[#FFFCF7] text-[#163E37] hover:bg-[#F4ECDF]'
                    }`}
                  >
                    <ArrowUpDown className="w-4 h-4 text-[#7054AE]" />
                    <span>{isReorderMode ? 'Xong sắp xếp' : 'Sắp xếp thứ tự'}</span>
                  </button>

                  {/* Primary Add Item Button */}
                  <button
                    onClick={() => handleOpenAddItem()}
                    className="min-h-[42px] px-4 sm:px-5 py-2 rounded-2xl bg-[#7054AE] text-white text-xs font-semibold hover:bg-[#624598] transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-[0.98] ml-auto lg:ml-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm món mới</span>
                  </button>
                </div>
              </div>

              {/* ================= REORDER MODE VIEW ================= */}
              {isReorderMode ? (
                <div className="bg-[#FFFCF7] rounded-[28px] p-5 sm:p-6 border-2 border-[#163E37] shadow-md space-y-4 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2D8CF]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#163E37] text-white flex items-center justify-center shrink-0">
                        <ArrowUpDown className="w-4 h-4 text-[#E0F1E9]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[#163E37]">
                          Chế độ sắp xếp thứ tự món
                        </h3>
                        <p className="text-xs text-[#746E79]">
                          Chọn nhóm món bên dưới và dùng mũi tên để chỉnh vị trí hiển thị ngoài menu
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsReorderMode(false)}
                      className="px-4 py-2 rounded-xl bg-[#163E37] text-white text-xs font-semibold hover:bg-black transition-colors self-start sm:self-auto cursor-pointer"
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
                          className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#7054AE] text-white shadow-xs'
                              : 'bg-[#F4ECDF] text-[#163E37] border border-[#E2D8CF] hover:border-[#7054AE]'
                          }`}
                        >
                          {c.name} ({count})
                        </button>
                      );
                    })}
                  </div>

                  {/* Reorder List for selected Category */}
                  {itemsForReorder.length === 0 ? (
                    <div className="p-8 text-center text-[#746E79] bg-[#F4ECDF] rounded-2xl border border-dashed border-[#E2D8CF]">
                      Nhóm này chưa có món nào để sắp xếp.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {itemsForReorder.map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-3 sm:p-3.5 bg-[#F4ECDF] rounded-2xl border border-[#E2D8CF] flex items-center justify-between gap-3 hover:border-[#7054AE]/60 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="w-7 text-xs font-mono font-semibold text-[#7054AE] text-center shrink-0">
                              #{idx + 1}
                            </span>

                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-10 h-10 rounded-xl object-cover border border-[#E2D8CF] shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-[#FFFCF7] border border-[#E2D8CF] flex items-center justify-center text-[10px] text-[#746E79] shrink-0 font-bold">
                                Không ảnh
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-[#163E37] truncate">
                                {item.name}
                              </div>
                              <div className="text-[11px] text-[#746E79]">
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
                              className="p-1.5 rounded-lg text-[#746E79] hover:text-[#163E37] hover:bg-[#FFFCF7] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                              title="Lên đầu danh sách"
                            >
                              <ChevronsUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleMoveItemOrder(item.id, 'up')}
                              disabled={idx === 0}
                              className="p-1.5 rounded-lg text-[#746E79] hover:text-[#163E37] hover:bg-[#FFFCF7] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                              title="Lên trên 1 vị trí"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleMoveItemOrder(item.id, 'down')}
                              disabled={idx === itemsForReorder.length - 1}
                              className="p-1.5 rounded-lg text-[#746E79] hover:text-[#163E37] hover:bg-[#FFFCF7] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                              title="Xuống dưới 1 vị trí"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleMoveItemOrder(item.id, 'bottom')}
                              disabled={idx === itemsForReorder.length - 1}
                              className="p-1.5 rounded-lg text-[#746E79] hover:text-[#163E37] hover:bg-[#FFFCF7] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
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
                  <div style={{ top: headerHeight }} className="sticky z-20 bg-[#FFFCF7] rounded-[28px] p-4 sm:p-5 border border-[#E2D8CF] shadow-xs space-y-3.5">
                    {/* Search & Status Filters */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                      {/* Search Input */}
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-[#746E79] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Tìm món theo tên hoặc mô tả..."
                          className="w-full min-h-[42px] pl-10 pr-9 py-2 rounded-2xl border border-[#E2D8CF] bg-[#F4ECDF] text-xs text-[#163E37] font-bold focus:outline-hidden focus:border-[#7054AE] focus:bg-[#FFFCF7] transition-colors placeholder:text-[#8E8799]"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#746E79] hover:text-[#163E37] cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Status Filter Selector */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                        <span className="text-[11px] font-bold text-[#746E79] shrink-0 mr-1">
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
                                ? 'bg-[#163E37] text-white shadow-xs'
                                : 'bg-[#F4ECDF] text-[#746E79] border border-[#E2D8CF] hover:text-[#163E37]'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#E2D8CF]">
                      <CategoryTabs categories={categories} items={items}
                        selectedId={selectedCatFilter} onSelect={setSelectedCatFilter} />
                    </div>
                  </div>
                  {/* ================= ITEMS LIST & MANAGEMENT TABLE ================= */}
                  {displayedItems.length === 0 ? (
                    <div className="bg-[#FFFCF7] rounded-[28px] p-10 text-center border border-[#E2D8CF] shadow-xs space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#F4ECDF] text-[#7054AE] flex items-center justify-center mx-auto">
                        <UtensilsCrossed className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-semibold text-[#163E37]">
                        Không tìm thấy món ăn nào
                      </h3>
                      <p className="text-xs text-[#746E79] max-w-sm mx-auto">
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
                            className="px-4 py-2 rounded-xl border border-[#E2D8CF] text-xs font-bold text-[#163E37] hover:bg-[#F4ECDF] cursor-pointer"
                          >
                            Xóa bộ lọc
                          </button>
                        ) : null}
                        <button
                          onClick={() => handleOpenAddItem()}
                          className="px-4 py-2 rounded-xl bg-[#7054AE] text-white text-xs font-bold hover:bg-[#624598] cursor-pointer"
                        >
                          Thêm món mới ngay
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#FFFCF7] rounded-[28px] border border-[#E2D8CF] shadow-xs overflow-hidden divide-y divide-[#E2D8CF]">
                      {displayedItems.map((item) => {
                        const cat = categories.find((c) => c.id === item.categoryId);
                        const catName = cat ? cat.name : 'Chưa phân nhóm';

                        return (
                          <div
                            key={item.id}
                            className="p-4 sm:p-4.5 hover:bg-[#F4ECDF]/60 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5"
                          >
                            {/* Left: Thumbnail & Item Meta */}
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              {item.imageUrl ? (
                                <div className="owner-menu-thumb w-14 h-14 rounded-2xl overflow-hidden bg-[#163E37] shrink-0 border border-[#E2D8CF]">
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-14 h-14 rounded-2xl bg-[#F4ECDF] text-[#746E79] shrink-0 border border-[#E2D8CF] flex items-center justify-center text-[10px] font-bold text-center p-1">
                                  Không ảnh
                                </div>
                              )}

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-sm font-semibold text-[#163E37] truncate">
                                    {item.name}
                                  </h3>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F4ECDF] text-[#746E79] border border-[#E2D8CF]">
                                    {catName}
                                  </span>
                                </div>

                                {item.description && (
                                  <p className="text-[11px] text-[#746E79] line-clamp-1 mt-0.5 font-medium">
                                    {item.description}
                                  </p>
                                )}

                                {/* Price Representation */}
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <div className="text-xs font-semibold text-[#7054AE] tabular-nums">
                                    {item.pricingMode === 'single' ? (
                                      formatVND(item.price)
                                    ) : (
                                      <span>
                                        Từ {formatVND(Math.min(...item.options.map((o) => o.price || 0)))}
                                      </span>
                                    )}
                                  </div>

                                  {item.pricingMode === 'multiple' && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E0F1E9] text-[#163E37] border border-[#B9DCCC]">
                                      <Layers className="w-3 h-3 text-[#163E37]" />
                                      <span>Nhiều mức giá ({item.options.length} lựa chọn)</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: Quick Controls (Status selector, Duplicate, Edit, Delete) */}
                            <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-center justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E2D8CF]/70">
                              {/* Quick Status Dropdown */}
                              <select
                                value={item.status}
                                aria-label={`Trạng thái ${item.name}`}
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
                                    ? 'bg-[#E0F1E9] border-[#B9DCCC] text-[#163E37]'
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
                                  className="min-h-[36px] min-w-[36px] p-2 rounded-xl border border-[#E2D8CF] text-[#746E79] hover:text-[#163E37] hover:bg-[#F4ECDF] transition-colors flex items-center justify-center cursor-pointer"
                                  title="Nhân bản món này (tạo bản sao)"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>

                                {/* Edit Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditItem(item)}
                                  className="min-h-[36px] min-w-[36px] p-2 rounded-xl border border-[#E2D8CF] text-[#746E79] hover:text-[#163E37] hover:bg-[#F4ECDF] transition-colors flex items-center justify-center cursor-pointer"
                                  title="Chỉnh sửa chi tiết"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete Button */}
                                <button
                                  type="button"
                                  onClick={() => setDeletingItem(item)}
                                  className="min-h-[36px] min-w-[36px] p-2 rounded-xl border border-[#E2D8CF] text-[#746E79] hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center cursor-pointer"
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
          <section hidden={activeTab !== 'info'} aria-label="Thông tin quán"><ShopInfoForm
              shop={shop}
              onDirtyChange={setInfoDirty}
              onOpenPreview={() => { if (infoDirty) { showToast('info','Lưu thông tin trước khi xem bản nháp.'); return; } setEditorMode('preview'); setActiveTab('editor'); }}
              onSave={async (updated) => {
                const result = await onUpdateDraft({
                  ...shopData,
                  shop: updated,
                });
                return result;
              }}
            /></section>

          {/* ================= TAB 4: QR CODE ================= */}
          {activeTab === 'qr' && (
            <QRView shop={shop} onOpenGuestView={openPublishedMenu} isFirebaseUser={!!user.isFirebaseUser} />
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

      {/* 5. Unsaved Changes Navigation Guard Modal */}
      {pendingTabSwitch && (
        <DeleteConfirmModal
          isOpen={true}
          title="Bạn có thay đổi chưa lưu trên bản nháp"
          description="Bạn có chỉnh sửa chưa được xác nhận lưu. Hãy lưu trước khi chuyển trang, hoặc giữ chỉnh sửa và chuyển trang."
          confirmLabel="Lưu bản nháp & Chuyển trang"
          cancelLabel="Giữ chỉnh sửa & Chuyển"
          isDanger={false}
          onConfirm={async () => {
            if (await handleManualSaveDraft()) {
              setActiveTab(pendingTabSwitch as any);
              setPendingTabSwitch(null);
            }
          }}
          onClose={() => {
            setActiveTab(pendingTabSwitch as any);
            setPendingTabSwitch(null);
          }}
        />
      )}
    </div>
  );
};
