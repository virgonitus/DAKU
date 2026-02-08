import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle, Info, HelpCircle } from 'lucide-react';

export type ModalType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

interface ModalProps {
    isOpen: boolean;
    type?: ModalType;
    title: string;
    message: React.ReactNode;
    onClose: () => void;
    onConfirm?: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
}

const Modal: React.FC<ModalProps> = ({
    isOpen,
    type = 'info',
    title,
    message,
    onClose,
    onConfirm,
    confirmLabel = 'OK',
    cancelLabel = 'Batal'
}) => {
    const [show, setShow] = useState(false);
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        if (isOpen) {
            setShow(true);
            // Small delay to allow render before animation
            timeoutId = setTimeout(() => setAnimate(true), 10);
        } else {
            setAnimate(false);
            // Wait for animation to finish before removing from DOM
            timeoutId = setTimeout(() => setShow(false), 300);
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [isOpen]);

    // Handle Enter Key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent default form submission or other effects
                if (type === 'confirm' && onConfirm) {
                    onConfirm();
                    onClose();
                } else {
                    onClose();
                }
            }
            // Optional: Handle Escape to close
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, type, onConfirm, onClose]);

    if (!show) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle className="w-12 h-12 text-green-500" />;
            case 'error': return <X className="w-12 h-12 text-red-500" />;
            case 'warning': return <AlertTriangle className="w-12 h-12 text-amber-500" />;
            case 'confirm': return <HelpCircle className="w-12 h-12 text-blue-500" />;
            default: return <Info className="w-12 h-12 text-blue-400" />;
        }
    };

    const getHeaderColor = () => {
        switch (type) {
            case 'success': return 'bg-green-50';
            case 'error': return 'bg-red-50';
            case 'warning': return 'bg-amber-50';
            case 'confirm': return 'bg-blue-50';
            default: return 'bg-blue-50';
        }
    };

    return (
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center px-4 transition-all duration-300 ${animate ? 'backdrop-blur-sm bg-black/40' : 'backdrop-blur-none bg-black/0'}`}>
            <div
                className={`bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all duration-300 ${animate ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`}
            >
                <div className={`p-6 flex flex-col items-center text-center ${getHeaderColor()}`}>
                    <div className="bg-white p-3 rounded-full shadow-sm mb-4">
                        {getIcon()}
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                </div>

                <div className="p-6">
                    <p className="text-gray-600 text-center mb-6 text-sm leading-relaxed">{message}</p>

                    <div className="flex gap-3">
                        {type === 'confirm' ? (
                            <>
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-2.5 px-4 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                                >
                                    {cancelLabel}
                                </button>
                                <button
                                    onClick={() => { onConfirm?.(); onClose(); }}
                                    className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors"
                                >
                                    {confirmLabel}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={onClose}
                                className="w-full py-2.5 px-4 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black shadow-lg transition-colors"
                            >
                                Tutup
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Modal;
