import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Copy,
  Check,
  Download,
  ExternalLink,
  Info,
  AlertTriangle,
  QrCode,
  Printer,
  Smartphone,
  Share2,
  FileCheck,
  Sparkles,
} from 'lucide-react';
import { ShopSettings } from '../types/menu';

interface QRViewProps {
  shop: ShopSettings;
  onOpenGuestView: (shopId: string) => void;
}

export const QRView: React.FC<QRViewProps> = ({ shop, onOpenGuestView }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrGenerated, setQrGenerated] = useState(false);

  // Construct absolute guest URL
  const baseUrl = window.location.origin + window.location.pathname;
  const guestMenuUrl = `${baseUrl.replace(/\/$/, '')}#/menu/${shop.id}`;

  const isLocalOrDev =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('.run.app') ||
    window.location.hostname.includes('webcontainer') ||
    window.location.hostname.includes('preview');

  useEffect(() => {
    if (!canvasRef.current) return;

    QRCode.toCanvas(
      canvasRef.current,
      guestMenuUrl,
      {
        width: 300,
        margin: 3, // Ample white quiet zone margin for 100% camera readability
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      },
      (error) => {
        if (error) {
          console.error('QR code generation failed:', error);
          setQrGenerated(false);
        } else {
          setQrGenerated(true);
        }
      }
    );
  }, [guestMenuUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(guestMenuUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = guestMenuUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadPNG = () => {
    if (!canvasRef.current) return;
    try {
      const srcCanvas = canvasRef.current;
      const downloadCanvas = document.createElement('canvas');
      const padding = 40;
      const textHeight = 84;
      downloadCanvas.width = srcCanvas.width + padding * 2;
      downloadCanvas.height = srcCanvas.height + padding * 2 + textHeight;

      const ctx = downloadCanvas.getContext('2d');
      if (!ctx) return;

      // Clean white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);

      // Draw subtle border card for table standee printout
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#EFE5D9';
      ctx.strokeRect(10, 10, downloadCanvas.width - 20, downloadCanvas.height - 20);

      // Draw QR in center
      ctx.drawImage(srcCanvas, padding, padding);

      // Shop Name and instructions
      ctx.fillStyle = '#241E35';
      ctx.font = 'bold 22px "Be Vietnam Pro", -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(shop.name, downloadCanvas.width / 2, srcCanvas.height + padding + 32);

      ctx.fillStyle = '#FF5A36';
      ctx.font = 'bold 13px "Be Vietnam Pro", -apple-system, sans-serif';
      ctx.fillText('QUÉT MÃ XEM THỰC ĐƠN ĐIỆN TỬ', downloadCanvas.width / 2, srcCanvas.height + padding + 56);

      ctx.fillStyle = '#6E6779';
      ctx.font = '11px "Be Vietnam Pro", -apple-system, sans-serif';
      ctx.fillText('Không cần tải ứng dụng · Cập nhật món mới nhất', downloadCanvas.width / 2, srcCanvas.height + padding + 74);

      const link = document.createElement('a');
      link.download = `QR-Menu-${shop.id}.png`;
      link.href = downloadCanvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to download QR code PNG', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. Page Header */}
      <div className="bg-white rounded-[28px] p-6 border border-[#EFE5D9] shadow-xs">
        <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#FF5A36] mb-1">
          <QrCode className="w-4 h-4" />
          <span>Mã QR &amp; Đường dẫn chia sẻ</span>
        </div>
        <h2 className="text-lg sm:text-xl font-black text-[#241E35]">
          Mã QR xem thực đơn chính thức của quán
        </h2>
        <p className="text-xs sm:text-sm text-[#6E6779] mt-1 leading-relaxed font-medium">
          Mã QR được liên kết vĩnh viễn với mã quán{' '}
          <code className="bg-[#FFF9F3] px-2 py-0.5 rounded-lg font-mono font-bold text-[#FF5A36] border border-[#EFE5D9]">
            {shop.id}
          </code>
          . Bạn có thể in tem để bàn ngay hôm nay; khi thay đổi món hay giá và bấm <em>Xuất bản</em>, mã QR này vẫn hoạt động bình thường mà không cần in lại.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* 2. QR Preview Card with Standee frame */}
        <div className="bg-white rounded-[28px] p-6 border border-[#EFE5D9] shadow-xs flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#241E35] mb-2 bg-[#E5F76A] px-3.5 py-1 rounded-full shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#FF5A36]" />
            <span>Bản in tiêu chuẩn để bàn</span>
          </div>
          <div className="font-black text-[#241E35] text-xl mb-4 truncate max-w-full">
            {shop.name}
          </div>

          {/* Standee-like container */}
          <div className="p-4 sm:p-5 bg-white border-2 border-[#EFE5D9] rounded-[24px] shadow-sm flex flex-col items-center justify-center">
            <canvas ref={canvasRef} className="max-w-full h-auto rounded" />
            <div className="mt-3 text-xs font-black text-[#FF5A36] tracking-wide">
              QUÉT MÃ XEM MENU
            </div>
            <div className="text-[10px] text-[#6E6779] font-mono mt-0.5">
              ID: {shop.id}
            </div>
          </div>

          <p className="text-xs text-[#6E6779] mt-3 font-medium">
            Mã đen trên nền trắng có lề tĩnh an toàn (Quiet Zone) đạt chuẩn quét của mọi loại camera điện thoại.
          </p>

          {/* Explicit Quick Actions */}
          <div className="w-full mt-6 space-y-2.5">
            <button
              onClick={handleDownloadPNG}
              disabled={!qrGenerated}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#FF5A36] text-white text-xs font-black hover:bg-[#E6431F] transition-all shadow-xs active:scale-[0.98] cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Tải ảnh QR (PNG chuẩn in để bàn)</span>
            </button>

            <button
              onClick={() => onOpenGuestView(shop.id)}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#FFF9F3] border border-[#EFE5D9] text-[#241E35] text-xs font-bold hover:bg-[#E5F76A]/40 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-[#FF5A36]" />
              <span>Mở xem thử menu khách</span>
            </button>
          </div>
        </div>

        {/* 3. Link Details & Practical Printing Guides */}
        <div className="space-y-4">
          {/* Guest Link Details */}
          <div className="bg-white rounded-[28px] p-6 border border-[#EFE5D9] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#241E35] flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-[#FF5A36]" />
                <span>Đường dẫn truy cập menu khách</span>
              </h3>
            </div>

            <p className="text-xs text-[#6E6779] font-medium">
              Bạn có thể dán đường dẫn này lên Zalo, Fanpage Facebook, Google Maps hoặc gửi trực tiếp cho khách qua tin nhắn:
            </p>

            <div className="p-3.5 bg-[#FFF9F3] rounded-2xl border border-[#EFE5D9] text-xs font-mono text-[#241E35] break-all select-all font-semibold">
              {guestMenuUrl}
            </div>

            <button
              onClick={handleCopy}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-[#EFE5D9] bg-white text-[#241E35] text-xs font-bold hover:bg-[#FFF9F3] transition-colors shadow-xs cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Đã sao chép đường dẫn!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#6E6779]" />
                  <span>Sao chép đường dẫn menu</span>
                </>
              )}
            </button>
          </div>

          {/* 4. Practical Printing & Deployment Guide */}
          <div className="bg-[#FFF9F3] border border-[#EFE5D9] rounded-[28px] p-5.5 text-xs text-[#6E6779] leading-relaxed space-y-3">
            <div className="flex items-center gap-2 font-black text-[#241E35] text-sm">
              <Printer className="w-4 h-4 text-[#FF5A36] shrink-0" />
              <span>Hướng dẫn in ấn &amp; đặt tại quán</span>
            </div>

            <ul className="space-y-2 font-medium">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A36] mt-1.5 shrink-0" />
                <span>
                  <strong>Kích thước tem bàn:</strong> Khuyên dùng kích thước tối thiểu từ <strong>6x6 cm đến 8x8 cm</strong> để camera điện thoại lấy nét nhanh trong điều kiện ánh sáng quán cà phê hoặc nhà hàng.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7447E8] mt-1.5 shrink-0" />
                <span>
                  <strong>Chất liệu khuyên dùng:</strong> Decal nhựa chống nước (cán mờ hoặc bóng) hoặc mica để bàn chữ T/chữ L.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                <span>
                  <strong>Không cần in lại tem:</strong> Khi quán đổi giá, thêm món mới hay đổi ảnh nền, chỉ cần bấm nút <em>"Xuất bản ngay"</em> trên trang quản lý. Khách quét mã cũ vẫn xem ngay thực đơn mới.
                </span>
              </li>
            </ul>
          </div>

          {/* Online Cloud Sync Notice */}
          <div className="bg-white rounded-2xl p-4 border border-[#EFE5D9] text-xs text-[#6E6779] space-y-1.5 font-medium">
            <div className="flex items-center gap-2 text-[#241E35] font-bold">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>Đồng bộ thực đơn đám mây (Online Cloud)</span>
            </div>
            <p>
              Hệ thống đã kết nối cơ sở dữ liệu Firebase Firestore. Thực đơn xuất bản được lưu trữ trực tuyến để mọi khách hàng quét mã từ điện thoại cá nhân (4G/Wi-Fi bất kỳ) đều truy cập mượt mà.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
