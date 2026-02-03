
import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { X } from 'lucide-react';

interface AddProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (product: Omit<Product, 'id' | 'productCode'>, id?: string) => void;
    productToEdit: Product | null;
}

const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onSave, productToEdit }) => {
    const [name, setName] = useState('');
    const [salePrice, setSalePrice] = useState(0);
    const [purchasePrice, setPurchasePrice] = useState(0);
    const [vat, setVat] = useState(20);

    const isEditMode = productToEdit !== null;

    useEffect(() => {
        if (isOpen) {
            if (isEditMode) {
                setName(productToEdit.name);
                setSalePrice(productToEdit.salePrice);
                setPurchasePrice(productToEdit.purchasePrice);
                setVat(productToEdit.vat);
            } else {
                setName('');
                setSalePrice(0);
                setPurchasePrice(0);
                setVat(20);
            }
        }
    }, [productToEdit, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || salePrice <= 0) {
            alert('Veuillez renseigner le nom et un prix de vente valide.');
            return;
        }
        
        onSave({ 
            name, 
            description: productToEdit?.description || '',
            productType: productToEdit?.productType || 'Produit',
            unitOfMeasure: productToEdit?.unitOfMeasure || 'Aucune',
            salePrice, 
            purchasePrice, 
            vat,
            stockQuantity: productToEdit?.stockQuantity || 0,
            minStockAlert: productToEdit?.minStockAlert || 5
        }, productToEdit?.id);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" aria-modal="true">
            <div className="relative w-full max-w-lg p-4 bg-white rounded-lg shadow-xl">
                <div className="flex items-center justify-between pb-4 border-b">
                    <h3 className="text-lg font-semibold text-slate-900">{isEditMode ? 'Modifier le produit' : 'Ajouter un nouveau produit'}</h3>
                    <button onClick={onClose} className="p-1 text-slate-400 rounded-full hover:bg-slate-100 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <div>
                        <label htmlFor="productName" className="block text-sm font-medium text-slate-700">Nom du produit</label>
                        <input type="text" id="productName" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="salePrice" className="block text-sm font-medium text-slate-700">Prix de vente (HT)</label>
                            <input type="number" id="salePrice" value={salePrice} onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                        </div>
                         <div>
                            <label htmlFor="purchasePrice" className="block text-sm font-medium text-slate-700">Prix d'achat (HT)</label>
                            <input type="number" id="purchasePrice" value={purchasePrice} onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                        </div>
                    </div>
                     <div>
                        <label htmlFor="vat" className="block text-sm font-medium text-slate-700">TVA (%)</label>
                        <select id="vat" value={vat} onChange={(e) => setVat(parseInt(e.target.value))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                            <option>20</option>
                            <option>14</option>
                            <option>10</option>
                            <option>7</option>
                            <option>0</option>
                        </select>
                    </div>
                    <div className="flex justify-end pt-4 space-x-2 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500">
                            Annuler
                        </button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-slate-800 border border-transparent rounded-md shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-800">
                            {isEditMode ? 'Mettre à jour' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProductModal;
