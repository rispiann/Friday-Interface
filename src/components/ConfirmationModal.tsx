import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }: ConfirmationModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop (latar belakang gelap) */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

          {/* Konten Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative z-10 w-full max-w-md p-6 bg-card/80 border border-glass-border rounded-2xl shadow-2xl shadow-black/50"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-yellow-500/10 border-2 border-yellow-500/30 mb-4">
                <AlertTriangle className="w-8 h-8 text-yellow-300" />
              </div>

              <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
              <p className="text-sm text-muted-foreground mb-8">
                {message}
              </p>

              <div className="flex w-full gap-4">
                {/* Tombol Batal */}
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-muted/30 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  Batal
                </button>
                {/* Tombol Konfirmasi (Hapus) */}
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600/80 border border-red-500/50 rounded-lg hover:bg-red-600 transition-colors shadow-lg shadow-red-600/20"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
