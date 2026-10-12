import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Smartphone,
  Monitor,
  RotateCcw,
  Check,
  ZoomIn,
  ZoomOut,
  Move,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Sliders,
  Sparkles,
  MapPin,
  Phone,
  UtensilsCrossed,
  AlertCircle,
  Sun,
  Moon,
  Layers,
} from 'lucide-react';
import { ShopSettings, HeaderBackgroundConfig } from '../types/menu';
import { compressHeaderBackgroundImage } from '../utils/image';

interface HeaderBackgroundModalProps {
  isOpen: boolean;
  shop: ShopSettings;
  onSave: (config: HeaderBackgroundConfig) => void;
  onClose: () => void;
  triggerButtonRef?: React.RefObject<HTMLElement | null>;
}

// Default configuration when shop has never customized header background
export const DEFAULT_HEADER_BACKGROUND_CONFIG: HeaderBackgroundConfig = {
  imageUrl: undefined,
  desktopPosition: { x: 50, y: 50 },
  desktopZoom: 1.0,
  mobilePosition: { x: 50, y: 50 },
  mobileZoom: 1.0,
  overlayType: 'dark',
  overlayOpacity: 35,
  textColorMode: 'auto',
  showShowcaseFrames: true,
};

// Sample preset backgrounds for quick selection
export const HEADER_PRESET_IMAGES = [
  {
    id: 'cafe-warm',
    name: 'Quán cà phê gỗ ấm',
    url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'food-spread',
    name: 'Bàn ẩm thực tiệc tươi',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'asian-dining',
    name: 'Bếp món Á truyền thống',
    url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'street-bbq',
    name: 'Món nướng & Bia thủ công',
    url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'dessert-bakery',
    name: 'Tiệm trà bánh ngọt',
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80',
  },
];

export const HeaderBackgroundModal: React.FC<HeaderBackgroundModalProps> = ({
  isOpen,
  shop,
  onSave,
  onClose,
  triggerButtonRef,
}) => {
  // Local working state cloned from current shop config (only committed on Save)
  const [config, setConfig] = useState<HeaderBackgroundConfig>(() => {
    return shop.headerBackground
      ? JSON.parse(JSON.stringify(shop.headerBackground))
      : { ...DEFAULT_HEADER_BACKGROUND_CONFIG };
  });

  // Re-sync when modal opens
  useEffect(() => {
    if (isOpen) {
      setConfig(
        shop.headerBackground
          ? JSON.parse(JSON.stringify(shop.headerBackground))
          : { ...DEFAULT_HEADER_BACKGROUND_CONFIG }
      );
      setError(null);
    }
  }, [isOpen, shop.headerBackground]);

  // Preview device tab: 'mobile' vs 'desktop'
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');

  // UI state
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dragging state for visual crop
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; startX: number; startY: number }>({
    clientX: 0,
    clientY: 0,
    startX: 50,
    startY: 50,
  });
  const previewSurfaceRef = useRef<HTMLDivElement>(null);

  // Focus trap / escape key listener
  const modalContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleCancel = () => {
    setError(null);
    onClose();
    if (triggerButtonRef?.current) {
      triggerButtonRef.current.focus();
    }
  };

  // Helper to get active position & zoom for current preview tab
  const activePosition = previewDevice === 'mobile' ? config.mobilePosition : config.desktopPosition;
  const activeZoom = previewDevice === 'mobile' ? config.mobileZoom : config.desktopZoom;

  const updateActivePosition = useCallback(
    (newPos: { x: number; y: number }) => {
      // Clamp between 0 and 100
      const clampedX = Math.max(0, Math.min(100, Math.round(newPos.x)));
      const clampedY = Math.max(0, Math.min(100, Math.round(newPos.y)));

      setConfig((prev) => {
        if (previewDevice === 'mobile') {
          return { ...prev, mobilePosition: { x: clampedX, y: clampedY } };
        } else {
          return { ...prev, desktopPosition: { x: clampedX, y: clampedY } };
        }
      });
    },
    [previewDevice]
  );

  const updateActiveZoom = useCallback(
    (newZoom: number) => {
      // Clamp zoom between 1.0 and 2.5
      const clampedZoom = Math.max(1.0, Math.min(2.5, Number(newZoom.toFixed(2))));
      setConfig((prev) => {
        if (previewDevice === 'mobile') {
          return { ...prev, mobileZoom: clampedZoom };
        } else {
          return { ...prev, desktopZoom: clampedZoom };
        }
      });
    },
    [previewDevice]
  );

  // Step directional nudging (useful for arrow buttons and keyboard)
  const nudgePosition = (deltaX: number, deltaY: number) => {
    updateActivePosition({
      x: activePosition.x + deltaX,
      y: activePosition.y + deltaY,
    });
  };

  // File upload handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsProcessingImage(true);

    try {
      const compressedDataUrl = await compressHeaderBackgroundImage(file);
      setConfig((prev) => ({
        ...prev,
        imageUrl: compressedDataUrl,
        // Reset focal position & zoom when a new image is loaded
        desktopPosition: { x: 50, y: 50 },
        desktopZoom: 1.0,
        mobilePosition: { x: 50, y: 50 },
        mobileZoom: 1.0,
      }));
    } catch (err: any) {
      setError(err?.message || 'Không thể xử lý hình ảnh này');
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Drag interaction handlers
  const handlePointerDown = (clientX: number, clientY: number) => {
    if (!config.imageUrl) return;
    setIsDragging(true);
    dragStartRef.current = {
      clientX,
      clientY,
      startX: activePosition.x,
      startY: activePosition.y,
    };
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging || !previewSurfaceRef.current) return;

    const rect = previewSurfaceRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const deltaPixelX = clientX - dragStartRef.current.clientX;
    const deltaPixelY = clientY - dragStartRef.current.clientY;

    // Moving mouse right should move focal point left (to drag image)
    // Scale delta inversely by zoom so dragging feels 1:1
    const deltaPercentX = -(deltaPixelX / rect.width) * 100 / activeZoom;
    const deltaPercentY = -(deltaPixelY / rect.height) * 100 / activeZoom;

    updateActivePosition({
      x: dragStartRef.current.startX + deltaPercentX,
      y: dragStartRef.current.startY + deltaPercentY,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Mouse handlers
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handlePointerDown(e.clientX, e.clientY);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      handlePointerMove(e.clientX, e.clientY);
    }
  };

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      handlePointerDown(touch.clientX, touch.clientY);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      handlePointerMove(touch.clientX, touch.clientY);
    }
  };

  // Compute effective text color for preview & display
  const effectiveTextColor: 'light' | 'dark' = (() => {
    if (config.textColorMode === 'light') return 'light';
    if (config.textColorMode === 'dark') return 'dark';
    // Auto mode: dark overlay with >= 25% opacity gives light text
    if (config.overlayType === 'dark' && config.overlayOpacity >= 25) {
      return 'light';
    }
    return 'dark';
  })();

  // Reset to default action
  const handleResetToDefault = () => {
    setConfig((prev) => ({
      ...DEFAULT_HEADER_BACKGROUND_CONFIG,
      // Retain current showcase frames toggle preference!
      showShowcaseFrames: prev.showShowcaseFrames,
    }));
    setError(null);
  };

  // Submit save action
  const handleSaveDraft = () => {
    setError(null);
    try {
      onSave(config);
      onClose();
      if (triggerButtonRef?.current) {
        triggerButtonRef.current.focus();
      }
    } catch (err: any) {
      setError(err?.message || 'Lỗi khi lưu cấu hình nền header');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tùy chỉnh nền toàn bộ Header"
      className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150 overflow-y-auto"
    >
      <div
        ref={modalContainerRef}
        className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border border-[#EFE5D9] flex flex-col my-auto max-h-[94vh]"
      >
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-[#EFE5D9] flex items-center justify-between bg-[#FFF9F3] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#E5F76A] text-[#241E35] flex items-center justify-center font-black shadow-2xs">
              <ImageIcon className="w-5 h-5 text-[#FF5A36]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#241E35] leading-tight">
                Đổi nền toàn bộ Header
              </h2>
              <p className="text-xs text-[#6E6779] font-medium">
                Ảnh nền phủ sau logo, tên quán, thông tin & các khung ảnh
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="w-9 h-9 rounded-full text-[#6E6779] hover:bg-[#FFF0EB] flex items-center justify-center transition-colors"
            title="Đóng (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Device Preview Switcher & Canvas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#241E35] flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#FF5A36]" />
                <span>Xem trước thực tế trên thiết bị</span>
              </span>

              {/* Device Tabs */}
              <div className="inline-flex rounded-xl p-1 bg-[#FFF9F3] border border-[#EFE5D9]">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
                    previewDevice === 'mobile'
                      ? 'bg-white text-[#241E35] shadow-xs'
                      : 'text-[#6E6779] hover:text-[#241E35]'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-[#FF5A36]" />
                  <span>Điện thoại</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
                    previewDevice === 'desktop'
                      ? 'bg-white text-[#241E35] shadow-xs'
                      : 'text-[#6E6779] hover:text-[#241E35]'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5 text-[#FF5A36]" />
                  <span>Máy tính</span>
                </button>
              </div>
            </div>

            {/* Interactive Preview Container */}
            <div className="bg-[#241E35]/5 p-3 sm:p-4 rounded-[28px] border border-[#EFE5D9] flex flex-col items-center justify-center">
              <div
                className={`w-full transition-all duration-200 ${
                  previewDevice === 'mobile' ? 'max-w-[340px]' : 'max-w-full'
                }`}
              >
                <div
                  ref={previewSurfaceRef}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={handlePointerUp}
                  onMouseLeave={handlePointerUp}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={handlePointerUp}
                  style={{ touchAction: 'none' }}
                  className={`relative overflow-hidden rounded-[26px] border border-[#EFE5D9] shadow-md select-none ${
                    config.imageUrl ? 'cursor-grab active:cursor-grabbing' : ''
                  }`}
                >
                  {/* Layer A: Custom Background or Default Poster Canvas */}
                  {config.imageUrl ? (
                    <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#241E35]">
                      <img
                        src={config.imageUrl}
                        alt="Header background preview"
                        draggable={false}
                        style={{
                          objectFit: 'cover',
                          objectPosition: `${activePosition.x}% ${activePosition.y}%`,
                          transform: `scale(${activeZoom})`,
                          transformOrigin: `${activePosition.x}% ${activePosition.y}%`,
                        }}
                        className="w-full h-full pointer-events-none transition-transform duration-75"
                      />
                    </div>
                  ) : (
                    /* Default Poster Canvas if no custom image */
                    <div className="absolute inset-0 w-full h-full bg-[#FFFFFF] overflow-hidden">
                      <div
                        className="absolute -top-10 -right-10 w-48 h-48 rounded-[48px] bg-[#FF5A36] transform rotate-12 opacity-95 pointer-events-none"
                      />
                      <div className="absolute -top-4 right-16 w-36 h-36 rounded-[36px] bg-[#7447E8] opacity-90 pointer-events-none" />
                      <div className="absolute top-16 right-2 w-24 h-8 rounded-full bg-[#E5F76A] opacity-95 transform -rotate-6 pointer-events-none" />
                    </div>
                  )}

                  {/* Layer B: Custom Overlay (if custom image enabled) */}
                  {config.imageUrl && config.overlayOpacity > 0 && (
                    <div
                      className="absolute inset-0 pointer-events-none transition-opacity"
                      style={{
                        backgroundColor: config.overlayType === 'dark' ? '#000000' : '#FFFFFF',
                        opacity: config.overlayOpacity / 100,
                      }}
                    />
                  )}

                  {/* Layer C: Interactive Foreground Content */}
                  <div className="relative z-10 p-4 sm:p-5 pointer-events-none">
                    <div
                      className={`grid gap-3 sm:gap-4 items-center ${
                        previewDevice === 'desktop' && config.showShowcaseFrames
                          ? 'grid-cols-12'
                          : 'grid-cols-1'
                      }`}
                    >
                      {/* Left Column: Brand & Info */}
                      <div
                        className={`space-y-2 ${
                          previewDevice === 'desktop' && config.showShowcaseFrames
                            ? 'col-span-8'
                            : 'col-span-12'
                        }`}
                      >
                        {/* Logo & Category Badge */}
                        <div className="flex items-center gap-2.5">
                          <div className="w-11 h-11 rounded-[16px] bg-white p-0.5 shadow-sm border border-[#EFE5D9] shrink-0 overflow-hidden">
                            {shop.logoUrl ? (
                              <img
                                src={shop.logoUrl}
                                alt={shop.name}
                                className="w-full h-full object-cover rounded-[14px]"
                              />
                            ) : (
                              <div
                                className="w-full h-full rounded-[14px] flex items-center justify-center text-white font-black text-lg"
                                style={{ backgroundColor: shop.themeColor || '#FF5A36' }}
                              >
                                {shop.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E5F76A] text-[#241E35] text-[9px] font-black uppercase shadow-2xs">
                              <Sparkles className="w-2.5 h-2.5 text-[#FF5A36]" />
                              <span>Thực đơn điện tử</span>
                            </span>
                          </div>
                        </div>

                        {/* Title & Tagline */}
                        <div>
                          <h3
                            className={`text-lg sm:text-xl font-black leading-tight drop-shadow-xs truncate ${
                              effectiveTextColor === 'light' ? 'text-white' : 'text-[#241E35]'
                            }`}
                          >
                            {shop.name}
                          </h3>
                          {shop.tagline && (
                            <p
                              className={`text-[11px] font-bold mt-0.5 line-clamp-1 ${
                                effectiveTextColor === 'light'
                                  ? 'text-[#E5F76A]'
                                  : 'text-[#FF5A36]'
                              }`}
                            >
                              {shop.tagline}
                            </p>
                          )}
                        </div>

                        {/* Address & Phone */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px]">
                          {shop.address && (
                            <div
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border max-w-full ${
                                effectiveTextColor === 'light'
                                  ? 'bg-black/40 border-white/20 text-white backdrop-blur-xs'
                                  : 'bg-white border-[#EFE5D9] text-[#241E35]'
                              }`}
                            >
                              <MapPin className="w-2.5 h-2.5 text-[#FF5A36] shrink-0" />
                              <span className="truncate max-w-[170px]">{shop.address}</span>
                            </div>
                          )}
                          {shop.phone && (
                            <div
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border ${
                                effectiveTextColor === 'light'
                                  ? 'bg-black/40 border-white/20 text-white backdrop-blur-xs'
                                  : 'bg-white border-[#EFE5D9] text-[#241E35]'
                              }`}
                            >
                              <Phone className="w-2.5 h-2.5 text-[#FF5A36] shrink-0" />
                              <span>{shop.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Column: Showcase Frame (if enabled) */}
                      {config.showShowcaseFrames && (
                        <div
                          className={`flex justify-center items-center ${
                            previewDevice === 'desktop' ? 'col-span-4' : 'mt-1'
                          }`}
                        >
                          <div className="relative w-32 h-20 rounded-[18px] overflow-hidden shadow-md border-2 border-white bg-[#241E35]">
                            {shop.coverUrl ? (
                              <img
                                src={shop.coverUrl}
                                alt="Khung ảnh"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div
                                className="w-full h-full flex flex-col justify-end p-2 text-white"
                                style={{ backgroundColor: shop.themeColor || '#FF5A36' }}
                              >
                                <UtensilsCrossed className="w-5 h-5 opacity-40 mb-0.5" />
                                <div className="text-[9px] font-bold">Món đặc trưng</div>
                              </div>
                            )}
                            <div className="absolute top-1 left-1.5 px-1.5 py-0.2 rounded-full bg-[#E5F76A] text-[#241E35] text-[8px] font-black uppercase">
                              Khung ảnh
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Drag Visual Indicator */}
                  {config.imageUrl && (
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 text-white text-[9px] font-bold flex items-center gap-1 backdrop-blur-xs pointer-events-none z-20">
                      <Move className="w-3 h-3 text-[#FFE6A7]" />
                      <span>{isDragging ? 'Đang kéo vị trí...' : 'Kéo để chỉnh vùng'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Direct Crop & Zoom Controls */}
              {config.imageUrl && (
                <div className="w-full mt-3 pt-3 border-t border-[#EFE5D9] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  {/* Position Nudge Controls */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-[#6E6779] mr-1">Vị trí ảnh:</span>
                    <button
                      type="button"
                      onClick={() => nudgePosition(0, -6)}
                      className="w-7 h-7 rounded-lg bg-white border border-[#EFE5D9] hover:bg-[#FFF0EB] flex items-center justify-center font-bold text-[#241E35] shadow-2xs"
                      title="Dịch lên"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgePosition(0, 6)}
                      className="w-7 h-7 rounded-lg bg-white border border-[#EFE5D9] hover:bg-[#FFF0EB] flex items-center justify-center font-bold text-[#241E35] shadow-2xs"
                      title="Dịch xuống"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgePosition(-6, 0)}
                      className="w-7 h-7 rounded-lg bg-white border border-[#EFE5D9] hover:bg-[#FFF0EB] flex items-center justify-center font-bold text-[#241E35] shadow-2xs"
                      title="Dịch trái"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgePosition(6, 0)}
                      className="w-7 h-7 rounded-lg bg-white border border-[#EFE5D9] hover:bg-[#FFF0EB] flex items-center justify-center font-bold text-[#241E35] shadow-2xs"
                      title="Dịch phải"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateActivePosition({ x: 50, y: 50 })}
                      className="px-2 py-1 rounded-lg bg-white border border-[#EFE5D9] text-[10px] font-black text-[#6E6779] hover:text-[#241E35] shadow-2xs"
                    >
                      Về giữa ({activePosition.x}%, {activePosition.y}%)
                    </button>
                  </div>

                  {/* Zoom Slider */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => updateActiveZoom(activeZoom - 0.15)}
                      className="w-7 h-7 rounded-lg bg-white border border-[#EFE5D9] hover:bg-[#FFF0EB] flex items-center justify-center font-bold text-[#241E35] shadow-2xs shrink-0"
                      title="Thu nhỏ"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="range"
                      min="1.0"
                      max="2.5"
                      step="0.05"
                      value={activeZoom}
                      onChange={(e) => updateActiveZoom(parseFloat(e.target.value))}
                      className="accent-[#FF5A36] w-28 cursor-pointer"
                      title="Phóng to / thu nhỏ ảnh"
                    />
                    <button
                      type="button"
                      onClick={() => updateActiveZoom(activeZoom + 0.15)}
                      className="w-7 h-7 rounded-lg bg-white border border-[#EFE5D9] hover:bg-[#FFF0EB] flex items-center justify-center font-bold text-[#241E35] shadow-2xs shrink-0"
                      title="Phóng to"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-black tabular-nums text-[#241E35] w-12 text-right">
                      {Math.round(activeZoom * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Choose / Upload Image */}
          <div className="p-4 rounded-2xl bg-white border border-[#EFE5D9] space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-black text-[#241E35] block">
                  Tải ảnh nền cho header
                </label>
                <p className="text-[11px] text-[#6E6779]">
                  Hỗ trợ định dạng JPG, PNG, WebP (tối đa 5MB). Ảnh được tối ưu tự động.
                </p>
              </div>

              {config.imageUrl && (
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, imageUrl: undefined }))}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 underline"
                >
                  Gỡ ảnh nền
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              disabled={isProcessingImage}
              onClick={() => fileInputRef.current?.click()}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-2xl border-2 border-dashed border-[#FF5A36]/50 bg-[#FFF0EB]/50 hover:bg-[#FFF0EB] text-[#241E35] font-black text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4 text-[#FF5A36]" />
              <span>
                {isProcessingImage
                  ? 'Đang nén & chuẩn bị ảnh...'
                  : config.imageUrl
                  ? 'Chọn tệp khác từ máy để thay ảnh nền'
                  : 'Bấm để tải ảnh nền mới từ thiết bị'}
              </span>
            </button>

            {/* Presets and URL Quick Options */}
            <div className="pt-2 border-t border-[#EFE5D9] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#6E6779]">
                  Hoặc chọn nhanh ảnh mẫu có sẵn:
                </span>
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="text-[11px] font-bold text-[#FF5A36] hover:underline"
                >
                  {showUrlInput ? 'Ẩn nhập URL' : 'Dán link URL ảnh'}
                </button>
              </div>

              {/* Preset Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {HEADER_PRESET_IMAGES.map((preset) => {
                  const isSelected = config.imageUrl === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setConfig((prev) => ({
                          ...prev,
                          imageUrl: preset.url,
                          desktopPosition: { x: 50, y: 50 },
                          desktopZoom: 1.0,
                          mobilePosition: { x: 50, y: 50 },
                          mobileZoom: 1.0,
                        }));
                      }}
                      className={`group relative rounded-xl overflow-hidden border text-left transition-all ${
                        isSelected
                          ? 'border-[#FF5A36] ring-2 ring-[#FF5A36]/30 shadow-xs'
                          : 'border-[#EFE5D9] hover:border-[#FF5A36]/60'
                      }`}
                    >
                      <div className="h-14 w-full bg-[#241E35] overflow-hidden">
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="p-1.5 bg-white">
                        <span className="text-[10px] font-bold text-[#241E35] block truncate">
                          {preset.name}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#FF5A36] text-white flex items-center justify-center shadow-xs">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* URL Input field if toggled */}
              {showUrlInput && (
                <div className="flex gap-2 pt-1 animate-in fade-in duration-100">
                  <input
                    type="url"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="https://example.com/anh-header.jpg"
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-[#EFE5D9] text-[#241E35] focus:outline-hidden focus:border-[#FF5A36]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customUrlInput.trim()) {
                        setConfig((prev) => ({
                          ...prev,
                          imageUrl: customUrlInput.trim(),
                          desktopPosition: { x: 50, y: 50 },
                          desktopZoom: 1.0,
                          mobilePosition: { x: 50, y: 50 },
                          mobileZoom: 1.0,
                        }));
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#241E35] text-white text-xs font-bold hover:bg-black transition-colors"
                  >
                    Dùng ảnh
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 3. Overlay and Contrast Controls (Active if image is chosen) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Overlay Style & Opacity */}
            <div className="p-4 rounded-2xl bg-white border border-[#EFE5D9] space-y-3 shadow-2xs">
              <label className="text-xs font-black text-[#241E35] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#FF5A36]" />
                <span>Lớp phủ màu nền</span>
              </label>

              {/* Overlay type switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, overlayType: 'dark' }))}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-all ${
                    config.overlayType === 'dark'
                      ? 'bg-[#241E35] text-white border-[#241E35] shadow-xs'
                      : 'bg-white text-[#241E35] border-[#EFE5D9] hover:bg-[#FFF9F3]'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5 text-[#E5F76A]" />
                  <span>Phủ Tối</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, overlayType: 'light' }))}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-all ${
                    config.overlayType === 'light'
                      ? 'bg-[#E5F76A] text-[#241E35] border-[#d6ea56] shadow-xs'
                      : 'bg-white text-[#241E35] border-[#EFE5D9] hover:bg-[#FFF9F3]'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 text-[#FF5A36]" />
                  <span>Phủ Sáng</span>
                </button>
              </div>

              {/* Overlay Opacity Slider */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#6E6779]">
                  <span>Độ đậm lớp phủ:</span>
                  <span className="text-[#241E35] font-black">{config.overlayOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="5"
                  value={config.overlayOpacity}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, overlayOpacity: parseInt(e.target.value, 10) }))
                  }
                  className="accent-[#FF5A36] w-full cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#6E6779]">
                  <span>0% (Không phủ)</span>
                  <span>80% (Đậm)</span>
                </div>
              </div>
            </div>

            {/* Typography Contrast Mode */}
            <div className="p-4 rounded-2xl bg-white border border-[#EFE5D9] space-y-3 shadow-2xs">
              <label className="text-xs font-black text-[#241E35] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#FF5A36]" />
                <span>Màu chữ chính</span>
              </label>

              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, textColorMode: 'auto' }))}
                    className={`min-h-[36px] px-2 py-1 rounded-xl text-xs font-black flex items-center justify-center border transition-all ${
                      config.textColorMode === 'auto'
                        ? 'bg-[#FF5A36] text-white border-[#FF5A36] shadow-xs'
                        : 'bg-white text-[#241E35] border-[#EFE5D9] hover:bg-[#FFF9F3]'
                    }`}
                  >
                    Tự động
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, textColorMode: 'light' }))}
                    className={`min-h-[36px] px-2 py-1 rounded-xl text-xs font-black flex items-center justify-center border transition-all ${
                      config.textColorMode === 'light'
                        ? 'bg-[#241E35] text-white border-[#241E35] shadow-xs'
                        : 'bg-white text-[#241E35] border-[#EFE5D9] hover:bg-[#FFF9F3]'
                    }`}
                  >
                    Sáng
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, textColorMode: 'dark' }))}
                    className={`min-h-[36px] px-2 py-1 rounded-xl text-xs font-black flex items-center justify-center border transition-all ${
                      config.textColorMode === 'dark'
                        ? 'bg-[#E5F76A] text-[#241E35] border-[#d6ea56] shadow-xs'
                        : 'bg-white text-[#241E35] border-[#EFE5D9] hover:bg-[#FFF9F3]'
                    }`}
                  >
                    Tối
                  </button>
                </div>

                <p className="text-[10px] text-[#6E6779] leading-relaxed">
                  {config.textColorMode === 'auto'
                    ? `Đang áp dụng: Chữ ${effectiveTextColor === 'light' ? 'Sáng (Trắng)' : 'Tối (Đậm)'} theo lớp phủ hiện tại.`
                    : config.textColorMode === 'light'
                    ? 'Ép màu chữ trắng sáng, phù hợp khi dùng ảnh nền tối hoặc món ăn đậm màu.'
                    : 'Ép màu chữ tối (#241E35), phù hợp khi dùng ảnh nền sáng màu.'}
                </p>
              </div>
            </div>
          </div>

          {/* 4. Showcase Frames Switch ("Hiện khung ảnh trang trí") */}
          <div className="p-4 rounded-2xl bg-white border border-[#EFE5D9] flex items-center justify-between gap-4 shadow-2xs">
            <div>
              <div className="text-xs font-black text-[#241E35]">
                Hiện khung ảnh trang trí bên phải
              </div>
              <p className="text-[11px] text-[#6E6779] max-w-md mt-0.5">
                Hiển thị các khung ảnh món đặc trưng & ảnh phụ ghép tầng. Khi tắt, thông tin quán sẽ mở rộng trọn vẹn bề ngang. Ảnh đã có trong khung vẫn được giữ nguyên.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={config.showShowcaseFrames}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, showShowcaseFrames: e.target.checked }))
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF5A36]" />
            </label>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 sm:p-5 border-t border-[#EFE5D9] bg-[#FFF9F3] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {/* Reset button */}
          <button
            type="button"
            onClick={handleResetToDefault}
            className="min-h-[42px] px-3.5 py-2 rounded-2xl bg-white border border-[#EFE5D9] hover:bg-[#FFF0EB] text-xs font-bold text-[#6E6779] hover:text-[#241E35] flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi phục nền mặc định</span>
          </button>

          {/* Save & Cancel */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 sm:flex-none min-h-[42px] px-5 py-2 rounded-2xl bg-white border border-[#EFE5D9] hover:bg-[#FFF0EB] text-xs font-bold text-[#241E35] transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              className="flex-1 sm:flex-none min-h-[42px] px-6 py-2 rounded-2xl bg-[#FF5A36] hover:bg-[#E6431F] text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Lưu vào bản nháp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
