
import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, ScanLine, FileText, Loader2 } from 'lucide-react';
import { Supplier, Product, PurchaseOrder, LineItem, PurchaseOrderStatus, CompanySettings } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { parseDecimalInput, formatDecimalForInput } from '../services/currencyService';

interface CreatePurchaseOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (order: Omit<PurchaseOrder, 'id'>, id?: string) => Promise<any> | void;
    suppliers: Supplier[];
    products: Product[];
    orderToEdit?: PurchaseOrder | null;
    companySettings?: CompanySettings | null;
}

const CreatePurchaseOrderModal: React.FC<CreatePurchaseOrderModalProps> = ({ isOpen, onClose, onSave, suppliers, products, orderToEdit, companySettings }) => {
    const { t, isRTL, language } = useLanguage();
    const [isVisible, setIsVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const isModeTTC = companySettings?.priceDisplayMode === 'TTC';
    const vatOptions = language === 'es' ? [21, 10, 4, 0] : [20, 14, 10, 7, 0];

    const [supplierId, setSupplierId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [expectedDate, setExpectedDate] = useState('');
    const [notes, setNotes] = useState('');
    const [calculationMode, setCalculationMode] = useState<'piece' | 'm2' | 'ml' | 'kg'>('piece');
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    
    const [selectedProductId, setSelectedProductId] = useState('');
    const [tempName, setTempName] = useState('');
    const [tempDesc, setTempDesc] = useState('');
    const [tempPrice, setTempPrice] = useState<string>('0');
    const [tempVat, setTempVat] = useState(20);
    const [itemQuantity, setItemQuantity] = useState<string>('1');
    const [tempLength, setTempLength] = useState<string>('1');
    const [tempHeight, setTempHeight] = useState<string>('1');
    const [tempWeight, setTempWeight] = useState<string>('1');
    const [tempProductCode, setTempProductCode] = useState('');

    const [isDiscountEnabled, setIsDiscountEnabled] = useState(false);
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
    const [discountValue, setDiscountValue] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setIsVisible(true), 10);
            if (orderToEdit) {
                setSupplierId(orderToEdit.supplierId);
                setDate(orderToEdit.date);
                setExpectedDate(orderToEdit.expectedDate || '');
                setNotes(orderToEdit.notes || '');
                // Read calculationMode from first line item
                setCalculationMode(orderToEdit.lineItems[0]?.calculationMode || 'piece');
                setLineItems(JSON.parse(JSON.stringify(orderToEdit.lineItems)));
                setIsDiscountEnabled(!!orderToEdit.discountValue && orderToEdit.discountValue > 0);
                setDiscountType(orderToEdit.discountType || 'percentage');
                setDiscountValue(orderToEdit.discountValue ? formatDecimalForInput(orderToEdit.discountValue, language) : '');
            } else {
                setSupplierId('');
                setDate(new Date().toISOString().split('T')[0]);
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                setExpectedDate(nextWeek.toISOString().split('T')[0]);
                setNotes('');
                setLineItems([]);
                setTempVat(language === 'es' ? 21 : 20);
                setIsDiscountEnabled(false);
                setDiscountType('percentage');
                setDiscountValue('0');
            }
            resetItemForm();
        } else {
            setIsVisible(false);
        }
    }, [isOpen, orderToEdit, language]);

    const resetItemForm = () => {
        setSelectedProductId('');
        setTempName('');
        setTempDesc('');
        setTempPrice('0');
        setTempVat(language === 'es' ? 21 : 20);
        setItemQuantity('1');
        setTempLength('1');
        setTempHeight('1');
        setTempProductCode('');
    };

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 200);
    };

    const updateLineItem = (id: string, updatedField: Partial<LineItem>) => {
        setLineItems(prev => prev.map(item => item.id === id ? { ...item, ...updatedField } : item));
    };

    useEffect(() => {
        if (selectedProductId) {
            const product = products.find(p => p.id === selectedProductId);
            if (product) {
                setTempName(product.name);
                setTempDesc(product.description || '');
                const priceToDisplay = isModeTTC ? (product.purchasePrice * (1 + product.vat / 100)) : product.purchasePrice;
                setTempPrice(formatDecimalForInput(priceToDisplay, language));
                setTempVat(product.vat);
                setTempProductCode(product.productCode);
            }
        }
    }, [selectedProductId, products, language, isModeTTC]);

    const isM2 = calculationMode === 'm2';
    const isML = calculationMode === 'ml';
    const isKg = calculationMode === 'kg';
    const showLengthColumn = calculationMode === 'm2' || calculationMode === 'ml';
    const showHeightColumn = calculationMode === 'm2';

    const getLineMultiplier = (item: LineItem) => {
        if (isM2) return (item.length || 1) * (item.height || 1);
        if (isML) return (item.length || 1);
        if (isKg) return (item.weight || 1);
        return 1;
    };

    const handleAddItem = () => {
        if (!tempName) return;
        const qty = parseDecimalInput(itemQuantity);
        const inputPrice = parseDecimalInput(tempPrice);
        const price = isModeTTC ? (inputPrice / (1 + tempVat / 100)) : inputPrice;
        const length = showLengthColumn ? parseDecimalInput(tempLength) : 1;
        const height = showHeightColumn ? parseDecimalInput(tempHeight) : 1;
        const weight = isKg ? parseDecimalInput(tempWeight) : 1;

        const newItem: LineItem = {
            id: `temp-${Date.now()}`,
            productId: selectedProductId || null,
            productCode: tempProductCode,
            name: tempName,
            description: tempDesc,
            quantity: qty,
            length: length || 1,
            height: height || 1,
            weight: weight || 1,
            unitPrice: price,
            vat: tempVat
        };
        setLineItems(prev => [...prev, newItem]);
        resetItemForm();
    };

    const handleRemoveItem = (id: string) => {
        setLineItems(prev => prev.filter(item => item.id !== id));
    };

    const totals = useMemo(() => {
        const subTotal = lineItems.reduce((acc, item) => {
            const lineTotal = item.unitPrice * item.quantity * getLineMultiplier(item);
            return acc + lineTotal;
        }, 0);
        
        let discountAmount = 0;
        const parsedDiscountValue = parseDecimalInput(discountValue);
        if (isDiscountEnabled && parsedDiscountValue > 0) {
            if (discountType === 'percentage') {
                discountAmount = subTotal * (parsedDiscountValue / 100);
            } else { // fixed
                discountAmount = parsedDiscountValue;
            }
        }

        const subTotalAfterDiscount = subTotal - discountAmount;

        const vatAmountAfterDiscount = lineItems.reduce((acc, item) => {
            const itemTotalHT = item.unitPrice * item.quantity * getLineMultiplier(item);
            const itemDiscount = subTotal > 0 ? (itemTotalHT / subTotal) * discountAmount : 0;
            const itemBaseForVat = itemTotalHT - itemDiscount;
            return acc + (itemBaseForVat * (item.vat / 100));
        }, 0);

        const totalAmount = subTotalAfterDiscount + vatAmountAfterDiscount;
        return { subTotal, vatAmount: vatAmountAfterDiscount, totalAmount, discountAmount };
    }, [lineItems, isDiscountEnabled, discountType, discountValue, language, calculationMode]);

    const handleSave = async () => {
        if (!supplierId || lineItems.length === 0) return;
        const supplier = suppliers.find(s => s.id === supplierId);
        
        const fallbackName = language === 'es' ? 'Proveedor desconocido' : 'Fournisseur inconnu';
        const supplierNameDisplay = supplier ? (supplier.company || supplier.name) : fallbackName;
        
        // Store calculationMode in the first line item to avoid schema changes
        const updatedLineItems = [...lineItems];
        if (updatedLineItems.length > 0) {
            updatedLineItems[0] = { ...updatedLineItems[0], calculationMode };
        }

        const orderData = {
            supplierId, supplierName: supplierNameDisplay, date, expectedDate, notes, lineItems: updatedLineItems,
            status: orderToEdit ? orderToEdit.status : PurchaseOrderStatus.Draft,
            subTotal: totals.subTotal, vatAmount: totals.vatAmount, totalAmount: totals.totalAmount,
            discountType: isDiscountEnabled ? discountType : undefined,
            discountValue: isDiscountEnabled ? parseDecimalInput(discountValue) : undefined,
        };

        setIsSubmitting(true);
        try {
            if (orderToEdit?.id) {
                await onSave(orderData, orderToEdit.id);
            } else {
                await onSave(orderData);
            }
            handleClose();
        } catch (error) { console.error(error); } finally { setIsSubmitting(false); }
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`} aria-modal="true">
            <div className="absolute inset-0 bg-neutral-900/80 backdrop-blur-md" onClick={handleClose}></div>
            <div className={`relative w-full h-full md:h-auto md:max-h-[95vh] md:max-w-6xl bg-white md:rounded-3xl shadow-2xl transition-all duration-300 ease-out flex flex-col ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0 translate-y-10 md:translate-y-0'}`}>
                
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 md:rounded-t-3xl">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">{orderToEdit ? t('editPurchaseOrder') : t('newPurchaseOrder')}</h3>
                        {orderToEdit && <p className="text-xs text-slate-500 mt-0.5">#{orderToEdit.documentId || orderToEdit.id}</p>}
                    </div>
                    <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-all"><X size={20} /></button>
                </div>

                <div className="px-4 md:px-6 py-5 overflow-y-auto custom-scrollbar flex-1 space-y-6 pb-24 md:pb-8">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-1 space-y-1">
                            <label className="block text-sm font-bold text-slate-700 ml-1">{t('supplier')} *</label>
                            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12">
                                <option value="">-- {t('select')} --</option>
                                {suppliers.map(supplier => (<option key={supplier.id} value={supplier.id}>{supplier.company || supplier.name}</option>))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-slate-700 ml-1">{t('date')} *</label>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12"/>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-slate-700 ml-1">{t('expectedDelivery')}</label>
                            <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12"/>
                        </div>
                        <div className="sm:col-span-3 flex items-center gap-6 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2">
                                <label htmlFor="calculation-mode" className="text-sm font-bold text-slate-700">Mode de calcul</label>
                                <select 
                                    id="calculation-mode"
                                    value={calculationMode}
                                    onChange={(e) => setCalculationMode(e.target.value as 'piece' | 'm2' | 'ml' | 'kg')}
                                    className="rounded-lg border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm py-1.5"
                                >
                                    <option value="piece">Par pièce</option>
                                    <option value="m2">Par m²</option>
                                    <option value="ml">Par mètre linéaire</option>
                                    <option value="kg">Par kg</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 shadow-inner space-y-4">
                        <div className="flex items-center gap-3">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><ScanLine size={14}/> {t('items')}</h4>
                            <div className="h-px bg-slate-200 flex-1"></div>
                        </div>
                        
                        <div className="grid grid-cols-24 gap-3 items-end">
                            <div className="col-span-12 lg:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">{t('refLabel')}</label>
                                <input type="text" value={tempProductCode} onChange={(e) => setTempProductCode(e.target.value)} placeholder={t('reference')} className="block w-full rounded-lg border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-11"/>
                            </div>
                            <div className="col-span-12 lg:col-span-4">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">{t('productAutoLabel')}</label>
                                <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="block w-full rounded-lg border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-11 bg-white">
                                    <option value="">-- {t('select')} --</option>
                                    {products.map(product => (<option key={product.id} value={product.id}>{product.name}</option>))}
                                </select>
                            </div>
                            <div className="col-span-24 lg:col-span-6">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">{t('designationLabel')} *</label>
                                <input type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder={t('description')} className="block w-full rounded-lg border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-[11px] h-11 font-medium"/>
                            </div>
                            <div className="col-span-12 lg:col-span-3">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">{isModeTTC ? t('puTTCLabel') : t('puHTLabel')}</label>
                                <input 
                                    type="text" 
                                    value={tempPrice} 
                                    onChange={(e) => setTempPrice(e.target.value)} 
                                    className="block w-full rounded-lg border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-11"
                                />
                            </div>
                            <div className="col-span-12 lg:col-span-3">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">{t('quantity')}</label>
                                <input type="text" value={itemQuantity} onChange={(e) => setItemQuantity(e.target.value)} className="block w-full rounded-lg border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-11"/>
                            </div>
                            {showLengthColumn && (
                                <div className="col-span-12 lg:col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Long.</label>
                                    <input type="text" value={tempLength} onChange={(e) => setTempLength(e.target.value)} className="block w-full rounded-lg border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-11"/>
                                </div>
                            )}
                            {showHeightColumn && (
                                <div className="col-span-12 lg:col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Haut.</label>
                                    <input type="text" value={tempHeight} onChange={(e) => setTempHeight(e.target.value)} className="block w-full rounded-lg border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-11"/>
                                </div>
                            )}
                            {isKg && (
                                <div className="col-span-12 lg:col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Poids (kg)</label>
                                    <input type="text" value={tempWeight} onChange={(e) => setTempWeight(e.target.value)} className="block w-full rounded-lg border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-11"/>
                                </div>
                            )}
                            <div className="col-span-12 lg:col-span-3">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">{t('vat')}</label>
                                <select value={tempVat} onChange={(e) => setTempVat(parseInt(e.target.value))} className="block w-full rounded-lg border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-11">
                                    {vatOptions.map(v => <option key={v} value={v}>{v}%</option>)}
                                </select>
                            </div>
                            <div className="col-span-24 lg:col-span-3">
                                <button onClick={handleAddItem} className="w-full inline-flex items-center justify-center h-11 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md active:scale-95 text-sm font-bold gap-2">
                                    <Plus size={18} /> {t('add')}
                                </button>
                            </div>
                        </div>
                    </div>

                    {lineItems.length > 0 ? (
                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">{t('description')}</th>
                                        <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">{t('quantity')}</th>
                                        {showLengthColumn && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Long.</th>}
                                        {showHeightColumn && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Haut.</th>}
                                        {isKg && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Poids (kg)</th>}
                                        {isM2 && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">M²</th>}
                                        {isML && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">ML</th>}
                                        {isKg && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Total kg</th>}
                                        <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">{isModeTTC ? t('puTTCLabel') : t('puHTLabel')}</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">{isModeTTC ? t('totalTTCLabel') : t('totalHTLabel')}</th>
                                        <th className="px-4 py-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {lineItems.map(item => {
                                        const displayPrice = isModeTTC ? (item.unitPrice * (1 + item.vat/100)) : item.unitPrice;
                                        const displayLineTotal = item.quantity * getLineMultiplier(item) * displayPrice;
                                        
                                        return (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="text-[11px] font-bold text-slate-900 leading-tight">{item.name}</div>
                                                {item.productCode && <div className="text-[9px] text-slate-400 font-mono mt-0.5">{item.productCode}</div>}
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs text-slate-600 font-bold">
                                                <input 
                                                    type="text" 
                                                    value={formatDecimalForInput(item.quantity, language)} 
                                                    onChange={(e) => updateLineItem(item.id, { quantity: parseDecimalInput(e.target.value) })}
                                                    className="w-16 p-1 text-center border-none focus:ring-0 text-xs font-bold bg-transparent"
                                                />
                                            </td>
                                        {showLengthColumn && (
                                            <td className="px-4 py-3 text-center text-xs text-slate-600 font-bold">
                                                <input 
                                                    type="text" 
                                                    value={formatDecimalForInput(item.length || 1, language)} 
                                                    onChange={(e) => updateLineItem(item.id, { length: parseDecimalInput(e.target.value) })}
                                                    className="w-12 p-1 text-center border-none focus:ring-0 text-xs font-bold bg-transparent"
                                                />
                                            </td>
                                        )}
                                        {showHeightColumn && (
                                            <td className="px-4 py-3 text-center text-xs text-slate-600 font-bold">
                                                <input 
                                                    type="text" 
                                                    value={formatDecimalForInput(item.height || 1, language)} 
                                                    onChange={(e) => updateLineItem(item.id, { height: parseDecimalInput(e.target.value) })}
                                                    className="w-12 p-1 text-center border-none focus:ring-0 text-xs font-bold bg-transparent"
                                                />
                                            </td>
                                        )}
                                        {isKg && (
                                            <td className="px-4 py-3 text-center text-xs text-slate-600 font-bold">
                                                <input 
                                                    type="text" 
                                                    value={formatDecimalForInput(item.weight || 1, language)} 
                                                    onChange={(e) => updateLineItem(item.id, { weight: parseDecimalInput(e.target.value) })}
                                                    className="w-12 p-1 text-center border-none focus:ring-0 text-xs font-bold bg-transparent"
                                                />
                                            </td>
                                        )}
                                        {isM2 && <td className="px-4 py-3 text-center text-xs font-medium text-slate-700">{(item.quantity * (item.length || 1) * (item.height || 1)).toLocaleString('fr-MA', { maximumFractionDigits: 2 })}</td>}
                                        {isML && <td className="px-4 py-3 text-center text-xs font-medium text-slate-700">{(item.quantity * (item.length || 1)).toLocaleString('fr-MA', { maximumFractionDigits: 2 })}</td>}
                                        {isKg && <td className="px-4 py-3 text-center text-xs font-medium text-slate-700">{(item.quantity * (item.weight || 1)).toLocaleString('fr-MA', { maximumFractionDigits: 2 })}</td>}
                                            <td className="px-4 py-3 text-right text-xs">
                                                 <input 
                                                    type="text" 
                                                    value={formatDecimalForInput(displayPrice, language)} 
                                                    onChange={(e) => {
                                                        const val = parseDecimalInput(e.target.value);
                                                        updateLineItem(item.id, { unitPrice: isModeTTC ? (val / (1 + item.vat/100)) : val });
                                                    }}
                                                    className="w-24 p-1 text-right border-none focus:ring-0 text-xs font-medium bg-transparent"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-right text-xs font-bold text-slate-900">
                                                {displayLineTotal.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-3 text-center"><button onClick={() => handleRemoveItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={16}/></button></td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-400 text-sm italic">
                            {t('items')} ({language === 'ar' ? 'فارغ' : 'Vide'})
                        </div>
                    )}

                    <div className="flex justify-end border-t border-slate-100 pt-6">
                        <div className="w-full max-w-sm space-y-3">
                            <div className="flex justify-between text-sm text-slate-500"><span>{t('totalHT')}</span><span>{totals.subTotal.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { style: 'currency', currency: 'MAD' })}</span></div>
                            
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <label htmlFor="discount-toggle" className="text-slate-500 font-medium">{t('globalDiscount')}</label>
                                    <input 
                                        type="checkbox" 
                                        id="discount-toggle"
                                        checked={isDiscountEnabled}
                                        onChange={(e) => setIsDiscountEnabled(e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                </div>
                                {isDiscountEnabled && totals.discountAmount > 0 && (
                                    <span className="font-bold text-red-500">
                                        - {totals.discountAmount.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { style: 'currency', currency: 'MAD' })}
                                    </span>
                                )}
                            </div>

                            {isDiscountEnabled && (
                                <div className="pl-4 pb-2">
                                    <div className="flex items-stretch bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                        <input 
                                            type="text" 
                                            value={discountValue}
                                            onChange={e => setDiscountValue(e.target.value)}
                                            placeholder="0"
                                            className="flex-1 min-w-0 h-9 border-0 bg-transparent text-sm font-bold text-right focus:ring-0 px-3"
                                        />
                                        <div className="w-px bg-slate-200 my-1"></div>
                                        <select 
                                            value={discountType}
                                            onChange={e => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                                            className="h-9 border-0 bg-slate-50 py-0 pl-3 pr-8 text-slate-600 focus:ring-0 sm:text-sm font-bold cursor-pointer hover:bg-slate-100 transition-colors"
                                        >
                                            <option value="percentage">%</option>
                                            <option value="fixed">MAD</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between text-sm text-slate-500"><span>{t('vat')}</span><span>{totals.vatAmount.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { style: 'currency', currency: 'MAD' })}</span></div>
                            <div className="h-px bg-slate-200 my-1"></div>
                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100"><span className="text-base font-bold text-slate-900">{t('totalTTC')}</span><span className="text-xl font-black text-emerald-700">{totals.totalAmount.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { style: 'currency', currency: 'MAD' })}</span></div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-end gap-3 px-4 md:px-6 py-4 bg-slate-50 border-t border-slate-200 md:rounded-b-3xl">
                    <button onClick={handleClose} disabled={isSubmitting} className="order-2 md:order-1 flex-1 md:flex-none px-6 py-3.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-all">{t('cancel')}</button>
                    <button onClick={handleSave} disabled={isSubmitting} className="order-1 md:order-2 flex-1 md:flex-none px-10 py-3.5 text-sm font-bold text-white bg-emerald-600 border border-transparent rounded-xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">{isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />} {t('save')}</button>
                </div>
            </div>
        </div>
    );
};

export default CreatePurchaseOrderModal;
