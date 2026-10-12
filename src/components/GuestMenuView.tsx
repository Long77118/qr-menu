import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import {
  Search,
  MapPin,
  Phone,
  X,
  AlertCircle,
  Sparkles,
  ChevronRight,
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
  const [viewingItem, setViewingItem] = useState<MenuItem | null>(null);
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
  const categoryButtonsRef = useRef<Record<string, HTMLButtonElement | null>>({});

  const shop = shopData?.shop;
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
    return items.filter((item) => {
      if (!isDirectEditMode && item.status === 'hidden') return false;
      return true;
    });
  }, [items, isDirectEditMode]);

  // Categories that contain items or all categories in edit mode
  const activeCategories = useMemo(() => {
    if (isDirectEditMode) {
      return [...categories].sort((a, b) => a.order - b.order);
    }
    return categories
      .filter((cat) => visibleItems.some((item) => item.categoryId === cat.id))
      .sort((a, b) => a.order - b.order);
  }, [categories, visibleItems, isDirectEditMode]);

  // Resolve category representative image: custom category image -> first item with image -> undefined (fallback to geometric)
  const categoryImageMap = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const cat of activeCategories) {
      if (cat.imageUrl) {
        map[cat.id] = cat.imageUrl;
      } else {
        const itemWithImg = items.find((item) => item.categoryId === cat.id && Boolean(item.imageUrl));
        map[cat.id] = itemWithImg?.imageUrl;
      }
    }
    return map;
  }, [activeCategories, items]);

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
    if (triggerEl) {
      triggerElementRef.current = triggerEl;
    }
    setViewingItem(item);
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

  // Category selection handler with elastic pill and scroll-into-view
  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    const btn = categoryButtonsRef.current[categoryId];
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
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
    return items.filter((i) => i.imageUrl).slice(0, 3);
  }, [items]);

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
    <LayoutGroup id="qr-poster-menu">
      <div className="min-h-screen bg-[#FFF9F3] text-[#241E35] pb-24 selection:bg-[#E5F76A] selection:text-[#241E35]">
        {/* Top Preview Status Bar if in Preview Mode */}
        {isPreview && !isDirectEditMode && (
          <div className="sticky top-0 z-50 bg-[#241E35] text-[#FFF9F3] px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-sm">
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
        <div className="max-w-2xl mx-auto bg-[#FFF9F3] sm:border sm:border-[#EFE5D9] sm:rounded-[36px] sm:shadow-lg sm:my-4 sm:overflow-hidden min-h-screen">
          {/* ================= HERO / MAIN POSTER COVER ================= */}
          <header className="relative bg-white border-b border-[#EFE5D9] overflow-hidden rounded-b-[36px] sm:rounded-t-[36px] shadow-xs">
            {/* Background Canvas: Custom Photo Background OR Clean Light Base with isolated right decorative container */}
            {hasCustomHeaderBg ? (
              <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#241E35]">
                <img
                  src={headerBg?.imageUrl}
                  alt={shop.name}
                  referrerPolicy="no-referrer"
                  style={{
                    objectFit: 'cover',
                    objectPosition: `${headerBgPos.x}% ${headerBgPos.y}%`,
                    transform: `scale(${headerBgZoom})`,
                    transformOrigin: `${headerBgPos.x}% ${headerBgPos.y}%`,
                  }}
                  className="w-full h-full transition-transform duration-100"
                />
                {/* Custom Overlay */}
                {(headerBg?.overlayOpacity ?? 0) > 0 && (
                  <div
                    className="absolute inset-0 pointer-events-none transition-opacity"
                    style={{
                      backgroundColor: headerBg?.overlayType === 'light' ? '#FFFFFF' : '#000000',
                      opacity: (headerBg?.overlayOpacity ?? 35) / 100,
                    }}
                  />
                )}
              </div>
            ) : null}

            {/* Direct Edit Button: Đổi nền header (Only in owner edit mode) */}
            {isDirectEditMode && (
              <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
                <button
                  ref={headerBgButtonRef}
                  onClick={() => setEditingHeaderBg(true)}
                  className="min-h-[36px] px-3.5 py-1.5 rounded-full bg-white/95 text-[#241E35] hover:bg-white text-xs font-black shadow-md border border-[#EFE5D9] hover:border-[#FF5A36] flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                  title="Đổi ảnh nền phủ toàn bộ khối header"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-[#FF5A36]" />
                  <span>Đổi nền header</span>
                </button>
              </div>
            )}

            {/* Foreground Content */}
            <div className={`relative p-5 sm:p-7 overflow-hidden z-10 ${isDirectEditMode ? 'pt-14 sm:pt-7' : ''}`}>
              <div
                className={`grid gap-5 sm:gap-6 items-center ${
                  showShowcaseFrames ? 'grid-cols-1 sm:grid-cols-12' : 'grid-cols-1'
                }`}
              >
                {/* Left/Main Column: Single Primary Title + Identity (58% desktop width, top on mobile) */}
                <div className={`${showShowcaseFrames ? 'sm:col-span-7' : 'w-full max-w-xl'} space-y-3`}>
                  {/* Logo Emblem & Official Badge Row */}
                  <div className="flex items-center gap-3">
                    {/* Logo Squircle Badge */}
                    <div className="relative w-14 h-14 rounded-[20px] bg-white p-1 shadow-md border border-[#EFE5D9] shrink-0 overflow-hidden group">
                      {shop.logoUrl ? (
                        <img
                          src={shop.logoUrl}
                          alt={shop.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover rounded-[16px]"
                        />
                      ) : (
                        <div
                          className="w-full h-full rounded-[16px] flex items-center justify-center text-white font-black text-2xl shadow-inner"
                          style={{ backgroundColor: themeColor || '#FF5A36' }}
                        >
                          {shop.name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      {/* Direct edit button for logo */}
                      {isDirectEditMode && (
                        <button
                          onClick={() => setEditingLogo(true)}
                          className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center opacity-90 rounded-[16px] transition-opacity text-[9px] font-bold"
                          title="Đổi Logo quán"
                        >
                          <Camera className="w-3.5 h-3.5 mb-0.5 text-[#E5F76A]" />
                          <span>Đổi Logo</span>
                        </button>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5F76A] text-[#241E35] text-[10px] font-black uppercase tracking-wider shadow-2xs border border-[#d6ea56]">
                        <Sparkles className="w-3.5 h-3.5 text-[#FF5A36]" />
                        <span>Thực đơn điện tử</span>
                      </div>
                      <div
                        className={`text-[11px] font-semibold mt-0.5 ${
                          effectiveTextColor === 'light' ? 'text-white/80' : 'text-[#6E6779]'
                        }`}
                      >
                        {visibleItems.length} món · {activeCategories.length} nhóm
                      </div>
                    </div>
                  </div>

                  {/* Single Shop Title & Tagline (NO DUPLICATE) */}
                  <motion.div
                    initial={shouldAnimateHero && !prefersReducedMotion ? { opacity: 0, y: 12 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.12 }}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1
                        className={`text-2xl sm:text-3xl font-black tracking-tight leading-tight break-words ${
                          effectiveTextColor === 'light'
                            ? 'text-white drop-shadow-sm'
                            : 'text-[#241E35]'
                        }`}
                      >
                        {shop.name}
                      </h1>
                      {isDirectEditMode && (
                        <button
                          onClick={() => setEditingShopName(true)}
                          className="px-2.5 py-1 rounded-full bg-[#E5F76A] text-[#241E35] hover:bg-[#d6ea56] text-[11px] font-black inline-flex items-center gap-1 shadow-2xs border border-[#d6ea56] shrink-0"
                          title="Chỉnh sửa tên quán & khẩu hiệu"
                        >
                          <Edit3 className="w-3 h-3 text-[#FF5A36]" />
                          <span>Sửa tên</span>
                        </button>
                      )}
                    </div>

                    {shop.tagline && (
                      <p
                        className={`text-xs sm:text-sm font-bold mt-1 break-words ${
                          effectiveTextColor === 'light'
                            ? 'text-[#E5F76A] drop-shadow-2xs'
                            : 'text-[#FF5A36]'
                        }`}
                      >
                        {shop.tagline}
                      </p>
                    )}

                    {shop.description && (
                      <p
                        className={`text-xs leading-relaxed mt-1 line-clamp-3 break-words ${
                          effectiveTextColor === 'light' ? 'text-white/90' : 'text-[#524B5C]'
                        }`}
                      >
                        {shop.description}
                      </p>
                    )}
                  </motion.div>

                  {/* Address & Phone Strip */}
                  <motion.div
                    initial={shouldAnimateHero && !prefersReducedMotion ? { opacity: 0, y: 8 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.18 }}
                    className="flex flex-wrap items-center gap-2 pt-1 text-[11px]"
                  >
                    {shop.address && (
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-medium shadow-2xs max-w-full ${
                          effectiveTextColor === 'light'
                            ? 'bg-black/45 border-white/20 text-white backdrop-blur-xs'
                            : 'bg-white border-[#EFE5D9] text-[#241E35]'
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#FF5A36] shrink-0" />
                        <span className="truncate">{shop.address}</span>
                      </div>
                    )}
                    {shop.phone && (
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-medium shadow-2xs shrink-0 ${
                          effectiveTextColor === 'light'
                            ? 'bg-black/45 border-white/20 text-white backdrop-blur-xs'
                            : 'bg-white border-[#EFE5D9] text-[#241E35]'
                        }`}
                      >
                        <Phone className="w-3.5 h-3.5 text-[#FF5A36] shrink-0" />
                        <a href={`tel:${shop.phone}`} className="font-bold hover:underline">
                          {shop.phone}
                        </a>
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* Right Column: Dedicated Clipped Container for Vibrant Geometric Art & Photo Collage */}
                {showShowcaseFrames && (
                  <div className="sm:col-span-5 relative flex justify-center items-center py-2 sm:py-0 w-full mt-2 sm:mt-0">
                    <div
                      className={`relative w-full max-w-[280px] sm:max-w-[270px] h-38 sm:h-44 rounded-[28px] overflow-hidden flex items-center justify-center p-2.5 ${
                        hasCustomHeaderBg
                          ? 'bg-transparent'
                          : 'bg-[#FFF7F0] border border-[#F2E4D6] shadow-2xs'
                      }`}
                    >
                      {/* Vibrant Color Shapes - strictly clipped inside this right container, never bleeding into text! */}
                      {!hasCustomHeaderBg && (
                        <>
                          {/* 1. Large Cam rực section */}
                          <div className="absolute -top-10 -right-8 w-44 sm:w-52 h-44 sm:h-52 rounded-[48px] bg-[#FF5A36] transform rotate-12 pointer-events-none" />
                          {/* 2. Bold geometric Tím layer */}
                          <div className="absolute -bottom-10 -left-8 w-36 sm:w-44 h-36 sm:h-44 rounded-[38px] bg-[#7447E8] transform -rotate-6 pointer-events-none" />
                          {/* 3. Vàng chanh energy accent pill */}
                          <div className="absolute top-2 left-3 w-20 sm:w-24 h-6.5 rounded-full bg-[#E5F76A] transform rotate-6 pointer-events-none shadow-2xs" />
                          {/* 4. Soft pink geometric accent */}
                          <div className="absolute bottom-2 right-4 w-12 sm:w-14 h-12 sm:h-14 rounded-full bg-[#FF83B5] pointer-events-none opacity-85" />
                        </>
                      )}

                      {/* Photo Collage Stack */}
                      <div className="relative w-full max-w-[220px] sm:max-w-[230px] h-32 sm:h-38 z-10">
                        {/* Layer 1 (Back Frame): Primary Cover or Dish */}
                        <motion.div
                          initial={
                            shouldAnimateHero && !prefersReducedMotion
                              ? { opacity: 0, x: 25, rotate: 6 }
                              : false
                          }
                          animate={{ opacity: 1, x: 0, rotate: 2 }}
                          transition={{ duration: 0.45, delay: 0.08, type: 'spring' as const, stiffness: 220, damping: 22 }}
                          className="absolute inset-0 w-full h-full rounded-[24px] overflow-hidden shadow-md border-2 border-white bg-[#241E35]"
                        >
                          {shop.coverUrl || posterShowcaseItems[0]?.imageUrl ? (
                            <img
                              src={shop.coverUrl || posterShowcaseItems[0]?.imageUrl}
                              alt={shop.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex flex-col justify-end p-3 text-white"
                              style={{ backgroundColor: themeColor || '#FF5A36' }}
                            >
                              <UtensilsCrossed className="w-8 h-8 opacity-40 mb-1" />
                              <div className="text-[11px] font-bold">Thực đơn tươi ngon</div>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          <div className="absolute top-2 left-2.5 px-2.5 py-0.5 rounded-full bg-[#E5F76A] text-[#241E35] text-[9px] font-black uppercase shadow-xs">
                            Đặc trưng
                          </div>
                        </motion.div>

                        {/* Layer 2 (Front Accent Frame): Signature Dish / Drink Badge */}
                        {posterShowcaseItems.length > 0 && (
                          <motion.div
                            initial={
                              shouldAnimateHero && !prefersReducedMotion
                                ? { opacity: 0, x: -20, rotate: -8 }
                                : false
                            }
                            animate={{ opacity: 1, x: 0, rotate: -3 }}
                            transition={{ duration: 0.45, delay: 0.12, type: 'spring' as const, stiffness: 220, damping: 22 }}
                            onClick={() => {
                              if (!isDirectEditMode && posterShowcaseItems[0]) {
                                handleOpenDetail(posterShowcaseItems[0]);
                              }
                            }}
                            className={`absolute -bottom-2 -left-2.5 w-26 sm:w-30 h-22 sm:h-26 rounded-[20px] overflow-hidden shadow-xl border-2 border-white bg-[#241E35] ${
                              !isDirectEditMode ? 'cursor-pointer hover:scale-105 transition-transform' : ''
                            }`}
                            title={posterShowcaseItems[0]?.name}
                          >
                            <img
                              src={posterShowcaseItems[0]?.imageUrl}
                              alt={posterShowcaseItems[0]?.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                            <div className="absolute bottom-1.5 inset-x-2">
                              <div className="text-[10px] font-black text-white truncate drop-shadow-xs">
                                {posterShowcaseItems[0]?.name}
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* Direct edit button for showcase frame */}
                        {isDirectEditMode && (
                          <button
                            onClick={() => setEditingCover(true)}
                            className="absolute -top-1.5 -right-1.5 px-2.5 py-1 rounded-full bg-white text-[#241E35] text-[10px] font-black shadow-md border border-[#EFE5D9] hover:bg-[#FFF9F3] flex items-center gap-1 z-20"
                            title="Đổi ảnh trong khung trang trí"
                          >
                            <Camera className="w-3.5 h-3.5 text-[#FF5A36]" />
                            <span>Đổi ảnh khung</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* ================= SEARCH & CATEGORY BANNER STRIP ================= */}
          <div className="sticky top-0 z-30 bg-[#FFF9F3]/95 backdrop-blur-md px-4 pt-3 pb-2.5 space-y-2 border-b border-[#EFE5D9]">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E6779]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm món ăn, đồ uống..."
                className="w-full min-h-[44px] pl-10 pr-10 py-2 bg-white rounded-[18px] border border-[#EFE5D9] text-sm font-medium text-[#241E35] placeholder:text-[#8E8799] focus:outline-hidden focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/20 shadow-xs transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full text-[#6E6779] hover:bg-[#FFF9F3] flex items-center justify-center transition-colors"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Horizontal Category Image Banner Strip */}
            <div className="overflow-x-auto scrollbar-none py-1.5 -mx-4 px-4 flex items-center gap-[10px] touch-pan-x scroll-smooth">
              {/* All Items Banner Button */}
              <button
                ref={(el) => {
                  categoryButtonsRef.current['all'] = el;
                }}
                onClick={() => handleSelectCategory('all')}
                title="Tất cả các món"
                aria-label={`Tất cả các món, ${visibleItems.length} món`}
                className={`group relative w-[146px] min-w-[146px] h-[80px] sm:w-[172px] sm:min-w-[172px] sm:h-[90px] rounded-[20px] overflow-hidden text-left shrink-0 transition-all duration-200 ease-out select-none focus:outline-hidden ${
                  selectedCategoryId === 'all'
                    ? 'border-2 border-[#FF5A36] ring-2 ring-[#FF5A36]/30 shadow-md scale-[1.02] -translate-y-0.5'
                    : 'border border-black/10 hover:border-[#FF5A36]/50 shadow-2xs hover:scale-[1.01] hover:-translate-y-0.5'
                }`}
              >
                {/* Vibrant Geometric Brand Graphic for Tất cả */}
                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#FF5A36] via-[#FF5A36] to-[#7447E8] overflow-hidden">
                  <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-[#E5F76A] opacity-40 pointer-events-none" />
                  <div className="absolute top-1 right-2 w-8 h-8 rounded-full bg-[#FF83B5] opacity-50 pointer-events-none" />
                  <div className="absolute -bottom-6 -left-3 w-16 h-16 rounded-full bg-[#7447E8] pointer-events-none opacity-60" />
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-[#E5F76A] text-[#241E35] text-[9px] font-black uppercase shadow-xs flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-[#FF5A36]" />
                    <span>Tất cả</span>
                  </div>
                </div>

                {/* Scrim chuyển tối chân banner để đọc tên rõ */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

                {/* Tên nhóm và số lượng món */}
                <div className="absolute bottom-1.5 inset-x-1.5 sm:bottom-2 sm:inset-x-2 z-10 pointer-events-none">
                  {selectedCategoryId === 'all' ? (
                    <div className="bg-[#E5F76A] text-[#241E35] rounded-[14px] px-2 py-1 shadow-xs border border-[#d6ea56]/70 flex items-center justify-between gap-1.5 w-full">
                      <span className="font-black text-xs sm:text-[13px] leading-tight text-[#241E35]">
                        Tất cả món
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-black text-[#241E35] shrink-0 bg-[#241E35]/12 px-1.5 py-0.5 rounded-md">
                        {visibleItems.length}
                      </span>
                    </div>
                  ) : (
                    <div className="px-1 py-0.5 flex items-center justify-between gap-1.5 w-full">
                      <span className="font-black text-xs sm:text-[13px] leading-tight text-white drop-shadow-sm">
                        Tất cả món
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-bold text-white/95 shrink-0 bg-black/45 px-1.5 py-0.5 rounded-md backdrop-blur-xs">
                        {visibleItems.length}
                      </span>
                    </div>
                  )}
                </div>
              </button>

              {/* Active Category Banners */}
              {activeCategories.map((cat) => {
                const count = visibleItems.filter((i) => i.categoryId === cat.id).length;
                const isSelected = selectedCategoryId === cat.id;
                const bannerImg = categoryImageMap[cat.id];
                const catTheme = getCategoryCardTheme(cat.id, cat.name);

                return (
                  <button
                    key={cat.id}
                    ref={(el) => {
                      categoryButtonsRef.current[cat.id] = el;
                    }}
                    onClick={() => handleSelectCategory(cat.id)}
                    title={cat.name}
                    aria-label={`${cat.name}, ${count} món`}
                    className={`group relative w-[146px] min-w-[146px] h-[80px] sm:w-[172px] sm:min-w-[172px] sm:h-[90px] rounded-[20px] overflow-hidden text-left shrink-0 transition-all duration-200 ease-out select-none focus:outline-hidden ${
                      isSelected
                        ? 'border-2 border-[#FF5A36] ring-2 ring-[#FF5A36]/30 shadow-md scale-[1.02] -translate-y-0.5'
                        : 'border border-black/10 hover:border-[#FF5A36]/50 shadow-2xs hover:scale-[1.01] hover:-translate-y-0.5'
                    }`}
                  >
                    {/* Background: Cover photo or Vibrant Geometric Graphic fallback */}
                    {bannerImg ? (
                      <img
                        src={bannerImg}
                        alt={cat.name}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="absolute inset-0 w-full h-full overflow-hidden"
                        style={{ backgroundColor: catTheme.bgHex }}
                      >
                        <div
                          className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-60 pointer-events-none"
                          style={{ backgroundColor: catTheme.shape1Hex }}
                        />
                        <div
                          className="absolute -bottom-6 -left-4 w-16 h-16 rounded-full opacity-50 pointer-events-none"
                          style={{ backgroundColor: catTheme.shape2Hex }}
                        />
                        <div
                          className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase shadow-2xs"
                          style={{ backgroundColor: catTheme.badgeBg, color: catTheme.badgeText }}
                        >
                          <Sparkles className="w-2.5 h-2.5 inline mr-0.5" />
                          Menu
                        </div>
                      </div>
                    )}

                    {/* Scrim gradient: Darkens bottom for contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" />

                    {/* Label & Item Count */}
                    <div className="absolute bottom-1.5 inset-x-1.5 sm:bottom-2 sm:inset-x-2 z-10 pointer-events-none">
                      {isSelected ? (
                        <div className="bg-[#E5F76A] text-[#241E35] rounded-[14px] px-2 py-1 shadow-xs border border-[#d6ea56]/70 flex items-center justify-between gap-1.5 w-full">
                          <span className="font-black text-xs sm:text-[13px] leading-tight line-clamp-2 text-[#241E35]">
                            {cat.name}
                          </span>
                          <span className="text-[10px] sm:text-[11px] font-black text-[#241E35] shrink-0 bg-[#241E35]/12 px-1.5 py-0.5 rounded-md">
                            {count}
                          </span>
                        </div>
                      ) : (
                        <div className="px-1 py-0.5 flex items-center justify-between gap-1.5 w-full">
                          <span className="font-black text-xs sm:text-[13px] leading-tight line-clamp-2 text-white drop-shadow-sm">
                            {cat.name}
                          </span>
                          <span className="text-[10px] sm:text-[11px] font-bold text-white/95 shrink-0 bg-black/45 px-1.5 py-0.5 rounded-md backdrop-blur-xs">
                            {count}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Direct Edit: Add Category action card */}
              {isDirectEditMode && onOpenAddCategory && (
                <button
                  onClick={onOpenAddCategory}
                  className="h-[80px] sm:h-[90px] w-[100px] min-w-[100px] sm:w-[110px] sm:min-w-[110px] rounded-[20px] border-2 border-dashed border-[#FF5A36]/50 bg-[#FFF3EB] hover:bg-[#FFE8DC] hover:border-[#FF5A36] text-[#241E35] flex flex-col items-center justify-center gap-1 shrink-0 transition-all shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
                  title="Thêm nhóm món mới"
                  aria-label="Thêm nhóm món mới"
                >
                  <div className="w-7 h-7 rounded-full bg-[#E5F76A] flex items-center justify-center text-[#241E35] shadow-2xs">
                    <Plus className="w-4 h-4 text-[#FF5A36]" />
                  </div>
                  <span className="text-xs font-black">Thêm nhóm</span>
                </button>
              )}
            </div>
          </div>

          {/* ================= FOOD POSTER CARDS LIST ================= */}
          <main className="p-4 sm:p-5 space-y-6">
            {filteredItems.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-[32px] border border-[#EFE5D9] p-8 shadow-xs">
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
                  <div className="flex items-center justify-between pt-2">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {group.items.map((item) => {
                      const priceInfo = getItemPriceDisplay(item);
                      const isOutOfStock = item.status === 'out_of_stock';
                      const isHidden = item.status === 'hidden';

                      return (
                        <div
                          key={item.id}
                          className="min-h-[210px] h-[215px] sm:h-[225px] w-full relative"
                        >
                          <motion.div
                            layoutId={`card-container-${item.id}`}
                            transition={springTransition}
                            style={{ borderRadius: 28 }}
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              if (!isDirectEditMode) {
                                handleOpenDetail(item, e.currentTarget);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (!isDirectEditMode && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault();
                                handleOpenDetail(item, e.currentTarget);
                              }
                            }}
                            className={`group relative w-full h-full overflow-hidden border border-[#EFE5D9] poster-card-shadow cursor-pointer focus-visible:ring-3 focus-visible:ring-[#FF5A36] focus-visible:outline-hidden ${
                              isOutOfStock ? 'opacity-95' : ''
                            } ${animatingItemId === item.id ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                          >
                            {/* 1. Background Visual with Continuous Layout */}
                            <motion.div
                              layoutId={`card-image-box-${item.id}`}
                              transition={springTransition}
                              className="absolute inset-0 w-full h-full bg-[#241E35] overflow-hidden"
                            >
                              {item.imageUrl ? (
                                <>
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    referrerPolicy="no-referrer"
                                    loading="eager"
                                    decoding="async"
                                    className={`w-full h-full object-cover ${
                                      isOutOfStock ? 'grayscale-[20%] opacity-85' : ''
                                    }`}
                                  />
                                  {/* Refined scrim: pure photo colors at top/mid (0-45%), gentle transition (45-70%), dark only at bottom behind text (70-100%) */}
                                  <div className="absolute inset-0 bg-gradient-to-b from-transparent from-45% via-black/35 via-70% to-black/90 pointer-events-none" />
                                </>
                              ) : (
                                /* Geometric food poster background with category color rhythm */
                                <GeometricCardBackground
                                  theme={getCategoryCardTheme(group.category.id, group.category.name)}
                                  itemId={item.id}
                                />
                              )}
                            </motion.div>

                            {/* 2. Top-Right Notched Carved Price Badge */}
                            <div className="absolute top-0 right-0 z-10 flex items-start">
                              {/* Left concave fillet curve */}
                              <svg
                                className="w-3.5 h-3.5 text-[#E5F76A] fill-current pointer-events-none hidden sm:block"
                                viewBox="0 0 14 14"
                              >
                                <path d="M 0,0 C 0,7.7 6.3,14 14,14 L 14,0 Z" />
                              </svg>

                              {/* Price Badge with layoutId */}
                              <motion.div
                                layoutId={`card-price-badge-${item.id}`}
                                layout="position"
                                transition={springTransition}
                                onClick={(e) => {
                                  if (isDirectEditMode) {
                                    e.stopPropagation();
                                    setEditingPriceItem(item);
                                  }
                                }}
                                className={`bg-[#E5F76A] text-[#241E35] font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-bl-[22px] rounded-tr-[28px] shadow-xs flex items-center gap-1 tabular-nums ${
                                  isDirectEditMode
                                    ? 'hover:scale-105 ring-2 ring-[#FF5A36] cursor-pointer'
                                    : ''
                                }`}
                              >
                                <span>{priceInfo.label}</span>
                                {isDirectEditMode && (
                                  <Edit3 className="w-3 h-3 text-[#FF5A36] ml-0.5" />
                                )}
                              </motion.div>
                            </div>

                            {/* 3. Top-Left Status Tags (Tạm hết, Ẩn, Đổi ảnh) */}
                            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 flex-wrap">
                              {isOutOfStock && (
                                <span className="px-2.5 py-1 rounded-full bg-[#241E35] text-white text-[10px] font-black uppercase tracking-wider shadow-sm border border-white/20">
                                  Tạm hết
                                </span>
                              )}

                              {isHidden && isDirectEditMode && (
                                <span className="px-2.5 py-1 rounded-full bg-[#241E35] text-white text-[10px] font-bold">
                                  Món đang ẩn
                                </span>
                              )}

                              {/* Direct Edit: Change Photo button */}
                              {isDirectEditMode && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingImageItem(item);
                                  }}
                                  className="px-2.5 py-1 rounded-full bg-white/95 text-[#241E35] hover:bg-white text-[11px] font-black shadow-xs inline-flex items-center gap-1 border border-[#EFE5D9]"
                                  title="Thay đổi ảnh món"
                                >
                                  <Camera className="w-3.5 h-3.5 text-[#FF5A36]" />
                                  <span>{item.imageUrl ? 'Đổi ảnh' : 'Thêm ảnh'}</span>
                                </button>
                              )}
                            </div>

                            {/* 4. Bottom Typography (Food Title & Description) */}
                            <div className="absolute bottom-0 inset-x-0 p-3 sm:p-3.5 z-10 flex flex-col justify-end pointer-events-none">
                              {item.imageUrl ? (
                                /* Card With Image: Typography on bottom scrim */
                                <div className="flex items-end justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <motion.h3
                                        layoutId={`card-title-${item.id}`}
                                        layout="position"
                                        transition={springTransition}
                                        onClick={(e) => {
                                          if (isDirectEditMode) {
                                            e.stopPropagation();
                                            setEditingTitleItem(item);
                                          }
                                        }}
                                        className={`text-base sm:text-lg font-black leading-snug line-clamp-2 text-white drop-shadow-sm pointer-events-auto ${
                                          isDirectEditMode
                                            ? 'hover:underline cursor-pointer'
                                            : ''
                                        }`}
                                      >
                                        {item.name}
                                      </motion.h3>

                                      {isDirectEditMode && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingTitleItem(item);
                                          }}
                                          className="p-1 rounded-md bg-white/90 hover:bg-white text-[#241E35] pointer-events-auto shrink-0"
                                          title="Sửa tên món"
                                        >
                                          <Edit3 className="w-3 h-3 text-[#FF5A36]" />
                                        </button>
                                      )}
                                    </div>

                                    {item.description && (
                                      <p className="text-xs line-clamp-1 mt-0.5 text-[#FFF9F3]/90 font-medium">
                                        {item.description}
                                      </p>
                                    )}
                                  </div>

                                  {/* Right action badge */}
                                  {!isDirectEditMode ? (
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 pointer-events-auto bg-white/20 text-white backdrop-blur-xs">
                                      <ChevronRight className="w-4 h-4" />
                                    </div>
                                  ) : (
                                    onOpenFullEditItem && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onOpenFullEditItem(item);
                                        }}
                                        className="px-2.5 py-1 rounded-xl bg-white text-[#241E35] text-[11px] font-bold shadow-sm hover:bg-[#FFF9F3] shrink-0 pointer-events-auto border border-[#EFE5D9]"
                                      >
                                        Chi tiết
                                      </button>
                                    )
                                  )}
                                </div>
                              ) : (
                                /* Card Without Image: Clean white/ivory panel for crystal-clear readability */
                                <div className="bg-white/95 backdrop-blur-xs rounded-[20px] p-2.5 sm:p-3 shadow-xs border border-black/5 flex items-end justify-between gap-2 pointer-events-auto">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <motion.h3
                                        layoutId={`card-title-${item.id}`}
                                        layout="position"
                                        transition={springTransition}
                                        onClick={(e) => {
                                          if (isDirectEditMode) {
                                            e.stopPropagation();
                                            setEditingTitleItem(item);
                                          }
                                        }}
                                        className={`text-base sm:text-lg font-black leading-snug line-clamp-2 text-[#241E35] ${
                                          isDirectEditMode
                                            ? 'hover:underline cursor-pointer'
                                            : ''
                                        }`}
                                      >
                                        {item.name}
                                      </motion.h3>

                                      {isDirectEditMode && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingTitleItem(item);
                                          }}
                                          className="p-1 rounded-md bg-[#FFF9F3] hover:bg-[#EFE5D9] text-[#241E35] shrink-0"
                                          title="Sửa tên món"
                                        >
                                          <Edit3 className="w-3 h-3 text-[#FF5A36]" />
                                        </button>
                                      )}
                                    </div>

                                    {item.description && (
                                      <p className="text-xs line-clamp-1 mt-0.5 text-[#6E6779] font-medium">
                                        {item.description}
                                      </p>
                                    )}
                                  </div>

                                  {/* Right action badge */}
                                  {!isDirectEditMode ? (
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 bg-[#E5F76A] text-[#241E35] font-black shadow-2xs">
                                      <ChevronRight className="w-4 h-4" />
                                    </div>
                                  ) : (
                                    onOpenFullEditItem && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onOpenFullEditItem(item);
                                        }}
                                        className="px-2.5 py-1 rounded-xl bg-[#241E35] text-white text-[11px] font-bold shadow-sm hover:bg-black shrink-0"
                                      >
                                        Chi tiết
                                      </button>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </main>

          {/* Footer info */}
          <footer className="p-6 text-center text-xs text-[#6E6779] space-y-1.5 border-t border-[#EFE5D9] bg-white rounded-t-[36px]">
            <div className="flex items-center justify-center gap-1.5 font-bold text-[#241E35]">
              <Sparkles className="w-3.5 h-3.5 text-[#FF5A36]" />
              <span>{shop.name}</span>
            </div>
            <p className="font-medium">Thực đơn poster điện tử QR Menu · Khách quét mã xem trực tiếp trên điện thoại</p>
          </footer>
        </div>

        {/* ================= CONTINUOUS SHARED-ELEMENT FOOD DETAIL MODAL ================= */}
        <AnimatePresence
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
                className="relative bg-white w-full sm:max-w-md rounded-t-[36px] sm:rounded-[32px] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col z-10 border border-[#EFE5D9]"
              >
                {/* Mobile Drag Pill */}
                <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0 bg-white">
                  <div className="w-12 h-1.5 rounded-full bg-[#EFE5D9]" />
                </div>

                {/* Continuous Image Box */}
                <motion.div
                  layoutId={`card-image-box-${viewingItem.id}`}
                  transition={springTransition}
                  className="relative h-56 sm:h-64 w-full bg-[#241E35] overflow-hidden shrink-0"
                >
                  {viewingItem.imageUrl ? (
                    <>
                      <img
                        src={viewingItem.imageUrl}
                        alt={viewingItem.name}
                        referrerPolicy="no-referrer"
                        loading="eager"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent pointer-events-none" />
                    </>
                  ) : (
                    /* Geometric food poster background matching category rhythm */
                    <GeometricCardBackground
                      theme={getCategoryCardTheme(
                        viewingItem.categoryId,
                        categories.find((c) => c.id === viewingItem.categoryId)?.name
                      )}
                      itemId={viewingItem.id}
                    />
                  )}

                  {/* Close button on image */}
                  <button
                    ref={modalCloseButtonRef}
                    onClick={handleCloseDetail}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors shadow-md z-20"
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
                <div className="p-5 pb-2 border-b border-[#EFE5D9]">
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
                  className="p-5 space-y-4 overflow-y-auto flex-1 modal-scrollable-content"
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
                <div className="p-4 border-t border-[#EFE5D9] bg-[#FFF9F3] flex justify-end shrink-0">
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
    </LayoutGroup>
  );
};
