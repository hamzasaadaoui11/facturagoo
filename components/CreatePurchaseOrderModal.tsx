
import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, ScanLine, FileText } from 'lucide-react';
import { Supplier, Product, PurchaseOrder, LineItem, PurchaseOrderStatus } from '../types';

interface CreatePurchaseOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (order: Omit<PurchaseOrder, 'id'>, id?: string) => void;
    suppliers: Supplier[];
    products: Product[];
    orderToEdit?: PurchaseOrder | null;
}

const CreatePurchaseOrderModal: React.FC<CreatePurchaseOrderModalProps> = ({ isOpen, onClose, onSave, suppliers, products, orderToEdit }) => {
    const [isVisible, setIsVisible] = useState(false);
    
    // Form State
    const [supplierId, setSupplierId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [expectedDate, setExpectedDate] = useState('');
    const [notes, setNotes] = useState('');
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    
    // Item Addition State
    const [selectedProductId, setSelectedProductId] = useState('');
    const [itemQuantity, setItemQuantity] = useState(1);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setIsVisible(true), 10);
            
            if (orderToEdit) {
                // Edit Mode
                setSupplierId(orderToEdit.supplierId);
                setDate(orderToEdit.date);
                setExpectedDate(orderToEdit.expectedDate || '');
                setNotes(orderToEdit.notes || '');
                setLineItems(orderToEdit.lineItems);
            } else {
                // Create Mode
                setSupplierId('');
                setDate(new Date().toISOString().split('T')[0]);
                // Default expected: 7 days from now
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                setExpectedDate(nextWeek.toISOString().split('T')[0]);
                setNotes('');
                setLineItems([]);
                setSelectedProductId('');
                setItemQuantity(1);
            }
        } else {
            setIsVisible(false);
        }
    }, [isOpen, orderToEdit]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 200);
    };

    const handleAddItem = () => {
        if (!selectedProductId) return;
        const product = products.find(p => p.id === selectedProductId);
        if (!product) return;

        const newItem: LineItem = {
            id: `temp-${Date.now()}`,
            productId: product.id,
            name: product.name,
            description: product.description || '',
            quantity: itemQuantity,
            unitPrice: product.purchasePrice, // Use Purchase Price for Orders
            vat: product.vat
        };

        setLineItems(prev => [...prev, newItem]);
        setSelectedProductId('');
        setItemQuantity(1);
    };

    const handleRemoveItem = (id: string) => {
        setLineItems(prev => prev.filter(item => item.id !== id));
    };

    const totals = useMemo(() => {
        const subTotal = lineItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
        const vatAmount = lineItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity * (item.vat / 100)), 0);
        const totalAmount = subTotal + vatAmount;
        return { subTotal, vatAmount, totalAmount };
    }, [lineItems]);

    const handleSave = () => {
        if (!supplierId) {
            alert('Veuillez sélectionner un fournisseur.');
            return;
        }
        if (lineItems.length === 0) {
            alert('Veuillez ajouter au moins un article.');
            return;
        }

        const supplier = suppliers.find(s => s.id === supplierId);
        
        onSave({
            supplierId,
            supplierName: supplier?.name || 'Fournisseur inconnu',
            date,
            expectedDate,
            notes,
            lineItems,
            status: orderToEdit ? orderToEdit.status : PurchaseOrderStatus.Draft,
            subTotal: totals.subTotal,
            vatAmount: totals.vatAmount,
            totalAmount: totals.totalAmount,
        }, orderToEdit?.id);
        handleClose();
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`} aria-modal="true">
            <div className="absolute inset-0 bg-neutral-900/75 backdrop-blur-sm" onClick={handleClose}></div>
            
            <div className={`relative w-full max-w-3xl bg-white rounded-lg shadow-xl transition-all duration-200 ease-in-out flex flex-col max-h-[90vh] ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
                    <div>
                        <h3 className="text-lg font-semibold text-neutral-900">{orderToEdit ? 'Modifier Bon de Commande' : 'Nouveau Bon de Commande'}</h3>
                        <p className="text-sm text-neutral-500">{orderToEdit ? `Modification du BC #${orderToEdit.id}` : 'Créer une commande fournisseur.'}</p>
                    </div>
                    <button onClick={handleClose} className="p-1 text-neutral-400 hover:text-neutral-600 rounded-full hover:bg-neutral-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="px-6 py-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                    
                    {/* Supplier & Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="sm:col-span-1">
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Fournisseur *</label>
                            <select 
                                value={supplierId}
                                onChange={(e) => setSupplierId(e.target.value)}
                                className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                            >
                                <option value="">-- Sélectionner --</option>
                                {suppliers.map(supplier => (
                                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Date de commande *</label>
                            <input 
                                type="date" 
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Date de livraison prévue</label>
                            <input 
                                type="date" 
                                value={expectedDate}
                                onChange={(e) => setExpectedDate(e.target.value)}
                                className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Notes / Instructions</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Instructions de livraison, références, etc."
                            rows={2}
                            className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                        />
                    </div>

                    {/* Product Selection Area */}
                    <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-medium text-neutral-900 flex items-center gap-2">
                                <ScanLine size={16} className="text-emerald-600"/> Ajouter des articles
                            </h4>
                        </div>
                        
                        <div className="flex gap-3 items-end">
                            <div className="flex-grow">
                                <label className="block text-xs font-medium text-neutral-500 mb-1">Produit</label>
                                <select 
                                    value={selectedProductId}
                                    onChange={(e) => setSelectedProductId(e.target.value)}
                                    className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                                >
                                    <option value="">-- Choisir Produit --</option>
                                    {products.map(product => (
                                        <option key={product.id} value={product.id}>{product.name} (P.A: {product.purchasePrice} MAD)</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-24">
                                <label className="block text-xs font-medium text-neutral-500 mb-1">Qté</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    value={itemQuantity}
                                    onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                                    className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm text-center"
                                />
                            </div>
                            <button 
                                onClick={handleAddItem}
                                disabled={!selectedProductId}
                                className="inline-flex items-center justify-center h-[38px] px-4 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Items Table */}
                    {lineItems.length > 0 ? (
                        <div className="border border-neutral-200 rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-neutral-200">
                                <thead className="bg-neutral-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Désignation</th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-neutral-500 uppercase">Qté</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500 uppercase">P.U (Achat)</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Total</th>
                                        <th className="px-4 py-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-neutral-200">
                                    {lineItems.map(item => (
                                        <tr key={item.id}>
                                            <td className="px-4 py-2 text-sm text-neutral-900">{item.name}</td>
                                            <td className="px-4 py-2 text-sm text-center text-neutral-600">{item.quantity}</td>
                                            <td className="px-4 py-2 text-sm text-right text-neutral-600">{item.unitPrice.toLocaleString('fr-FR')}</td>
                                            <td className="px-4 py-2 text-sm text-right font-medium text-neutral-900">{(item.quantity * item.unitPrice).toLocaleString('fr-FR')}</td>
                                            <td className="px-4 py-2 text-center">
                                                <button onClick={() => handleRemoveItem(item.id)} className="text-neutral-400 hover:text-red-500 transition-colors">
                                                    <Trash2 size={16}/>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-neutral-50 rounded-lg border border-dashed border-neutral-300 text-neutral-500 text-sm">
                            Aucun article ajouté.
                        </div>
                    )}

                    {/* Footer Totals */}
                    <div className="flex justify-end border-t border-neutral-200 pt-6">
                        <div className="w-full max-w-xs space-y-3">
                             <div className="flex justify-between text-sm text-neutral-600">
                                <span>Total HT</span>
                                <span>{totals.subTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span>
                            </div>
                            <div className="flex justify-between text-sm text-neutral-600">
                                <span>TVA (Estimée)</span>
                                <span>{totals.vatAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span>
                            </div>
                            <div className="h-px bg-neutral-200 my-1"></div>
                            <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                <span className="text-base font-bold text-emerald-800">Total TTC</span>
                                <span className="text-lg font-bold text-emerald-700">{totals.totalAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 px-6 py-4 bg-neutral-50 border-t border-neutral-200 rounded-b-lg">
                     <button 
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg shadow-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all"
                    >
                        Annuler
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-lg shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all flex items-center gap-2"
                    >
                        <FileText size={16} /> {orderToEdit ? 'Mettre à jour' : 'Enregistrer Commande'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CreatePurchaseOrderModal;
