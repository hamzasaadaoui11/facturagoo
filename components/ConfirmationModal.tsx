
import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void> | void;
    title?: string;
    message?: string;
    isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message, isLoading: externalLoading }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [internalLoading, setInternalLoading] = useState(false);
    const { t, language } = useLanguage();

    const isLoading = externalLoading || internalLoading;

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setIsVisible(true), 10);
            setInternalLoading(false);
        } else {
            setIsVisible(false);
        }
    }, [isOpen]);

    const handleClose = () => {
        if (isLoading) return;
        setIsVisible(false);
        setTimeout(onClose, 200);
    };

    const handleConfirm = async () => {
        if (isLoading) return;
        
        try {
            setInternalLoading(true);
            const result = onConfirm();
            if (result instanceof Promise) {
                await result;
            }
            handleClose();
        } catch (error) {
            console.error("Confirmation action failed:", error);
            setInternalLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`} aria-modal="true">
            <div className="absolute inset-0 bg-neutral-900/75 backdrop-blur-sm" onClick={handleClose}></div>
            <div className={`relative w-full max-w-md p-6 bg-white rounded-lg shadow-xl transition-all duration-200 ease-in-out ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`} role="dialog" aria-labelledby="modal-title">
                <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <AlertTriangle className={`h-6 w-6 text-red-600 ${isLoading ? 'animate-pulse' : ''}`} aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                        <h3 className="text-lg font-semibold leading-6 text-neutral-900" id="modal-title">
                            {title || t('confirmDelete')}
                        </h3>
                        <div className="mt-2">
                            <p className="text-sm text-neutral-500">
                                {message || t('confirmDeleteMessage')}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="inline-flex w-full justify-center rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:bg-red-400 disabled:cursor-not-allowed sm:w-auto transition-all duration-200 ease-in-out flex items-center gap-2"
                    >
                        {isLoading && (
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        {isLoading ? (language === 'ar' ? 'جاري...' : 'Chargement...') : t('confirm')}
                    </button>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isLoading}
                        className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:w-auto transition-all duration-200 ease-in-out"
                    >
                        {t('cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
