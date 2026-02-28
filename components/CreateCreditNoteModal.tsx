
import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, ScanLine, Calculator, FileText, Loader2, AlertCircle } from 'lucide-react';
import { Client, Product, CreditNote, LineItem, CreditNoteStatus, CompanySettings } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { parseDecimalInput, formatDecimalForInput } from '../services/currencyService';

interface CreateCreditNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (creditNote: Omit<CreditNote, 'id'>, id?: string) => Promise<any> | void;
    clients: Client[];
    products: Product[];
    creditNoteToEdit?: CreditNote | null;
    companySettings?: CompanySettings | null;
}

const CreateCreditNoteModal: React.FC<CreateCreditNoteModalProps> = ({ isOpen, onClose, onSave, clients, products, creditNoteToEdit, companySettings }) => {
    const { t, isRTL, language } = useLanguage();
    const [isVisible, setIsVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const isModeTTC = companySettings?.priceDisplayMode === 'TTC';
    const vatOptions = language === 'es' ? [21, 10, 4, 0] : [20, 14, 10, 7, 0];

    const [clientId, setClientId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [reason, setReason] = useState('');
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    
    const [selectedProductId, setSelectedProductId] = useState('');
    const [tempName, setTempName] = useState('');
    const [tempDesc, setTempDesc] = useState('');
    const [tempPrice, setTempPrice] = useState(0);
    const [tempVat, setTempVat] = useState(20);
    const [itemQuantity, setItemQuantity] = useState<string>('1');
    const [tempProductCode, setTempProductCode] = useState('');

    const [isDiscountEnabled, setIsDiscountEnabled] = useState(false);
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
    const [discountValue, setDiscountValue] = useState<string>('');
    const [useDimensions, setUseDimensions] = useState(false);
    const [tempLength, setTempLength] = useState<string>('1');
    const [tempHeight, setTempHeight] = useState<string>('1');

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setIsVisible(true), 10);
            setError(null);
            if (creditNoteToEdit) {
                setClientId(creditNoteToEdit.clientId);
                setDate(creditNoteToEdit.date);
                setReason(creditNoteToEdit.subject || '');
                setLineItems(JSON.parse(JSON.stringify(creditNoteToEdit.lineItems)));
                setIsDiscountEnabled(!!creditNoteToEdit.discountValue && creditNoteToEdit.discountValue > 0);
                setDiscountType(creditNoteToEdit.discountType || 'percentage');
                setDiscountValue(creditNoteToEdit.discountValue && creditNoteToEdit.discountValue > 0 ? formatDecimalForInput(creditNoteToEdit.discountValue, language) : '');
                setUseDimensions(creditNoteToEdit.useDimensions || false);
            } else {
                setClientId('');
                setDate(new Date().toISOString().split('T')[0]);
                setReason('');
                setLineItems([]);
                setTempVat(language === 'es' ? 21 : 20);
                setIsDiscountEnabled(false);
                setDiscountType('percentage');
                setDiscountValue('');
                setUseDimensions(false);
            }
            resetItemForm();
        } else {
            setIsVisible(false);
        }
    }, [isOpen, creditNoteToEdit, language]);

    const resetItemForm = () => {
        setSelectedProductId('');
        setTempName('');
        setTempDesc('');
        setTempPrice(0);
        setTempVat(language === 'es' ? 21 : 20);
        setItemQuantity('1');
        setTempProductCode('');
        setTempLength('1');
        setTempHeight('1');
    };

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 200);
    };

    useEffect(() => {
        if (selectedProductId) {
            const product = products.find(p => p.id === selectedProductId);
            if (product) {
                setTempName(product.name);
                setTempDesc(product.description || '');
                const priceToInject = isModeTTC ? product.salePrice * (1 + product.vat / 100) : product.salePrice;
                setTempPrice(priceToInject);
                setTempVat(product.vat);
                setTempProductCode(product.productCode);
            }
        }
    }, [selectedProductId, products, isModeTTC]);

    const handleAddItem = () => {
        if (!tempName) return;
        const qty = parseDecimalInput(itemQuantity);
        const length = parseDecimalInput(tempLength);
        const height = parseDecimalInput(tempHeight);

        const newItem: LineItem = {
            id: `temp-${Date.now()}`,
            productId: selectedProductId || null,
            productCode: selectedProductId ? tempProductCode : undefined,
            name: tempName,
            description: tempDesc,
            quantity: qty,
            unitPrice: tempPrice,
            vat: tempVat,
            length: useDimensions ? (length || 1) : undefined,
            height: useDimensions ? (height || 1) : undefined
        };
        setLineItems(prev => [...prev, newItem]);
        resetItemForm();
    };

    const handleRemoveItem = (id: string) => {
        setLineItems(prev => prev.filter(item => item.id !== id));
    };

    const updateLineItem = (id: string, updatedField: Partial<LineItem>) => {
        setLineItems(prev => prev.map(item => item.id === id ? { ...item, ...updatedField } : item));
    };

    const totals = useMemo(() => {
        const subTotal = lineItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity * (useDimensions ? (item.length || 1) * (item.height || 1) : 1)), 0);
        
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
            const itemTotalHT = item.unitPrice * item.quantity * (useDimensions ? (item.length || 1) * (item.height || 1) : 1);
            const itemDiscount = subTotal > 0 ? (itemTotalHT / subTotal) * discountAmount : 0;
            const itemBaseForVat = itemTotalHT - itemDiscount;
            return acc + (itemBaseForVat * (item.vat / 100));
        }, 0);

        const totalTTC = subTotalAfterDiscount + vatAmountAfterDiscount;
        return { subTotal, vatAmount: vatAmountAfterDiscount, totalTTC, discountAmount };
    }, [lineItems, isDiscountEnabled, discountType, discountValue, language, useDimensions]);

    const handleSave = async () => {
        if (!clientId || lineItems.length === 0) return;
        const client = clients.find(c => c.id === clientId);
        const clientNameDisplay = client ? (client.company || client.name) : (language === 'es' ? 'Cliente desconocido' : 'Client inconnu');
        const creditNoteData: Omit<CreditNote, 'id'> = {
            clientId, clientName: clientNameDisplay, date, subject: reason, lineItems,
            useDimensions,
            status: creditNoteToEdit ? creditNoteToEdit.status : CreditNoteStatus.Draft,
            subTotal: totals.subTotal, vatAmount: totals.vatAmount, amount: totals.totalTTC, invoiceId: creditNoteToEdit?.invoiceId,
            discountType: isDiscountEnabled ? discountType : undefined,
            discountValue: isDiscountEnabled ? parseDecimalInput(discountValue) : undefined,
        };
        setIsSubmitting(true);
        setError(null);
        try { 
            if (creditNoteToEdit?.id) {
                await onSave(creditNoteData, creditNoteToEdit.id);
            } else {
                await onSave(creditNoteData);
            }
            handleClose(); 
        } catch (err: any) { setError(err.message || "Error."); } finally { setIsSubmitting(false); }
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`} aria-modal="true">
            <div className="absolute inset-0 bg-neutral-900/80 backdrop-blur-md" onClick={handleClose}></div>
            <div className={`relative w-full h-full md:h-auto md:max-h-[95vh] md:max-w-6xl bg-white md:rounded-3xl shadow-2xl transition-all duration-300 ease-out flex flex-col ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0 translate-y-10 md:translate-y-0'}`}>
                
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 md:rounded-t-3xl">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">{creditNoteToEdit ? t('editCreditNote') : t('newCreditNote')}</h3>
                        {creditNoteToEdit && <p className="text-xs text-slate-500 mt-0.5">#{creditNoteToEdit.documentId || creditNoteToEdit.id}</p>}
                    </div>
                    <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-all"><X size={20} /></button>
                </div>

                {error && (<div className="px-6 pt-4"><div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3"><AlertCircle className="h-5 w-5 text-red-500 shrink-0" /><p className="text-xs text-red-700">{error}</p></div></div>)}

                <div className="px-4 md:px-6 py-5 overflow-y-auto custom-scrollbar flex-1 space-y-6 pb-24 md:pb-8">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-slate-700 ml-1">{t('client')} *</label>
                            <select value={clientId} onChange={(e) => setClientId(e.target.value)} disabled={!!creditNoteToEdit?.invoiceId} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12 bg-white disabled:bg-gray-100">
                                <option value="">-- {t('select')} --</option>
                                {clients.map(client => (<option key={client.id} value={client.id}>{client.company || client.name}</option>))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-slate-700 ml-1">{t('date')} *</label>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12"/>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-slate-700 ml-1">{t('reasonLabel')}</label>
                            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={language === 'es' ? 'Ej: Devolución de producto' : 'Ex: Retour produit'} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12"/>
                        </div>
                        <div className="sm:col-span-3 flex items-center gap-2 px-1">
                            <input 
                                type="checkbox" 
                                id="use-dimensions"
                                checked={useDimensions}
                                onChange={(e) => setUseDimensions(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <label htmlFor="use-dimensions" className="text-sm font-bold text-slate-700 cursor-pointer">
                                Activer les dimensions
                            </label>
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
                            <div className={`col-span-12 ${useDimensions ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">{t('productAutoLabel')}</label>
                                <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="block w-full rounded-lg border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-11 bg-white">
                                    <option value="">-- {t('select')} --</option>
                                    {products.map(product => (<option key={product.id} value={product.id}>{product.name}</option>))}
                                </select>
                            </div>
                            <div className={`col-span-24 ${useDimensions ? 'lg:col-span-5' : 'lg:col-span-6'}`}>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">{t('designationLabel')} *</label>
                                <input type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder={t('description')} className="block w-full rounded-lg border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-[11px] h-11 font-medium"/>
                            </div>
                            {useDimensions && (
                                <>
                                    <div className="col-span-12 lg:col-span-2">
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Long.</label>
                                        <input type="text" value={tempLength} onChange={(e) => setTempLength(e.target.value)} className="block w-full rounded-lg border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-11"/>
                                    </div>
                                    <div className="col-span-12 lg:col-span-2">
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Haut.</label>
                                        <input type="text" value={tempHeight} onChange={(e) => setTempHeight(e.target.value)} className="block w-full rounded-lg border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-11"/>
                                    </div>
                                </>
                            )}
                            <div className="col-span-12 lg:col-span-3">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">{t('puHTLabel')}</label>
                                <input type="number" value={tempPrice} onChange={(e) => setTempPrice(parseFloat(e.target.value) || 0)} className="block w-full rounded-lg border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-11"/>
                            </div>
                            <div className={`col-span-12 ${useDimensions ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">{t('quantity')}</label>
                                <input type="text" value={itemQuantity} onChange={(e) => setItemQuantity(e.target.value)} className="block w-full rounded-lg border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-11"/>
                            </div>
                            <div className={`col-span-12 ${useDimensions ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
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
                                        {useDimensions && (
                                            <>
                                                <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Long.</th>
                                                <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Haut.</th>
                                            </>
                                        )}
                                        <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">{t('totalHTLabel')}</th>
                                        <th className="px-4 py-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {lineItems.map(item => {
                                        const displayLineTotal = item.quantity * item.unitPrice * (useDimensions ? (item.length || 1) * (item.height || 1) : 1);
                                        
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
                                            {useDimensions && (
                                                <>
                                                    <td className="px-4 py-3 text-center text-xs text-slate-600 font-bold">
                                                        <input 
                                                            type="text" 
                                                            value={formatDecimalForInput(item.length || 1, language)} 
                                                            onChange={(e) => updateLineItem(item.id, { length: parseDecimalInput(e.target.value) })}
                                                            className="w-12 p-1 text-center border-none focus:ring-0 text-xs font-bold bg-transparent"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-xs text-slate-600 font-bold">
                                                        <input 
                                                            type="text" 
                                                            value={formatDecimalForInput(item.height || 1, language)} 
                                                            onChange={(e) => updateLineItem(item.id, { height: parseDecimalInput(e.target.value) })}
                                                            className="w-12 p-1 text-center border-none focus:ring-0 text-xs font-bold bg-transparent"
                                                        />
                                                    </td>
                                                </>
                                            )}
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
                                {isDiscountEnabled && (
                                    <span className="font-bold text-red-500">
                                        - {totals.discountAmount.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { style: 'currency', currency: 'MAD' })}
                                    </span>
                                )}
                            </div>

                            {isDiscountEnabled && (
                                <div className="pl-4 pb-2">
                                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                                        <div className="relative flex w-full">
                                            <input 
                                                type="text" 
                                                value={discountValue}
                                                onChange={e => setDiscountValue(e.target.value)}
                                                className={`w-full h-9 rounded-md border-transparent bg-transparent text-sm font-bold text-right pr-16 focus:ring-0`}
                                            />
                                            <div className="absolute inset-y-0 right-0 flex items-center">
                                                <select 
                                                    value={discountType}
                                                    onChange={e => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                                                    className="h-full rounded-md border-transparent bg-transparent py-0 pl-2 pr-7 text-slate-500 focus:ring-0 sm:text-sm font-bold"
                                                >
                                                    <option value="percentage">%</option>
                                                    <option value="fixed">MAD</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between text-sm text-slate-500"><span>{t('vat')}</span><span>{totals.vatAmount.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { style: 'currency', currency: 'MAD' })}</span></div>
                            <div className="h-px bg-slate-200 my-1"></div>
                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100"><span className="text-base font-bold text-slate-900">{t('totalTTC')}</span><span className="text-xl font-black text-emerald-700">{totals.totalTTC.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { style: 'currency', currency: 'MAD' })}</span></div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-end gap-3 px-4 md:px-6 py-4 bg-slate-50 border-t border-slate-200 md:rounded-b-3xl">
                    <button onClick={handleClose} disabled={isSubmitting} className="order-2 md:order-1 flex-1 md:flex-none px-6 py-3.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-all">{t('cancel')}</button>
                    <button onClick={handleSave} disabled={isSubmitting} className="order-1 md:order-2 flex-1 md:flex-none px-10 py-3.5 text-sm font-bold text-white bg-emerald-600 border border-transparent rounded-xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">{isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />} {t('save')}</button>
                </div>
            </div>
            <style>{`
                .grid-cols-24 { grid-template-columns: repeat(24, minmax(0, 1fr)); }
                @media (max-width: 1023px) {
                    .lg\\:col-span-2, .lg\\:col-span-4, .lg\\:col-span-3 { grid-column: span 12 / span 12; }
                    .lg\\:col-span-6, .lg\\:col-span-24 { grid-column: span 24 / span 24; }
                }
                @media (min-width: 1024px) {
                    .lg\\:col-span-2 { grid-column: span 2 / span 2; }
                    .lg\\:col-span-4 { grid-column: span 4 / span 4; }
                    .lg\\:col-span-6 { grid-column: span 6 / span 6; }
                    .lg\\:col-span-3 { grid-column: span 3 / span 3; }
                }
            `}</style>
        </div>
    );
};

export default CreateCreditNoteModal;
