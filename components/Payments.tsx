
import React from 'react';
import Header from './Header';
import { CreditCard, Search } from 'lucide-react';
import { Payment } from '../types';

interface PaymentsProps {
    payments: Payment[];
}

const Payments: React.FC<PaymentsProps> = ({ payments }) => {
    return (
        <div>
            <Header title="Historique des Paiements" />

            <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-neutral-200">
                <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
                    <div className="relative max-w-sm w-full">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                           <Search className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                        </div>
                        <input
                           type="search"
                           placeholder="Rechercher par client ou référence..."
                           className="block w-full rounded-lg border-neutral-300 py-2 pl-10 text-neutral-900 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                        />
                    </div>
                    <div className="text-sm text-neutral-500">
                        Total reçu : <span className="font-bold text-emerald-600">{payments.reduce((acc, p) => acc + p.amount, 0).toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                        <thead className="bg-neutral-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Date</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Client</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Facture</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Mode</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-500">Montant</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 bg-white">
                            {payments.length > 0 ? (
                                payments.slice().reverse().map((payment) => (
                                    <tr key={payment.id} className="hover:bg-emerald-50/60 transition-colors duration-200">
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">{new Date(payment.date).toLocaleDateString('fr-FR')}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-neutral-900">{payment.clientName}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-emerald-600 font-medium">#{payment.invoiceNumber}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                                            <span className="inline-flex items-center gap-1">
                                                <CreditCard size={14} /> {payment.method}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold text-neutral-900">{payment.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="text-center py-16 px-6 text-sm text-neutral-500">
                                        <div className="flex flex-col items-center">
                                            <CreditCard className="h-10 w-10 text-neutral-400 mb-2" />
                                            <h3 className="font-semibold text-neutral-800">Aucun paiement enregistré</h3>
                                            <p>Les paiements enregistrés sur les factures apparaîtront ici.</p>
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
