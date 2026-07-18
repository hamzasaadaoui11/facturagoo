
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Header from './Header';
import { FileText, Download, Plus, Pencil, Printer, MoreVertical, Trash2, CheckCircle, RefreshCw, Loader2, ChevronLeft, ChevronRight, Search, MessageSquare } from 'lucide-react';
import { CreditNote, CreditNoteStatus, Client, Product, CompanySettings } from '../types';
import CreateCreditNoteModal from './CreateCreditNoteModal';
import ConfirmationModal from './ConfirmationModal';
import { generatePDF, printDocument } from '../services/pdfService';
import { useLanguage } from '../contexts/LanguageContext';
import { shareDocument } from '../services/shareService';
import DocumentPreviewModal from './DocumentPreviewModal';

const statusColors: { [key in CreditNoteStatus]: string } = {
    [CreditNoteStatus.Draft]: 'bg-neutral-100 text-neutral-600',
    [CreditNoteStatus.Validated]: 'bg-purple-100 text-purple-700',
    [CreditNoteStatus.Refunded]: 'bg-green-100 text-green-700',
};

interface CreditNotesProps {
    creditNotes: CreditNote[];
    onUpdateCreditNoteStatus: (id: string, newStatus: CreditNoteStatus) => void;
    onCreateCreditNote: (note: Omit<CreditNote, 'id'>) => void;
    onUpdateCreditNote: (note: CreditNote) => void;
    onDeleteCreditNote: (id: string) => void;
    clients?: Client[];
    products?: Product[];
    companySettings?: CompanySettings | null;
    generateDocumentId?: () => string;
}

const CreditNotes: React.FC<CreditNotesProps> = ({ 
    creditNotes, 
    onUpdateCreditNoteStatus, 
    onCreateCreditNote, 
    onUpdateCreditNote, 
    onDeleteCreditNote, 
    clients = [], 
    products = [],
    companySettings,
    generateDocumentId
}) => {
    const { t, isRTL } = useLanguage();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [creditNoteToEdit, setCreditNoteToEdit] = useState<CreditNote | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

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
    const filteredNotes = creditNotes.filter(note => {
        const term = searchTerm.toLowerCase();
        return (
            (note.documentId || note.id).toLowerCase().includes(term) ||
            (note.clientName || '').toLowerCase().includes(term) ||
            (note.invoiceId || '').toLowerCase().includes(term)
        );
    });
    const totalPages = Math.ceil(filteredNotes.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedNotes = filteredNotes.slice(startIndex, startIndex + itemsPerPage);

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

    useEffect(() => {
        setCurrentPage(1);
    }, [creditNotes.length, searchTerm, itemsPerPage]);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [idToDelete, setIdToDelete] = useState<string | null>(null);
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
            const menuHeight = 260; 
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

    const handleEditClick = (note: CreditNote) => {
        setCreditNoteToEdit(note);
        setIsCreateModalOpen(true);
    };

    const handleCreateClick = () => {
        setCreditNoteToEdit(null);
        setIsCreateModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        setIdToDelete(id);
        setIsDeleteModalOpen(true);
        setActiveMenuId(null);
    };

    const confirmDelete = () => {
        if (idToDelete) {
            onDeleteCreditNote(idToDelete);
        }
        setIsDeleteModalOpen(false);
        setIdToDelete(null);
    };

    const handleSave = (data: any, id?: string) => {
        if (id) {
            onUpdateCreditNote({ ...data, id });
        } else {
            onCreateCreditNote(data);
        }
    };

    const handleDownload = async (note: CreditNote) => {
        setDownloadingId(note.id);
        setActiveMenuId(null);
        try {
            const client = clients.find(c => c.id === note.clientId);
            await generatePDF('Avoir', note, companySettings || null, client);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setDownloadingId(null);
        }
    };

    const handlePrint = (note: CreditNote) => {
        setActiveMenuId(null);
        try {
            const client = clients.find(c => c.id === note.clientId);
            printDocument('Avoir', note, companySettings || null, client);
        } catch (error: any) {
            alert(error.message);
        }
    };

    const getStatusLabel = (status: CreditNoteStatus) => {
        switch(status) {
            case CreditNoteStatus.Draft: return t('statusManual');
            case CreditNoteStatus.Validated: return t('statusValidated');
            case CreditNoteStatus.Refunded: return t('statusRefunded');
            default: return status;
        }
    };

    const activeNote = creditNotes.find(n => n.id === activeMenuId);
    const isDownloading = activeNote ? downloadingId === activeNote.id : false;

    return (
        <div>
            <Header title={t('creditNotes')}>
                 <button
                    type="button"
                    onClick={handleCreateClick}
                    className="inline-flex items-center gap-x-2 rounded-lg bg-emerald-600 px-3 py-2 md:px-3.5 md:py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-all"
                >
                    <Plus className="h-5 w-5" />
                    <span className="hidden sm:inline">{t('newCreditNote')}</span>
                    <span className="sm:hidden">{t('add')}</span>
                </button>
            </Header>
            
            <CreateCreditNoteModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleSave}
                clients={clients}
                products={products}
                creditNoteToEdit={creditNoteToEdit}
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
                    type="Avoir"
                    doc={selectedDocForPreview}
                    settings={companySettings}
                    recipient={selectedRecipientForPreview}
                />
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
                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-neutral-200">
                    {paginatedNotes.length > 0 ? (
                        paginatedNotes.map((note) => (
                            <div key={note.id} className="p-4 space-y-3 hover:bg-emerald-50/60 transition-colors duration-200">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-medium text-emerald-600">{note.documentId || note.id}</div>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[note.status]}`}>
                                        {getStatusLabel(note.status)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-neutral-900 truncate">{note.clientName}</div>
                                        <div className="text-xs text-neutral-500">{new Date(note.date).toLocaleDateString()}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-neutral-900">{note.amount.toLocaleString(undefined, { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}</div>
                                        <div className="text-xs text-neutral-500">{note.invoiceId || '-'}</div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-end pt-2 border-t border-neutral-100">
                                    <button 
                                        onClick={(e) => toggleMenu(e, note.id)}
                                        className={`p-2 rounded-full transition-colors ${activeMenuId === note.id ? 'bg-neutral-200 text-neutral-800' : 'text-neutral-500 hover:bg-neutral-100'}`}
                                    >
                                        <MoreVertical size={20} />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 px-4">
                            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="text-sm font-bold text-slate-800">Aucun avoir trouvé</h3>
                        </div>
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                        <thead className="bg-neutral-50">
                            <tr>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('creditNoteNumber')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('date')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('client')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('invoiceReference')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-left' : 'text-right'}`}>{t('amount')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('status')}</th>
                                <th scope="col" className="relative px-6 py-3 text-right"><span className="sr-only">{t('actions')}</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 bg-white">
                            {paginatedNotes.length > 0 ? (
                                paginatedNotes.map((note) => (
                                    <tr key={note.id} className="hover:bg-emerald-50/60 transition-colors duration-200">
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-medium text-emerald-600 ${isRTL ? 'text-right' : 'text-left'}`}>{note.documentId || note.id}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm text-neutral-600 ${isRTL ? 'text-right' : 'text-left'}`}>{new Date(note.date).toLocaleDateString()}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm text-neutral-900 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{note.clientName}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{note.invoiceId || '-'}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm text-neutral-900 font-bold ${isRTL ? 'text-left' : 'text-right'}`}>{note.amount.toLocaleString(undefined, { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[note.status]}`}>
                                                {getStatusLabel(note.status)}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium relative">
                                            <button 
                                                onClick={(e) => toggleMenu(e, note.id)}
                                                className={`p-1.5 rounded-full transition-colors ${activeMenuId === note.id ? 'bg-neutral-200 text-neutral-800' : 'text-neutral-500 hover:bg-neutral-100'}`}
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
                                            <h3 className="text-lg font-bold text-slate-800">Aucun avoir trouvé</h3>
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
                                    Affichage de <span className="font-bold">{startIndex + 1}</span> à <span className="font-bold">{Math.min(startIndex + itemsPerPage, filteredNotes.length)}</span> sur <span className="font-bold">{filteredNotes.length}</span> avoirs
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
            {activeMenuId && activeNote && menuPosition && createPortal(
                <div 
                    className="absolute z-50 w-52 rounded-2xl bg-white shadow-xl border border-slate-100/80 p-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: menuPosition.top, left: menuPosition.left, transformOrigin: menuPosition.transformOrigin }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex flex-col gap-0.5">
                        <button 
                            onClick={() => { handleEditClick(activeNote); setActiveMenuId(null); }} 
                            className="flex w-full items-center px-3 py-2.5 text-[13px] font-medium text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <Pencil size={16} className={`text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('edit')}
                        </button>

                        {activeNote.status === CreditNoteStatus.Draft && (
                             <button 
                                onClick={() => { onUpdateCreditNoteStatus(activeNote.id, CreditNoteStatus.Validated); setActiveMenuId(null); }} 
                                className="flex w-full items-center px-3 py-2.5 text-[13px] font-medium text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                            >
                                <CheckCircle size={16} className={`text-green-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('validate')}
                            </button>
                        )}

                        {activeNote.status === CreditNoteStatus.Validated && (
                             <button 
                                onClick={() => { onUpdateCreditNoteStatus(activeNote.id, CreditNoteStatus.Refunded); setActiveMenuId(null); }} 
                                className="flex w-full items-center px-3 py-2.5 text-[13px] font-medium text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                            >
                                <RefreshCw size={16} className={`text-blue-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('markRefunded')}
                            </button>
                        )}
                        
                        <div className="border-t border-slate-100 my-1 mx-2"></div>

                        <button 
                            onClick={() => { handlePrint(activeNote); setActiveMenuId(null); }}
                            className="flex w-full items-center px-3 py-2.5 text-[13px] font-medium text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <Printer size={16} className={`text-neutral-500 group-hover:text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('print')}
                        </button>

                        <button 
                            onClick={() => { handleDownload(activeNote); setActiveMenuId(null); }}
                            disabled={isDownloading}
                            className="flex w-full items-center px-3 py-2.5 text-[13px] font-medium text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group disabled:opacity-50"
                        >
                            {isDownloading ? <Loader2 size={16} className={`animate-spin ${isRTL ? 'ml-3' : 'mr-3'}`} /> : <Download size={16} className={`text-neutral-500 group-hover:text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} />} {t('download')}
                        </button>

                        <button 
                            onClick={async () => {
                                const client = clients.find(c => c.id === activeNote.clientId);
                                setSelectedDocForPreview(activeNote);
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
                            onClick={() => { handleDeleteClick(activeNote.id); setActiveMenuId(null); }} 
                            className="flex w-full items-center px-3 py-2.5 text-[13px] font-medium text-red-600 rounded-xl hover:bg-red-50 transition-colors group"
                        >
                            <Trash2 size={16} className={`text-red-500 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('delete')}
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default CreditNotes;
