/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { StorageService } from './services/storage';
import { OnlineStorageService } from './services/onlineStorage';
import { FirebaseAuthService, testConnection } from './services/firebase';
import { ShopData, UserProfile } from './types/menu';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { OwnerDashboard } from './components/OwnerDashboard';
import { GuestMenuView } from './components/GuestMenuView';
import { ToastContainer, ToastMessage } from './components/Toast';
import { DEMO_SHOP_ID, INITIAL_DEMO_DATA } from './data/mockData';
import { ArrowLeft, Store, Cloud, CloudCheck, WifiOff } from 'lucide-react';

export default function App() {
  // Current logged in user (Firebase or local session)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() =>
    StorageService.getCurrentUser()
  );

  // Current Shop Data (Draft for owner dashboard)
  const [currentShopData, setCurrentShopData] = useState<ShopData | null>(null);
  const [isPublished, setIsPublished] = useState<boolean>(false);

  // Cloud connection & sync status
  const [isCloudOnline, setIsCloudOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Auth modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');

  // Navigation / Route state: 'home' | 'dashboard' | 'guest'
  const [currentRoute, setCurrentRoute] = useState<'home' | 'dashboard' | 'guest'>('home');
  const [guestShopId, setGuestShopId] = useState<string | null>(null);
  const [guestShopData, setGuestShopData] = useState<ShopData | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Test Firebase connection on boot (Skill constraint)
  useEffect(() => {
    testConnection().then((connected) => {
      setIsCloudOnline(connected);
    });
  }, []);

  // Firebase Auth state listener to persist login across reloads & multiple devices
  useEffect(() => {
    const unsubscribe = FirebaseAuthService.onAuthStateChanged(async (fbUser) => {
      if (fbUser) {
        // User is logged into Firebase
        const existingProfile = StorageService.getCurrentUser();
        let shopId = existingProfile?.shopId;

        if (!shopId || existingProfile?.id !== fbUser.uid) {
          // Look up user's shops in cloud
          const userShops = await OnlineStorageService.getUserShops(fbUser.uid);
          shopId = userShops.length > 0 ? userShops[0] : `quan-${fbUser.uid.slice(0, 8)}`;
        }

        const profile: UserProfile = {
          id: fbUser.uid,
          displayName: fbUser.displayName || existingProfile?.displayName || 'Chủ quán',
          email: fbUser.email || existingProfile?.email || '',
          shopId: shopId,
          isFirebaseUser: true,
          photoUrl: fbUser.photoURL || undefined,
        };

        setCurrentUser(profile);
        StorageService.setCurrentUser(profile);
      } else {
        // If logged out from Firebase and current profile is marked as Firebase user
        const existingProfile = StorageService.getCurrentUser();
        if (existingProfile?.isFirebaseUser) {
          setCurrentUser(null);
          StorageService.setCurrentUser(null);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Parse URL hash or query params
  const parseCurrentUrl = useCallback(() => {
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);

    // Check query param e.g. ?menu=moc-bep-cafe
    const queryMenu = searchParams.get('menu');
    if (queryMenu) {
      setGuestShopId(queryMenu);
      setCurrentRoute('guest');
      return;
    }

    // Check hash e.g. #/menu/moc-bep-cafe
    const hashMenuMatch = hash.match(/#\/menu\/([^/?#]+)/);
    if (hashMenuMatch && hashMenuMatch[1]) {
      setGuestShopId(hashMenuMatch[1]);
      setCurrentRoute('guest');
      return;
    }

    // Hash admin or root
    if (currentUser) {
      setCurrentRoute('dashboard');
    } else {
      setCurrentRoute('home');
    }
  }, [currentUser]);

  // Initial load & URL routing listener
  useEffect(() => {
    parseCurrentUrl();

    const handleHashChange = () => {
      parseCurrentUrl();
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [parseCurrentUrl]);

  // Real-time Guest Menu Subscription (Customer scanning QR code)
  useEffect(() => {
    if (currentRoute === 'guest' && guestShopId) {
      // Subscribe to real-time updates from Firestore
      const unsubscribe = OnlineStorageService.subscribeToPublishedMenu(
        guestShopId,
        (updatedData) => {
          setGuestShopData(updatedData);
        },
        (error) => {
          console.warn('Realtime sync fallback to cached/demo:', error);
        }
      );

      return () => unsubscribe();
    }
  }, [currentRoute, guestShopId]);

  // Load shop data when owner changes or dashboard loads
  useEffect(() => {
    if (currentRoute === 'dashboard' && currentUser) {
      let isMounted = true;
      setIsSyncing(true);

      // Attempt to load from cloud first
      OnlineStorageService.loadOwnerShop(currentUser.shopId)
        .then((cloudShop) => {
          if (!isMounted) return;
          if (cloudShop) {
            setCurrentShopData(cloudShop.draft);
            setIsPublished(cloudShop.isPublished);
          } else {
            // Local fallback
            StorageService.ensureShopExists(currentUser.shopId);
            const record = StorageService.getShop(currentUser.shopId);
            if (record) {
              setCurrentShopData(record.draft);
              setIsPublished(!!record.published);
            }
          }
        })
        .finally(() => {
          if (isMounted) setIsSyncing(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [currentUser, currentRoute]);

  // Multi-tab storage change listener
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'qr_menu_shops_v1') {
        if (currentRoute === 'guest' && guestShopId) {
          const updatedPub = StorageService.getPublishedShop(guestShopId);
          if (updatedPub) setGuestShopData(updatedPub);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentRoute, guestShopId]);

  // Navigation functions
  const navigateToGuest = (shopId: string) => {
    window.location.hash = `#/menu/${shopId}`;
  };

  const navigateToDashboard = () => {
    window.location.hash = '';
    setCurrentRoute('dashboard');
  };

  const navigateToHome = () => {
    window.location.hash = '';
    setCurrentRoute('home');
  };

  // Auth actions
  const handleAuthSuccess = async (user: UserProfile) => {
    setCurrentUser(user);
    setAuthModalOpen(false);

    // Load shop data
    const shop = await OnlineStorageService.loadOwnerShop(user.shopId);
    if (shop) {
      setCurrentShopData(shop.draft);
      setIsPublished(shop.isPublished);
    } else {
      StorageService.ensureShopExists(user.shopId);
      const record = StorageService.getShop(user.shopId);
      if (record) {
        setCurrentShopData(record.draft);
        setIsPublished(!!record.published);
      }
    }

    setCurrentRoute('dashboard');
    showToast(
      'success',
      user.isFirebaseUser
        ? `Đăng nhập thành công với tài khoản ${user.displayName}! Dữ liệu đã đồng bộ online.`
        : `Chào mừng ${user.displayName}! Bạn đang quản lý quán.`
    );
  };

  const handleLoginDemo = () => {
    const demoUser = StorageService.loginDemoUser();
    handleAuthSuccess(demoUser);
  };

  const handleLogout = async () => {
    try {
      await FirebaseAuthService.signOut();
    } catch (e) {
      console.warn('Sign out warning:', e);
    }
    StorageService.logout();
    setCurrentUser(null);
    setCurrentShopData(null);
    navigateToHome();
    showToast('info', 'Đã đăng xuất an toàn. Dữ liệu menu vẫn được lưu trữ bảo mật.');
  };

  // Dashboard updates (Draft update & Auto-save to cloud & local)
  const handleUpdateDraft = async (newData: ShopData) => {
    setCurrentShopData(newData);
    if (currentUser) {
      setIsSyncing(true);
      const res = await OnlineStorageService.saveDraft(currentUser.shopId, newData);
      setIsSyncing(false);
      if (!res.success && res.error) {
        showToast('error', res.error);
      }
    }
  };

  // Publish to Cloud and local
  const handlePublish = async () => {
    if (!currentUser || !currentShopData) return;
    setIsSyncing(true);
    const res = await OnlineStorageService.publishShop(currentUser.shopId);
    setIsSyncing(false);

    if (res.success) {
      setIsPublished(true);
      showToast(
        'success',
        'Xuất bản menu thành công! Khách quét QR trên mọi thiết bị sẽ thấy ngay thực đơn mới nhất.'
      );
    } else {
      showToast('error', res.error || 'Không thể xuất bản menu');
    }
  };

  const handleResetDemo = () => {
    const res = StorageService.resetDemoShop(DEMO_SHOP_ID);
    if (res.success) {
      setCurrentShopData(res.data);
      setIsPublished(true);
      showToast('success', 'Đã khôi phục thực đơn mẫu ban đầu thành công!');
    } else {
      showToast('error', res.error || 'Lỗi khi khôi phục dữ liệu');
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9F3] text-[#241E35]">
      {/* ROUTE 1: GUEST MENU VIEW */}
      {currentRoute === 'guest' && (
        <div className="relative">
          {/* Top navigation helper bar for demo */}
          <div className="bg-[#241E35] text-white text-xs px-4 py-2.5 flex items-center justify-between border-b border-white/10 shadow-xs">
            <button
              onClick={() => {
                if (currentUser) {
                  navigateToDashboard();
                } else {
                  navigateToHome();
                }
              }}
              className="inline-flex items-center gap-1.5 hover:text-[#E5F76A] transition-colors font-bold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#FF5A36]" />
              <span>{currentUser ? 'Quay lại trang quản lý' : 'Trang chủ QR Menu'}</span>
            </button>

            <div className="text-[11px] text-white/70 hidden sm:flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Giao diện khách quét QR · Đồng bộ thời gian thực · Không cần đăng nhập</span>
            </div>

            {currentUser && currentUser.shopId === guestShopId ? (
              <button
                onClick={navigateToDashboard}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#E5F76A] hover:underline cursor-pointer"
              >
                <Store className="w-3.5 h-3.5 text-[#FF5A36]" />
                <span>Bạn là chủ quán này (Quay lại sửa)</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setAuthMode('signup');
                  setAuthModalOpen(true);
                  navigateToHome();
                }}
                className="text-[11px] font-bold text-[#E5F76A] hover:underline cursor-pointer"
              >
                Tạo menu quán của bạn
              </button>
            )}
          </div>

          {/* Guest Menu UI */}
          <GuestMenuView
            shopData={guestShopData}
            isPreview={false}
          />
        </div>
      )}

      {/* ROUTE 2: OWNER DASHBOARD */}
      {currentRoute === 'dashboard' && currentUser && currentShopData && (
        <OwnerDashboard
          user={currentUser}
          shopData={currentShopData}
          isPublished={isPublished}
          onUpdateDraft={handleUpdateDraft}
          onPublish={handlePublish}
          onResetDemo={handleResetDemo}
          onLogout={handleLogout}
          onOpenGuestUrl={navigateToGuest}
          showToast={showToast}
        />
      )}

      {/* ROUTE 3: LANDING PAGE */}
      {currentRoute === 'home' && (
        <LandingPage
          onStartCreate={() => {
            setAuthMode('signup');
            setAuthModalOpen(true);
          }}
          onLoginDemo={handleLoginDemo}
          onViewSampleMenu={navigateToGuest}
        />
      )}

      {/* Auth Modal (Signup / Login / Reset Password) */}
      <AuthModal
        isOpen={authModalOpen}
        mode={authMode}
        onSuccess={handleAuthSuccess}
        onClose={() => setAuthModalOpen(false)}
        onSwitchMode={(mode) => setAuthMode(mode)}
      />

      {/* Global Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
