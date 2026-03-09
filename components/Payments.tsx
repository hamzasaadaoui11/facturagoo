
import React, { useState } from 'react';
import Header from './Header';
import { CreditCard, Search } from 'lucide-react';
import { Payment } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface PaymentsProps {
    payments: Payment[];
}

const Payments: React.FC<PaymentsProps> = ({ payments }) => {
    const { t, isRTL, language } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredPayments = payments.filter(p => {
        const term = searchTerm.toLowerCase();
        return (
            (p.clientName || '').toLowerCase().includes(term) ||
            (p.invoiceNumber || '').toLowerCase().includes(term)
        );
    });

    const totalCollected = payments.reduce((acc, p) => acc + p.amount, 0);
    const locale = language === 'es' ? 'es-ES' : (language === 'ar' ? 'ar-MA' : 'fr-FR');

    return (
        <div dir={isRTL ? 'rtl' : 'ltr'}>
            <Header title={t('paymentHistory')} />

            <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-neutral-200">
                <div className={`p-4 border-b border-neutral-200 flex flex-col sm:flex-row justify-between items-center gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
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
                    <div className={`text-sm text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t('totalCollected')} : <span className="font-bold text-emerald-600">{totalCollected.toLocaleString(locale, { style: 'currency', currency: 'MAD' })}</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                        <thead className="bg-neutral-50">
                            <tr>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('date')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('client')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('invoices')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('type')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-left' : 'text-right'}`}>{t('amount')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 bg-white">
                            {filteredPayments.length > 0 ? (
                                filteredPayments.slice().reverse().map((payment) => (
                                    <tr key={payment.id} className="hover:bg-emerald-50/60 transition-colors duration-200">
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{new Date(payment.date).toLocaleDateString(locale)}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-medium text-neutral-900 ${isRTL ? 'text-right' : 'text-left'}`}>{payment.clientName}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm text-emerald-600 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>#{payment.invoiceNumber}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <span className="inline-flex items-center gap-1">
                                                <CreditCard size={14} /> {payment.method}
                                            </span>
                                        </td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-bold text-neutral-900 ${isRTL ? 'text-left' : 'text-right'}`}>{payment.amount.toLocaleString(locale, { style: 'currency', currency: 'MAD' })}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="text-center py-16 px-6 text-sm text-neutral-500">
                                        <div className="flex flex-col items-center">
                                            <CreditCard className="h-10 w-10 text-neutral-400 mb-2 opacity-50" />
                                            <h3 className="font-semibold text-neutral-800">{t('noPaymentsFound')}</h3>
                                            <p className="mt-1">{t('paymentsDesc')}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Payments;
