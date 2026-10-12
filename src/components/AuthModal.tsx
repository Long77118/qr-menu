import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Info,
  ArrowRight,
  ArrowLeft,
  Mail,
  Lock,
  Store,
  User,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { OnlineStorageService } from '../services/onlineStorage';
import { FirebaseAuthService } from '../services/firebase';
import { UserProfile } from '../types/menu';
import { DEMO_USER } from '../data/mockData';

interface AuthModalProps {
  isOpen: boolean;
  mode: 'signup' | 'login';
  onSuccess: (user: UserProfile) => void;
  onClose: () => void;
  onSwitchMode: (mode: 'signup' | 'login') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  mode: initialMode,
  onSuccess,
  onClose,
  onSwitchMode,
}) => {
  const [currentMode, setCurrentMode] = useState<'signup' | 'login' | 'forgot'>(initialMode);
  const [signupStep, setSignupStep] = useState<1 | 2>(1);

  // Form states
  const [shopName, setShopName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [useTemplate, setUseTemplate] = useState(true);

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  if (!isOpen) return null;

  const getFriendlyErrorMessage = (err: any): string => {
    const code = err?.code || '';
    switch (code) {
      case 'auth/popup-closed-by-user':
        return 'Cửa sổ đăng nhập đã được đóng.';
      case 'auth/email-already-in-use':
        return 'Email này đã được đăng ký. Vui lòng chuyển sang màn hình Đăng nhập!';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Email hoặc mật khẩu không chính xác.';
      case 'auth/weak-password':
        return 'Mật khẩu quá ngắn, vui lòng nhập ít nhất 6 ký tự.';
      case 'auth/invalid-email':
        return 'Địa chỉ email không đúng định dạng.';
      case 'auth/network-request-failed':
        return 'Lỗi kết nối mạng. Vui lòng kiểm tra lại đường truyền internet.';
      default:
        return err?.message || 'Có lỗi xảy ra trong quá trình xác thực.';
    }
  };

  // --- GOOGLE SIGN-IN ---
  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessInfo(null);
    try {
      const fbUser = await FirebaseAuthService.signInWithGoogle();
      
      // Check existing shops
      const existingShops = await OnlineStorageService.getUserShops(fbUser.uid);
      let targetShopId: string;

      if (existingShops.length > 0) {
        targetShopId = existingShops[0];
      } else {
        // Create initial shop for new user
        const newShopName = shopName.trim() || `Quán của ${fbUser.displayName || 'tôi'}`;
        const created = await OnlineStorageService.createNewShopOnline(
          {
            name: newShopName,
          },
          true // load template
        );
        targetShopId = created.shopId;
      }

      const userProfile: UserProfile = {
        id: fbUser.uid,
        displayName: fbUser.displayName || 'Chủ quán',
        email: fbUser.email || '',
        shopId: targetShopId,
        isFirebaseUser: true,
        photoUrl: fbUser.photoURL || undefined,
      };

      StorageService.setCurrentUser(userProfile);
      onSuccess(userProfile);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // --- EMAIL SIGN-UP ---
  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) {
      setError('Vui lòng nhập tên quán của bạn');
      return;
    }
    if (!displayName.trim()) {
      setError('Vui lòng nhập tên của bạn');
      return;
    }
    if (!email.trim()) {
      setError('Vui lòng nhập email đăng ký');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu cần tối thiểu 6 ký tự');
      return;
    }
    setError(null);
    setSignupStep(2);
  };

  const handleCompleteEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const fbUser = await FirebaseAuthService.signUpWithEmail(
        email.trim(),
        password,
        displayName.trim()
      );

      // Create shop online
      const created = await OnlineStorageService.createNewShopOnline(
        {
          name: shopName.trim(),
        },
        useTemplate
      );

      const userProfile: UserProfile = {
        id: fbUser.uid,
        displayName: displayName.trim() || fbUser.displayName || 'Chủ quán',
        email: fbUser.email || email.trim(),
        shopId: created.shopId,
        isFirebaseUser: true,
      };

      StorageService.setCurrentUser(userProfile);
      onSuccess(userProfile);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // --- EMAIL SIGN-IN ---
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const fbUser = await FirebaseAuthService.signInWithEmail(email.trim(), password);

      // Check existing shops in Firestore
      const existingShops = await OnlineStorageService.getUserShops(fbUser.uid);
      let targetShopId: string;

      if (existingShops.length > 0) {
        targetShopId = existingShops[0];
      } else {
        // Fallback or find locally
        const local = StorageService.getCurrentUser();
        if (local && local.id === fbUser.uid) {
          targetShopId = local.shopId;
        } else {
          const created = await OnlineStorageService.createNewShopOnline(
            {
              name: `Quán của ${fbUser.displayName || 'tôi'}`,
            },
            true
          );
          targetShopId = created.shopId;
        }
      }

      const userProfile: UserProfile = {
        id: fbUser.uid,
        displayName: fbUser.displayName || displayName.trim() || 'Chủ quán',
        email: fbUser.email || email.trim(),
        shopId: targetShopId,
        isFirebaseUser: true,
      };

      StorageService.setCurrentUser(userProfile);
      onSuccess(userProfile);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // --- PASSWORD RESET ---
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Vui lòng nhập email để nhận liên kết đặt lại mật khẩu');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await FirebaseAuthService.resetPassword(email.trim());
      setSuccessInfo('Đã gửi email hướng dẫn đặt lại mật khẩu! Vui lòng kiểm tra hộp thư đến (và thư rác).');
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // --- DEMO LOGIN FALLBACK ---
  const handleDemoLogin = () => {
    const user = StorageService.loginDemoUser();
    onSuccess(user);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden border border-[#EFE5D9]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#EFE5D9] flex items-center justify-between bg-[#FFF9F3]">
          <div>
            <h2 className="text-sm sm:text-base font-black text-[#241E35]">
              {currentMode === 'signup'
                ? `Đăng ký quán mới (Bước ${signupStep}/2)`
                : currentMode === 'forgot'
                ? 'Quên mật khẩu tài khoản'
                : 'Đăng nhập chủ quán'}
            </h2>
            <p className="text-xs text-[#6E6779] mt-0.5 font-medium">
              {currentMode === 'signup'
                ? signupStep === 1
                  ? 'Tạo tài khoản thật và đồng bộ đám mây'
                  : 'Lựa chọn phương thức bắt đầu thực đơn'
                : currentMode === 'forgot'
                ? 'Nhận email đặt lại mật khẩu an toàn'
                : 'Quản lý thực đơn và đồng bộ online'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-8 h-8 rounded-full text-[#6E6779] hover:text-[#241E35] hover:bg-white flex items-center justify-center transition-colors border border-transparent hover:border-[#EFE5D9]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Notification / Error / Success */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successInfo && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successInfo}</span>
            </div>
          )}

          {/* GOOGLE SIGN IN BUTTON (Fast 1-Click for both login & signup) */}
          {currentMode !== 'forgot' && signupStep === 1 && (
            <div>
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isLoading}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-[#241E35] border-2 border-[#EFE5D9] hover:border-[#241E35]/20 font-black flex items-center justify-center gap-3 transition-all shadow-xs cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#FF5A36]" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>
                  {currentMode === 'signup'
                    ? 'Tạo tài khoản nhanh với Google'
                    : 'Đăng nhập bằng tài khoản Google'}
                </span>
              </button>

              <div className="relative my-3 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#EFE5D9]"></div>
                </div>
                <span className="relative bg-white px-2 text-[11px] font-bold text-[#6E6779] uppercase">
                  hoặc dùng email
                </span>
              </div>
            </div>
          )}

          {/* SIGNUP FORM */}
          {currentMode === 'signup' && (
            signupStep === 1 ? (
              <form onSubmit={handleStep1Next} className="space-y-3">
                <div>
                  <label className="block font-bold text-[#241E35] mb-1">
                    Tên quán ăn / café của bạn <span className="text-[#FF5A36]">*</span>
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-[#6E6779] absolute left-3 top-3" />
                    <input
                      type="text"
                      value={shopName}
                      onChange={(e) => {
                        setShopName(e.target.value);
                        setError(null);
                      }}
                      placeholder="VD: Cơm Tấm Sài Gòn 1985, Tiệm Trà Mùa Thu..."
                      className="w-full min-h-[42px] pl-9.5 pr-3.5 py-2 rounded-xl border border-[#EFE5D9] focus:outline-hidden focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/20 text-sm text-[#241E35] font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#241E35] mb-1">
                    Tên hiển thị của bạn <span className="text-[#FF5A36]">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#6E6779] absolute left-3 top-3" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="VD: Nguyễn Văn Nam (Chủ quán)"
                      className="w-full min-h-[42px] pl-9.5 pr-3.5 py-2 rounded-xl border border-[#EFE5D9] focus:outline-hidden focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/20 text-sm text-[#241E35] font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#241E35] mb-1">
                    Email đăng ký <span className="text-[#FF5A36]">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#6E6779] absolute left-3 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="VD: nam@quan.vn"
                      className="w-full min-h-[42px] pl-9.5 pr-3.5 py-2 rounded-xl border border-[#EFE5D9] focus:outline-hidden focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/20 text-sm text-[#241E35]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#241E35] mb-1">
                    Mật khẩu (tối thiểu 6 ký tự) <span className="text-[#FF5A36]">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#6E6779] absolute left-3 top-3" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full min-h-[42px] pl-9.5 pr-3.5 py-2 rounded-xl border border-[#EFE5D9] focus:outline-hidden focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/20 text-sm text-[#241E35]"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-[#EFE5D9] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentMode('login');
                      onSwitchMode('login');
                      setError(null);
                    }}
                    className="text-[#FF5A36] hover:underline font-bold"
                  >
                    Đã có tài khoản? Đăng nhập
                  </button>
                  <button
                    type="submit"
                    className="min-h-[40px] px-5 py-2 rounded-2xl bg-[#FF5A36] text-white font-black hover:bg-[#E6431F] transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Tiếp tục bước 2</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            ) : (
              /* Step 2: Menu Strategy */
              <form onSubmit={handleCompleteEmailSignup} className="space-y-4">
                <div>
                  <label className="block font-bold text-[#241E35] mb-2">
                    Lựa chọn khởi đầu menu cho {shopName}
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setUseTemplate(true)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        useTemplate
                          ? 'border-[#FF5A36] bg-[#FFF0EB] ring-2 ring-[#FF5A36]'
                          : 'border-[#EFE5D9] hover:bg-[#FFF9F3]'
                      }`}
                    >
                      <div className="font-bold text-xs text-[#241E35] flex items-center gap-1">
                        <span>Nạp menu mẫu</span>
                        <Sparkles className="w-3 h-3 text-[#FF5A36]" />
                      </div>
                      <div className="text-[11px] text-[#6E6779] mt-1 leading-snug">
                        Có sẵn món &amp; giá mẫu để chỉnh sửa nhanh
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setUseTemplate(false)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        !useTemplate
                          ? 'border-[#FF5A36] bg-[#FFF0EB] ring-2 ring-[#FF5A36]'
                          : 'border-[#EFE5D9] hover:bg-[#FFF9F3]'
                      }`}
                    >
                      <div className="font-bold text-xs text-[#241E35]">Bắt đầu menu trống</div>
                      <div className="text-[11px] text-[#6E6779] mt-1 leading-snug">
                        Tự tạo từng nhóm và món từ đầu
                      </div>
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#EFE5D9] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setSignupStep(1)}
                    disabled={isLoading}
                    className="px-3 py-2 text-[#6E6779] hover:text-[#241E35] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Quay lại</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="min-h-[40px] px-5 py-2 rounded-2xl bg-[#FF5A36] text-white font-black hover:bg-[#E6431F] transition-colors shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Hoàn tất &amp; Lưu Online</span>
                  </button>
                </div>
              </form>
            )
          )}

          {/* LOGIN FORM */}
          {currentMode === 'login' && (
            <form onSubmit={handleEmailLogin} className="space-y-3.5">
              <div>
                <label className="block font-bold text-[#241E35] mb-1">
                  Email tài khoản
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#6E6779] absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder="VD: nam@quan.vn"
                    required
                    className="w-full min-h-[42px] pl-9.5 pr-3.5 py-2 rounded-xl border border-[#EFE5D9] focus:outline-hidden focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/20 text-sm text-[#241E35]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-[#241E35]">
                    Mật khẩu
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentMode('forgot');
                      setError(null);
                      setSuccessInfo(null);
                    }}
                    className="text-[11px] text-[#FF5A36] hover:underline font-bold"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#6E6779] absolute left-3 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="••••••••"
                    required
                    className="w-full min-h-[42px] pl-9.5 pr-3.5 py-2 rounded-xl border border-[#EFE5D9] focus:outline-hidden focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/20 text-sm text-[#241E35]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[42px] px-4 py-2 rounded-2xl bg-[#FF5A36] text-white font-black hover:bg-[#E6431F] transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Đăng nhập vào quán</span>
              </button>

              <div className="pt-2 border-t border-[#EFE5D9] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentMode('signup');
                    onSwitchMode('signup');
                    setError(null);
                  }}
                  className="text-[#FF5A36] hover:underline font-bold"
                >
                  Chưa có tài khoản? Đăng ký ngay
                </button>
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  className="text-[#6E6779] hover:text-[#241E35] font-bold hover:underline"
                >
                  Vào thử quán mẫu
                </button>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {currentMode === 'forgot' && (
            <form onSubmit={handlePasswordReset} className="space-y-3.5">
              <div>
                <label className="block font-bold text-[#241E35] mb-1">
                  Nhập email tài khoản của bạn
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#6E6779] absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="VD: nam@quan.vn"
                    required
                    className="w-full min-h-[42px] pl-9.5 pr-3.5 py-2 rounded-xl border border-[#EFE5D9] focus:outline-hidden focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/20 text-sm text-[#241E35]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[42px] px-4 py-2 rounded-2xl bg-[#FF5A36] text-white font-black hover:bg-[#E6431F] transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Gửi liên kết đặt lại mật khẩu</span>
              </button>

              <div className="pt-2 border-t border-[#EFE5D9] text-center">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentMode('login');
                    setError(null);
                    setSuccessInfo(null);
                  }}
                  className="text-[#FF5A36] hover:underline font-bold inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Quay lại đăng nhập</span>
                </button>
              </div>
            </form>
          )}

          {/* Bottom Demo helper notice */}
          <div className="p-3 bg-[#FFF9F3] rounded-2xl border border-[#EFE5D9] text-[#6E6779] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#FF5A36] shrink-0 mt-0.5" />
            <div className="leading-relaxed text-[11px]">
              Tài khoản được bảo vệ bởi <strong>Firebase Authentication &amp; Firestore Security Rules</strong>. Dữ liệu thực đơn được lưu trữ an toàn và đồng bộ tức thời giữa các thiết bị.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
