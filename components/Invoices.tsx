
import React, { useState } from 'react';
import Header from './Header';
import { CreditCard, FileText, CheckCircle, Download, Plus, Loader2, Pencil } from 'lucide-react';
import { Invoice, InvoiceStatus, Payment, Client, Product, CompanySettings } from '../types';
import CreateInvoiceModal from './CreateInvoiceModal';
import { generatePDF } from '../services/pdfService';

const statusColors: { [key in InvoiceStatus]: string } = {
    [InvoiceStatus.Paid]: 'bg-green-100 text-green-700',
    [InvoiceStatus.Pending]: 'bg-yellow-100 text-yellow-700',
    [InvoiceStatus.Overdue]: 'bg-red-100 text-red-700',
    [InvoiceStatus.Draft]: 'bg-neutral-100 text-neutral-600',
    [InvoiceStatus.Partial]: 'bg-blue-100 text-blue-700',
};

interface InvoicesProps {
    invoices: Invoice[];
    onUpdateInvoiceStatus: (invoiceId: string, newStatus: InvoiceStatus) => void;
    onAddPayment: (payment: Omit<Payment, 'id'>) => void;
    onCreateInvoice?: (invoice: any) => Promise<any> | void;
    onUpdateInvoice?: (invoice: any, id: string) => Promise<any> | void;
    clients?: Client[];
    products?: Product[];
    companySettings?: CompanySettings | null;
}

const Invoices: React.FC<InvoicesProps> = ({ invoices, onUpdateInvoiceStatus, onAddPayment, onCreateInvoice, onUpdateInvoice, clients = [], products = [], companySettings }) => {
    const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
    const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'Virement' | 'Chèque' | 'Espèces' | 'Carte Bancaire'>('Virement');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const openPaymentModal = (invoice: Invoice) => {
        setSelectedInvoiceForPayment(invoice);
        setPaymentAmount(invoice.amount - (invoice.amountPaid || 0));
    };

    const handleEditClick = (invoice: Invoice) => {
        setInvoiceToEdit(invoice);
        setIsCreateModalOpen(true);
    };

    const handleCreateClick = () => {
        setInvoiceToEdit(null);
        setIsCreateModalOpen(true);
    };

    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInvoiceForPayment) return;
        
        onAddPayment({
            invoiceId: selectedInvoiceForPayment.id,
            invoiceNumber: selectedInvoiceForPayment.documentId || selectedInvoiceForPayment.id,
            clientId: selectedInvoiceForPayment.clientId,
            clientName: selectedInvoiceForPayment.clientName,
            date: new Date().toISOString().split('T')[0],
            amount: paymentAmount,
            method: paymentMethod
        });
        
        setSelectedInvoiceForPayment(null);
    };

    const handleSaveInvoice = (invoiceData: any, id?: string) => {
        if (id && onUpdateInvoice) {
            return onUpdateInvoice(invoiceData, id);
        } else if (onCreateInvoice) {
            return onCreateInvoice(invoiceData);
        }
    };

    const handleDownload = async (invoice: Invoice) => {
        setDownloadingId(invoice.id);
        try {
            const client = clients.find(c => c.id === invoice.clientId);
            await generatePDF('Facture', invoice, companySettings || null, client);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <div>
            <Header title="Factures">
                 <button
                    type="button"
                    onClick={handleCreateClick}
                    className="inline-flex items-center gap-x-2 rounded-lg bg-emerald-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.97]"
                >
                    <Plus className="-ml-0.5 h-5 w-5" />
                    Nouvelle Facture
                </button>
            </Header>
            
            <CreateInvoiceModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleSaveInvoice}
                clients={clients}
                products={products}
                invoiceToEdit={invoiceToEdit}
            />

            {/* Payment Modal */}
            {selectedInvoiceForPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Enregistrer un paiement</h3>
                        <p className="text-sm text-gray-500 mb-4">Pour la facture {selectedInvoiceForPayment.documentId || selectedInvoiceForPayment.id}</p>
                        <form onSubmit={handlePaymentSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Montant</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    max={selectedInvoiceForPayment.amount - (selectedInvoiceForPayment.amountPaid || 0)}
                                    value={paymentAmount} 
                                    onChange={e => setPaymentAmount(parseFloat(e.target.value))}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">Reste à payer : {(selectedInvoiceForPayment.amount - (selectedInvoiceForPayment.amountPaid || 0)).toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Mode de paiement</label>
                                <select 
                                    value={paymentMethod} 
                                    onChange={e => setPaymentMethod(e.target.value as any)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                                >
                                    <option>Virement</option>
                                    <option>Chèque</option>
                                    <option>Espèces</option>
                                    <option>Carte Bancaire</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setSelectedInvoiceForPayment(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Annuler</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700">Confirmer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-neutral-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                        <thead className="bg-neutral-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">N° Facture</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Client</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Montant</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Reste à payer</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Échéance</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Statut</th>
                                <th scope="col" className="relative px-6 py-3 text-right"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 bg-white">
                            {invoices.length > 0 ? (
                                invoices.map((invoice) => {
                                    const remaining = invoice.amount - (invoice.amountPaid || 0);
                                    const isDownloading = downloadingId === invoice.id;
                                    return (
                                    <tr key={invoice.id} className="hover:bg-emerald-50/60 transition-colors duration-200">
                                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-emerald-600">{invoice.documentId || invoice.id}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-600">{invoice.clientName}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-900 font-medium">{invoice.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-red-600">{remaining > 0 ? remaining.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' }) : '-'}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-600">{new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[invoice.status]}`}>
                                                {invoice.status}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button 
                                                    onClick={() => handleEditClick(invoice)} 
                                                    className="p-1.5 text-neutral-600 hover:bg-neutral-100 rounded-md transition-colors"
                                                    title="Modifier"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                {invoice.status === InvoiceStatus.Draft && (
                                                     <button 
                                                        onClick={() => onUpdateInvoiceStatus(invoice.id, InvoiceStatus.Pending)} 
                                                        className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                                                        title="Valider la facture"
                                                    >
                                                        <CheckCircle size={18} />
                                                    </button>
                                                )}
                                                {remaining > 0 && (
                                                    <button 
                                                        onClick={() => openPaymentModal(invoice)} 
                                                        className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors"
                                                        title="Enregistrer un paiement"
                                                    >
                                                        <CreditCard size={18} />
                                                    </button>
                                                )}
                                                 <button 
                                                    onClick={() => handleDownload(invoice)} 
                                                    disabled={isDownloading}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors disabled:opacity-50"
                                                    title="Télécharger PDF"
                                                >
                                                    {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )})
                            ) : (
                                <tr>
                                    <td colSpan={7} className="text-center py-16 px-6 text-sm text-neutral-500">
                                        <div className="flex flex-col items-center">
                                            <FileText className="h-10 w-10 text-neutral-400 mb-2" />
                                            <h3 className="font-semibold text-neutral-800">Aucune facture trouvée</h3>
                                            <p>Les factures générées depuis les devis apparaîtront ici.</p>
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

export default Invoices;
