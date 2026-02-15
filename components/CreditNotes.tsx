
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Header from './Header';
// Fix: Added missing Loader2 import
import { FileText, Download, Plus, Pencil, Printer, MoreVertical, Trash2, CheckCircle, RefreshCw, Loader2 } from 'lucide-react';
import { CreditNote, CreditNoteStatus, Client, Product, CompanySettings } from '../types';
import CreateCreditNoteModal from './CreateCreditNoteModal';
import ConfirmationModal from './ConfirmationModal';
import { generatePDF, printDocument } from '../services/pdfService';
import { useLanguage } from '../contexts/LanguageContext';

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
}

const CreditNotes: React.FC<CreditNotesProps> = ({ 
    creditNotes, 
    onUpdateCreditNoteStatus, 
    onCreateCreditNote, 
    onUpdateCreditNote, 
    onDeleteCreditNote, 
    clients = [], 
    products = [],
    companySettings 
}) => {
    const { t, isRTL } = useLanguage();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [creditNoteToEdit, setCreditNoteToEdit] = useState<CreditNote | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [idToDelete, setIdToDelete] = useState<string | null>(null);

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
                left: isRTL ? rect.left + window.scrollX : Math.max(10, rect.right + window.scrollX - 192) // Prevent overflow
            });
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
                    className="inline-flex items-center gap-x-2 rounded-lg bg-emerald-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-all"
                >
                    <Plus className={`${isRTL ? 'ml-0.5' : '-ml-0.5'} h-5 w-5`} />
                    {t('newCreditNote')}
                </button>
            </Header>
            
            <CreateCreditNoteModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleSave}
                clients={clients}
                products={products}
                creditNoteToEdit={creditNoteToEdit}
            />

            <ConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title={t('confirmDelete')}
                message={t('confirmDeleteMessage')}
            />

            <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-neutral-200">
                <div className="overflow-x-auto">
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
                            {creditNotes.length > 0 ? (
                                creditNotes.map((note) => (
                                    <tr key={note.id} className="hover:bg-emerald-50/60 transition-colors duration-200">
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-medium text-emerald-600 ${isRTL ? 'text-right' : 'text-left'}`}>{note.documentId || note.id}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm text-neutral-600 ${isRTL ? 'text-right' : 'text-left'}`}>{new Date(note.date).toLocaleDateString()}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm text-neutral-900 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{note.clientName}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{note.invoiceId || '-'}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm text-neutral-900 font-bold ${isRTL ? 'text-left' : 'text-right'}`}>{note.amount.toLocaleString(undefined, { style: 'currency', currency: 'MAD' })}</td>
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
                                            <h3 className="text-lg font-bold text-slate-800">{t('noCreditNotesFound')}</h3>
                                            <p className="text-sm text-slate-500 mt-1">{t('firstCreditNotePrompt')}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Menu Dropdown via Portal */}
            {activeMenuId && activeNote && menuPosition && createPortal(
                <div 
                    className="absolute z-50 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                    style={{ top: menuPosition.top, left: menuPosition.left }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="py-1">
                        <button 
                            onClick={() => { handleEditClick(activeNote); setActiveMenuId(null); }} 
                            className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                        >
                            <Pencil size={16} className={`${isRTL ? 'ml-3' : 'mr-3'} text-emerald-600`} /> {t('edit')}
                        </button>

                        {activeNote.status === CreditNoteStatus.Draft && (
                             <button 
                                onClick={() => { onUpdateCreditNoteStatus(activeNote.id, CreditNoteStatus.Validated); setActiveMenuId(null); }} 
                                className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                            >
                                <CheckCircle size={16} className={`${isRTL ? 'ml-3' : 'mr-3'} text-green-600`} /> {t('validate')}
                            </button>
                        )}

                        {activeNote.status === CreditNoteStatus.Validated && (
                             <button 
                                onClick={() => { onUpdateCreditNoteStatus(activeNote.id, CreditNoteStatus.Refunded); setActiveMenuId(null); }} 
                                className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                            >
                                <RefreshCw size={16} className={`${isRTL ? 'ml-3' : 'mr-3'} text-blue-600`} /> {t('markRefunded')}
                            </button>
                        )}
                        
                        <div className="border-t border-gray-100 my-1"></div>

                        <button 
                            onClick={() => { handlePrint(activeNote); setActiveMenuId(null); }}
                            className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                        >
                            <Printer size={16} className={`${isRTL ? 'ml-3' : 'mr-3'} text-neutral-500`} /> {t('print')}
                        </button>

                        <button 
                            onClick={() => { handleDownload(activeNote); setActiveMenuId(null); }}
                            disabled={isDownloading}
                            className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                        >
                            {isDownloading ? <Loader2 size={16} className={`${isRTL ? 'ml-3' : 'mr-3'} animate-spin`} /> : <Download size={16} className={`${isRTL ? 'ml-3' : 'mr-3'} text-neutral-500`} />} {t('download')}
                        </button>

                        <button 
                            onClick={() => handleDeleteClick(activeNote.id)} 
                            className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                        >
                            <Trash2 size={16} className={`${isRTL ? 'ml-3' : 'mr-3'} text-red-600`} /> {t('delete')}
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default CreditNotes;
