/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { OperationResult } from './types/operations';
import { StorageService } from './services/storage';
import { OnlineStorageService } from './services/onlineStorage';
import { FirebaseAuthService } from './services/firebase';
import { AuthSession } from './services/authSession';
import { ShopData, UserProfile } from './types/menu';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { AdminPortal } from './components/AdminPortal';
import { MenuDiscovery } from './components/MenuDiscovery';
import { OwnerDashboard } from './components/OwnerDashboard';
import { GuestMenuView } from './components/GuestMenuView';
import { ToastContainer, ToastMessage } from './components/Toast';
import { ArrowLeft, Store } from 'lucide-react';

export default function App() {
  // Current logged in user (Firebase or local session)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const activeProfile = useRef(currentUser);
  activeProfile.current = currentUser;

  // Current Shop Data (Draft for owner dashboard)
  const [currentShopData, setCurrentShopData] = useState<ShopData | null>(null);
  const [isPublished, setIsPublished] = useState<boolean>(false);

  // Cloud connection & sync status
  const [isCloudOnline, setIsCloudOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const pendingWrites = useRef(0);
  const [hasPendingDraft, setHasPendingDraft] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authAttempt, setAuthAttempt] = useState(0);

  // Auth modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');

  // Navigation / Route state: 'home' | 'dashboard' | 'guest'
  const [currentRoute, setCurrentRoute] = useState<'home' | 'dashboard' | 'guest' | 'admin' | 'discover'>(() => window.location.hash === '#/admin' ? 'admin' : window.location.hash === '#/discover' ? 'discover' : 'home');
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

  // The browser reports connectivity; writes themselves report cloud success/failure.
  useEffect(() => {
    const update = () => setIsCloudOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  useEffect(() => {
    let active = true;
    setAuthError(null);
    const unsubscribe = FirebaseAuthService.onAuthStateChanged(async (fbUser) => {
      if (!active || AuthSession.isBusy()) return;
      if (window.location.hash.split('?')[0] === '#/admin') return;
      if (window.location.hash.split('?')[0] === '#/discover') return;
      if (!fbUser) {
        AuthSession.invalidate();
        if (StorageService.getCurrentUser()) {
          setCurrentUser(null);
          setCurrentShopData(null);
          StorageService.setCurrentUser(null);
        }
        return;
      }
      if (StorageService.getCurrentUser()?.id !== fbUser.uid) {
        setCurrentUser(null);
        setCurrentShopData(null);
      }
      try {
        const token = await fbUser.getIdTokenResult();
        if (!active || FirebaseAuthService.getCurrentUser()?.uid !== fbUser.uid) return;
        if (token.claims.qrAdmin === true) {
          setCurrentUser(null);
          return;
        }
        const result = await AuthSession.restore(fbUser);
        if (!active || result.ignored) return;
        if (result.profile) setCurrentUser(result.profile);
        else if (result.needsSetup) {
          setCurrentUser(null);
          StorageService.setCurrentUser(null);
          setAuthMode('login');
          setAuthModalOpen(true);
          showToast('info', 'Tài khoản chưa có quán. Đăng nhập để hoàn tất thiết lập.');
        }
      } catch (error) {
        if (active) setAuthError(error instanceof Error ? error.message : String(error));
      }
    });
    return () => { active = false; unsubscribe(); };
  }, [authAttempt, showToast, currentRoute === 'admin' || currentRoute === 'discover']);
  // Parse URL hash or query params
  const parseCurrentUrl = useCallback(() => {
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);

    if (hash.split('?')[0] === '#/admin') { setCurrentRoute('admin'); return; }
    if (hash.split('?')[0] === '#/discover') { setCurrentRoute('discover'); return; }

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
          console.warn('Realtime sync fallback to cache:', error);
        }
      );

      return () => unsubscribe();
    }
  }, [currentRoute, guestShopId]);

  useEffect(() => {
    if (currentRoute !== 'dashboard' || !currentUser) return;
    let active = true;
    setCurrentShopData(null);
    setLoadError(null);
    setIsSyncing(true);
    const load = async () => {
      try {
        const record = await OnlineStorageService.loadOwnerShop(currentUser.shopId);
        if (!active) return;
        if (!record) throw new Error('Không tìm thấy quán. Vui lòng kiểm tra lại tài khoản.');
        setCurrentShopData(record.draft);
        setIsPublished(record.isPublished);
        setHasPendingDraft(!!record.pending);
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : String(error));
      } finally { if (active) setIsSyncing(pendingWrites.current > 0); }
    };
    void load();
    return () => { active = false; };
  }, [currentUser, currentRoute, loadAttempt]);

  const syncPending = useCallback(async () => {
    if (!currentUser?.isFirebaseUser || FirebaseAuthService.getCurrentUser()?.uid !== currentUser.id || !navigator.onLine) return;
    pendingWrites.current++;
    setIsSyncing(true);
    try {
      const results = await OnlineStorageService.syncPendingDrafts();
      if (FirebaseAuthService.getCurrentUser()?.uid !== currentUser.id) return;
      setHasPendingDraft(!!StorageService.getPendingDraft(currentUser.shopId, currentUser.id));
      const failed = results.find(result => !result.success);
      if (failed) showToast('error', failed.error || 'Chưa đồng bộ được bản nháp.');
      else if (results.length) showToast('success', 'Đã đồng bộ bản nháp. Menu khách giữ nguyên đến khi bạn xuất bản.');
      const warning = results.find(result => result.cacheWarning);
      if (warning) showToast('info', warning.cacheWarning!);
    } finally {
      pendingWrites.current--;
      setIsSyncing(pendingWrites.current > 0);
    }
  }, [currentUser, showToast]);

  useEffect(() => {
    if (isCloudOnline && currentShopData && currentUser?.isFirebaseUser) void syncPending();
  }, [isCloudOnline, !!currentShopData, syncPending]);
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
    setCurrentShopData(null);
    setCurrentUser(user);
    setAuthError(null);
    setAuthModalOpen(false);
    setCurrentRoute('dashboard');
    showToast('success', `Đăng nhập thành công: ${user.displayName}.`);
  };

  const handleLogout = async () => {
    AuthSession.invalidate();
    try {
      await FirebaseAuthService.signOut();
    } catch (e) {
      showToast('error', 'Chưa đăng xuất được. Vui lòng thử lại.');
      return;
    }
    StorageService.logout();
    setCurrentUser(null);
    setCurrentShopData(null);
    navigateToHome();
    showToast('info', 'Đã đăng xuất an toàn. Dữ liệu menu vẫn được lưu trữ bảo mật.');
  };

  const draftSaveRevision=useRef(0);
  // Dashboard updates (Draft update & Auto-save to cloud & local)
  const handleUpdateDraft = async (newData: ShopData): Promise<OperationResult> => {
    const revision=++draftSaveRevision.current;
    setCurrentShopData(newData);
    if (!currentUser) return { success: false, error: 'Bạn chưa đăng nhập.' };
    if (currentUser.isFirebaseUser && FirebaseAuthService.getCurrentUser()?.uid !== currentUser.id) {
      const cached = StorageService.savePendingDraft(currentUser.shopId, newData, currentUser.id);
      setHasPendingDraft(cached.success);
      const error = cached.success ? 'Phiên đăng nhập đã thay đổi. Nháp được giữ trên thiết bị; hãy đăng nhập lại.' : cached.error;
      showToast('error', error || 'Không lưu được bản nháp.');
      return { success: false, pending: cached.success, error };
    }
    pendingWrites.current++;
    setIsSyncing(true);
    try {
      const res: OperationResult = await OnlineStorageService.saveDraft(currentUser.shopId, newData);
      if (activeProfile.current?.id !== currentUser.id || activeProfile.current.shopId !== currentUser.shopId) return res;
      if(res.success && res.savedDraft && revision===draftSaveRevision.current)setCurrentShopData(res.savedDraft);
      setHasPendingDraft(!!currentUser.isFirebaseUser && !!StorageService.getPendingDraft(currentUser.shopId, currentUser.id));
      if (!res.success && res.error) {
        showToast('error', res.error);
      }
      if (res.cacheWarning) showToast('info', `Đã lưu cloud, nhưng lưu dự phòng thất bại: ${res.cacheWarning}`);
      return res;
    } finally {
      pendingWrites.current--;
      setIsSyncing(pendingWrites.current > 0);
    }
  };

  // Publish to Cloud and local
  const handlePublish = async (snapshot: ShopData): Promise<OperationResult> => {
    const revision=++draftSaveRevision.current;
    if (!currentUser) return { success: false, error: 'Bạn chưa đăng nhập.' };
    if (currentUser.isFirebaseUser && FirebaseAuthService.getCurrentUser()?.uid !== currentUser.id) {
      return { success: false, error: 'Phiên đăng nhập đã thay đổi. Hãy đăng nhập lại trước khi xuất bản.' };
    }
    pendingWrites.current++;
    setIsSyncing(true);
    try {
    let res: OperationResult;
    res = await OnlineStorageService.publishShop(currentUser.shopId, snapshot);
    if (activeProfile.current?.id !== currentUser.id || activeProfile.current.shopId !== currentUser.shopId) return res;
    if(res.success && res.savedDraft && revision===draftSaveRevision.current)setCurrentShopData(res.savedDraft);
    setHasPendingDraft(!!currentUser.isFirebaseUser && !!StorageService.getPendingDraft(currentUser.shopId, currentUser.id));
    if (res.success) {
      setIsPublished(true);
      showToast(
        'success',
        'Xuất bản menu thành công! Khách quét QR sẽ thấy bản vừa xuất bản.'
      );
    } else {
      showToast('error', res.error || 'Không thể xuất bản menu');
    }
    if (res.cacheWarning) showToast('info', `Đã xuất bản cloud, nhưng lưu dự phòng thất bại: ${res.cacheWarning}`);
    return res;
    } finally {
      pendingWrites.current--;
      setIsSyncing(pendingWrites.current > 0);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1E8DC] text-[#241E35]">
      {currentRoute === 'admin' && <AdminPortal />}
      {currentRoute === 'discover' && <MenuDiscovery />}
      {authError && currentRoute !== 'guest' && currentRoute !== 'admin' && currentRoute !== 'discover' && (
        <div role="alert" className="p-4 bg-rose-50 text-rose-900">
          Không khôi phục được phiên quản lý: {authError}
          <button className="ml-3 underline" onClick={() => setAuthAttempt(v => v + 1)}>Thử lại</button>
          <button className="ml-3 underline" onClick={() => { setAuthMode('login'); setAuthModalOpen(true); }}>Đăng nhập lại</button>
        </div>
      )}
      {currentRoute === 'dashboard' && currentUser?.isFirebaseUser && (!isCloudOnline || hasPendingDraft) && (
        <div role="status" className="p-3 bg-amber-50 text-amber-900 text-sm">
          {!isCloudOnline ? 'Thiết bị đang offline. ' : ''}
          {hasPendingDraft ? 'Bản nháp trên thiết bị đang chờ đồng bộ. Menu khách chưa thay đổi.' : 'Chỉnh sửa sẽ được lưu trên thiết bị để đồng bộ sau.'}
          <button disabled={isSyncing || !isCloudOnline} className="ml-3 underline disabled:opacity-50" onClick={() => void syncPending()}>Thử đồng bộ</button>
        </div>
      )}
      {currentRoute === 'dashboard' && currentUser && !currentShopData && (
        <div className="p-8 text-center" role={loadError ? 'alert' : 'status'}>
          {loadError || 'Đang tải quán…'}
          {loadError && <button className="ml-3 underline" onClick={() => setLoadAttempt(v => v + 1)}>Thử lại</button>}
          <button className="ml-3 underline" onClick={handleLogout}>Đăng xuất</button>
        </div>
      )}
      {/* ROUTE 1: GUEST MENU VIEW */}
      {currentRoute === 'guest' && (
        <div className="relative">
          {/* Public menu navigation */}
          <div className="guest-public-nav">
            <button aria-label={currentUser ? "Quay lại trang quản lý" : "Trang chủ QR Menu"}
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

            <a href="#/discover" className="guest-public-discover">Khám phá các quán</a>

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
        <OwnerDashboard key={`${currentUser.id}:${currentUser.shopId}`}
          user={currentUser}
          shopData={currentShopData}
          isPublished={isPublished}
          isSyncing={isSyncing}
          hasPendingDraft={hasPendingDraft}
          onUpdateDraft={handleUpdateDraft}
          onPublish={handlePublish}
          onLogout={handleLogout}
          onOpenGuestUrl={navigateToGuest}
          showToast={showToast}
        />
      )}

      {/* ROUTE 3: LANDING PAGE */}
      {currentRoute === 'home' && (
        <>
        <LandingPage
          onLogin={() => { setAuthMode('login'); setAuthModalOpen(true); }}
          onStartCreate={() => {
            setAuthMode('signup');
            setAuthModalOpen(true);
          }}
        />
        </>
      )}

      {/* Auth Modal (Signup / Login / Reset Password) */}
      <AuthModal
        isOpen={authModalOpen && currentRoute !== 'admin' && currentRoute !== 'discover'}
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
