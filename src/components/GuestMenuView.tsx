import { GuestMenuHeader } from './GuestMenuHeader';
import { GuestFoodCard, GuestDishVisual } from './GuestFoodCard';
import './guestMenu.css';
import './guestMenuCreative.css';
import { CategoryTabs } from './CategoryTabs';
import { MenuCategoryEntry } from './MenuCategoryEntry';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup, MotionConfig } from 'motion/react';
import {
  Search,
  MapPin,
  Phone,
  X,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Edit3,
  Camera,
  Plus,
  UtensilsCrossed,
  Tag,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';
import { ShopData, MenuItem, MenuCategory, HeaderBackgroundConfig } from '../types/menu';
import { formatVND } from '../utils/format';
import { matchesVietnamese } from '../utils/search';
import { getPublicMenuItems } from '../utils/publicMenu';
import { menuImageSource } from '../utils/menuImageSources';
import {
  EditShopNameModal,
  EditItemPriceModal,
  EditItemTitleModal,
  ChangeImageModal,
} from './DirectEditModals';
import { HeaderBackgroundModal } from './HeaderBackgroundModal';
import { getCategoryCardTheme } from '../constants/theme';
import { GeometricCardBackground } from './GeometricCardBackground';

interface GuestMenuViewProps {
  shopData: ShopData | null;
  isPreview?: boolean;
  previewDevice?: 'desktop' | 'mobile';
  onExitPreview?: () => void;

  // Direct editing props (only active when owner is in "Thiết kế & chỉnh trực tiếp" workspace)
  isDirectEditMode?: boolean;
  onDirectUpdateItem?: (updatedItem: MenuItem) => void;
  onDirectUpdateShop?: (name: string, tagline?: string, coverUrl?: string, logoUrl?: string) => void;
  onDirectUpdateHeaderBg?: (headerBackground: HeaderBackgroundConfig) => void;
  onOpenFullAddItem?: (categoryId?: string) => void;
  onOpenFullEditItem?: (item: MenuItem) => void;
  onOpenAddCategory?: () => void;
}

export const GuestMenuView: React.FC<GuestMenuViewProps> = ({
  shopData,
  isPreview = false,
  previewDevice,
  onExitPreview,
  isDirectEditMode = false,
  onDirectUpdateItem,
  onDirectUpdateShop,
  onDirectUpdateHeaderBg,
  onOpenFullAddItem,
  onOpenFullEditItem,
  onOpenAddCategory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [categoryEntryOpen, setCategoryEntryOpen] = useState(true);
  const menuControlsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!categoryEntryOpen && !isDirectEditMode) menuControlsRef.current?.scrollIntoView({ block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  },[categoryEntryOpen,isDirectEditMode]);
  const [selectedItem, setViewingItem] = useState<MenuItem | null>(null);
  // Track item undergoing morph animation to keep source card hidden until onExitComplete
  const [animatingItemId, setAnimatingItemId] = useState<string | null>(null);

  // Responsive screen breakpoint detection for header background positioning
  const [isDesktopScreen, setIsDesktopScreen] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    setIsDesktopScreen(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktopScreen(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Prefers reduced motion detection
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Hero intro animation flag (only runs once per session/visit)
  const hasAnimatedHeroRef = useRef(false);
  const [shouldAnimateHero, setShouldAnimateHero] = useState(() => {
    try {
      return sessionStorage.getItem('qr_menu_hero_intro_done') !== 'true';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (shouldAnimateHero) {
      hasAnimatedHeroRef.current = true;
      try {
        sessionStorage.setItem('qr_menu_hero_intro_done', 'true');
      } catch {}
      // Mark as done after initial intro
      const timer = setTimeout(() => {
        setShouldAnimateHero(false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [shouldAnimateHero]);

  // Direct in-place editing modal states
  const [editingShopName, setEditingShopName] = useState(false);
  const [editingCover, setEditingCover] = useState(false);
  const [editingLogo, setEditingLogo] = useState(false);
  const [editingHeaderBg, setEditingHeaderBg] = useState(false);
  const [editingPriceItem, setEditingPriceItem] = useState<MenuItem | null>(null);
  const [editingTitleItem, setEditingTitleItem] = useState<MenuItem | null>(null);
  const [editingImageItem, setEditingImageItem] = useState<MenuItem | null>(null);

  // Store the element that triggered the modal to return focus on close
  const triggerElementRef = useRef<HTMLElement | null>(null);
  const headerBgButtonRef = useRef<HTMLButtonElement | null>(null);
  const modalCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const detailDialogRef = useRef<HTMLDivElement | null>(null);


  const shop = shopData?.shop;
  useEffect(() => { setCategoryEntryOpen(true); setSelectedCategoryId('all'); setSearchQuery(''); }, [shop?.id]);
  const categories = shopData?.categories || [];
  const items = shopData?.items || [];
  const themeColor = shop?.themeColor || '#FF5A36';

  // Header background configurations & contrast detection
  const headerBg = shop?.headerBackground;
  const hasCustomHeaderBg = Boolean(headerBg?.imageUrl);
  const showShowcaseFrames = headerBg?.showShowcaseFrames ?? true;

  const headerBgPos = isDesktopScreen
    ? (headerBg?.desktopPosition || { x: 50, y: 50 })
    : (headerBg?.mobilePosition || { x: 50, y: 50 });
  const headerBgZoom = isDesktopScreen
    ? (headerBg?.desktopZoom || 1.0)
    : (headerBg?.mobileZoom || 1.0);

  const effectiveTextColor: 'light' | 'dark' = useMemo(() => {
    if (!hasCustomHeaderBg) return 'dark';
    if (headerBg?.textColorMode === 'light') return 'light';
    if (headerBg?.textColorMode === 'dark') return 'dark';
    // auto mode
    if (headerBg?.overlayType === 'dark' && (headerBg?.overlayOpacity ?? 35) >= 25) {
      return 'light';
    }
    return 'dark';
  }, [hasCustomHeaderBg, headerBg]);

  // Filter items visible to customers (exclude hidden items unless in direct owner edit mode!)
  const visibleItems = useMemo(() => {
    return isDirectEditMode ? items : getPublicMenuItems(items);
  }, [items, isDirectEditMode]);
  const portraitItem=visibleItems.find(item=>item.status!=='hidden' && item.imageUrl);
  const portraitUrl=menuImageSource(portraitItem?.imageUrl,portraitItem?.imageSources,'thumbnail');

  // Re-resolve details from the current visible snapshot: a live update may hide/remove a dish.
  const viewingItem = !isDirectEditMode && selectedItem
    ? visibleItems.find((item) => item.id === selectedItem.id) ?? null
    : null;

  useEffect(() => {
    if (selectedItem && !viewingItem) {
      setViewingItem(null);
      setAnimatingItemId(null);
    }
  }, [selectedItem, viewingItem]);

  // Categories that contain items or all categories in edit mode
  const activeCategories = useMemo(() => {
    if (isDirectEditMode) {
      return [...categories].sort((a, b) => a.order - b.order);
    }
    return categories
      .filter((cat) => visibleItems.some((item) => item.categoryId === cat.id))
      .sort((a, b) => a.order - b.order);
  }, [categories, visibleItems, isDirectEditMode]);

  // Filter items by category and search query
  const filteredItems = useMemo(() => {
    return visibleItems
      .filter((item) => {
        if (selectedCategoryId !== 'all' && item.categoryId !== selectedCategoryId) {
          return false;
        }
        if (searchQuery.trim()) {
          const matchName = matchesVietnamese(item.name, searchQuery);
          const matchDesc = item.description ? matchesVietnamese(item.description, searchQuery) : false;
          return matchName || matchDesc;
        }
        return true;
      })
      .sort((a, b) => a.order - b.order);
  }, [visibleItems, selectedCategoryId, searchQuery]);

  // Group filtered items by category if "all" is selected
  const itemsByCategory = useMemo(() => {
    if (selectedCategoryId !== 'all') {
      const cat = categories.find((c) => c.id === selectedCategoryId);
      return [
        {
          category: cat || { id: selectedCategoryId, name: 'Danh mục', order: 0 },
          items: filteredItems,
        },
      ];
    }

    return activeCategories
      .map((cat) => ({
        category: cat,
        items: filteredItems.filter((item) => item.categoryId === cat.id),
      }))
      .filter((group) => (isDirectEditMode ? true : group.items.length > 0));
  }, [activeCategories, categories, filteredItems, selectedCategoryId, isDirectEditMode]);

  // Keyboard Escape listener for detail modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && viewingItem) {
        handleCloseDetail();
      }
      if (e.key === 'Tab' && viewingItem) {
        const dialog = detailDialogRef.current;
        const controls = dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]');
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
          e.preventDefault(); first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingItem]);

  // Scroll locking: when modal is active (opening or closing), prevent body scroll without layout shift
  useEffect(() => {
    if (animatingItemId) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [animatingItemId]);

  // Focus management when modal opens/closes
  const handleOpenDetail = (item: MenuItem, triggerEl?: HTMLElement) => {
    if (isDirectEditMode) return;
    const currentItem = visibleItems.find((candidate) => candidate.id === item.id);
    if (!currentItem) return;
    if (triggerEl) {
      triggerElementRef.current = triggerEl;
    }
    setViewingItem(currentItem);
    setAnimatingItemId(item.id);
    setTimeout(() => {
      modalCloseButtonRef.current?.focus();
    }, 60);
  };

  const handleCloseDetail = () => {
    setViewingItem(null);
    // Keep animatingItemId until onExitComplete fires to prevent duplicate card flash
    if (triggerElementRef.current) {
      triggerElementRef.current.focus();
    }
  };

  // Price calculation helper
  const getItemPriceDisplay = (item: MenuItem) => {
    if (item.pricingMode === 'single') {
      return { label: formatVND(item.price), isStartingFrom: false };
    }
    if (item.options && item.options.length > 0) {
      const minPrice = Math.min(...item.options.map((o) => o.price));
      return { label: `Từ ${formatVND(minPrice)}`, isStartingFrom: true };
    }
    return { label: '0đ', isStartingFrom: false };
  };

  // Showcase items for hero poster frames
  const posterShowcaseItems = useMemo(() => {
    return visibleItems.filter((i) => i.imageUrl).slice(0, 3);
  }, [visibleItems]);

  // Shared spring transition for layout animations - tuned for smooth organic deceleration without harsh snaps
  const springTransition = useMemo(() => {
    if (prefersReducedMotion) {
      return { duration: 0.05 };
    }
    return {
      type: 'spring' as const,
      stiffness: 300,
      damping: 30,
      mass: 0.9,
    };
  }, [prefersReducedMotion]);

  // If menu is not available or unpublished
  if (!shopData || !shop) {
    return (
      <div className="min-h-screen bg-[#FFF9F3] flex flex-col items-center justify-center p-6 text-center text-[#241E35]">
        <div className="w-16 h-16 rounded-[24px] bg-[#E5F76A] flex items-center justify-center text-[#241E35] mb-4 shadow-sm">
          <AlertCircle className="w-8 h-8 text-[#FF5A36]" />
        </div>
        <h1 className="text-xl font-bold mb-2">Thực đơn chưa sẵn sàng</h1>
        <p className="text-sm text-[#6E6779] max-w-sm mb-6 leading-relaxed">
          Quán đang hoàn thiện thực đơn hoặc chưa xuất bản menu công khai. Vui lòng quay lại sau!
        </p>
        {isPreview && onExitPreview && (
          <button
            onClick={onExitPreview}
            className="px-6 py-2.5 rounded-2xl bg-[#FF5A36] text-white text-sm font-black hover:bg-[#E6431F] transition-colors shadow-xs"
          >
            Quay lại trang quản lý
          </button>
        )}
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user"><LayoutGroup id="qr-poster-menu">
      <div className="guest-menu-page" data-owner-edit={isDirectEditMode}>
        {/* Top Preview Status Bar if in Preview Mode */}
        {isPreview && !isDirectEditMode && (
          <div className="guest-preview-notice sticky top-0 z-50 bg-[#241E35] text-[#FFF9F3] px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5A36] animate-pulse" />
              <span>Chế độ xem thử: Dữ liệu bản nháp đang chỉnh sửa</span>
            </div>
            {onExitPreview && (
              <button
                onClick={onExitPreview}
                className="px-3 py-1 bg-[#FF5A36] text-[#241E35] rounded-xl text-xs font-black hover:bg-[#ff4820] transition-colors"
              >
                Quay lại quản lý
              </button>
            )}
          </div>
        )}

        {/* Main Poster Container */}
        <div className="guest-menu-shell">
          {/* ================= HERO / MAIN POSTER COVER ================= */}
          <GuestMenuHeader shop={shop} itemCount={visibleItems.length} categoryCount={activeCategories.length} isDesktop={previewDevice ? previewDevice === 'desktop' : isDesktopScreen} previewImageUrl={portraitUrl} />
          {isDirectEditMode && <div className="owner-edit-tools" role="group" aria-label="Chỉnh thông tin menu">
            <button type="button" onClick={() => setEditingShopName(true)}>Sửa tên quán</button>
            <button type="button" onClick={() => setEditingLogo(true)}>Đổi logo</button>
            <button type="button" onClick={() => setEditingHeaderBg(true)}>Đổi ảnh bìa</button>
            <button type="button" onClick={onOpenAddCategory}>Quản lý danh mục</button>
          </div>}

          {!isDirectEditMode && categoryEntryOpen ? (
            <MenuCategoryEntry categories={activeCategories} items={visibleItems} onSelect={id => {
              setSelectedCategoryId(id); setSearchQuery(''); setCategoryEntryOpen(false);
            }} />
          ) : <>
          {/* ================= SEARCH & CATEGORY BANNER STRIP ================= */}
          <div ref={menuControlsRef} className="guest-menu-search-strip">
            {!isDirectEditMode && <button type="button" onClick={() => { setCategoryEntryOpen(true); setSearchQuery(''); }}
              className="guest-menu-back">
              <ChevronLeft className="w-4 h-4" />Danh mục thực đơn
            </button>}
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E6779]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Tìm món trong thực đơn"
                placeholder="Tìm kiếm món ăn, đồ uống..."
                className="w-full min-h-[44px] pl-10 pr-10 py-2 bg-white rounded-[18px] border border-[#EFE5D9] text-sm font-medium text-[#241E35] placeholder:text-[#8E8799] focus:outline-hidden focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/20 shadow-xs transition-all"
              />
              {searchQuery && (
                <button aria-label="Xóa tìm món"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full text-[#6E6779] hover:bg-[#FFF9F3] flex items-center justify-center transition-colors"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <CategoryTabs categories={activeCategories} items={visibleItems}
              selectedId={selectedCategoryId} onSelect={setSelectedCategoryId}
              trailingAction={isDirectEditMode && onOpenAddCategory ? (
                <button type="button" onClick={onOpenAddCategory} className="category-tab" aria-label="Thêm nhóm món mới">
                  <Plus className="w-4 h-4" /><span>Thêm nhóm</span>
                </button>
              ) : undefined} />
          </div>
          {/* ================= FOOD POSTER CARDS LIST ================= */}
          <main className="guest-menu-list">
            {filteredItems.length === 0 ? (
              <div className="guest-menu-empty py-16 text-center bg-white rounded-[32px] border border-[#EFE5D9] p-8 shadow-xs">
                <div className="w-14 h-14 rounded-full bg-[#E5F76A] text-[#241E35] flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <UtensilsCrossed className="w-7 h-7 text-[#FF5A36]" />
                </div>
                <h2 className="text-base font-black text-[#241E35]">Không tìm thấy món phù hợp</h2>
                <p className="text-xs text-[#6E6779] mt-1 max-w-xs mx-auto font-medium">
                  {searchQuery
                    ? `Không có kết quả nào cho "${searchQuery}"`
                    : 'Chưa có món nào trong danh mục này'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-4 px-4 py-2 rounded-2xl bg-[#E5F76A] text-[#241E35] text-xs font-black hover:bg-[#d6ea56] shadow-xs"
                  >
                    Xóa bộ lọc tìm kiếm
                  </button>
                )}
              </div>
            ) : (
              itemsByCategory.map((group) => (
                <section key={group.category.id} className="space-y-3.5">
                  {/* Category Header */}
                  <div className="guest-menu-section-heading">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black uppercase tracking-wider text-[#241E35] flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FF5A36]" />
                        {group.category.name}
                      </h2>
                      <span className="text-[11px] font-bold text-[#6E6779] bg-white px-2.5 py-0.5 rounded-full border border-[#EFE5D9]">
                        {group.items.length} món
                      </span>
                    </div>

                    {/* Direct Edit: Add Dish inside this category */}
                    {isDirectEditMode && onOpenFullAddItem && (
                      <button
                        onClick={() => onOpenFullAddItem(group.category.id)}
                        className="px-3 py-1 rounded-full bg-white border border-[#EFE5D9] hover:border-[#FF5A36] text-[#241E35] text-xs font-bold inline-flex items-center gap-1 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#FF5A36]" />
                        <span>Thêm món vào {group.category.name}</span>
                      </button>
                    )}
                  </div>

                  {/* 1 Column on Mobile, 2 Columns on Desktop */}
                  <div className="guest-menu-food-grid">
                    {group.items.map((item, index) => {
                      const priceInfo = getItemPriceDisplay(item);
                      const isOutOfStock = item.status === 'out_of_stock';
                      const isHidden = item.status === 'hidden';
                      const featured = false;
                      const card = <GuestFoodCard item={item} price={priceInfo.label} categoryName={group.category.name} index={index} total={group.items.length} hidden={animatingItemId === item.id} onOpen={isDirectEditMode ? () => onOpenFullEditItem?.(item) : handleOpenDetail} />;
                      if (!isDirectEditMode) return <React.Fragment key={item.id}>{card}</React.Fragment>;
                      return <div key={item.id} className="owner-edit-dish" data-featured={featured}>
                        {card}
                        <div className="owner-edit-dish-tools" role="group" aria-label={`Chỉnh ${item.name}`}>
                          <button type="button" onClick={() => onOpenFullEditItem?.(item)}>Chi tiết</button>
                          <button type="button" onClick={() => setEditingTitleItem(item)}>Tên</button>
                          <button type="button" onClick={() => setEditingPriceItem(item)}>Giá</button>
                          <button type="button" onClick={() => setEditingImageItem(item)}>Ảnh</button>
                          <span>{isHidden ? 'Đang ẩn' : isOutOfStock ? 'Tạm hết' : 'Đang bán'}</span>
                        </div>
                      </div>;
                    })}
                  </div>
                </section>
              ))
            )}
          </main>
          </>}

          {/* Footer info */}
          <footer className="guest-menu-footer"><span>{shop.name} · Thực đơn điện tử</span>{!isDirectEditMode && <a href="#/discover">Khám phá các quán <ChevronRight className="w-4 h-4" aria-hidden="true" /></a>}</footer>
        </div>

        {/* ================= CONTINUOUS SHARED-ELEMENT FOOD DETAIL MODAL ================= */}
        <AnimatePresence
          key={selectedItem && !viewingItem ? 'unavailable-detail' : 'visible-detail'}
          onExitComplete={() => {
            // Once the card morph exit transition finishes, reveal source card seamlessly
            setAnimatingItemId(null);
          }}
        >
          {viewingItem && (
            <div
              key={`modal-overlay-wrap-${viewingItem.id}`}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
              role="dialog"
              ref={detailDialogRef}
              aria-modal="true"
              aria-label={viewingItem.name}
            >
              {/* Hardware-accelerated pure backdrop without expensive filter reprojection */}
              <motion.div
                key={`modal-backdrop-${viewingItem.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                onClick={handleCloseDetail}
                className="fixed inset-0 bg-black/65"
              />

              {/* Expanded Card Morph Container */}
              <motion.div
                key={`card-container-${viewingItem.id}`}
                layoutId={`card-container-${viewingItem.id}`}
                transition={springTransition}
                style={{ borderRadius: 32 }}
                onClick={(e) => e.stopPropagation()}
                className="guest-menu-detail relative bg-white w-full sm:max-w-md rounded-t-[36px] sm:rounded-[32px] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col z-10 border border-[#EFE5D9]"
              >
                {/* Mobile Drag Pill */}
                <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0 bg-white">
                  <div className="w-12 h-1.5 rounded-full bg-[#EFE5D9]" />
                </div>

                {/* Continuous Image Box */}
                <motion.div
                  layoutId={`card-image-box-${viewingItem.id}`}
                  transition={springTransition}
                  className="guest-menu-detail-photo relative h-56 sm:h-64 w-full bg-[#241E35] overflow-hidden shrink-0"
                >
                  <GuestDishVisual item={viewingItem} detail />

                  {/* Close button on image */}
                  <button
                    ref={modalCloseButtonRef}
                    onClick={handleCloseDetail}
                    className="guest-menu-detail-close absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors shadow-md z-20"
                    title="Đóng (Esc)"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  {/* Out of stock badge if applicable */}
                  {viewingItem.status === 'out_of_stock' && (
                    <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-[#241E35] text-white text-xs font-black shadow-md z-20 border border-white/20">
                      Món đang tạm hết
                    </div>
                  )}
                </motion.div>

                {/* Continuous Title & Price Row */}
                <div className="guest-menu-detail-title p-5 pb-2 border-b border-[#EFE5D9]">
                  <div className="flex items-start justify-between gap-3">
                    <motion.h3
                      layoutId={`card-title-${viewingItem.id}`}
                      layout="position"
                      transition={springTransition}
                      className="text-xl sm:text-2xl font-black text-[#241E35] leading-snug flex-1"
                    >
                      {viewingItem.name}
                    </motion.h3>

                    {/* Continuous Price Badge with position layout */}
                    <motion.div
                      layoutId={`card-price-badge-${viewingItem.id}`}
                      layout="position"
                      transition={springTransition}
                      className="bg-[#E5F76A] text-[#241E35] font-black text-sm sm:text-base px-3.5 py-1.5 rounded-2xl shadow-xs shrink-0 tabular-nums"
                    >
                      {getItemPriceDisplay(viewingItem).label}
                    </motion.div>
                  </div>
                </div>

                {/* Staggered Body Content (Description, Pricing Options, Sizing) */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, delay: 0.1 }}
                  className="guest-menu-detail-body p-5 space-y-4 overflow-y-auto flex-1 modal-scrollable-content"
                >
                  {viewingItem.description && (
                    <div className="bg-[#FFF9F3] p-4 rounded-2xl border border-[#EFE5D9] text-xs text-[#241E35] leading-relaxed font-medium">
                      {viewingItem.description}
                    </div>
                  )}

                  {/* Price Breakdown / Multi-pricing Table */}
                  <div className="space-y-2.5">
                    <div className="text-xs font-black text-[#241E35] uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-[#FF5A36]" />
                      <span>
                        {viewingItem.pricingMode === 'single'
                          ? 'Đơn giá tiêu chuẩn'
                          : 'Các lựa chọn kích cỡ / định lượng'}
                      </span>
                    </div>

                    {viewingItem.pricingMode === 'single' ? (
                      <div className="p-3.5 bg-[#FFF9F3] rounded-2xl border border-[#EFE5D9] flex items-center justify-between shadow-2xs">
                        <span className="text-xs text-[#6E6779] font-bold">1 phần tiêu chuẩn</span>
                        <span className="text-base font-black tabular-nums bg-[#E5F76A] text-[#241E35] px-3 py-1 rounded-xl">
                          {formatVND(viewingItem.price)}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {viewingItem.options && viewingItem.options.length > 0 ? (
                          viewingItem.options.map((opt) => (
                            <div
                              key={opt.id}
                              className="p-3.5 bg-[#FFF9F3] rounded-2xl border border-[#EFE5D9] flex items-center justify-between text-xs shadow-2xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#FF5A36]" />
                                <span className="font-bold text-[#241E35]">{opt.name}</span>
                              </div>
                              <span className="font-black tabular-nums bg-[#E5F76A] text-[#241E35] px-3 py-1 rounded-xl">
                                {formatVND(opt.price)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-[#6E6779] italic">Chưa có thông tin tùy chọn giá</p>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Modal Close Action Button */}
                <div className="guest-menu-detail-footer p-4 border-t border-[#EFE5D9] bg-[#FFF9F3] flex justify-end shrink-0">
                  <button
                    onClick={handleCloseDetail}
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-2xl bg-white border border-[#EFE5D9] text-[#241E35] text-xs font-black hover:bg-[#FFF9F3] transition-colors shadow-xs"
                  >
                    Đóng (Xem tiếp các món khác)
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ================= IN-PLACE DIRECT EDIT POPUPS ================= */}
        {isDirectEditMode && (
          <>
            <EditShopNameModal
              isOpen={editingShopName}
              shop={shop}
              onSave={(name, tagline) => {
                if (onDirectUpdateShop) {
                  onDirectUpdateShop(name, tagline, shop.coverUrl, shop.logoUrl);
                }
              }}
              onClose={() => setEditingShopName(false)}
            />

            <ChangeImageModal
              isOpen={editingCover}
              title="Đổi ảnh bìa quán"
              currentImageUrl={shop.coverUrl}
              onSave={(newCover) => {
                if (onDirectUpdateShop) {
                  onDirectUpdateShop(shop.name, shop.tagline, newCover, shop.logoUrl);
                }
              }}
              onClose={() => setEditingCover(false)}
            />

            <ChangeImageModal
              isOpen={editingLogo}
              title="Đổi logo quán"
              currentImageUrl={shop.logoUrl}
              onSave={(newLogo) => {
                if (onDirectUpdateShop) {
                  onDirectUpdateShop(shop.name, shop.tagline, shop.coverUrl, newLogo);
                }
              }}
              onClose={() => setEditingLogo(false)}
            />

            <EditItemPriceModal
              isOpen={!!editingPriceItem}
              item={editingPriceItem}
              onSave={(updated) => {
                if (onDirectUpdateItem) {
                  onDirectUpdateItem(updated);
                }
              }}
              onClose={() => setEditingPriceItem(null)}
            />

            <EditItemTitleModal
              isOpen={!!editingTitleItem}
              item={editingTitleItem}
              onSave={(updated) => {
                if (onDirectUpdateItem) {
                  onDirectUpdateItem(updated);
                }
              }}
              onClose={() => setEditingTitleItem(null)}
            />

            <ChangeImageModal
              isOpen={!!editingImageItem}
              title={`Ảnh món: ${editingImageItem?.name || ''}`}
              currentImageUrl={editingImageItem?.imageUrl}
              onSave={(newImg) => {
                if (editingImageItem && onDirectUpdateItem) {
                  onDirectUpdateItem({
                    ...editingImageItem,
                    imageUrl: newImg,
                  });
                }
              }}
              onClose={() => setEditingImageItem(null)}
            />

            <HeaderBackgroundModal
              isOpen={editingHeaderBg}
              shop={shop}
              previewImageUrl={portraitUrl}
              onSave={(newHeaderBg) => {
                if (onDirectUpdateHeaderBg) {
                  onDirectUpdateHeaderBg(newHeaderBg);
                }
              }}
              onClose={() => setEditingHeaderBg(false)}
              triggerButtonRef={headerBgButtonRef}
            />
          </>
        )}
      </div>
    </LayoutGroup></MotionConfig>
  );
};
