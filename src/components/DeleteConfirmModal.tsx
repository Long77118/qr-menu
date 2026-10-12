import React from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Xác nhận xóa',
  cancelLabel = 'Hủy bỏ',
  isDanger = true,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-sm rounded-[28px] shadow-xl overflow-hidden border border-[#EFE5D9]">
        <div className="p-5 text-xs space-y-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                isDanger ? 'bg-rose-100 text-rose-700' : 'bg-[#E5F76A] text-[#241E35]'
              }`}
            >
              {isDanger ? <AlertTriangle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5 text-[#FF5A36]" />}
            </div>
            <div>
              <h3 className="text-sm font-black text-[#241E35] leading-snug">{title}</h3>
              <p className="text-[#6E6779] mt-1.5 leading-relaxed font-medium">{description}</p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EFE5D9]">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-4 py-2 rounded-xl text-[#6E6779] hover:bg-[#FFF9F3] font-bold transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`min-h-[40px] px-4 py-2 rounded-2xl font-black transition-colors shadow-xs ${
                isDanger ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-[#FF5A36] hover:bg-[#E6431F] text-white'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
