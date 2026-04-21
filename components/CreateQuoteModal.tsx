
import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, ScanLine, Calculator, FileText, Package, Square, Ruler, Weight, Hash, Tag, Coins, Layers } from 'lucide-react';
import { Client, Product, Quote, LineItem, QuoteStatus, CompanySettings } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { parseDecimalInput, formatDecimalForInput } from '../services/currencyService';
import SearchableProductSelect from './SearchableProductSelect';

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
    const [expiryDate, setExpiryDate] = useState('');
    const [subject, setSubject] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [purchaseOrderNumber, setPurchaseOrderNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [calculationMode, setCalculationMode] = useState<'piece' | 'm2' | 'ml' | 'kg' | 'days'>('piece');
    const [lineItems, setLineItems] = useState<LineItem[]>([]);

    const [showSubjectField, setShowSubjectField] = useState(false);
    const [showExpiryDateField, setShowExpiryDateField] = useState(false);
    const [showPurchaseOrderField, setShowPurchaseOrderField] = useState(false);
    const [showPaymentMethodField, setShowPaymentMethodField] = useState(false);
    
    const [selectedProductId, setSelectedProductId] = useState('');
    const [tempName, setTempName] = useState('');
    const [tempDesc, setTempDesc] = useState('');
    const [tempPrice, setTempPrice] = useState<string>('0');
    const [tempVat, setTempVat] = useState(20);
    const [itemQuantity, setItemQuantity] = useState<string>('1');
    const [tempDays, setTempDays] = useState<string>('1');
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
            if (quoteToEdit) {
                setClientId(quoteToEdit.clientId);
                setDate(quoteToEdit.date);
                const initialExpiryDate = quoteToEdit.expiryDate || quoteToEdit.lineItems[0]?.expiryDate || '';
                setExpiryDate(initialExpiryDate || new Date(new Date(quoteToEdit.date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                setShowExpiryDateField(!!initialExpiryDate);
                
                const initialSubject = quoteToEdit.subject || quoteToEdit.lineItems[0]?.subject || '';
                setSubject(initialSubject);
                setShowSubjectField(!!initialSubject);
                
                const initialPaymentMethod = quoteToEdit.paymentMethod || quoteToEdit.lineItems[0]?.paymentMethod || '';
                setPaymentMethod(initialPaymentMethod);
                setShowPaymentMethodField(!!initialPaymentMethod);
                
                const initialPO = quoteToEdit.purchaseOrderNumber || '';
                setPurchaseOrderNumber(initialPO);
                setShowPurchaseOrderField(!!initialPO);

                setNotes(quoteToEdit.notes || '');
                // Read calculationMode from first line item
                setCalculationMode(quoteToEdit.lineItems[0]?.calculationMode || 'piece');
                setLineItems(JSON.parse(JSON.stringify(quoteToEdit.lineItems)));
                setIsDiscountEnabled(!!quoteToEdit.discountValue && quoteToEdit.discountValue > 0);
                setDiscountType(quoteToEdit.discountType || 'percentage');
                setDiscountValue(quoteToEdit.discountValue ? formatDecimalForInput(quoteToEdit.discountValue, language) : '');
            } else {
                setClientId('');
                setDate(new Date().toISOString().split('T')[0]);
                setExpiryDate('');
                setShowExpiryDateField(false);
                setSubject('');
                setShowSubjectField(false);
                setPaymentMethod('');
                setShowPaymentMethodField(false);
                setPurchaseOrderNumber('');
                setShowPurchaseOrderField(false);
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
    }, [isOpen, quoteToEdit, language]);

    const resetItemForm = () => {
        setSelectedProductId('');
        setTempName('');
        setTempDesc('');
        setTempPrice('0');
        setTempVat(language === 'es' ? 21 : 20);
        setItemQuantity('1');
        setTempDays('1');
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
                setTempName(product.description || product.name);
                setTempDesc('');
                const priceToDisplay = isModeTTC ? (product.salePrice * (1 + product.vat / 100)) : product.salePrice;
                setTempPrice(formatDecimalForInput(priceToDisplay, language));
                setTempVat(product.vat);
                setTempProductCode(product.productCode);
            }
        }
    }, [selectedProductId, products, language, isModeTTC]);

    const isM2 = calculationMode === 'm2';
    const isML = calculationMode === 'ml';
    const isKg = calculationMode === 'kg';
    const isDays = calculationMode === 'days';
    const showLengthColumn = calculationMode === 'm2' || calculationMode === 'ml';
    const showHeightColumn = calculationMode === 'm2';
    const showDaysColumn = calculationMode === 'days';

    const getLineMultiplier = (item: LineItem) => {
        if (isM2) return (item.length || 1) * (item.height || 1);
        if (isML) return (item.length || 1);
        if (isKg) return (item.weight || 1);
        if (isDays) return (item.days || 1);
        return 1;
    };

    const handleAddItem = () => {
        try {
            if (!tempName) return;
            const qty = parseDecimalInput(itemQuantity);
            const inputPrice = parseDecimalInput(tempPrice);
            const vatValue = typeof tempVat === 'number' ? tempVat : 20;
            const price = isModeTTC ? (inputPrice / (1 + vatValue / 100)) : inputPrice;
            const length = showLengthColumn ? parseDecimalInput(tempLength) : 1;
            const height = showHeightColumn ? parseDecimalInput(tempHeight) : 1;
            const weight = isKg ? parseDecimalInput(tempWeight) : 1;
            const days = isDays ? parseDecimalInput(tempDays) : 1;

            const newItem: LineItem = {
                id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                productId: selectedProductId || null,
                productCode: tempProductCode || '',
                name: tempName,
                description: tempDesc || '',
                quantity: qty || 1,
                length: length || 1,
                height: height || 1,
                weight: weight || 1,
                days: days || 1,
                unitPrice: price || 0,
                vat: vatValue
            };
            setLineItems(prev => [...(prev || []), newItem]);
            resetItemForm();
        } catch (error) {
            console.error("Error in handleAddItem:", error);
            alert("Erreur lors de l'ajout de l'article. Veuillez vérifier les données saisies.");
        }
    };

    const handleRemoveItem = (id: string) => {
        setLineItems(prev => prev.filter(item => item.id !== id));
    };

    const updateLineItem = (id: string, updatedField: Partial<LineItem>) => {
        setLineItems(prev => prev.map(item => item.id === id ? { ...item, ...updatedField } : item));
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

        const totalTTC = subTotalAfterDiscount + vatAmountAfterDiscount;
        return { subTotal, vatAmount: vatAmountAfterDiscount, totalTTC, discountAmount };
    }, [lineItems, isDiscountEnabled, discountType, discountValue, language, calculationMode]);

    const handleSave = () => {
        if (!clientId || lineItems.length === 0) return;
        const client = clients.find(c => c.id === clientId);
        const clientNameDisplay = client ? (client.company || client.name) : 'Client inconnu';

        // Store metadata in the first line item to avoid schema changes
        const updatedLineItems = [...lineItems];
        if (updatedLineItems.length > 0) {
            updatedLineItems[0] = { 
                ...updatedLineItems[0], 
                calculationMode,
                subject: showSubjectField ? subject : undefined,
                expiryDate: showExpiryDateField ? expiryDate : undefined,
                notes,
                paymentMethod: showPaymentMethodField ? paymentMethod : undefined
            };
        }

        const quoteData = {
            clientId, clientName: clientNameDisplay, date, 
            expiryDate: showExpiryDateField ? expiryDate : undefined, 
            subject: showSubjectField ? subject : undefined, 
            paymentMethod: showPaymentMethodField ? paymentMethod : undefined,
            purchaseOrderNumber: showPurchaseOrderField ? purchaseOrderNumber : undefined,
            notes,
            lineItems: updatedLineItems,
            status: quoteToEdit ? quoteToEdit.status : QuoteStatus.Draft,
            subTotal: totals.subTotal, 
            vatAmount: totals.vatAmount,
            amount: totals.totalTTC,
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

                <div className="px-3 md:px-6 py-5 overflow-y-auto custom-scrollbar flex-1 space-y-6 pb-24 md:pb-8">
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
                        
                        {showExpiryDateField ? (
                            <div className="space-y-1">
                                <label className="block text-sm font-bold text-slate-700 ml-1">{t('expiryDate')}</label>
                                <div className="relative">
                                    <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12 pr-10"/>
                                    <button 
                                        type="button"
                                        onClick={() => { setExpiryDate(''); setShowExpiryDateField(false); }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-end pb-2">
                                <button 
                                    type="button"
                                    onClick={() => {
                                        if (!expiryDate) {
                                            setExpiryDate(new Date(new Date(date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                                        }
                                        setShowExpiryDateField(true);
                                    }}
                                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <Plus size={14} /> {t('addExpiryDate')}
                                </button>
                            </div>
                        )}

                        {showSubjectField ? (
                            <div className="space-y-1">
                                <label className="block text-sm font-bold text-slate-700 ml-1">{t('subject')}</label>
                                <div className="relative">
                                    <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('subject')} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12 pr-10"/>
                                    <button 
                                        type="button"
                                        onClick={() => { setSubject(''); setShowSubjectField(false); }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-end pb-2">
                                <button 
                                    type="button"
                                    onClick={() => setShowSubjectField(true)}
                                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <Plus size={14} /> {t('addSubject')}
                                </button>
                            </div>
                        )}

                        {showPurchaseOrderField ? (
                            <div className="space-y-1">
                                <label className="block text-sm font-bold text-slate-700 ml-1">{t('purchaseOrderNumber')}</label>
                                <div className="relative">
                                    <input type="text" value={purchaseOrderNumber} onChange={(e) => setPurchaseOrderNumber(e.target.value)} placeholder={t('purchaseOrderNumber')} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12 pr-10"/>
                                    <button 
                                        type="button"
                                        onClick={() => { setPurchaseOrderNumber(''); setShowPurchaseOrderField(false); }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-end pb-2">
                                <button 
                                    type="button"
                                    onClick={() => setShowPurchaseOrderField(true)}
                                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <Plus size={14} /> {t('addPurchaseOrderNumber')}
                                </button>
                            </div>
                        )}

                        {showPaymentMethodField ? (
                            <div className="space-y-1">
                                <label className="block text-sm font-bold text-slate-700 ml-1">{t('paymentMethod')}</label>
                                <div className="relative">
                                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12 pr-10">
                                        <option value="">-- {t('select')} --</option>
                                        <option value="Virement">Virement</option>
                                        <option value="Chèque">Chèque</option>
                                        <option value="Espèces">Espèces</option>
                                        <option value="Carte Bancaire">Carte Bancaire</option>
                                    </select>
                                    <button 
                                        type="button"
                                        onClick={() => { setPaymentMethod(''); setShowPaymentMethodField(false); }}
                                        className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-end pb-2">
                                <button 
                                    type="button"
                                    onClick={() => setShowPaymentMethodField(true)}
                                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <Plus size={14} /> {t('addPaymentMethod')}
                                </button>
                            </div>
                        )}

                        <div className="md:col-span-2 space-y-2">
                            <label className="block text-sm font-bold text-slate-700 ml-1">Mode de calcul</label>
                            <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 w-fit">
                                {[
                                    { id: 'piece', label: 'Par pièce', icon: Package },
                                    { id: 'm2', label: 'Par m² (Larg x Haut)', icon: Square },
                                    { id: 'ml', label: 'Par mètre linéaire', icon: Ruler },
                                    { id: 'kg', label: 'Par kg', icon: Weight },
                                    { id: 'days', label: 'Par Jour', icon: Calculator }
                                ].map((mode) => (
                                    <button
                                        key={mode.id}
                                        type="button"
                                        onClick={() => setCalculationMode(mode.id as any)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                            calculationMode === mode.id 
                                            ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200' 
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                                        }`}
                                    >
                                        <mode.icon size={14} />
                                        {mode.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                    <Layers size={18} />
                                </div>
                                <h4 className="text-sm font-bold text-slate-800 tracking-tight">{t('items')}</h4>
                            </div>
                            <div className="h-px bg-slate-100 flex-1 mx-6 hidden md:block"></div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-24 gap-4 items-end">
                            <div className="col-span-1 md:col-span-12 lg:col-span-2">
                                <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">
                                    <Hash size={10} /> {t('refLabel')}
                                </label>
                                <input 
                                    type="text" 
                                    value={tempProductCode} 
                                    onChange={(e) => setTempProductCode(e.target.value)} 
                                    placeholder={t('reference')} 
                                    className="block w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 focus:bg-white text-xs h-12 transition-all"
                                />
                            </div>
                            <div className="col-span-1 md:col-span-12 lg:col-span-4">
                                <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">
                                    <Package size={10} /> {t('productAutoLabel')}
                                </label>
                                <SearchableProductSelect 
                                    products={products}
                                    selectedProductId={selectedProductId}
                                    onSelect={setSelectedProductId}
                                    placeholder={`-- ${t('select')} --`}
                                />
                            </div>
                            <div className="col-span-1 md:col-span-24 lg:col-span-6">
                                <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">
                                    <Tag size={10} /> {t('designationLabel')} *
                                </label>
                                <input 
                                    type="text" 
                                    value={tempName} 
                                    onChange={(e) => setTempName(e.target.value)} 
                                    placeholder={t('description')} 
                                    className="block w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 focus:bg-white text-[11px] h-12 font-medium transition-all"
                                />
                            </div>
                            <div className="col-span-1 md:col-span-12 lg:col-span-3">
                                <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">
                                    <Coins size={10} /> {isModeTTC ? t('puTTCLabel') : t('puHTLabel')}
                                </label>
                                <input 
                                    type="text" 
                                    value={tempPrice} 
                                    onChange={(e) => setTempPrice(e.target.value)} 
                                    className="block w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 focus:bg-white text-xs h-12 transition-all font-mono"
                                />
                            </div>
                            <div className="col-span-1 md:col-span-12 lg:col-span-3">
                                <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">
                                    <Calculator size={10} /> {t('quantity')}
                                </label>
                                <input 
                                    type="text" 
                                    value={itemQuantity} 
                                    onChange={(e) => setItemQuantity(e.target.value)} 
                                    className="block w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 focus:bg-white text-xs h-12 transition-all"
                                />
                            </div>
                            {showLengthColumn && (
                                <div className="col-span-1 md:col-span-12 lg:col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">{calculationMode === 'm2' ? 'Larg.' : 'Long.'}</label>
                                    <input 
                                        type="text" 
                                        value={tempLength} 
                                        onChange={(e) => setTempLength(e.target.value)} 
                                        className="block w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 focus:bg-white text-xs h-12 transition-all"
                                    />
                                </div>
                            )}
                            {showHeightColumn && (
                                <div className="col-span-1 md:col-span-12 lg:col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">Haut.</label>
                                    <input 
                                        type="text" 
                                        value={tempHeight} 
                                        onChange={(e) => setTempHeight(e.target.value)} 
                                        className="block w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 focus:bg-white text-xs h-12 transition-all"
                                    />
                                </div>
                            )}
                            {isKg && (
                                <div className="col-span-1 md:col-span-12 lg:col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">Poids (kg)</label>
                                    <input 
                                        type="text" 
                                        value={tempWeight} 
                                        onChange={(e) => setTempWeight(e.target.value)} 
                                        className="block w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 focus:bg-white text-xs h-12 transition-all"
                                    />
                                </div>
                            )}
                            {isDays && (
                                <div className="col-span-1 md:col-span-12 lg:col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">{t('uDay')}</label>
                                    <input 
                                        type="text" 
                                        value={tempDays} 
                                        onChange={(e) => setTempDays(e.target.value)} 
                                        className="block w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 focus:bg-white text-xs h-12 transition-all font-mono"
                                    />
                                </div>
                            )}
                            <div className="col-span-1 md:col-span-12 lg:col-span-3">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">{t('vat')}</label>
                                <select 
                                    value={tempVat} 
                                    onChange={(e) => setTempVat(parseInt(e.target.value))} 
                                    className="block w-full rounded-xl border-slate-200 bg-slate-50/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 focus:bg-white text-xs h-12 transition-all"
                                >
                                    {vatOptions.map(v => <option key={v} value={v}>{v}%</option>)}
                                </select>
                            </div>
                            <div className="col-span-1 md:col-span-24 lg:col-span-3">
                                <button 
                                    onClick={handleAddItem} 
                                    className="w-full inline-flex items-center justify-center h-12 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-200 transition-all active:scale-[0.98] text-sm font-bold gap-2"
                                >
                                    <Plus size={18} /> {t('add')}
                                </button>
                            </div>
                        </div>
                    </div>

                    {lineItems.length > 0 ? (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block border border-slate-200 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">{t('refLabel')}</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">{t('description')}</th>
                                            <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">{t('quantity')}</th>
                                            {showLengthColumn && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">{calculationMode === 'm2' ? 'Larg.' : 'Long.'}</th>}
                                            {showHeightColumn && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Haut.</th>}
                                            {isKg && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Poids (kg)</th>}
                                            {isM2 && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">M²</th>}
                                            {isML && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">ML</th>}
                                            {isKg && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Total kg</th>}
                                            {isDays && <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">{t('uDay')}</th>}
                                            <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">{isModeTTC ? t('puTTCLabel') : t('puHTLabel')}</th>
                                            <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">{isModeTTC ? t('totalTTCLabel') : t('totalHTLabel')}</th>
                                            <th className="px-4 py-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                        {(lineItems || []).map(item => {
                                            const itemVat = typeof item.vat === 'number' ? item.vat : 20;
                                            const displayPrice = isModeTTC ? (item.unitPrice * (1 + itemVat/100)) : item.unitPrice;
                                            const displayLineTotal = (item.quantity || 0) * getLineMultiplier(item) * (displayPrice || 0);
                                            
                                            return (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <input 
                                                        type="text" 
                                                        value={item.productCode || ''} 
                                                        onChange={(e) => updateLineItem(item.id, { productCode: e.target.value })}
                                                        placeholder={t('refLabel')}
                                                        className="w-full p-1 text-left border-none focus:ring-0 text-[11px] font-mono bg-transparent"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input 
                                                        type="text" 
                                                        value={item.name || ''} 
                                                        onChange={(e) => updateLineItem(item.id, { name: e.target.value })}
                                                        placeholder={t('designationLabel')}
                                                        className="w-full p-1 text-left border-none focus:ring-0 text-[11px] font-bold text-slate-900 bg-transparent"
                                                    />
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
                                            {isDays && (
                                                <td className="px-4 py-3 text-center text-xs text-slate-600 font-bold">
                                                    <input 
                                                        type="text" 
                                                        value={formatDecimalForInput(item.days || 1, language)} 
                                                        onChange={(e) => updateLineItem(item.id, { days: parseDecimalInput(e.target.value) })}
                                                        className="w-12 p-1 text-center border-none focus:ring-0 text-xs font-bold bg-transparent font-mono"
                                                    />
                                                </td>
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

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-4">
                                {(lineItems || []).map(item => {
                                    const itemVat = typeof item.vat === 'number' ? item.vat : 20;
                                    const displayPrice = isModeTTC ? (item.unitPrice * (1 + itemVat/100)) : item.unitPrice;
                                    const displayLineTotal = (item.quantity || 0) * getLineMultiplier(item) * (displayPrice || 0);
                                    
                                    return (
                                        <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 space-y-2">
                                                    <div>
                                                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t('designationLabel')}</label>
                                                        <input 
                                                            type="text" 
                                                            value={item.name || ''} 
                                                            onChange={(e) => updateLineItem(item.id, { name: e.target.value })}
                                                            placeholder={t('designationLabel')}
                                                            className="w-full h-8 rounded-lg border-slate-200 bg-white text-sm font-bold px-2 mt-0.5"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t('refLabel')}</label>
                                                        <input 
                                                            type="text" 
                                                            value={item.productCode || ''} 
                                                            onChange={(e) => updateLineItem(item.id, { productCode: e.target.value })}
                                                            placeholder={t('refLabel')}
                                                            className="w-full h-8 rounded-lg border-slate-200 bg-white text-[11px] font-mono px-2 mt-0.5"
                                                        />
                                                    </div>
                                                </div>
                                                <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('quantity')}</label>
                                                    <input 
                                                        type="text" 
                                                        value={formatDecimalForInput(item.quantity, language)} 
                                                        onChange={(e) => updateLineItem(item.id, { quantity: parseDecimalInput(e.target.value) })}
                                                        className="w-full h-10 rounded-lg border-slate-200 bg-white text-sm font-bold px-3"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isModeTTC ? t('puTTCLabel') : t('puHTLabel')}</label>
                                                    <input 
                                                        type="text" 
                                                        value={formatDecimalForInput(displayPrice, language)} 
                                                        onChange={(e) => {
                                                            const val = parseDecimalInput(e.target.value);
                                                            updateLineItem(item.id, { unitPrice: isModeTTC ? (val / (1 + item.vat/100)) : val });
                                                        }}
                                                        className="w-full h-10 rounded-lg border-slate-200 bg-white text-sm font-bold px-3"
                                                    />
                                                </div>
                                            </div>

                                            {(showLengthColumn || showHeightColumn || isKg) && (
                                                <div className="grid grid-cols-3 gap-3">
                                                    {showLengthColumn && (
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Long.</label>
                                                            <input 
                                                                type="text" 
                                                                value={formatDecimalForInput(item.length || 1, language)} 
                                                                onChange={(e) => updateLineItem(item.id, { length: parseDecimalInput(e.target.value) })}
                                                                className="w-full h-10 rounded-lg border-slate-200 bg-white text-sm font-bold px-3"
                                                            />
                                                        </div>
                                                    )}
                                                    {showHeightColumn && (
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Haut.</label>
                                                            <input 
                                                                type="text" 
                                                                value={formatDecimalForInput(item.height || 1, language)} 
                                                                onChange={(e) => updateLineItem(item.id, { height: parseDecimalInput(e.target.value) })}
                                                                className="w-full h-10 rounded-lg border-slate-200 bg-white text-sm font-bold px-3"
                                                            />
                                                        </div>
                                                    )}
                                                    {isKg && (
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Poids</label>
                                                            <input 
                                                                type="text" 
                                                                value={formatDecimalForInput(item.weight || 1, language)} 
                                                                onChange={(e) => updateLineItem(item.id, { weight: parseDecimalInput(e.target.value) })}
                                                                className="w-full h-10 rounded-lg border-slate-200 bg-white text-sm font-bold px-3"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</div>
                                                <div className="text-sm font-black text-emerald-600">
                                                    {displayLineTotal.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { minimumFractionDigits: 2 })} MAD
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-400 text-sm italic">
                            {t('items')} ({language === 'ar' ? 'فارغ' : 'Vide'})
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 pt-6">
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1">{t('remarque')}</label>
                            <textarea 
                                value={notes} 
                                onChange={(e) => setNotes(e.target.value)} 
                                placeholder={t('remarque')} 
                                className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs min-h-[60px] py-2 px-3"
                            />
                        </div>
                        <div className="flex justify-end">
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
                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100"><span className="text-base font-bold text-slate-900">{t('totalTTC')}</span><span className="text-xl font-black text-emerald-700">{totals.totalTTC.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { style: 'currency', currency: 'MAD' })}</span></div>
                        </div>
                    </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-end gap-3 px-4 md:px-6 py-4 bg-slate-50 border-t border-slate-200 md:rounded-b-3xl">
                    <button onClick={handleClose} className="order-2 md:order-1 flex-1 md:flex-none px-6 py-3.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-all">{t('cancel')}</button>
                    <button onClick={handleSave} className="order-1 md:order-2 flex-1 md:flex-none px-10 py-3.5 text-sm font-bold text-white bg-emerald-600 border border-transparent rounded-xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 active:scale-95"><FileText size={18} /> {quoteToEdit ? t('update') : t('save')}</button>
                </div>
            </div>
        </div>
    );
};

export default CreateQuoteModal;
