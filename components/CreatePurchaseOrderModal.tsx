import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, ScanLine, FileText, Loader2 } from 'lucide-react';
import { Supplier, Product, PurchaseOrder, LineItem, PurchaseOrderStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface CreatePurchaseOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (order: Omit<PurchaseOrder, 'id'>, id?: string) => Promise<any> | void;
    suppliers: Supplier[];
    products: Product[];
    orderToEdit?: PurchaseOrder | null;
}

const CreatePurchaseOrderModal: React.FC<CreatePurchaseOrderModalProps> = ({ isOpen, onClose, onSave, suppliers, products, orderToEdit }) => {
    const { t, isRTL } = useLanguage();
    const [isVisible, setIsVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form State
    const [supplierId, setSupplierId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [expectedDate, setExpectedDate] = useState('');
    const [notes, setNotes] = useState('');
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    
    // Item Addition State (Free Text)
    const [selectedProductId, setSelectedProductId] = useState('');
    const [tempName, setTempName] = useState('');
    const [tempDesc, setTempDesc] = useState('');
    const [tempPrice, setTempPrice] = useState(0);
    const [tempVat, setTempVat] = useState(20);
    const [itemQuantity, setItemQuantity] = useState(1);
    const [tempProductCode, setTempProductCode] = useState('');

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
            }
            resetItemForm();
        } else {
            setIsVisible(false);
        }
    }, [isOpen, orderToEdit]);

    const resetItemForm = () => {
        setSelectedProductId('');
        setTempName('');
        setTempDesc('');
        setTempPrice(0);
        setTempVat(20);
        setItemQuantity(1);
        setTempProductCode('');
    };

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 200);
    };

    // Auto-fill
    useEffect(() => {
        if (selectedProductId) {
            const product = products.find(p => p.id === selectedProductId);
            if (product) {
                setTempName(product.name);
                setTempDesc(product.description || '');
                setTempPrice(product.purchasePrice);
                setTempVat(product.vat);
                setTempProductCode(product.productCode);
            }
        }
    }, [selectedProductId, products]);

    const handleAddItem = () => {
        if (!tempName) {
            alert(t('description'));
            return;
        }

        const newItem: LineItem = {
            id: `temp-${Date.now()}`,
            productId: selectedProductId || null,
            productCode: tempProductCode, // Use state
            name: tempName,
            description: tempDesc,
            quantity: itemQuantity,
            unitPrice: tempPrice,
            vat: tempVat
        };

        setLineItems(prev => [...prev, newItem]);
        resetItemForm();
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

    const handleSave = async () => {
        if (!supplierId) {
            alert(t('supplier'));
            return;
        }
        if (lineItems.length === 0) {
            alert(t('items'));
            return;
        }

        const supplier = suppliers.find(s => s.id === supplierId);
        
        setIsSubmitting(true);
        try {
            await onSave({
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
        } catch (error) {
            console.error("Save failed", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`} aria-modal="true">
            <div className="absolute inset-0 bg-neutral-900/75 backdrop-blur-sm" onClick={handleClose}></div>
            
            <div className={`relative w-full max-w-4xl bg-white rounded-lg shadow-xl transition-all duration-200 ease-in-out flex flex-col max-h-[90vh] ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
                    <div>
                        <h3 className="text-lg font-semibold text-neutral-900">{orderToEdit ? t('newPurchaseOrder') : t('newPurchaseOrder')}</h3>
                        <p className="text-sm text-neutral-500">{orderToEdit ? `#${orderToEdit.documentId || orderToEdit.id}` : ''}</p>
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
                            <label className="block text-sm font-medium text-neutral-700 mb-1">{t('supplier')} *</label>
                            <select 
                                value={supplierId}
                                onChange={(e) => setSupplierId(e.target.value)}
                                className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                            >
                                <option value="">-- {t('select')} --</option>
                                {suppliers.map(supplier => (
                                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">{t('date')} *</label>
                            <input 
                                type="date" 
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">{t('dueDate')}</label>
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
                        <label className="block text-sm font-medium text-neutral-700 mb-1">{t('notes')}</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={t('notes')}
                            rows={2}
                            className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                        />
                    </div>

                    {/* Product Selection Area */}
                    <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-medium text-neutral-900 flex items-center gap-2">
                                <ScanLine size={16} className="text-emerald-600"/> {t('items')}
                            </h4>
                        </div>
                        
                        <div className="grid grid-cols-12 gap-3 items-end">
                            {/* Product Selector */}
                            <div className="col-span-12 md:col-span-2">
                                <label className="block text-xs font-medium text-neutral-500 mb-1">Produit (Auto)</label>
                                <select 
                                    value={selectedProductId}
                                    onChange={(e) => setSelectedProductId(e.target.value)}
                                    className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm text-neutral-600"
                                >
                                    <option value="">-- {t('new')} --</option>
                                    {products.map(product => (
                                        <option key={product.id} value={product.id}>{product.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Ref (2 cols) - NEW */}
                            <div className="col-span-6 md:col-span-2">
                                <label className="block text-xs font-medium text-neutral-500 mb-1">{t('reference')}</label>
                                <input 
                                    type="text" 
                                    value={tempProductCode}
                                    onChange={(e) => setTempProductCode(e.target.value)}
                                    placeholder={t('reference')}
                                    className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                                />
                            </div>

                            {/* Name Input */}
                            <div className="col-span-6 md:col-span-3">
                                <label className="block text-xs font-medium text-neutral-500 mb-1">{t('description')} *</label>
                                <input 
                                    type="text" 
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                    className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm font-medium"
                                />
                            </div>

                            {/* Price */}
                            <div className="col-span-4 md:col-span-2">
                                <label className="block text-xs font-medium text-neutral-500 mb-1">{t('unitPrice')}</label>
                                <input 
                                    type="number" 
                                    value={tempPrice}
                                    onChange={(e) => setTempPrice(parseFloat(e.target.value) || 0)}
                                    className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                                />
                            </div>

                            {/* Qty & VAT Grouped */}
                            <div className="col-span-8 md:col-span-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-neutral-500 mb-1">{t('quantity')}</label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            value={itemQuantity}
                                            onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                                            className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm text-center"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-neutral-500 mb-1">{t('vat')}</label>
                                        <select 
                                            value={tempVat} 
                                            onChange={(e) => setTempVat(parseInt(e.target.value))} 
                                            className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                                        >
                                            <option value="20">20%</option>
                                            <option value="14">14%</option>
                                            <option value="10">10%</option>
                                            <option value="7">7%</option>
                                            <option value="0">0%</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Button */}
                            <div className="col-span-12 md:col-span-12 flex justify-end mt-2">
                                <button 
                                    onClick={handleAddItem}
                                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm text-sm font-medium"
                                >
                                    <Plus size={16} className={`mr-2 ${isRTL ? 'ml-2 mr-0' : ''}`} /> {t('add')}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    {lineItems.length > 0 ? (
                        <div className="border border-neutral-200 rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-neutral-200">
                                <thead className="bg-neutral-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase rtl:text-right">{t('reference')}</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase rtl:text-right">{t('description')}</th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-neutral-500 uppercase">{t('quantity')}</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500 uppercase rtl:text-left">{t('unitPrice')}</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500 uppercase rtl:text-left">{t('total')}</th>
                                        <th className="px-4 py-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-neutral-200">
                                    {lineItems.map(item => (
                                        <tr key={item.id}>
                                            <td className="px-4 py-2 text-sm text-neutral-500 rtl:text-right">{item.productCode || '-'}</td>
                                            <td className="px-4 py-2 text-sm text-neutral-900 rtl:text-right">{item.name}</td>
                                            <td className="px-4 py-2 text-sm text-center text-neutral-600">{item.quantity}</td>
                                            <td className="px-4 py-2 text-sm text-right text-neutral-600 rtl:text-left">{item.unitPrice.toLocaleString('fr-FR')}</td>
                                            <td className="px-4 py-2 text-sm text-right font-medium text-neutral-900 rtl:text-left">{(item.quantity * item.unitPrice).toLocaleString('fr-FR')}</td>
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
                            {t('items')}
                        </div>
                    )}

                    {/* Footer Totals */}
                    <div className="flex justify-end border-t border-neutral-200 pt-6">
                        <div className="w-full max-w-xs space-y-3">
                             <div className="flex justify-between text-sm text-neutral-600">
                                <span>{t('totalHT')}</span>
                                <span>{totals.subTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span>
                            </div>
                            <div className="flex justify-between text-sm text-neutral-600">
                                <span>{t('vat')}</span>
                                <span>{totals.vatAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span>
                            </div>
                            <div className="h-px bg-neutral-200 my-1"></div>
                            <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                <span className="text-base font-bold text-emerald-800">{t('totalTTC')}</span>
                                <span className="text-lg font-bold text-emerald-700">{totals.totalAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 px-6 py-4 bg-neutral-50 border-t border-neutral-200 rounded-b-lg">
                     <button 
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg shadow-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
                    >
                        {t('cancel')}
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-lg shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} 
                        {isSubmitting ? t('save') : t('save')}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CreatePurchaseOrderModal;