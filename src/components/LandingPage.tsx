import React from 'react';
import { QrCode, UtensilsCrossed, Smartphone, ArrowRight, CheckCircle2, ChevronRight, Store, Sparkles, Camera, Edit3 } from 'lucide-react';
import { DEMO_SHOP_ID } from '../data/mockData';

interface LandingPageProps {
  onStartCreate: () => void;
  onLoginDemo: () => void;
  onViewSampleMenu: (shopId: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartCreate,
  onLoginDemo,
  onViewSampleMenu,
}) => {
  return (
    <div className="min-h-screen bg-[#FFF9F3] text-[#241E35] flex flex-col selection:bg-[#E5F76A] selection:text-[#241E35]">
      {/* Top Bar */}
      <header className="border-b border-[#EFE5D9] bg-[#FFF9F3]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-[#FF5A36] text-white flex items-center justify-center font-black text-sm shadow-xs">
              QR
            </div>
            <span className="text-lg font-black tracking-tight text-[#241E35]">
              QR Menu
            </span>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden sm:flex items-center gap-6 text-xs font-bold text-[#6E6779]">
            <button
              onClick={() => onViewSampleMenu(DEMO_SHOP_ID)}
              className="hover:text-[#FF5A36] transition-colors"
            >
              Xem menu mẫu poster
            </button>
            <button
              onClick={onLoginDemo}
              className="hover:text-[#FF5A36] transition-colors"
            >
              Đăng nhập demo
            </button>
          </nav>

          {/* Zone 3: Primary CTA */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onLoginDemo}
              className="sm:hidden px-3 py-1.5 rounded-xl border border-[#EFE5D9] text-[#241E35] text-xs font-bold hover:bg-white transition-colors"
            >
              Đăng nhập
            </button>
            <button
              onClick={onStartCreate}
              className="min-h-[40px] px-4 py-2 rounded-2xl bg-[#FF5A36] text-white text-xs font-black hover:bg-[#E6431F] transition-colors shadow-xs active:scale-[0.98]"
            >
              Tạo menu miễn phí
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-16 sm:pt-16 sm:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E5F76A] border border-[#d6ea56] text-[#241E35] text-xs font-bold shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-[#FF5A36]" />
                <span>Trải nghiệm tạo menu poster sống động cho quán ăn &amp; cà phê</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#241E35] tracking-tight leading-tight text-balance">
                Tạo menu điện tử miễn phí cho quán của bạn
              </h1>

              <p className="text-sm sm:text-base text-[#6E6779] leading-relaxed max-w-xl text-balance font-medium">
                Thêm món ăn và đồ uống, cập nhật giá, chỉnh sửa trực tiếp trên menu đang xem và lấy mã QR cho khách quét trên điện thoại. Không cần cài ứng dụng, trực quan như bộ poster tương tác.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={onStartCreate}
                  className="min-h-[46px] px-6 py-3 rounded-2xl bg-[#FF5A36] text-white text-sm font-black hover:bg-[#E6431F] transition-colors shadow-sm inline-flex items-center gap-2 active:scale-[0.98]"
                >
                  <span>Tạo menu miễn phí</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={onLoginDemo}
                  className="min-h-[46px] px-5 py-3 rounded-2xl bg-white border border-[#EFE5D9] text-[#241E35] text-sm font-bold hover:bg-[#FFF9F3] transition-colors shadow-2xs"
                >
                  Đăng nhập demo
                </button>

                <button
                  onClick={() => onViewSampleMenu(DEMO_SHOP_ID)}
                  className="min-h-[46px] px-4 py-3 rounded-2xl text-[#6E6779] hover:text-[#241E35] text-sm font-bold hover:bg-[#E5F76A]/40 transition-colors inline-flex items-center gap-1"
                >
                  <span>Xem menu mẫu</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Scope note */}
              <div className="pt-2 text-xs text-[#6E6779] flex items-start gap-2 bg-white p-4 rounded-[22px] border border-[#EFE5D9] shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-[#FF5A36] shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  <strong>Lưu trữ tại trình duyệt này (LocalStorage):</strong> Bạn có thể tạo quán, chỉnh sửa trực tiếp trên menu và quét mã QR ngay để trải nghiệm đầy đủ quy trình thực tế.
                </span>
              </div>
            </div>

            {/* Right Column: Phone Mockup Illustration with Poster Card */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-[320px]">
                {/* Phone Frame */}
                <div className="relative rounded-[44px] border-[5px] border-[#241E35] bg-[#241E35] p-2.5 shadow-2xl">
                  {/* Speaker & notch */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-[#241E35] rounded-full z-20 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-black mr-2" />
                    <div className="w-5 h-1 rounded-full bg-stone-700" />
                  </div>

                  {/* Phone Screen Mock */}
                  <div className="rounded-[34px] overflow-hidden bg-[#FFF9F3] text-[#241E35] text-xs border border-[#EFE5D9] relative">
                    {/* Simulated Cafe Cover */}
                    <div className="h-28 bg-[#FF5A36] p-3 flex flex-col justify-end text-white relative overflow-hidden">
                      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-[#E5F76A] opacity-75" />
                      <div className="absolute -bottom-4 right-10 w-16 h-16 rounded-full bg-[#7447E8] opacity-60" />
                      <div className="relative z-10">
                        <div className="font-black text-sm">Bếp &amp; Cà phê Mộc</div>
                        <div className="text-[10px] font-semibold text-white/90">Hương vị mộc mạc — Đậm đà</div>
                      </div>
                    </div>

                    {/* Simulated Category Pill Tabs */}
                    <div className="p-2 border-b border-[#EFE5D9] bg-white flex gap-1.5 overflow-x-hidden text-[10px]">
                      <span className="px-2.5 py-1 rounded-full bg-[#FF5A36] text-white font-black shadow-2xs">Món ăn</span>
                      <span className="px-2.5 py-1 rounded-full bg-[#FFF9F3] text-[#6E6779] border border-[#EFE5D9] font-bold">Cà phê</span>
                      <span className="px-2.5 py-1 rounded-full bg-[#FFF9F3] text-[#6E6779] border border-[#EFE5D9] font-bold">Trà &amp; nước</span>
                    </div>

                    {/* Simulated Poster Dishes */}
                    <div className="p-2.5 space-y-2.5">
                      <div className="relative rounded-[20px] overflow-hidden bg-[#241E35] h-24 text-white p-2.5 flex flex-col justify-between shadow-xs">
                        <div className="absolute top-0 right-0 bg-[#E5F76A] text-[#241E35] font-black text-[11px] px-2.5 py-0.5 rounded-bl-xl rounded-tr-lg">
                          Từ 45.000đ
                        </div>
                        <div />
                        <div>
                          <div className="font-black text-xs">Cơm gà xé Hội An</div>
                          <div className="text-[9px] text-[#FFF9F3]/80">Cơm vàng dẻo nghệ tươi...</div>
                        </div>
                      </div>

                      <div className="relative rounded-[20px] overflow-hidden bg-gradient-to-br from-[#FFF0EB] to-[#FFE5DC] h-20 p-2.5 flex flex-col justify-between border border-[#EFE5D9]">
                        <div className="absolute top-0 right-0 bg-[#E5F76A] text-[#241E35] font-black text-[10px] px-2 py-0.5 rounded-bl-xl">
                          Từ 28.000đ
                        </div>
                        <div />
                        <div>
                          <div className="font-black text-xs text-[#241E35]">Cà phê sữa rang mộc</div>
                          <div className="text-[9px] text-[#6E6779]">Pha phin Robusta Cư M&apos;gar</div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom CTA to click into sample */}
                    <div className="p-2.5 bg-[#FFF9F3] text-center border-t border-[#EFE5D9]">
                      <button
                        onClick={() => onViewSampleMenu(DEMO_SHOP_ID)}
                        className="w-full py-2 rounded-xl bg-[#FF5A36] text-white text-[11px] font-black hover:bg-[#E6431F] shadow-xs"
                      >
                        Chạm để mở menu mẫu này
                      </button>
                    </div>
                  </div>
                </div>

                {/* Floating QR Tag badge */}
                <div className="absolute -bottom-4 -left-6 bg-white p-3.5 rounded-[22px] shadow-xl border border-[#EFE5D9] flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#E5F76A] text-[#241E35] flex items-center justify-center font-bold">
                    <QrCode className="w-5 h-5 text-[#FF5A36]" />
                  </div>
                  <div className="text-left pr-1">
                    <div className="text-xs font-black text-[#241E35]">Mã QR cố định</div>
                    <div className="text-[10px] text-[#6E6779]">In dán bàn tiện lợi</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Step Guide Section */}
        <section className="bg-white border-y border-[#EFE5D9] py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-xl mx-auto mb-12">
              <h2 className="text-2xl font-black text-[#241E35]">Quy trình 3 bước đơn giản</h2>
              <p className="text-xs sm:text-sm text-[#6E6779] mt-2 font-medium">
                Thiết kế tinh gọn giúp chủ quán tạo menu trong vài phút mà không cần kỹ năng công nghệ
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="p-6 rounded-[28px] bg-[#FFF9F3] border border-[#EFE5D9] relative space-y-3 shadow-xs">
                <div className="w-10 h-10 rounded-2xl bg-[#FF5A36] text-white flex items-center justify-center font-black text-sm shadow-xs">
                  1
                </div>
                <div className="flex items-center gap-2 font-black text-[#241E35] text-sm">
                  <Store className="w-4 h-4 text-[#FF5A36]" />
                  <span>Tạo quán của bạn</span>
                </div>
                <p className="text-xs text-[#6E6779] leading-relaxed">
                  Nhập tên quán ăn hoặc quán cà phê của bạn. Thêm logo, ảnh bìa và chọn màu sắc nhận diện tùy chỉnh theo phong cách riêng.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-6 rounded-[28px] bg-[#FFF9F3] border border-[#EFE5D9] relative space-y-3 shadow-xs">
                <div className="w-10 h-10 rounded-2xl bg-[#FF5A36] text-white flex items-center justify-center font-black text-sm shadow-xs">
                  2
                </div>
                <div className="flex items-center gap-2 font-black text-[#241E35] text-sm">
                  <UtensilsCrossed className="w-4 h-4 text-[#FF5A36]" />
                  <span>Chỉnh trực tiếp trên menu</span>
                </div>
                <p className="text-xs text-[#6E6779] leading-relaxed">
                  Bấm trực tiếp vào tên, giá, ảnh để sửa ngay tại chỗ. Hỗ trợ giá đơn hoặc nhiều kích cỡ (Size M, Size L), đổi trạng thái còn/hết tức thì.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-6 rounded-[28px] bg-[#FFF9F3] border border-[#EFE5D9] relative space-y-3 shadow-xs">
                <div className="w-10 h-10 rounded-2xl bg-[#FF5A36] text-white flex items-center justify-center font-black text-sm shadow-xs">
                  3
                </div>
                <div className="flex items-center gap-2 font-black text-[#241E35] text-sm">
                  <Smartphone className="w-4 h-4 text-[#FF5A36]" />
                  <span>Xuất bản &amp; Tải mã QR</span>
                </div>
                <p className="text-xs text-[#6E6779] leading-relaxed">
                  Xuất bản menu và tải ảnh mã QR đen trắng chuẩn nét để in dán tại bàn. Khách chỉ cần mở camera quét là xem được ngay trên điện thoại.
                </p>
              </div>
            </div>

            {/* Bottom Callout button */}
            <div className="mt-12 text-center">
              <button
                onClick={onStartCreate}
                className="min-h-[46px] px-7 py-3 rounded-2xl bg-[#FF5A36] text-white text-sm font-black hover:bg-[#E6431F] transition-colors shadow-sm inline-flex items-center gap-2"
              >
                <span>Bắt đầu trải nghiệm ngay</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#EFE5D9] bg-[#FFF9F3] py-8 text-xs text-[#6E6779]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-black text-[#241E35]">QR Menu</span> — Trải nghiệm tạo thực đơn poster điện tử cho quán
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onLoginDemo}
              className="hover:text-[#FF5A36] transition-colors font-bold"
            >
              Hồ sơ quán mẫu
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => onViewSampleMenu(DEMO_SHOP_ID)}
              className="hover:text-[#FF5A36] transition-colors font-bold"
            >
              Menu khách
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
