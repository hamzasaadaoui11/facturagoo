
import React, { useEffect, useState } from 'react';
import { X, FileText, Calculator } from 'lucide-react';

interface DeliveryNoteOptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (showPrices: boolean) => void;
}

const DeliveryNoteOptionModal: React.FC<DeliveryNoteOptionModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [isVisible, setIsVisible] = useState(false);

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

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`} aria-modal="true">
            <div className="absolute inset-0 bg-neutral-900/75 backdrop-blur-sm" onClick={handleClose}></div>
            <div className={`relative w-full max-w-sm p-6 bg-white rounded-lg shadow-xl transition-all duration-200 ease-in-out transform ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                <div className="flex justify-between items-center mb-5">
                    <h3 className="text-lg font-bold text-gray-900">Format du document</h3>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <p className="text-sm text-gray-500 mb-6">
                    Choisissez le type de Bon de Livraison à générer :
                </p>
                
                <div className="space-y-3">
                    <button 
                        onClick={() => onConfirm(false)}
                        className="w-full flex items-center p-4 border border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50/50 hover:shadow-md transition-all group bg-white"
                    >
                        <div className="p-3 bg-gray-100 text-gray-600 rounded-lg group-hover:bg-emerald-100 group-hover:text-emerald-600 mr-4 transition-colors">
                            <FileText size={24} />
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-gray-900 group-hover:text-emerald-700">Bon sans prix</div>
                            <div className="text-xs text-gray-500 mt-0.5">Quantités et désignations uniquement</div>
                        </div>
                    </button>

                    <button 
                        onClick={() => onConfirm(true)}
                        className="w-full flex items-center p-4 border border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50/50 hover:shadow-md transition-all group bg-white"
                    >
                        <div className="p-3 bg-gray-100 text-gray-600 rounded-lg group-hover:bg-emerald-100 group-hover:text-emerald-600 mr-4 transition-colors">
                            <Calculator size={24} />
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-gray-900 group-hover:text-emerald-700">Bon valorisé</div>
                            <div className="text-xs text-gray-500 mt-0.5">Inclut les prix unitaires et totaux</div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeliveryNoteOptionModal;
