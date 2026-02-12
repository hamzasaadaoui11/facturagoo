import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, ScanLine, Calculator, FileText, Loader2, AlertCircle } from 'lucide-react';
import { Client, Product, CreditNote, LineItem, CreditNoteStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface CreateCreditNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (creditNote: Omit<CreditNote, 'id'>, id?: string) => Promise<any> | void;
    clients: Client[];
    products: Product[];
    creditNoteToEdit?: CreditNote | null;
}

const CreateCreditNoteModal: React.FC<CreateCreditNoteModalProps> = ({ isOpen, onClose, onSave, clients, products, creditNoteToEdit }) => {
    const { t, isRTL, language } = useLanguage();
    const [isVisible, setIsVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [clientId, setClientId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [reason, setReason] = useState('');
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    
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
            setError(null);
            if (creditNoteToEdit) {
                setClientId(creditNoteToEdit.clientId);
                setDate(creditNoteToEdit.date);
                setReason(creditNoteToEdit.subject || '');
                setLineItems(JSON.parse(JSON.stringify(creditNoteToEdit.lineItems)));
            } else {
                setClientId('');
                setDate(new Date().toISOString().split('T')[0]);
                setReason('');
                setLineItems([]);
            }
            resetItemForm();
        } else {
            setIsVisible(false);
        }
    }, [isOpen, creditNoteToEdit]);

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

    useEffect(() => {
        if (selectedProductId) {
            const product = products.find(p => p.id === selectedProductId);
            if (product) {
                setTempName(product.name);
                setTempDesc(product.description || '');
                setTempPrice(product.salePrice);
                setTempVat(product.vat);
                setTempProductCode(product.productCode);
            }
        }
    }, [selectedProductId, products]);

    const handleAddItem = () => {
        if (!tempName) return;
        const newItem: LineItem = {
            id: `temp-${Date.now()}`,
            productId: selectedProductId || null,
            productCode: selectedProductId ? tempProductCode : undefined,
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
        const totalTTC = subTotal + vatAmount;
        return { subTotal, vatAmount, totalTTC };
    }, [lineItems]);

    const handleSave = async () => {
        if (!clientId || lineItems.length === 0) return;
        const client = clients.find(c => c.id === clientId);
        const clientNameDisplay = client ? (client.company || client.name) : 'Client inconnu';
        const creditNoteData: Omit<CreditNote, 'id'> = {
            clientId, clientName: clientNameDisplay, date, subject: reason, lineItems,
            status: creditNoteToEdit ? creditNoteToEdit.status : CreditNoteStatus.Draft,
            subTotal: totals.subTotal, vatAmount: totals.vatAmount, amount: totals.totalTTC, invoiceId: creditNoteToEdit?.invoiceId
        };
        setIsSubmitting(true);
        setError(null);
        try { await onSave(creditNoteData, creditNoteToEdit?.id); handleClose(); } catch (err: any) { setError(err.message || "Erreur."); } finally { setIsSubmitting(false); }
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 shadow-inner space-y-4">
                        <div className="flex items-center gap-3">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><ScanLine size={14}/> {t('items')}</h4>
                            <div className="h-px bg-slate-200 flex-1"></div>
                        </div>
                        
                        <div className="grid grid-cols-24 gap-3 items-end">
                            <div className="col-span-12 lg:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Réf.</label>
                                <input type="text" value={tempProductCode} onChange={(e) => setTempProductCode(e.target.value)} placeholder="Réf" className="block w-full rounded-lg border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-11"/>
                            </div>
                            <div className="col-span-12 lg:col-span-4">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Produit (Auto)</label>
                                <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="block w-full rounded-lg border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-11 bg-white">
                                    <option value="">-- {t('select')} --</option>
                                    {products.map(product => (<option key={product.id} value={product.id}>{product.name}</option>))}
                                </select>
                            </div>
                            <div className="col-span-24 lg:col-span-6">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Désignation *</label>
                                <input type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="Nom de l'article" className="block w-full rounded-lg border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-11 font-medium"/>
                            </div>
                            <div className="col-span-12 lg:col-span-3">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">P.U. HT</label>
                                <input type="number" value={tempPrice} onChange={(e) => setTempPrice(parseFloat(e.target.value) || 0)} className="block w-full rounded-lg border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-11"/>
                            </div>
                            <div className="col-span-12 lg:col-span-3">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Qté</label>
                                <input type="number" min="1" value={itemQuantity} onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)} className="block w-full rounded-lg border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-11"/>
                            </div>
                            <div className="col-span-12 lg:col-span-3">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">TVA</label>
                                <select value={tempVat} onChange={(e) => setTempVat(parseInt(e.target.value))} className="block w-full rounded-lg border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-11">
                                    <option value="20">20%</option><option value="14">14%</option><option value="10">10%</option><option value="7">7%</option><option value="0">0%</option>
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
                                        <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">{t('totalHT')}</th>
                                        <th className="px-4 py-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {lineItems.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="text-xs font-bold text-slate-900">{item.name}</div>
                                                {item.productCode && <div className="text-[10px] text-slate-400">{item.productCode}</div>}
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs text-slate-600 font-bold">{item.quantity}</td>
                                            <td className="px-4 py-3 text-right text-xs font-bold text-slate-900">{(item.quantity * item.unitPrice).toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR')}</td>
                                            <td className="px-4 py-3 text-center"><button onClick={() => handleRemoveItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={16}/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-400 text-sm italic">
                            {t('items')} (Vide)
                        </div>
                    )}

                    <div className="flex justify-end border-t border-slate-100 pt-6">
                        <div className="w-full max-w-sm space-y-3">
                            <div className="flex justify-between text-sm text-slate-500"><span>{t('totalHT')}</span><span>{totals.subTotal.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { style: 'currency', currency: 'MAD' })}</span></div>
                            <div className="flex justify-between text-sm text-slate-500"><span>{t('vat')}</span><span>{totals.vatAmount.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { style: 'currency', currency: 'MAD' })}</span></div>
                            <div className="h-px bg-slate-200 my-1"></div>
                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100"><span className="text-base font-bold text-slate-900">{t('totalTTC')}</span><span className="text-xl font-black text-emerald-700">{totals.totalTTC.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { style: 'currency', currency: 'MAD' })}</span></div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-end gap-3 px-4 md:px-6 py-4 bg-slate-50 border-t border-slate-200 md:rounded-b-3xl">
                    <button onClick={handleSave} disabled={isSubmitting} className="order-1 md:order-2 flex-1 md:flex-none px-10 py-3.5 text-sm font-bold text-white bg-emerald-600 border border-transparent rounded-xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">{isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />} {t('save')}</button>
                    <button onClick={handleClose} disabled={isSubmitting} className="order-2 md:order-1 flex-1 md:flex-none px-6 py-3.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-all">{t('cancel')}</button>
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