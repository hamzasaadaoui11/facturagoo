
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Header from './Header';
import { CreditCard, FileText, CheckCircle, Download, Plus, Loader2, Pencil, Printer, MoreVertical, Trash2, ArrowLeftRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Invoice, InvoiceStatus, Payment, Client, Product, CompanySettings } from '../types';
import CreateInvoiceModal from './CreateInvoiceModal';
import ConfirmationModal from './ConfirmationModal';
import { generatePDF, printDocument } from '../services/pdfService';
import { useLanguage } from '../contexts/LanguageContext';

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
    onDeleteInvoice?: (id: string) => Promise<void> | void;
    onCreateCreditNote?: (invoiceId: string) => void;
    clients?: Client[];
    products?: Product[];
    companySettings?: CompanySettings | null;
}

const Invoices: React.FC<InvoicesProps> = ({ invoices, onUpdateInvoiceStatus, onAddPayment, onCreateInvoice, onUpdateInvoice, onDeleteInvoice, onCreateCreditNote, clients = [], products = [], companySettings }) => {
    const { t, isRTL, language } = useLanguage();
    const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
    const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'Virement' | 'Chèque' | 'Espèces' | 'Carte Bancaire'>('Virement');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    // Responsive items per page
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = isMobile ? 4 : 6;
    const totalPages = Math.ceil(invoices.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedInvoices = invoices.slice(startIndex, startIndex + itemsPerPage);

    // Reset page if search results or data change
    useEffect(() => {
        setCurrentPage(1);
    }, [invoices.length, itemsPerPage]);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [invoiceIdToDelete, setInvoiceIdToDelete] = useState<string | null>(null);

    // Menu Dropdown State
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<{top: number, left: number} | null>(null);

    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        if(activeMenuId) {
            document.addEventListener('click', handleClickOutside);
            window.addEventListener('scroll', handleClickOutside, true);
            window.addEventListener('resize', handleClickOutside);
        }
        return () => {
            document.removeEventListener('click', handleClickOutside);
            window.removeEventListener('scroll', handleClickOutside, true);
            window.removeEventListener('resize', handleClickOutside);
        };
    }, [activeMenuId]);

    const toggleMenu = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (activeMenuId === id) {
            setActiveMenuId(null);
            setMenuPosition(null);
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            const leftPos = rect.right + window.scrollX - 192;
            setActiveMenuId(id);
            setMenuPosition({
                top: rect.bottom + window.scrollY + 5,
                left: isRTL ? rect.left + window.scrollX : Math.max(10, leftPos)
            });
        }
    };

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

    const handleDeleteClick = (id: string) => {
        setInvoiceIdToDelete(id);
        setIsDeleteModalOpen(true);
        setActiveMenuId(null);
    };

    const confirmDelete = () => {
        if (invoiceIdToDelete && onDeleteInvoice) {
            onDeleteInvoice(invoiceIdToDelete);
        }
        setIsDeleteModalOpen(false);
        setInvoiceIdToDelete(null);
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

    const handlePrint = (invoice: Invoice) => {
        try {
            const client = clients.find(c => c.id === invoice.clientId);
            printDocument('Facture', invoice, companySettings || null, client);
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleCreateCreditNote = (invoiceId: string) => {
        if(onCreateCreditNote) {
            onCreateCreditNote(invoiceId);
            setActiveMenuId(null);
        }
    };

    const activeInvoice = invoices.find(inv => inv.id === activeMenuId);
    const activeInvoiceRemaining = activeInvoice ? activeInvoice.amount - (activeInvoice.amountPaid || 0) : 0;
    const isDownloading = activeInvoice ? downloadingId === activeInvoice.id : false;

    return (
        <div>
            <Header title={t('invoices')}>
                 <button
                    type="button"
                    onClick={handleCreateClick}
                    className="inline-flex items-center gap-x-2 rounded-lg bg-emerald-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.97]"
                >
                    <Plus className="-ml-0.5 h-5 w-5 rtl:ml-0.5 rtl:-mr-0.5" />
                    {t('newInvoice')}
                </button>
            </Header>
            
            <CreateInvoiceModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleSaveInvoice}
                clients={clients}
                products={products}
                invoiceToEdit={invoiceToEdit}
                companySettings={companySettings}
            />

            <ConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
            />

            {selectedInvoiceForPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">{t('paymentRecorded')}</h3>
                        <p className="text-sm text-gray-500 mb-4">{t('invoices')} {selectedInvoiceForPayment.documentId || selectedInvoiceForPayment.id}</p>
                        <form onSubmit={handlePaymentSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('amount')}</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    max={selectedInvoiceForPayment.amount - (selectedInvoiceForPayment.amountPaid || 0)}
                                    value={paymentAmount} 
                                    onChange={e => setPaymentAmount(parseFloat(e.target.value))}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">{t('remaining')} : {(selectedInvoiceForPayment.amount - (selectedInvoiceForPayment.amountPaid || 0)).toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('paymentMethod')}</label>
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
                                <button type="button" onClick={() => setSelectedInvoiceForPayment(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">{t('cancel')}</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700">{t('confirm')}</button>
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
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 rtl:text-right">#</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 rtl:text-right">{t('client')}</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 rtl:text-right">{t('amount')}</th>
                                <th scope="col" className="hidden md:table-cell px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 rtl:text-right">{t('remaining')}</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 rtl:text-right">{t('status')}</th>
                                <th scope="col" className="relative px-6 py-3 text-right"><span className="sr-only">{t('actions')}</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 bg-white">
                            {paginatedInvoices.length > 0 ? (
                                paginatedInvoices.map((invoice) => {
                                    const remaining = invoice.amount - (invoice.amountPaid || 0);
                                    return (
                                    <tr key={invoice.id} className="hover:bg-emerald-50/60 transition-colors duration-200">
                                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-emerald-600 rtl:text-right">{invoice.documentId || invoice.id}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-600 max-w-[120px] truncate rtl:text-right">{invoice.clientName}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-900 font-medium rtl:text-right">{invoice.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</td>
                                        <td className="hidden md:table-cell whitespace-nowrap px-6 py-4 text-sm font-medium text-red-600 rtl:text-right">{remaining > 0 ? remaining.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' }) : '-'}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm rtl:text-right">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[invoice.status]}`}>
                                                {invoice.status}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium relative rtl:text-left">
                                            <button 
                                                onClick={(e) => toggleMenu(e, invoice.id)}
                                                className={`p-1.5 rounded-full transition-colors ${activeMenuId === invoice.id ? 'bg-neutral-200 text-neutral-800' : 'text-neutral-500 hover:bg-neutral-100'}`}
                                            >
                                                <MoreVertical size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                )})
                            ) : (
                                <tr>
                                    <td colSpan={7} className="text-center py-20 px-6">
                                        <div className="flex flex-col items-center justify-center">
                                            <FileText className="h-12 w-12 text-slate-300 mb-4" />
                                            <h3 className="text-lg font-bold text-slate-800">Aucune facture trouvée</h3>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination UI */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-neutral-200">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
                            >
                                {isRTL ? 'التالي' : 'Précédent'}
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
                            >
                                {isRTL ? 'السابق' : 'Suivant'}
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-neutral-700">
                                    Affichage de <span className="font-bold">{startIndex + 1}</span> à <span className="font-bold">{Math.min(startIndex + itemsPerPage, invoices.length)}</span> sur <span className="font-bold">{invoices.length}</span> factures
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-neutral-300 bg-white text-sm font-medium text-neutral-500 hover:bg-neutral-50 disabled:opacity-50"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${currentPage === i + 1 ? 'z-10 bg-emerald-50 border-emerald-500 text-emerald-600 font-bold' : 'bg-white border-neutral-300 text-neutral-500 hover:bg-neutral-50'}`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-neutral-300 bg-white text-sm font-medium text-neutral-500 hover:bg-neutral-50 disabled:opacity-50"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Menu Dropdown via Portal */}
            {activeMenuId && activeInvoice && menuPosition && createPortal(
                <div 
                    className="absolute z-50 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                    style={{ top: menuPosition.top, left: menuPosition.left }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="py-1">
                        <button 
                            onClick={() => { handleEditClick(activeInvoice); setActiveMenuId(null); }} 
                            className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                        >
                            <Pencil size={16} className={`text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('edit')}
                        </button>

                        {activeInvoice.status === InvoiceStatus.Draft && (
                             <button 
                                onClick={() => { onUpdateInvoiceStatus(activeInvoice.id, InvoiceStatus.Pending); setActiveMenuId(null); }} 
                                className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                            >
                                <CheckCircle size={16} className={`text-green-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('validate')}
                            </button>
                        )}

                        {activeInvoiceRemaining > 0 && (
                            <button 
                                onClick={() => { openPaymentModal(activeInvoice); setActiveMenuId(null); }} 
                                className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                            >
                                <CreditCard size={16} className={`text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('paymentAmount')}
                            </button>
                        )}

                        {onCreateCreditNote && (
                            <button 
                                onClick={() => handleCreateCreditNote(activeInvoice.id)} 
                                className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                            >
                                <ArrowLeftRight size={16} className={`text-purple-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('newCreditNote')}
                            </button>
                        )}
                        
                        <div className="border-t border-gray-100 my-1"></div>

                        <button 
                            onClick={() => { handlePrint(activeInvoice); setActiveMenuId(null); }}
                            className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                        >
                            <Printer size={16} className={`text-neutral-500 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('print')}
                        </button>

                        <button 
                            onClick={() => { handleDownload(activeInvoice); setActiveMenuId(null); }}
                            disabled={isDownloading}
                            className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                        >
                            {isDownloading ? <Loader2 size={16} className={`animate-spin ${isRTL ? 'ml-3' : 'mr-3'}`} /> : <Download size={16} className={`text-neutral-500 ${isRTL ? 'ml-3' : 'mr-3'}`} />} {t('download')}
                        </button>

                        <button 
                            onClick={() => handleDeleteClick(activeInvoice.id)} 
                            className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                        >
                            <Trash2 size={16} className={`text-red-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('delete')}
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Invoices;
