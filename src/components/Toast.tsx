import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = toast.duration || 5000;
    const startTime = Date.now();
    
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
    }, 50);

    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, duration);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [toast.id, toast.duration, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  };

  const styles = {
    success: {
      bg: 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/90 dark:to-emerald-900/90',
      border: 'border-l-4 border-l-green-500 dark:border-l-green-400',
      icon: 'text-green-600 dark:text-green-300',
      title: 'text-green-900 dark:text-green-50',
      message: 'text-green-700 dark:text-green-200',
      progress: 'bg-green-500 dark:bg-green-400',
    },
    error: {
      bg: 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/90 dark:to-rose-900/90',
      border: 'border-l-4 border-l-red-500 dark:border-l-red-400',
      icon: 'text-red-600 dark:text-red-300',
      title: 'text-red-900 dark:text-red-50',
      message: 'text-red-700 dark:text-red-200',
      progress: 'bg-red-500 dark:bg-red-400',
    },
    warning: {
      bg: 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/90 dark:to-yellow-900/90',
      border: 'border-l-4 border-l-amber-500 dark:border-l-amber-400',
      icon: 'text-amber-600 dark:text-amber-300',
      title: 'text-amber-900 dark:text-amber-50',
      message: 'text-amber-700 dark:text-amber-200',
      progress: 'bg-amber-500 dark:bg-amber-400',
    },
    info: {
      bg: 'bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-900/90 dark:to-sky-900/90',
      border: 'border-l-4 border-l-blue-500 dark:border-l-blue-400',
      icon: 'text-blue-600 dark:text-blue-300',
      title: 'text-blue-900 dark:text-blue-50',
      message: 'text-blue-700 dark:text-blue-200',
      progress: 'bg-blue-500 dark:bg-blue-400',
    },
  };

  const currentStyle = styles[toast.type];

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl shadow-2xl backdrop-blur-sm
        transform transition-all duration-300 ease-out
        ${currentStyle.bg} ${currentStyle.border}
        ${isExiting ? 'opacity-0 translate-x-full scale-95' : 'opacity-100 translate-x-0 scale-100'}
        hover:shadow-2xl hover:scale-[1.02]
      `}
    >
      <div className="flex items-start gap-4 p-4 pr-12">
        <div className={`flex-shrink-0 mt-0.5 ${currentStyle.icon}`}>
          {icons[toast.type]}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${currentStyle.title}`}>
            {toast.title}
          </p>
          {toast.message && (
            <p className={`mt-1 text-sm leading-relaxed ${currentStyle.message}`}>
              {toast.message}
            </p>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className={`
            absolute top-3 right-3 p-1.5 rounded-lg
            text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
            hover:bg-black/5 dark:hover:bg-white/10
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600
          `}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/5">
        <div
          className={`h-full ${currentStyle.progress} transition-all duration-100 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto animate-slide-in">
          <ToastItem toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
};
