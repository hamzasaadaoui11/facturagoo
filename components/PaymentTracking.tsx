
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Header from './Header';
import { Invoice, Payment, InvoiceStatus, Client } from '../types';
import { Search, CreditCard, AlertCircle, CheckCircle, PieChart, DollarSign, Users, X, MoreVertical, ChevronDown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface PaymentTrackingProps {
    invoices: Invoice[];
    payments: Payment[];
    onAddPayment: (payment: Omit<Payment, 'id'>) => void;
    clients: Client[];
}

const PaymentTracking: React.FC<PaymentTrackingProps> = ({ invoices, payments, onAddPayment, clients }) => {
    const { t, isRTL, language } = useLanguage();
    const [activeTab, setActiveTab] = useState<'outstanding' | 'partial' | 'paid'>('outstanding');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    
    // Payment Modal State
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'Virement' | 'Chèque' | 'Espèces' | 'Carte Bancaire'>('Virement');

    // Action Menu State
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<{top: number, left: number, transformOrigin: string} | null>(null);

    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        if(activeMenuId) {
            document.addEventListener('click', handleClickOutside);
            window.addEventListener('scroll', handleClickOutside, true);
        }
        return () => {
            document.removeEventListener('click', handleClickOutside);
            window.removeEventListener('scroll', handleClickOutside, true);
        };
    }, [activeMenuId]);

    const toggleMenu = (e: React.MouseEvent, invoice: Invoice) => {
        e.stopPropagation();
        if (activeMenuId === invoice.id) {
            setActiveMenuId(null);
            setMenuPosition(null);
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const menuHeight = 160; 
            const menuWidth = 192; 
            
            let top: number;
            let transformOrigin: string;
            
            if (rect.bottom + menuHeight > viewportHeight) {
                top = rect.top + window.scrollY - menuHeight - 5;
                transformOrigin = isRTL ? 'bottom left' : 'bottom right';
            } else {
                top = rect.bottom + window.scrollY + 5;
                transformOrigin = isRTL ? 'top left' : 'top right';
            }

            let left: number;
            if (isRTL) {
                left = rect.left + window.scrollX;
            } else {
                left = rect.right + window.scrollX - menuWidth;
            }

            setActiveMenuId(invoice.id);
            setMenuPosition({ top, left: Math.max(10, left), transformOrigin });
        }
    };

    const stats = useMemo(() => {
        let totalPaid = 0;
        let totalRemaining = 0;
        let partialRemaining = 0;

        const targetInvoices = selectedClientId 
            ? invoices.filter(inv => inv.clientId === selectedClientId && inv.status !== InvoiceStatus.Draft)
            : invoices.filter(inv => inv.status !== InvoiceStatus.Draft);

        targetInvoices.forEach(inv => {
            const paid = inv.amountPaid || 0;
            const remaining = Math.max(0, inv.amount - paid);

            totalPaid += paid;
            totalRemaining += remaining;

            if (inv.status === InvoiceStatus.Partial) {
                partialRemaining += remaining;
            }
        });

        return { totalPaid, totalRemaining, partialRemaining };
    }, [invoices, selectedClientId]);

    const filteredInvoices = useMemo(() => {
        let filtered = invoices.filter(inv => inv.status !== InvoiceStatus.Draft);

        // Filter by Client
        if (selectedClientId) {
            filtered = filtered.filter(inv => inv.clientId === selectedClientId);
        }

        // Filter by Tab
        if (activeTab === 'outstanding') {
            filtered = filtered.filter(inv => 
                inv.status === InvoiceStatus.Pending || 
                inv.status === InvoiceStatus.Overdue || 
                inv.status === InvoiceStatus.Partial
            );
        } else if (activeTab === 'partial') {
            filtered = filtered.filter(inv => inv.status === InvoiceStatus.Partial);
        } else if (activeTab === 'paid') {
            filtered = filtered.filter(inv => inv.status === InvoiceStatus.Paid);
        }

        // Filter by Search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(inv => 
                (inv.clientName || '').toLowerCase().includes(term) ||
                (inv.documentId || inv.id).toLowerCase().includes(term)
            );
        }

        return filtered;
    }, [invoices, activeTab, searchTerm, selectedClientId]);

    const handleOpenPayment = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        const remaining = invoice.amount - (invoice.amountPaid || 0);
        setPaymentAmount(remaining);
        setActiveMenuId(null);
    };

    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInvoice) return;

        onAddPayment({
            invoiceId: selectedInvoice.id,
            invoiceNumber: selectedInvoice.documentId || selectedInvoice.id,
            clientId: selectedInvoice.clientId,
            clientName: selectedInvoice.clientName,
            date: new Date().toISOString().split('T')[0],
            amount: paymentAmount,
            method: paymentMethod
        });

        setSelectedInvoice(null);
    };

    const currencyCode = 'MAD';
    const locale = language === 'es' ? 'es-ES' : (language === 'ar' ? 'ar-MA' : 'fr-FR');

    return (
        <div dir={isRTL ? 'rtl' : 'ltr'} className="pb-20">
            <Header title={t('paymentTracking')} />

            {/* Selection Client et Barre de recherche */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row gap-6 items-end">
                <div className="w-full md:w-1/3 space-y-1.5">
                    <label className="block text-xs font-black text-slate-400 uppercase ml-1 flex items-center gap-1.5">
                        <Users size={14} className="text-emerald-600"/> {t('client')}
                    </label>
                    <div className="relative">
                        <select 
                            value={selectedClientId} 
                            onChange={(e) => setSelectedClientId(e.target.value)}
                            className="block w-full rounded-xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-12 transition-all appearance-none pr-10 rtl:pl-10 rtl:pr-3"
                        >
                            <option value="">{language === 'es' ? 'Todos los clientes' : 'Tous les clients'}</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.company || c.name}</option>
                            ))}
                        </select>
                        <div className={`pointer-events-none absolute inset-y-0 flex items-center px-3 ${isRTL ? 'left-0' : 'right-0'}`}>
                            <ChevronDown size={16} className="text-slate-400" />
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-2/3 space-y-1.5">
                    <label className="block text-xs font-black text-slate-400 uppercase ml-1 flex items-center gap-1.5">
                        <Search size={14} className="text-emerald-600"/> {t('search')}
                    </label>
                    <div className="relative">
                        <div className={`pointer-events-none absolute inset-y-0 flex items-center ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'}`}>
                            <Search className="h-5 w-5 text-slate-300" aria-hidden="true" />
                        </div>
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={t('searchPaymentPlaceholder')}
                            className={`block w-full rounded-xl border-slate-200 bg-slate-50 py-3 text-slate-900 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm ${isRTL ? 'pr-10' : 'pl-10'}`}
                        />
                    </div>
                </div>
            </div>

            {/* KPI Cards Dynamiques par Client */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all">
                    <div>
                        <p className="text-sm font-medium text-slate-500">{t('totalCollected')}</p>
                        <p className="text-2xl font-black text-emerald-600 mt-1">{stats.totalPaid.toLocaleString(locale, { style: 'currency', currency: currencyCode })}</p>
                    </div>
                    <div className={`p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform ${isRTL ? 'mr-4' : 'ml-4'}`}>
                        <CheckCircle size={28} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all">
                    <div>
                        <p className="text-sm font-medium text-slate-500">{t('outstandingToRecover')}</p>
                        <p className="text-2xl font-black text-red-600 mt-1">{stats.totalRemaining.toLocaleString(locale, { style: 'currency', currency: currencyCode })}</p>
                    </div>
                    <div className={`p-3 bg-red-50 rounded-2xl text-red-600 group-hover:scale-110 transition-transform ${isRTL ? 'mr-4' : 'ml-4'}`}>
                        <AlertCircle size={28} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all">
                    <div>
                        <p className="text-sm font-medium text-slate-500">{t('remainingOnPartial')}</p>
                        <p className="text-2xl font-black text-blue-600 mt-1">{stats.partialRemaining.toLocaleString(locale, { style: 'currency', currency: currencyCode })}</p>
                    </div>
                    <div className={`p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform ${isRTL ? 'mr-4' : 'ml-4'}`}>
                        <PieChart size={28} />
                    </div>
                </div>
            </div>

            {/* Onglets de filtrage par statut */}
            <div className={`flex rounded-xl bg-slate-200/50 p-1.5 mb-6 w-fit ${isRTL ? 'space-x-reverse' : 'space-x-1'}`}>
                <button
                    onClick={() => setActiveTab('outstanding')}
                    className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold leading-5 focus:outline-none transition-all ${
                        activeTab === 'outstanding'
                            ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100'
                            : 'text-slate-500 hover:text-emerald-600'
                    }`}
                >
                    <AlertCircle size={16} />
                    {t('outstandingBalances')}
                </button>
                <button
                    onClick={() => setActiveTab('partial')}
                    className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold leading-5 focus:outline-none transition-all ${
                        activeTab === 'partial'
                            ? 'bg-white text-blue-700 shadow-sm border border-blue-100'
                            : 'text-slate-500 hover:text-blue-600'
                    }`}
                >
                    <PieChart size={16} />
                    {t('partialPayments')}
                </button>
                <button
                    onClick={() => setActiveTab('paid')}
                    className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold leading-5 focus:outline-none transition-all ${
                        activeTab === 'paid'
                            ? 'bg-white text-green-700 shadow-sm border border-green-100'
                            : 'text-slate-500 hover:text-green-600'
                    }`}
                >
                    <CheckCircle size={16} />
                    {t('paidInvoices')}
                </button>
            </div>

            {/* Tableau des factures filtrées */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/80">
                            <tr>
                                <th scope="col" className={`px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 ${isRTL ? 'text-right' : 'text-left'}`}>{t('invoices')}</th>
                                <th scope="col" className={`px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 ${isRTL ? 'text-right' : 'text-left'}`}>{t('client')}</th>
                                <th scope="col" className={`px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 ${isRTL ? 'text-left' : 'text-right'}`}>{t('total')}</th>
                                <th scope="col" className={`px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 ${isRTL ? 'text-left' : 'text-right'}`}>{t('alreadyPaid')}</th>
                                <th scope="col" className={`px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 ${isRTL ? 'text-left' : 'text-right'}`}>{t('remaining')}</th>
                                <th scope="col" className="px-6 py-4 text-center text-xs font-black uppercase tracking-widest text-slate-400">{t('status')}</th>
                                <th scope="col" className="relative px-6 py-4 text-right"><span className="sr-only">{t('actions')}</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-50">
                            {filteredInvoices.length > 0 ? (
                                filteredInvoices.map(invoice => {
                                    const paid = invoice.amountPaid || 0;
                                    const remaining = invoice.amount - paid;
                                    
                                    return (
                                        <tr key={invoice.id} className="hover:bg-emerald-50/30 transition-colors group">
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                                                {invoice.documentId || invoice.id}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>
                                                {invoice.clientName}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-slate-700 ${isRTL ? 'text-left' : 'text-right'}`}>
                                                {invoice.amount.toLocaleString(locale, { style: 'currency', currency: currencyCode })}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-emerald-600 font-bold ${isRTL ? 'text-left' : 'text-right'}`}>
                                                {paid > 0 ? paid.toLocaleString(locale, { style: 'currency', currency: currencyCode }) : '-'}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-black ${isRTL ? 'text-left' : 'text-right'}`}>
                                                <span className={remaining > 0.01 ? 'text-red-600' : 'text-slate-400'}>
                                                    {remaining > 0.01 ? remaining.toLocaleString(locale, { style: 'currency', currency: currencyCode }) : '0.00'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                                    invoice.status === InvoiceStatus.Paid ? 'bg-green-100 text-green-700' :
                                                    invoice.status === InvoiceStatus.Partial ? 'bg-blue-100 text-blue-700' :
                                                    invoice.status === InvoiceStatus.Overdue ? 'bg-red-100 text-red-700' :
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {invoice.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                                                <button 
                                                    onClick={(e) => toggleMenu(e, invoice)}
                                                    className={`p-2 rounded-full transition-colors ${activeMenuId === invoice.id ? 'bg-slate-200 text-slate-900' : 'text-slate-300 hover:bg-slate-100 group-hover:text-slate-500'}`}
                                                >
                                                    <MoreVertical size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <Search className="h-16 w-16 text-slate-100 mb-4" strokeWidth={1} />
                                            <p className="text-xl font-bold text-slate-800">{t('noFinancialData')}</p>
                                            <p className="text-sm text-slate-400 mt-1">Aucun document ne correspond à vos critères de filtrage.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Menu Dropdown via Portal avec positionnement intelligent */}
            {activeMenuId && filteredInvoices.find(inv => inv.id === activeMenuId) && menuPosition && createPortal(
                <div 
                    className="absolute z-[9999] w-48 origin-top-right rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-10 focus:outline-none animate-in fade-in zoom-in-95 duration-100"
                    style={{ 
                        top: menuPosition.top, 
                        left: menuPosition.left,
                        transformOrigin: menuPosition.transformOrigin
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="py-1.5">
                        {(() => {
                            const inv = filteredInvoices.find(i => i.id === activeMenuId);
                            const remaining = inv ? inv.amount - (inv.amountPaid || 0) : 0;
                            
                            return (
                                <>
                                    {remaining > 0.1 ? (
                                        <button 
                                            onClick={() => handleOpenPayment(inv!)}
                                            className="flex w-full items-center px-4 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50 transition-colors"
                                        >
                                            <CreditCard size={16} className={`${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('collectPayment')}
                                        </button>
                                    ) : (
                                        <div className="px-4 py-3 text-sm text-slate-400 flex items-center font-medium italic">
                                            <CheckCircle size={16} className={`${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('pdfSettled')}
                                        </div>
                                    )}
                                    
                                    <div className="border-t border-slate-100 my-1"></div>
                                    
                                    <button 
                                        onClick={() => { setActiveMenuId(null); }}
                                        className="flex w-full items-center px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                        <DollarSign size={16} className={`${isRTL ? 'ml-3' : 'mr-3'}`} /> {language === 'es' ? 'Ver detalles' : 'Détails financiers'}
                                    </button>
                                </>
                            );
                        })()}
                    </div>
                </div>,
                document.body
            )}

            {/* Modal de règlement */}
            {selectedInvoice && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <CreditCard className="text-emerald-600" /> {t('recordPayment')}
                            </h3>
                            <button onClick={() => setSelectedInvoice(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all"><X size={20} /></button>
                        </div>

                        <div className="bg-slate-50 p-5 rounded-2xl mb-8 text-sm border border-slate-100 shadow-inner">
                            <div className="flex justify-between mb-2.5">
                                <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest">{t('invoices')}</span>
                                <span className="font-bold text-slate-900">#{selectedInvoice.documentId || selectedInvoice.id}</span>
                            </div>
                            <div className="flex justify-between mb-2.5">
                                <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest">{t('client')}</span>
                                <span className="font-bold text-slate-900 truncate max-w-[200px]">{selectedInvoice.clientName}</span>
                            </div>
                            <div className="h-px bg-slate-200/60 my-4"></div>
                            <div className="flex justify-between items-center font-black">
                                <span className="text-red-500 uppercase text-[10px] tracking-widest">{t('remaining')}</span>
                                <span className="text-xl text-red-600">{(selectedInvoice.amount - (selectedInvoice.amountPaid || 0)).toLocaleString(locale, { style: 'currency', currency: currencyCode })}</span>
                            </div>
                        </div>

                        <form onSubmit={handlePaymentSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-black text-slate-700 ml-1">{t('amount')} ({currencyCode})</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        max={selectedInvoice.amount - (selectedInvoice.amountPaid || 0)}
                                        value={paymentAmount} 
                                        onChange={e => setPaymentAmount(parseFloat(e.target.value))}
                                        className={`block w-full rounded-2xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 font-black text-2xl h-16 ${isRTL ? 'pl-16 pr-4' : 'pl-4 pr-16'}`}
                                    />
                                    <div className={`pointer-events-none absolute inset-y-0 flex items-center ${isRTL ? 'left-0 pl-4' : 'right-0 pr-4'}`}>
                                        <span className="text-slate-300 font-black text-xs">{currencyCode}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-black text-slate-700 ml-1">{t('paymentMode')}</label>
                                <select 
                                    value={paymentMethod} 
                                    onChange={e => setPaymentMethod(e.target.value as any)}
                                    className="block w-full rounded-2xl border-slate-200 bg-slate-50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 h-14 font-bold text-slate-700"
                                >
                                    <option value="Virement">{language === 'es' ? 'Transferencia' : (language === 'ar' ? 'تحويل' : 'Virement')}</option>
                                    <option value="Chèque">{language === 'es' ? 'Cheque' : (language === 'ar' ? 'شيك' : 'Chèque')}</option>
                                    <option value="Espèces">{language === 'es' ? 'Efectivo' : (language === 'ar' ? 'نقدا' : 'Espèces')}</option>
                                    <option value="Carte Bancaire">{language === 'es' ? 'Tarjeta' : (language === 'ar' ? 'بطاقة' : 'Carte Bancaire')}</option>
                                </select>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 mt-10">
                                <button type="button" onClick={() => setSelectedInvoice(null)} className="flex-1 py-4 text-sm font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-all uppercase tracking-widest">{t('cancel')}</button>
                                <button type="submit" className="flex-[2] py-4 text-sm font-black text-white bg-emerald-600 rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-500/30 transition-all transform active:scale-95 uppercase tracking-widest">{t('confirm')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentTracking;
