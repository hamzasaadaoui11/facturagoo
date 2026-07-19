
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import Header from './Header';
import { CreditCard, FileText, CheckCircle, Download, Plus, Loader2, Pencil, Printer, MoreVertical, Trash2, ArrowLeftRight, ChevronLeft, ChevronRight, Search, MessageSquare } from 'lucide-react';
import { Invoice, InvoiceStatus, Payment, Client, Product, CompanySettings, PurchaseOrder } from '../types';
import CreateInvoiceModal from './CreateInvoiceModal';
import ConfirmationModal from './ConfirmationModal';
import InvoiceReportModal from './InvoiceReportModal';
import { generatePDF, printDocument } from '../services/pdfService';
import { useLanguage } from '../contexts/LanguageContext';
import { shareDocument } from '../services/shareService';
import DocumentPreviewModal from './DocumentPreviewModal';

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
    generateDocumentId?: () => string;
}

const Invoices: React.FC<InvoicesProps> = ({ invoices, onUpdateInvoiceStatus, onAddPayment, onCreateInvoice, onUpdateInvoice, onDeleteInvoice, onCreateCreditNote, clients = [], products = [], companySettings, generateDocumentId }) => {
    const { t, isRTL, language } = useLanguage();
    const location = useLocation();
    const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
    const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'Virement' | 'Chèque' | 'Espèces' | 'Carte Bancaire'>('Virement');
    const [checkNumber, setCheckNumber] = useState('');
    const [bankName, setBankName] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [prefilledPO, setPrefilledPO] = useState<string | undefined>(undefined);
    const [prefilledOrder, setPrefilledOrder] = useState<PurchaseOrder | undefined>(undefined);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    useEffect(() => {
        if (location.state && (location.state as any).prefilledOrder) {
            setPrefilledOrder((location.state as any).prefilledOrder);
            setIsCreateModalOpen(true);
            window.history.replaceState({}, document.title);
        } else if (location.state && (location.state as any).prefilledPO) {
            setPrefilledPO((location.state as any).prefilledPO);
            setIsCreateModalOpen(true);
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // Responsive items per page
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const filteredInvoices = invoices.filter(invoice => {
        const term = searchTerm.toLowerCase();
        return (
            (invoice.documentId || invoice.id).toLowerCase().includes(term) ||
            (invoice.clientName || '').toLowerCase().includes(term)
        );
    });
    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + itemsPerPage);

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            
            if (currentPage > 3) {
                pages.push('...');
            }
            
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            
            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) pages.push(i);
            }
            
            if (currentPage < totalPages - 2) {
                pages.push('...');
            }
            
            if (!pages.includes(totalPages)) pages.push(totalPages);
        }
        return pages;
    };

    // Reset page if search results or data change
    useEffect(() => {
        setCurrentPage(1);
    }, [invoices.length, searchTerm, itemsPerPage]);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [invoiceIdToDelete, setInvoiceIdToDelete] = useState<string | null>(null);
    const [isSharingDoc, setIsSharingDoc] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [selectedDocForPreview, setSelectedDocForPreview] = useState<any>(null);
    const [selectedRecipientForPreview, setSelectedRecipientForPreview] = useState<any>(null);

    // Menu Dropdown State
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<{top: number, left: number, transformOrigin: string} | null>(null);

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
            const viewportHeight = window.innerHeight;
            const menuHeight = 320; 
            const menuWidth = 208; // w-52 is 13rem = 208px
            
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

            setActiveMenuId(id);
            setMenuPosition({ top, left: Math.max(10, left), transformOrigin });
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
            method: paymentMethod,
            reference: paymentMethod === 'Chèque' ? checkNumber : undefined,
            bankName: paymentMethod === 'Chèque' ? bankName : undefined,
            notes: undefined
        });
        
        setSelectedInvoiceForPayment(null);
        setCheckNumber('');
        setBankName('');
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
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setIsReportModalOpen(true)}
                        className="inline-flex items-center gap-x-2 rounded-lg bg-white border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.97]"
                    >
                        <Printer className="-ml-0.5 h-5 w-5 rtl:ml-0.5 rtl:-mr-0.5" />
                        <span>Rapport Global</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleCreateClick}
                        className="inline-flex items-center gap-x-2 rounded-lg bg-emerald-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.97]"
                    >
                        <Plus className="-ml-0.5 h-5 w-5 rtl:ml-0.5 rtl:-mr-0.5" />
                        <span className="hidden sm:inline">{t('newInvoice')}</span>
                        <span className="sm:hidden">{t('add')}</span>
                    </button>
                </div>
            </Header>
            
            <CreateInvoiceModal 
                isOpen={isCreateModalOpen}
                onClose={() => { setIsCreateModalOpen(false); setPrefilledOrder(undefined); setPrefilledPO(undefined); }}
                onSave={handleSaveInvoice}
                clients={clients}
                products={products}
                invoiceToEdit={invoiceToEdit}
                prefilledPO={prefilledPO}
                prefilledOrder={prefilledOrder}
                companySettings={companySettings}
                generateDocumentId={generateDocumentId}
            />

            <ConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
            />

            {isPreviewModalOpen && selectedDocForPreview && (
                <DocumentPreviewModal
                    isOpen={isPreviewModalOpen}
                    onClose={() => {
                        setIsPreviewModalOpen(false);
                        setSelectedDocForPreview(null);
                        setSelectedRecipientForPreview(null);
                    }}
                    type="Facture"
                    doc={selectedDocForPreview}
                    settings={companySettings}
                    recipient={selectedRecipientForPreview}
                />
            )}

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
                                <p className="text-xs text-gray-500 mt-1">{t('remaining')} : {(selectedInvoiceForPayment.amount - (selectedInvoiceForPayment.amountPaid || 0)).toLocaleString('fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}</p>
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
                            {paymentMethod === 'Chèque' && (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-gray-700 uppercase ml-1">
                                            {language === 'es' ? 'Nº de cheque' : (language === 'ar' ? 'رقم الشيك' : 'N° de chèque')}
                                        </label>
                                        <input 
                                            type="text"
                                            value={checkNumber}
                                            onChange={(e) => setCheckNumber(e.target.value)}
                                            className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-11"
                                            placeholder="Ex: CH-12345"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-gray-700 uppercase ml-1">
                                            {language === 'es' ? 'Banco' : (language === 'ar' ? 'البنك' : 'Banque')}
                                        </label>
                                        <input 
                                            type="text"
                                            value={bankName}
                                            onChange={(e) => setBankName(e.target.value)}
                                            className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-11"
                                            placeholder="Ex: BMCE, Attijari..."
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setSelectedInvoiceForPayment(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">{t('cancel')}</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700">{t('confirm')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-neutral-200">
                <div className="p-4 border-b border-neutral-200">
                     <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 flex items-center pl-3 rtl:right-0 rtl:pr-3">
                           <Search className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                        </div>
                        <input
                           type="search"
                           placeholder={t('search')}
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                           className={`block w-full rounded-lg border-neutral-300 py-2 text-neutral-900 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm ${isRTL ? 'pr-10' : 'pl-10'}`}
                        />
                    </div>
                </div>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                        <thead className="bg-neutral-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 rtl:text-right">#</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 rtl:text-right">{t('date')}</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 rtl:text-right">{t('client')}</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 rtl:text-right">{t('amount')}</th>
                                <th scope="col" className="hidden lg:table-cell px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 rtl:text-right">{t('remaining')}</th>
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
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500 rtl:text-right">{new Date(invoice.date).toLocaleDateString('fr-FR')}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-600 max-w-[120px] truncate rtl:text-right">{invoice.clientName}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-900 font-medium rtl:text-right">{invoice.amount.toLocaleString('fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}</td>
                                        <td className="hidden lg:table-cell whitespace-nowrap px-6 py-4 text-sm font-medium text-red-600 rtl:text-right">{remaining > 0 ? remaining.toLocaleString('fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' }) : '-'}</td>
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

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-neutral-100 bg-slate-50/10">
                    {paginatedInvoices.length > 0 ? (
                        paginatedInvoices.map((invoice) => {
                            const remaining = invoice.amount - (invoice.amountPaid || 0);
                            return (
                                <div key={invoice.id} className="p-4 sm:p-5 bg-white mb-3 first:mt-3 rounded-2xl mx-2 shadow-sm border border-slate-100 transition-all active:bg-slate-50">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-xs font-black text-emerald-600">{invoice.documentId || invoice.id}</p>
                                                <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold ${statusColors[invoice.status]}`}>
                                                    {invoice.status}
                                                </span>
                                            </div>
                                            <p className="text-sm font-bold text-slate-900 truncate pr-2">{invoice.clientName}</p>
                                        </div>
                                        <button 
                                            onClick={(e) => toggleMenu(e, invoice.id)}
                                            className={`p-2.5 rounded-xl transition-all border border-slate-100 shadow-sm active:scale-90 ${activeMenuId === invoice.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 font-bold'}`}
                                        >
                                            <MoreVertical size={20} />
                                        </button>
                                    </div>
                                    
                                    <div className="flex justify-between items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('amount')}</p>
                                            <p className="text-sm font-black text-slate-900">
                                                {invoice.amount.toLocaleString('fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD', maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{new Date(invoice.date).toLocaleDateString('fr-FR')}</p>
                                            {remaining > 0 && (
                                                <p className="text-[11px] text-red-600 font-bold">
                                                    {t('remaining')}: {remaining.toLocaleString('fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD', maximumFractionDigits: 0 })}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-12 px-4">
                            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                            <h3 className="text-base font-bold text-slate-800">Aucune facture trouvée</h3>
                        </div>
                    )}
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
                                    Affichage de <span className="font-bold">{startIndex + 1}</span> à <span className="font-bold">{Math.min(startIndex + itemsPerPage, filteredInvoices.length)}</span> sur <span className="font-bold">{filteredInvoices.length}</span> factures
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
                                    {getPageNumbers().map((page, i) => (
                                        <React.Fragment key={i}>
                                            {page === '...' ? (
                                                <span className="relative inline-flex items-center px-4 py-2 border border-neutral-300 bg-white text-sm font-medium text-neutral-400">
                                                    ...
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => setCurrentPage(page as number)}
                                                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${currentPage === page ? 'z-10 bg-emerald-50 border-emerald-500 text-emerald-600 font-bold' : 'bg-white border-neutral-300 text-neutral-500 hover:bg-neutral-50'}`}
                                                >
                                                    {page}
                                                </button>
                                            )}
                                        </React.Fragment>
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
                    className="absolute z-50 w-52 rounded-2xl bg-white shadow-xl border border-slate-100/80 p-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: menuPosition.top, left: menuPosition.left, transformOrigin: menuPosition.transformOrigin }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex flex-col gap-0.5">
                        <button 
                            onClick={() => { handleEditClick(activeInvoice); setActiveMenuId(null); }} 
                            className="flex w-full items-center px-3 py-2.5 text-[13px] font-medium text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <Pencil size={16} className={`text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('edit')}
                        </button>

                        {activeInvoice.status === InvoiceStatus.Draft && (
                             <button 
                                onClick={() => { onUpdateInvoiceStatus(activeInvoice.id, InvoiceStatus.Pending); setActiveMenuId(null); }} 
                                className="flex w-full items-center px-3 py-2.5 text-[13px] font-medium text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                            >
                                <CheckCircle size={16} className={`text-green-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('validate')}
                            </button>
                        )}

                        {activeInvoiceRemaining > 0 && (
                            <button 
                                onClick={() => { openPaymentModal(activeInvoice); setActiveMenuId(null); }} 
                                className="flex w-full items-center px-3 py-2.5 text-[13px] font-medium text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                            >
                                <CreditCard size={16} className={`text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('paymentAmount')}
                            </button>
                        )}

                        {onCreateCreditNote && (
                            <button 
                                onClick={() => { handleCreateCreditNote(activeInvoice.id); setActiveMenuId(null); }} 
                                className="flex w-full items-center px-3 py-2.5 text-[13px] font-medium text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                            >
                                <ArrowLeftRight size={16} className={`text-purple-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('newCreditNote')}
                            </button>
                        )}
                        
                        <div className="border-t border-slate-100 my-1 mx-2"></div>

                        <button 
                            onClick={() => { handlePrint(activeInvoice); setActiveMenuId(null); }}
                            className="flex w-full items-center px-3 py-2.5 text-[13px] font-medium text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <Printer size={16} className={`text-neutral-500 group-hover:text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('print')}
                        </button>

                        <button 
                            onClick={() => { handleDownload(activeInvoice); setActiveMenuId(null); }}
                            disabled={isDownloading}
                            className="flex w-full items-center px-3 py-2.5 text-[13px] font-medium text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group disabled:opacity-50"
                        >
                            {isDownloading ? <Loader2 size={16} className={`animate-spin ${isRTL ? 'ml-3' : 'mr-3'}`} /> : <Download size={16} className={`text-neutral-500 group-hover:text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} />} {t('download')}
                        </button>

                        <button 
                            onClick={async () => {
                                const client = clients.find(c => c.id === activeInvoice.clientId);
                                setSelectedDocForPreview(activeInvoice);
                                setSelectedRecipientForPreview(client);
                                setIsPreviewModalOpen(true);
                                setActiveMenuId(null);
                            }}
                            className="flex w-full items-center px-3 py-2.5 text-[13px] font-medium text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <MessageSquare size={16} className={`text-emerald-500 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('sendWhatsApp')}
                        </button>

                        <div className="border-t border-slate-100 my-1 mx-2"></div>

                        <button 
                            onClick={() => { handleDeleteClick(activeInvoice.id); setActiveMenuId(null); }} 
                            className="flex w-full items-center px-3 py-2.5 text-[13px] font-medium text-red-600 rounded-xl hover:bg-red-50 transition-colors group"
                        >
                            <Trash2 size={16} className={`text-red-500 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('delete')}
                        </button>
                    </div>
                </div>,
                document.body
            )}
            <InvoiceReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                invoices={invoices}
                clients={clients}
                companySettings={companySettings}
            />
        </div>
    );
};

export default Invoices;
