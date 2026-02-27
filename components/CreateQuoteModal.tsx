
import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, ScanLine, Calculator, FileText } from 'lucide-react';
import { Client, Product, Quote, LineItem, QuoteStatus, CompanySettings } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { parseDecimalInput, formatDecimalForInput } from '../services/currencyService';

interface CreateQuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (quote: Omit<Quote, 'id' | 'amount'>, id?: string) => void;
    clients: Client[];
    products: Product[];
    quoteToEdit?: Quote | null;
    companySettings?: CompanySettings | null;
}

const CreateQuoteModal: React.FC<CreateQuoteModalProps> = ({ isOpen, onClose, onSave, clients, products, quoteToEdit, companySettings }) => {
    const { t, isRTL, language } = useLanguage();
    const [isVisible, setIsVisible] = useState(false);
    
    const isModeTTC = companySettings?.priceDisplayMode === 'TTC';
    const vatOptions = language === 'es' ? [21, 10, 4, 0] : [20, 14, 10, 7, 0];

    const [clientId, setClientId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [subject, setSubject] = useState('');
    const [reference, setReference] = useState('');
    const [useDimensions, setUseDimensions] = useState(false);
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    
    const [selectedProductId, setSelectedProductId] = useState('');
    const [tempName, setTempName] = useState('');
    const [tempDesc, setTempDesc] = useState('');
    const [tempPrice, setTempPrice] = useState<string>('0');
    const [tempVat, setTempVat] = useState(20);
    const [itemQuantity, setItemQuantity] = useState<string>('1');
    const [tempLength, setTempLength] = useState<string>('1');
    const [tempHeight, setTempHeight] = useState<string>('1');
    const [tempProductCode, setTempProductCode] = useState('');

    const [isDiscountEnabled, setIsDiscountEnabled] = useState(false);
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
    const [discountValue, setDiscountValue] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setIsVisible(true), 10);
            if (quoteToEdit) {
                setClientId(quoteToEdit.clientId);
                setDate(quoteToEdit.date);
                setSubject(quoteToEdit.subject || '');
                setReference(quoteToEdit.reference || '');
                setUseDimensions(!!quoteToEdit.useDimensions);
                setLineItems(JSON.parse(JSON.stringify(quoteToEdit.lineItems)));
                setIsDiscountEnabled(!!quoteToEdit.discountValue && quoteToEdit.discountValue > 0);
                setDiscountType(quoteToEdit.discountType || 'percentage');
                setDiscountValue(quoteToEdit.discountValue && quoteToEdit.discountValue > 0 ? formatDecimalForInput(quoteToEdit.discountValue, language) : '');
            } else {
                setClientId('');
                setDate(new Date().toISOString().split('T')[0]);
                setSubject('');
                setReference('');
                setUseDimensions(false);
                setLineItems([]);
                setTempVat(language === 'es' ? 21 : 20);
                setIsDiscountEnabled(false);
                setDiscountType('percentage');
                setDiscountValue('');
            }
            resetItemForm();
        } else {
            setIsVisible(false);
        }
    }, [isOpen, quoteToEdit, language]);

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

    useEffect(() => {
        if (selectedProductId) {
            const product = products.find(p => p.id === selectedProductId);
            if (product) {
                setTempName(product.name);
                setTempDesc(product.description || '');
                const priceToDisplay = isModeTTC ? (product.salePrice * (1 + product.vat / 100)) : product.salePrice;
                setTempPrice(formatDecimalForInput(priceToDisplay, language));
                setTempVat(product.vat);
                setTempProductCode(product.productCode);
            }
        }
    }, [selectedProductId, products, language, isModeTTC]);

    const handleAddItem = () => {
        if (!tempName) return;
        const qty = parseDecimalInput(itemQuantity);
        const length = useDimensions ? parseDecimalInput(tempLength) || 1 : 1;
        const height = useDimensions ? parseDecimalInput(tempHeight) || 1 : 1;
        const price = parseDecimalInput(tempPrice);

        const newItem: LineItem = {
            id: `temp-${Date.now()}`,
            productId: selectedProductId || null,
            productCode: tempProductCode,
            name: tempName,
            description: tempDesc,
            quantity: qty,
            length: useDimensions ? length : undefined,
            height: useDimensions ? height : undefined,
            unitPrice: isModeTTC ? (price / (1 + tempVat / 100)) : price,
            vat: tempVat
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
        const subTotal = lineItems.reduce((acc, item) => {
            const itemQty = item.quantity;
            const itemLength = item.length || 1;
            const itemHeight = item.height || 1;
            return acc + (item.unitPrice * itemQty * itemLength * itemHeight);
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
            const itemQty = item.quantity;
            const itemLength = item.length || 1;
            const itemHeight = item.height || 1;
            const itemTotalHT = item.unitPrice * itemQty * itemLength * itemHeight;
            const itemDiscount = subTotal > 0 ? (itemTotalHT / subTotal) * discountAmount : 0;
            const itemBaseForVat = itemTotalHT - itemDiscount;
            return acc + (itemBaseForVat * (item.vat / 100));
        }, 0);

        const totalTTC = subTotalAfterDiscount + vatAmountAfterDiscount;
        return { subTotal, vatAmount: vatAmountAfterDiscount, totalTTC, discountAmount };
    }, [lineItems, isDiscountEnabled, discountType, discountValue, language]);

    const handleSave = () => {
        if (!clientId || lineItems.length === 0) return;
        const client = clients.find(c => c.id === clientId);
        const clientNameDisplay = client ? (client.company || client.name) : 'Client inconnu';
        const quoteData = {
            clientId, clientName: clientNameDisplay, date, expiryDate: date, subject, reference, lineItems,
            useDimensions,
            status: quoteToEdit ? quoteToEdit.status : QuoteStatus.Draft,
            subTotal: totals.subTotal, 
            vatAmount: totals.vatAmount,
            discountType: isDiscountEnabled ? discountType : undefined,
            discountValue: isDiscountEnabled ? parseDecimalInput(discountValue) : undefined,
        };

        if (quoteToEdit?.id) {
            onSave(quoteData, quoteToEdit.id);
        } else {
            onSave(quoteData);
        }
        handleClose();
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`} aria-modal="true">
            <div className="absolute inset-0 bg-neutral-900/80 backdrop-blur-md" onClick={handleClose}></div>
            <div className={`relative w-full h-full md:h-auto md:max-h-[95vh] md:max-w-6xl bg-white md:rounded-3xl shadow-2xl transition-all duration-300 ease-out flex flex-col ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0 translate-y-10 md:translate-y-0'}`}>
                
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 md:rounded-t-3xl">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">{quoteToEdit ? t('editQuote') : t('newQuote')}</h3>
                        {quoteToEdit && <p className="text-xs text-slate-500 mt-0.5">#{quoteToEdit.documentId || quoteToEdit.id}</p>}
                    </div>
                    <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-all"><X size={20} /></button>
                </div>

                <div className="px-4 md:px-6 py-5 overflow-y-auto custom-scrollbar flex-1 space-y-6 pb-24 md:pb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-slate-700 ml-1">{t('client')} *</label>
                            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12">
                                <option value="">-- {t('select')} --</option>
                                {clients.map(client => (<option key={client.id} value={client.id}>{client.company || client.name}</option>))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-slate-700 ml-1">{t('date')} *</label>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12"/>
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="block text-sm font-bold text-slate-700 ml-1">{t('subject')}</label>
                            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('subject')} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12"/>
                        </div>
                        <div className="md:col-span-2 flex items-center gap-2 px-1">
                            <input 
                                type="checkbox" 
                                id="use-dimensions" 
                                checked={useDimensions} 
                                onChange={(e) => setUseDimensions(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <label htmlFor="use-dimensions" className="text-sm font-bold text-slate-700 cursor-pointer">
                                {t('enableDimensions')}
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
                            {useDimensions && (
                                <>
                                    <div className="col-span-12 lg:col-span-3">
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">{t('lengthShort')}</label>
                                        <input type="text" value={tempLength} onChange={(e) => setTempLength(e.target.value)} className="block w-full rounded-lg border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-11"/>
                                    </div>
                                    <div className="col-span-12 lg:col-span-3">
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">{t('heightShort')}</label>
                                        <input type="text" value={tempHeight} onChange={(e) => setTempHeight(e.target.value)} className="block w-full rounded-lg border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-11"/>
                                    </div>
                                </>
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
                                        {useDimensions && (
                                            <>
                                                <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">{t('lengthShort')}</th>
                                                <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">{t('heightShort')}</th>
                                            </>
                                        )}
                                        <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">{isModeTTC ? t('puTTCLabel') : t('puHTLabel')}</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">{isModeTTC ? t('totalTTCLabel') : t('totalHTLabel')}</th>
                                        <th className="px-4 py-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {lineItems.map(item => {
                                        const displayPrice = isModeTTC ? (item.unitPrice * (1 + item.vat/100)) : item.unitPrice;
                                        const itemQty = item.quantity;
                                        const itemLength = item.length || 1;
                                        const itemHeight = item.height || 1;
                                        const displayLineTotal = itemQty * itemLength * itemHeight * displayPrice;
                                        
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
                                                            onChange={(e) => updateLineItem(item.id, { length: parseDecimalInput(e.target.value) || 1 })}
                                                            className="w-16 p-1 text-center border-none focus:ring-0 text-xs font-bold bg-transparent"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-xs text-slate-600 font-bold">
                                                        <input 
                                                            type="text" 
                                                            value={formatDecimalForInput(item.height || 1, language)} 
                                                            onChange={(e) => updateLineItem(item.id, { height: parseDecimalInput(e.target.value) || 1 })}
                                                            className="w-16 p-1 text-center border-none focus:ring-0 text-xs font-bold bg-transparent"
                                                        />
                                                    </td>
                                                </>
                                            )}
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
                    <button onClick={handleClose} className="order-2 md:order-1 flex-1 md:flex-none px-6 py-3.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-all">{t('cancel')}</button>
                    <button onClick={handleSave} className="order-1 md:order-2 flex-1 md:flex-none px-10 py-3.5 text-sm font-bold text-white bg-emerald-600 border border-transparent rounded-xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 active:scale-95"><FileText size={18} /> {quoteToEdit ? t('update') : t('save')}</button>
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

export default CreateQuoteModal;
