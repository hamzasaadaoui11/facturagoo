
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import ChangeStatusModal from './ChangeStatusModal';
import CreateQuoteModal from './CreateQuoteModal';
import ConfirmationModal from './ConfirmationModal';
import { Plus, Search, Pencil, RefreshCw, Download, FileText, MoreVertical, CheckCircle, Loader2, Printer, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Quote, QuoteStatus, Client, Product, CompanySettings } from '../types';
import { generatePDF, printDocument } from '../services/pdfService';
import { useLanguage } from '../contexts/LanguageContext';

const statusColors: { [key in QuoteStatus]: string } = {
    [QuoteStatus.Created]: 'bg-blue-100 text-blue-700',
    [QuoteStatus.Draft]: 'bg-neutral-100 text-neutral-600',
    [QuoteStatus.Sent]: 'bg-cyan-100 text-cyan-700',
    [QuoteStatus.Approved]: 'bg-green-100 text-green-700',
    [QuoteStatus.Rejected]: 'bg-red-100 text-red-700',
    [QuoteStatus.Converted]: 'bg-purple-100 text-purple-700',
};

interface QuotesProps {
    quotes: Quote[];
    onUpdateQuoteStatus: (quoteId: string, newStatus: QuoteStatus) => void;
    onCreateInvoice: (quoteId: string) => Promise<void> | void;
    onAddQuote: (quote: Omit<Quote, 'id' | 'amount'>) => void;
    onUpdateQuote: (quote: Quote) => void;
    onDeleteQuote?: (id: string) => void;
    clients?: Client[];
    products?: Product[];
    companySettings?: CompanySettings | null;
}

const Quotes: React.FC<QuotesProps> = ({ 
    quotes, 
    onUpdateQuoteStatus, 
    onCreateInvoice,
    onAddQuote,
    onUpdateQuote,
    onDeleteQuote,
    clients = [],
    products = [],
    companySettings
}) => {
    const navigate = useNavigate();
    const { t, isRTL } = useLanguage();
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [quoteToUpdate, setQuoteToUpdate] = useState<Quote | null>(null);
    const [quoteToEdit, setQuoteToEdit] = useState<Quote | null>(null);
    const [convertingId, setConvertingId] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;
    const totalPages = Math.ceil(quotes.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedQuotes = quotes.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [quotes.length]);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [quoteIdToDelete, setQuoteIdToDelete] = useState<string | null>(null);

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
            setActiveMenuId(id);
            setMenuPosition({
                top: rect.bottom + window.scrollY + 5,
                left: isRTL ? rect.left + window.scrollX : rect.right + window.scrollX - 192 
            });
        }
    };

    const handleOpenStatusModal = (quote: Quote) => {
        setQuoteToUpdate(quote);
        setIsStatusModalOpen(true);
        setActiveMenuId(null);
    };

    const handleSaveStatus = (newStatus: QuoteStatus) => {
        if (quoteToUpdate) {
            onUpdateQuoteStatus(quoteToUpdate.id, newStatus);
        }
        setIsStatusModalOpen(false);
        setQuoteToUpdate(null);
    };

    const handleDeleteClick = (id: string) => {
        setQuoteIdToDelete(id);
        setIsDeleteModalOpen(true);
        setActiveMenuId(null);
    };

    const confirmDelete = () => {
        if (quoteIdToDelete && onDeleteQuote) {
            onDeleteQuote(quoteIdToDelete);
        }
        setIsDeleteModalOpen(false);
        setQuoteIdToDelete(null);
    };

    const handleDownload = async (quote: Quote) => {
        setDownloadingId(quote.id);
        setActiveMenuId(null);
        try {
            const client = clients.find(c => c.id === quote.clientId);
            await generatePDF('Devis', quote, companySettings || null, client);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setDownloadingId(null);
        }
    };

    const handlePrint = (quote: Quote) => {
        setActiveMenuId(null);
        try {
            const client = clients.find(c => c.id === quote.clientId);
            printDocument('Devis', quote, companySettings || null, client);
        } catch (error: any) {
            alert(error.message);
        }
    };
    
    const handleConvert = async (quoteId: string) => {
        if (!convertingId) {
            setConvertingId(quoteId);
            try {
                await onCreateInvoice(quoteId);
            } catch (error) {
                console.error("Erreur conversion", error);
            } finally {
                setConvertingId(null);
                setActiveMenuId(null);
            }
        }
    };

    const handleEdit = (quote: Quote) => {
        setQuoteToEdit(quote);
        setIsCreateModalOpen(true);
        setActiveMenuId(null);
    };

    const handleCreateClick = () => {
        setQuoteToEdit(null);
        setIsCreateModalOpen(true);
    };

    const handleSaveQuote = (quoteData: Omit<Quote, 'id' | 'amount'>, id?: string) => {
        if (id && onUpdateQuote) {
             const original = quotes.find(q => q.id === id);
             if(original) {
                 onUpdateQuote({
                     ...original,
                     ...quoteData,
                     amount: quoteData.subTotal + quoteData.vatAmount
                 });
             }
        } else {
            onAddQuote(quoteData);
        }
        setIsCreateModalOpen(false);
    };

    const activeQuote = quotes.find(q => q.id === activeMenuId);
    const isConverting = activeQuote ? convertingId === activeQuote.id : false;
    const isDownloading = activeQuote ? downloadingId === activeQuote.id : false;

    return (
        <div>
            <Header title={t('quotes')}>
                <button
                    type="button"
                    onClick={handleCreateClick}
                    className="inline-flex items-center gap-x-2 rounded-lg bg-emerald-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.97]"
                >
                    <Plus className="-ml-0.5 h-5 w-5 rtl:ml-0.5 rtl:-mr-0.5" />
                    {t('newQuote')}
                </button>
            </Header>

            <ChangeStatusModal
                isOpen={isStatusModalOpen}
                onClose={() => setIsStatusModalOpen(false)}
                onSave={handleSaveStatus}
                quote={quoteToUpdate}
            />

            <CreateQuoteModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleSaveQuote}
                clients={clients}
                products={products}
                quoteToEdit={quoteToEdit}
                companySettings={companySettings}
            />

            <ConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
            />

            <div className="rounded-lg bg-white shadow-sm ring-1 ring-neutral-200">
                <div className="p-4 border-b border-neutral-200">
                     <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 flex items-center pl-3 rtl:right-0 rtl:pr-3">
                           <Search className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                        </div>
                        <input
                           type="search"
                           placeholder={t('search')}
                           className={`block w-full rounded-lg border-neutral-300 py-2 text-neutral-900 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm ${isRTL ? 'pr-10' : 'pl-10'}`}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto rounded-lg">
                    <table className="min-w-full divide-y divide-neutral-200">
                        <thead className="bg-neutral-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 rtl:text-right">#</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 rtl:text-right">{t('date')}</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 rtl:text-right">{t('client')}</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 rtl:text-right">{t('amount')}</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 rtl:text-right">{t('status')}</th>
                                <th scope="col" className="relative px-6 py-3 text-right"><span className="sr-only">{t('actions')}</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 bg-white">
                            {paginatedQuotes.length > 0 ? (
                                paginatedQuotes.map((quote) => (
                                    <tr key={quote.id} className="hover:bg-emerald-50/60 transition-colors duration-200">
                                        <td className="whitespace-nowrap px-6 py-4 text-sm md:text-base font-medium text-emerald-600 rtl:text-right">{quote.documentId || quote.id}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm md:text-base text-neutral-500 rtl:text-right">{new Date(quote.date).toLocaleDateString('fr-FR')}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm md:text-base text-neutral-500 rtl:text-right">{quote.clientName}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm md:text-base text-neutral-500 rtl:text-right">{quote.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm md:text-base rtl:text-right">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[quote.status]}`}>
                                                {quote.status}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium relative rtl:text-left">
                                            <button 
                                                onClick={(e) => toggleMenu(e, quote.id)}
                                                className={`p-1.5 rounded-full transition-colors ${activeMenuId === quote.id ? 'bg-neutral-200 text-neutral-800' : 'text-neutral-500 hover:bg-neutral-100'}`}
                                            >
                                                <MoreVertical size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="text-center py-20 px-6">
                                       <div className="flex flex-col items-center justify-center">
                                            <FileText className="h-12 w-12 text-slate-300 mb-4" />
                                            <h3 className="text-lg font-bold text-slate-800">Aucun devis trouvé</h3>
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
                                {t('periodWeek')}
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
                            >
                                Suivant
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-neutral-700">
                                    Affichage de <span className="font-bold">{startIndex + 1}</span> à <span className="font-bold">{Math.min(startIndex + itemsPerPage, quotes.length)}</span> sur <span className="font-bold">{quotes.length}</span> devis
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
            {activeMenuId && activeQuote && menuPosition && createPortal(
                <div 
                    className="absolute z-50 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                    style={{ top: menuPosition.top, left: menuPosition.left }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="py-1">
                        <button 
                            onClick={() => handleEdit(activeQuote)} 
                            className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                        >
                            <Pencil size={16} className={`text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('edit')}
                        </button>

                        <button 
                            onClick={() => handleOpenStatusModal(activeQuote)} 
                            className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                        >
                            <RefreshCw size={16} className={`text-blue-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('update')}
                        </button>
                        
                        {activeQuote.status !== QuoteStatus.Converted && (
                             <button 
                                onClick={() => handleConvert(activeQuote.id)} 
                                disabled={isConverting}
                                className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                            >
                                {isConverting ? (
                                    <Loader2 size={16} className={`animate-spin text-purple-600 ${isRTL ? 'ml-3' : 'mr-3'}`} />
                                ) : (
                                    <CheckCircle size={16} className={`text-purple-600 ${isRTL ? 'ml-3' : 'mr-3'}`} />
                                )}
                                {t('convert')}
                            </button>
                        )}
                        
                        <button 
                            onClick={() => handlePrint(activeQuote)}
                            className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                        >
                            <Printer size={16} className={`text-neutral-500 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('print')}
                        </button>

                        <button 
                            onClick={() => handleDownload(activeQuote)}
                            disabled={isDownloading}
                            className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                        >
                            {isDownloading ? <Loader2 size={16} className={`animate-spin ${isRTL ? 'ml-3' : 'mr-3'}`} /> : <Download size={16} className={`text-neutral-500 ${isRTL ? 'ml-3' : 'mr-3'}`} />} {t('download')}
                        </button>

                        <button 
                            onClick={() => handleDeleteClick(activeQuote.id)} 
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

export default Quotes;
