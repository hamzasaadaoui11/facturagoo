
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import ChangeStatusModal from './ChangeStatusModal';
import CreateQuoteModal from './CreateQuoteModal';
import ConfirmationModal from './ConfirmationModal';
import { Plus, Search, Pencil, RefreshCw, Download, FileText, MoreVertical, CheckCircle, Loader2, Printer, Trash2 } from 'lucide-react';
import { Quote, QuoteStatus, Client, Product, CompanySettings } from '../types';
import { generatePDF, printDocument } from '../services/pdfService';

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
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [quoteToUpdate, setQuoteToUpdate] = useState<Quote | null>(null);
    const [quoteToEdit, setQuoteToEdit] = useState<Quote | null>(null);
    const [convertingId, setConvertingId] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [quoteIdToDelete, setQuoteIdToDelete] = useState<string | null>(null);

    // Menu Dropdown State
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<{top: number, left: number} | null>(null);

    // Close menu when clicking outside
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
                left: rect.right + window.scrollX - 192 // 192px width
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
            <Header title="Devis">
                <button
                    type="button"
                    onClick={handleCreateClick}
                    className="inline-flex items-center gap-x-2 rounded-lg bg-emerald-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.97]"
                >
                    <Plus className="-ml-0.5 h-5 w-5" />
                    Nouveau Devis
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
            />

            <ConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Supprimer le devis"
                message="Êtes-vous sûr de vouloir supprimer ce devis ? Cette action est irréversible."
            />

            <div className="rounded-lg bg-white shadow-sm ring-1 ring-neutral-200">
                <div className="p-4 border-b border-neutral-200">
                     <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                           <Search className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                        </div>
                        <input
                           type="search"
                           placeholder="Rechercher par numéro ou client..."
                           className="block w-full rounded-lg border-neutral-300 py-2 pl-10 text-neutral-900 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto rounded-lg">
                    <table className="min-w-full divide-y divide-neutral-200">
                        <thead className="bg-neutral-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Numéro</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Date</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Client</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Montant</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Statut</th>
                                <th scope="col" className="relative px-6 py-3 text-right"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 bg-white">
                            {quotes.length > 0 ? (
                                quotes.map((quote) => (
                                    <tr key={quote.id} className="hover:bg-emerald-50/60 transition-colors duration-200">
                                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-emerald-600">{quote.documentId || quote.id}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">{new Date(quote.date).toLocaleDateString('fr-FR')}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">{quote.clientName}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">{quote.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[quote.status]}`}>
                                                {quote.status}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium relative">
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
                                    <td colSpan={7} className="text-center py-16 px-6 text-sm text-neutral-500">
                                       <div className="flex flex-col items-center">
                                            <FileText className="h-10 w-10 text-neutral-400 mb-2" />
                                            <h3 className="font-semibold text-neutral-800">Aucun devis trouvé</h3>
                                            <p>Commencez par créer votre premier devis.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
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
                            <Pencil size={16} className="mr-3 text-emerald-600" /> Modifier
                        </button>

                        <button 
                            onClick={() => handleOpenStatusModal(activeQuote)} 
                            className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                        >
                            <RefreshCw size={16} className="mr-3 text-blue-600" /> Changer Statut
                        </button>
                        
                        {activeQuote.status !== QuoteStatus.Converted && (
                             <button 
                                onClick={() => handleConvert(activeQuote.id)} 
                                disabled={isConverting}
                                className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                            >
                                {isConverting ? (
                                    <Loader2 size={16} className="mr-3 animate-spin text-purple-600" />
                                ) : (
                                    <CheckCircle size={16} className="mr-3 text-purple-600" />
                                )}
                                Convertir Facture
                            </button>
                        )}
                        
                        <button 
                            onClick={() => handlePrint(activeQuote)}
                            className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                        >
                            <Printer size={16} className="mr-3 text-neutral-500" /> Imprimer
                        </button>

                        <button 
                            onClick={() => handleDownload(activeQuote)}
                            disabled={isDownloading}
                            className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                        >
                            {isDownloading ? <Loader2 size={16} className="mr-3 animate-spin" /> : <Download size={16} className="mr-3 text-neutral-500" />} Télécharger PDF
                        </button>

                        <button 
                            onClick={() => handleDeleteClick(activeQuote.id)} 
                            className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                        >
                            <Trash2 size={16} className="mr-3 text-red-600" /> Supprimer
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Quotes;
