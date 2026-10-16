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
      <div className="bg-[#FFFCF7] w-full max-w-sm rounded-[28px] shadow-xl overflow-hidden border border-[#E2D8CF]">
        <div className="p-5 text-xs space-y-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                isDanger ? 'bg-rose-100 text-rose-700' : 'bg-[#E0F1E9] text-[#163E37]'
              }`}
            >
              {isDanger ? <AlertTriangle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5 text-[#7054AE]" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#163E37] leading-snug">{title}</h3>
              <p className="text-[#746E79] mt-1.5 leading-relaxed font-medium">{description}</p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E2D8CF]">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-4 py-2 rounded-xl text-[#746E79] hover:bg-[#F4ECDF] font-bold transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`min-h-[40px] px-4 py-2 rounded-2xl font-semibold transition-colors shadow-xs ${
                isDanger ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-[#7054AE] hover:bg-[#624598] text-white'
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
