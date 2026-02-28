
import React, { useState, useEffect } from 'react';
import { Quote, QuoteStatus } from '../types';
import { X } from 'lucide-react';

interface ChangeStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newStatus: QuoteStatus) => void;
    quote: Quote | null;
}

const ChangeStatusModal: React.FC<ChangeStatusModalProps> = ({ isOpen, onClose, onSave, quote }) => {
    const [newStatus, setNewStatus] = useState<QuoteStatus>(QuoteStatus.Draft);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (quote) {
            setNewStatus(quote.status);
        }
    }, [quote]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setIsVisible(true), 10);
        } else {
            setIsVisible(false);
        }
    }, [isOpen]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 200);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(newStatus);
        handleClose();
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`} aria-modal="true">
             <div className="absolute inset-0 bg-neutral-900/75 backdrop-blur-sm" onClick={handleClose}></div>
            <div className={`relative w-full max-w-md p-6 bg-white rounded-lg shadow-xl transition-all duration-200 ease-in-out ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                <div className="flex items-start justify-between pb-4 border-b border-neutral-200">
                    <div>
                        <h3 className="text-lg font-semibold leading-6 text-neutral-900">Changer le statut</h3>
                        <p className="mt-1 text-sm text-neutral-500">Modifier le statut du devis #{quote?.id}.</p>
                    </div>
                    <button onClick={handleClose} className="p-1 -mt-1 -mr-1 text-neutral-400 rounded-full hover:bg-neutral-100 hover:text-neutral-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="mt-6">
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-neutral-700">Nouveau statut</label>
                        <select
                            id="status"
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value as QuoteStatus)}
                            className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                        >
                            {Object.values(QuoteStatus).map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end pt-6 mt-6 space-x-3 border-t border-neutral-200">
                        <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-semibold text-neutral-900 bg-white border border-neutral-300 rounded-lg shadow-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-200 ease-in-out">
                            Annuler
                        </button>
                        <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 border border-transparent rounded-lg shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 transition-all duration-200 ease-in-out">
                            Enregistrer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChangeStatusModal;
