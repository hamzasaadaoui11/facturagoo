
import React, { useState, useMemo } from 'react';
import Header from './Header';
import { Invoice, Payment, InvoiceStatus } from '../types';
import { Search, CreditCard, AlertCircle, CheckCircle, PieChart, DollarSign } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface PaymentTrackingProps {
    invoices: Invoice[];
    payments: Payment[];
    onAddPayment: (payment: Omit<Payment, 'id'>) => void;
}

const PaymentTracking: React.FC<PaymentTrackingProps> = ({ invoices, payments, onAddPayment }) => {
    const { t, isRTL, language } = useLanguage();
    const [activeTab, setActiveTab] = useState<'outstanding' | 'partial' | 'paid'>('outstanding');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    
    // Payment Modal State
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'Virement' | 'Chèque' | 'Espèces' | 'Carte Bancaire'>('Virement');

    const filteredInvoices = useMemo(() => {
        let filtered = invoices;

        // Filter out Drafts for payment tracking usually
        filtered = filtered.filter(inv => inv.status !== InvoiceStatus.Draft);

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
    }, [invoices, activeTab, searchTerm]);

    const stats = useMemo(() => {
        let totalPaid = 0;
        let totalRemaining = 0;
        let partialRemaining = 0; // Amount specifically remaining on partial invoices

        invoices.forEach(inv => {
            if (inv.status === InvoiceStatus.Draft) return;

            const paid = inv.amountPaid || 0;
            const remaining = Math.max(0, inv.amount - paid);

            totalPaid += paid;
            totalRemaining += remaining;

            if (inv.status === InvoiceStatus.Partial) {
                partialRemaining += remaining;
            }
        });

        return { totalPaid, totalRemaining, partialRemaining };
    }, [invoices]);

    const handleOpenPayment = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        const remaining = invoice.amount - (invoice.amountPaid || 0);
        setPaymentAmount(remaining);
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
        <div dir={isRTL ? 'rtl' : 'ltr'}>
            <Header title={t('paymentTracking')} />

            {/* Stats Cards - Financial Focus */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Total Paid */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-100 flex items-center justify-between group hover:shadow-md transition-all">
                    <div>
                        <p className="text-sm font-medium text-neutral-500">{t('totalCollected')}</p>
                        <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.totalPaid.toLocaleString(locale, { style: 'currency', currency: currencyCode })}</p>
                    </div>
                    <div className={`p-3 bg-emerald-50 rounded-lg text-emerald-600 group-hover:scale-110 transition-transform ${isRTL ? 'mr-4' : 'ml-4'}`}>
                        <CheckCircle size={24} />
                    </div>
                </div>

                {/* Total Remaining */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-100 flex items-center justify-between group hover:shadow-md transition-all">
                    <div>
                        <p className="text-sm font-medium text-neutral-500">{t('outstandingToRecover')}</p>
                        <p className="text-2xl font-bold text-red-600 mt-1">{stats.totalRemaining.toLocaleString(locale, { style: 'currency', currency: currencyCode })}</p>
                    </div>
                    <div className={`p-3 bg-red-50 rounded-lg text-red-600 group-hover:scale-110 transition-transform ${isRTL ? 'mr-4' : 'ml-4'}`}>
                        <AlertCircle size={24} />
                    </div>
                </div>

                {/* Remaining on Partial */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-100 flex items-center justify-between group hover:shadow-md transition-all">
                    <div>
                        <p className="text-sm font-medium text-neutral-500">{t('remainingOnPartial')}</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{stats.partialRemaining.toLocaleString(locale, { style: 'currency', currency: currencyCode })}</p>
                        <p className="text-xs text-neutral-400 mt-1">{t('startedInvoices')}</p>
                    </div>
                    <div className={`p-3 bg-blue-50 rounded-lg text-blue-600 group-hover:scale-110 transition-transform ${isRTL ? 'mr-4' : 'ml-4'}`}>
                        <PieChart size={24} />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className={`flex rounded-xl bg-neutral-100 p-1 mb-6 w-fit ${isRTL ? 'space-x-reverse' : 'space-x-1'}`}>
                <button
                    onClick={() => setActiveTab('outstanding')}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium leading-5 focus:outline-none transition-all ${
                        activeTab === 'outstanding'
                            ? 'bg-white text-emerald-700 shadow'
                            : 'text-neutral-600 hover:text-emerald-600'
                    }`}
                >
                    <AlertCircle size={16} />
                    {t('outstandingBalances')}
                </button>
                <button
                    onClick={() => setActiveTab('partial')}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium leading-5 focus:outline-none transition-all ${
                        activeTab === 'partial'
                            ? 'bg-white text-blue-700 shadow'
                            : 'text-neutral-600 hover:text-blue-600'
                    }`}
                >
                    <PieChart size={16} />
                    {t('partialPayments')}
                </button>
                <button
                    onClick={() => setActiveTab('paid')}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium leading-5 focus:outline-none transition-all ${
                        activeTab === 'paid'
                            ? 'bg-white text-green-700 shadow'
                            : 'text-neutral-600 hover:text-green-600'
                    }`}
                >
                    <CheckCircle size={16} />
                    {t('paidInvoices')}
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm ring-1 ring-neutral-200 overflow-hidden">
                <div className="p-4 border-b border-neutral-200 flex justify-between items-center bg-neutral-50">
                    <div className="relative max-w-sm w-full">
                        <div className={`pointer-events-none absolute inset-y-0 flex items-center ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'}`}>
                            <Search className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                        </div>
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={t('searchPaymentPlaceholder')}
                            className={`block w-full rounded-lg border-neutral-300 py-2 text-neutral-900 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm ${isRTL ? 'pr-10' : 'pl-10'}`}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                        <thead className="bg-neutral-50">
                            <tr>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('invoices')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('client')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-left' : 'text-right'}`}>{t('total')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-left' : 'text-right'}`}>{t('alreadyPaid')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-left' : 'text-right'}`}>{t('remaining')}</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-neutral-500">{t('status')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-left' : 'text-right'}`}>{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-neutral-200">
                            {filteredInvoices.length > 0 ? (
                                filteredInvoices.map(invoice => {
                                    const paid = invoice.amountPaid || 0;
                                    const remaining = invoice.amount - paid;
                                    
                                    return (
                                        <tr key={invoice.id} className="hover:bg-neutral-50 transition-colors">
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                                                {invoice.documentId || invoice.id}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-neutral-900 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                                                {invoice.clientName}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-neutral-900 ${isRTL ? 'text-left' : 'text-right'}`}>
                                                {invoice.amount.toLocaleString(locale, { style: 'currency', currency: currencyCode })}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium ${isRTL ? 'text-left' : 'text-right'}`}>
                                                {paid > 0 ? paid.toLocaleString(locale, { style: 'currency', currency: currencyCode }) : '-'}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${isRTL ? 'text-left' : 'text-right'}`}>
                                                <span className={remaining > 0 ? 'text-red-600' : 'text-neutral-400'}>
                                                    {remaining > 0.01 ? remaining.toLocaleString(locale, { style: 'currency', currency: currencyCode }) : '0.00'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    invoice.status === InvoiceStatus.Paid ? 'bg-green-100 text-green-800' :
                                                    invoice.status === InvoiceStatus.Partial ? 'bg-blue-100 text-blue-800' :
                                                    invoice.status === InvoiceStatus.Overdue ? 'bg-red-100 text-red-800' :
                                                    'bg-amber-100 text-amber-800'
                                                }`}>
                                                    {invoice.status}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isRTL ? 'text-left' : 'text-right'}`}>
                                                {remaining > 0.1 && (
                                                    <button 
                                                        onClick={() => handleOpenPayment(invoice)}
                                                        className="text-emerald-600 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-md transition-colors inline-flex items-center gap-1"
                                                    >
                                                        <CreditCard size={14} /> {t('collectPayment')}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-neutral-500 italic">
                                        {t('noFinancialData')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Payment Modal */}
            {selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <CreditCard className="text-emerald-600" /> {t('recordPayment')}
                        </h3>
                        <div className="bg-neutral-50 p-3 rounded-lg mb-4 text-sm border border-neutral-200">
                            <p className={`flex justify-between mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <span className="text-neutral-500">{t('invoices')} :</span>
                                <span className="font-medium text-neutral-900">{selectedInvoice.documentId || selectedInvoice.id}</span>
                            </p>
                            <p className={`flex justify-between mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <span className="text-neutral-500">{t('client')} :</span>
                                <span className="font-medium text-neutral-900">{selectedInvoice.clientName}</span>
                            </p>
                            <div className="border-t border-neutral-200 my-2"></div>
                            <p className={`flex justify-between font-bold text-red-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <span>{t('remaining')} :</span>
                                <span>{(selectedInvoice.amount - (selectedInvoice.amountPaid || 0)).toLocaleString(locale, { style: 'currency', currency: currencyCode })}</span>
                            </p>
                        </div>

                        <form onSubmit={handlePaymentSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('amount')} ({currencyCode})</label>
                                <div className="relative mt-1">
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        max={selectedInvoice.amount - (selectedInvoice.amountPaid || 0)}
                                        value={paymentAmount} 
                                        onChange={e => setPaymentAmount(parseFloat(e.target.value))}
                                        className={`block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 font-semibold ${isRTL ? 'pl-12 pr-3' : 'pl-3 pr-12'}`}
                                    />
                                    <div className={`pointer-events-none absolute inset-y-0 flex items-center ${isRTL ? 'left-0 pl-3' : 'right-0 pr-3'}`}>
                                        <span className="text-gray-400 sm:text-xs font-bold">{currencyCode}</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('paymentMode')}</label>
                                <select 
                                    value={paymentMethod} 
                                    onChange={e => setPaymentMethod(e.target.value as any)}
                                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                                >
                                    <option value="Virement">{language === 'es' ? 'Transferencia' : (language === 'ar' ? 'تحويل' : 'Virement')}</option>
                                    <option value="Chèque">{language === 'es' ? 'Cheque' : (language === 'ar' ? 'شيك' : 'Chèque')}</option>
                                    <option value="Espèces">{language === 'es' ? 'Efectivo' : (language === 'ar' ? 'نقدا' : 'Espèces')}</option>
                                    <option value="Carte Bancaire">{language === 'es' ? 'Tarjeta' : (language === 'ar' ? 'بطاقة' : 'Carte Bancaire')}</option>
                                </select>
                            </div>
                            <div className={`flex justify-end gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <button type="button" onClick={() => setSelectedInvoice(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">{t('cancel')}</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm transition-colors">{t('confirm')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentTracking;
