import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, ScanLine, Calculator, CreditCard, Loader2 } from 'lucide-react';
import { Client, Product, DeliveryNote, LineItem } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface CreateDeliveryNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (note: Omit<DeliveryNote, 'id'>, id?: string) => Promise<any> | void;
    clients: Client[];
    products: Product[];
    noteToEdit?: DeliveryNote | null;
}

const CreateDeliveryNoteModal: React.FC<CreateDeliveryNoteModalProps> = ({ isOpen, onClose, onSave, clients, products, noteToEdit }) => {
    const { t, isRTL } = useLanguage();
    const [isVisible, setIsVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [clientId, setClientId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    
    const [selectedProductId, setSelectedProductId] = useState('');
    const [tempName, setTempName] = useState('');
    const [tempDesc, setTempDesc] = useState('');
    const [tempPrice, setTempPrice] = useState(0);
    const [tempVat, setTempVat] = useState(20);
    const [itemQuantity, setItemQuantity] = useState(1);
    const [tempProductCode, setTempProductCode] = useState('');
    
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState('Espèces');

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setIsVisible(true), 10);
            if (noteToEdit) {
                setClientId(noteToEdit.clientId);
                setDate(noteToEdit.date);
                setLineItems(noteToEdit.lineItems);
                setPaymentAmount(noteToEdit.paymentAmount || 0);
                setPaymentMethod(noteToEdit.paymentMethod || 'Espèces');
            } else {
                setClientId('');
                setDate(new Date().toISOString().split('T')[0]);
                setLineItems([]);
                setPaymentAmount(0);
            }
            resetItemForm();
        } else {
            setIsVisible(false);
        }
    }, [isOpen, noteToEdit]);

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
            productCode: tempProductCode,
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

    useEffect(() => { if (!noteToEdit) setPaymentAmount(totals.totalTTC); }, [totals.totalTTC, noteToEdit]);

    const handleSave = async () => {
        if (!clientId || lineItems.length === 0) return;
        const client = clients.find(c => c.id === clientId);
        const clientNameDisplay = client ? (client.company || client.name) : 'Client inconnu';
        setIsSubmitting(true);
        try {
            await onSave({
                clientId, clientName: clientNameDisplay, date, lineItems, status: 'Livré',
                subTotal: totals.subTotal, vatAmount: totals.vatAmount, totalAmount: totals.totalTTC,
                paymentAmount, paymentMethod, invoiceId: noteToEdit?.invoiceId
            }, noteToEdit?.id);
            handleClose();
        } catch (error) { console.error(error); } finally { setIsSubmitting(false); }
    };

    const remainingAmount = totals.totalTTC - paymentAmount;
    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`} aria-modal="true">
            <div className="absolute inset-0 bg-neutral-900/75 backdrop-blur-sm" onClick={handleClose}></div>
            <div className={`relative w-full md:max-w-6xl bg-white md:rounded-xl shadow-2xl transition-all duration-200 ease-in-out flex flex-col h-full md:h-auto md:max-h-[95vh] ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
                    <div>
                        <h3 className="text-lg font-bold text-neutral-900">{noteToEdit ? t('editQuote') : t('newDeliveryNote')}</h3>
                        <p className="text-xs text-neutral-500">{noteToEdit ? `#${noteToEdit.documentId || noteToEdit.id}` : ''}</p>
                    </div>
                    <button onClick={handleClose} className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded-full hover:bg-neutral-100 transition-colors"><X size={24} /></button>
                </div>

                <div className="px-6 py-5 overflow-y-auto custom-scrollbar space-y-6 flex-1 pb-24 md:pb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-neutral-700 mb-1">{t('client')} *</label>
                            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-10 bg-white">
                                <option value="">-- {t('select')} --</option>
                                {clients.map(client => (<option key={client.id} value={client.id}>{client.company || client.name}</option>))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-neutral-700 mb-1">{t('date')} *</label>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-10"/>
                        </div>
                    </div>

                    <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 shadow-inner space-y-4">
                        <div className="flex items-center gap-3">
                            <h4 className="text-[11px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-1.5"><ScanLine size={14}/> {t('items')}</h4>
                            <div className="h-px bg-neutral-200 flex-1"></div>
                        </div>
                        
                        <div className="grid grid-cols-24 gap-2 items-end">
                            <div className="col-span-24 md:col-span-2">
                                <label className="block text-[10px] font-bold text-neutral-500 mb-1 uppercase truncate">Réf.</label>
                                <input type="text" value={tempProductCode} onChange={(e) => setTempProductCode(e.target.value)} placeholder="Réf" className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-9 text-left"/>
                            </div>
                            <div className="col-span-24 md:col-span-4">
                                <label className="block text-[10px] font-bold text-neutral-500 mb-1 uppercase truncate">Produit (Auto)</label>
                                <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-9 bg-white">
                                    <option value="">-- {t('select')} --</option>
                                    {products.map(product => (<option key={product.id} value={product.id}>{product.name}</option>))}
                                </select>
                            </div>
                            <div className="col-span-24 md:col-span-8">
                                <label className="block text-[10px] font-bold text-neutral-500 mb-1 uppercase">Désignation *</label>
                                <input type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="Nom de l'article" className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-9 font-medium text-left"/>
                            </div>
                            <div className="col-span-24 md:col-span-3">
                                <label className="block text-[10px] font-bold text-neutral-500 mb-1 uppercase">P.U. HT</label>
                                <input type="number" value={tempPrice} onChange={(e) => setTempPrice(parseFloat(e.target.value) || 0)} className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-9 text-left"/>
                            </div>
                            <div className="col-span-12 md:col-span-2">
                                <label className="block text-[10px] font-bold text-neutral-500 mb-1 uppercase truncate">Qté</label>
                                <input type="number" min="1" value={itemQuantity} onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)} className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-9 text-left"/>
                            </div>
                            <div className="col-span-12 md:col-span-2">
                                <label className="block text-[10px] font-bold text-neutral-500 mb-1 uppercase truncate">TVA</label>
                                <select value={tempVat} onChange={(e) => setTempVat(parseInt(e.target.value))} className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-9">
                                    <option value="20">20%</option><option value="14">14%</option><option value="10">10%</option><option value="7">7%</option><option value="0">0%</option>
                                </select>
                            </div>
                            <div className="col-span-24 md:col-span-3">
                                <button onClick={handleAddItem} className="w-full inline-flex items-center justify-center h-9 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md active:scale-95 text-xs font-bold gap-2">
                                    <Plus size={18} /> {t('add')}
                                </button>
                            </div>
                        </div>
                    </div>

                    {lineItems.length > 0 ? (
                        <div className="border border-neutral-200 rounded-lg overflow-hidden shadow-sm overflow-x-auto">
                            <table className="min-w-full divide-y divide-neutral-200">
                                <thead className="bg-neutral-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-[10px] font-bold text-neutral-500 uppercase">{t('reference')}</th>
                                        <th className="px-4 py-2 text-left text-[10px] font-bold text-neutral-500 uppercase">{t('description')}</th>
                                        <th className="px-4 py-2 text-left text-[10px] font-bold text-neutral-500 uppercase">{t('quantity')}</th>
                                        <th className="px-4 py-2 text-left text-[10px] font-bold text-neutral-500 uppercase">{t('unitPrice')}</th>
                                        <th className="px-4 py-2 text-left text-[10px] font-bold text-neutral-500 uppercase">{t('totalHT')}</th>
                                        <th className="px-4 py-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-neutral-200">
                                    {lineItems.map(item => (
                                        <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                                            <td className="px-4 py-2 text-xs text-neutral-500 rtl:text-right">{item.productCode || '-'}</td>
                                            <td className="px-4 py-2 text-xs text-neutral-900 rtl:text-right font-medium">{item.name}</td>
                                            <td className="px-4 py-2 text-xs text-left text-neutral-600 font-bold">{item.quantity}</td>
                                            <td className="px-4 py-2 text-xs text-left text-neutral-600">{item.unitPrice.toLocaleString('fr-FR')}</td>
                                            <td className="px-4 py-2 text-xs text-left font-bold text-neutral-900">{(item.quantity * item.unitPrice).toLocaleString('fr-FR')}</td>
                                            <td className="px-4 py-2 text-center"><button onClick={() => handleRemoveItem(item.id)} className="text-neutral-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (<div className="text-center py-10 bg-neutral-50 rounded-lg border border-dashed border-neutral-300 text-neutral-400 text-xs">{t('items')}</div>)}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-neutral-200 pt-6">
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-neutral-900 flex items-center gap-2 uppercase tracking-widest"><CreditCard size={14} className="text-emerald-600"/> {t('paymentMethod')}</h4>
                            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm space-y-3">
                                <div><label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">{t('paymentAmount')}</label><div className="relative"><input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)} className={`block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm font-bold h-10 ${isRTL ? 'pr-3 pl-14' : 'pl-3 pr-14'}`} placeholder="0.00"/><div className={`pointer-events-none absolute inset-y-0 flex items-center ${isRTL ? 'left-0 pl-3' : 'right-0 pr-3'}`}><span className="text-neutral-400 font-bold text-xs">MAD</span></div></div></div>
                                <div><label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">{t('paymentMethod')}</label><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-10 bg-white"><option>Espèces</option><option>Chèque</option><option>Virement</option><option>Carte Bancaire</option></select></div>
                            </div>
                        </div>
                        <div className="space-y-3">
                             <div className="flex justify-between text-xs text-neutral-500"><span>{t('totalHT')}</span><span>{totals.subTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span></div>
                            <div className="flex justify-between text-xs text-neutral-500"><span>{t('vat')}</span><span>{totals.vatAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span></div>
                            <div className="h-px bg-neutral-200 my-1"></div>
                            <div className="flex justify-between items-center text-neutral-900 font-bold"><span className="text-sm">{t('totalTTC')}</span><span className="text-base">{totals.totalTTC.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span></div>
                            <div className={`mt-4 p-4 rounded-xl border-2 ${remainingAmount > 0 ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}><div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase tracking-widest">{t('remaining')}</span><span className="text-xl font-black">{remainingAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span></div></div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 px-6 py-4 bg-neutral-50 border-t border-neutral-200 md:rounded-b-xl">
                     <button onClick={handleClose} disabled={isSubmitting} className="px-5 py-2 text-sm font-bold text-neutral-600 bg-white border border-neutral-300 rounded-lg shadow-sm hover:bg-neutral-50 disabled:opacity-50">{t('cancel')}</button>
                    <button onClick={handleSave} disabled={isSubmitting} className="px-7 py-2 text-sm font-bold text-white bg-emerald-600 border border-transparent rounded-lg shadow-md hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95">{isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />} {isSubmitting ? t('save') : t('save')}</button>
                </div>
            </div>
            <style>{`
                .grid-cols-24 { grid-template-columns: repeat(24, minmax(0, 1fr)); }
                @media (min-width: 768px) {
                    .md\\:col-span-2 { grid-column: span 2 / span 2; }
                    .md\\:col-span-4 { grid-column: span 4 / span 4; }
                    .md\\:col-span-8 { grid-column: span 8 / span 8; }
                    .md\\:col-span-3 { grid-column: span 3 / span 3; }
                }
            `}</style>
        </div>
    );
};

export default CreateDeliveryNoteModal;