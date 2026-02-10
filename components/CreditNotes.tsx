
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Header from './Header';
import { FileText, Download, Plus, Pencil, Printer, MoreVertical, Trash2, CheckCircle, RefreshCw } from 'lucide-react';
import { CreditNote, CreditNoteStatus, Client, Product, CompanySettings } from '../types';
import CreateCreditNoteModal from './CreateCreditNoteModal';
import ConfirmationModal from './ConfirmationModal';
import { generatePDF, printDocument } from '../services/pdfService';

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
                left: Math.max(10, rect.right + window.scrollX - 192) // Prevent overflow
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
        try {
            const client = clients.find(c => c.id === note.clientId);
            printDocument('Avoir', note, companySettings || null, client);
        } catch (error: any) {
            alert(error.message);
        }
    };

    const activeNote = creditNotes.find(n => n.id === activeMenuId);

    return (
        <div>
            <Header title="Avoirs">
                 <button
                    type="button"
                    onClick={handleCreateClick}
                    className="inline-flex items-center gap-x-2 rounded-lg bg-emerald-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-all"
                >
                    <Plus className="-ml-0.5 h-5 w-5" />
                    Nouvel Avoir
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
                title="Supprimer l'avoir"
                message="Êtes-vous sûr de vouloir supprimer cet avoir ? Cette action est irréversible."
            />

            <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-neutral-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                        <thead className="bg-neutral-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">N° Avoir</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Date</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Client</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Réf. Facture</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Montant</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Statut</th>
                                <th scope="col" className="relative px-6 py-3 text-right"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 bg-white">
                            {creditNotes.length > 0 ? (
                                creditNotes.map((note) => (
                                    <tr key={note.id} className="hover:bg-emerald-50/60 transition-colors duration-200">
                                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-emerald-600">{note.documentId || note.id}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-600">{new Date(note.date).toLocaleDateString('fr-FR')}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-900 font-medium">{note.clientName}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">{note.invoiceId || '-'}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-900 font-bold">{note.amount.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[note.status]}`}>
                                                {note.status}
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
                                            <p className="text-sm text-slate-500 mt-1">Créez des avoirs manuellement ou depuis une facture.</p>
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
                            <Pencil size={16} className="mr-3 text-emerald-600" /> Modifier
                        </button>

                        {activeNote.status === CreditNoteStatus.Draft && (
                             <button 
                                onClick={() => { onUpdateCreditNoteStatus(activeNote.id, CreditNoteStatus.Validated); setActiveMenuId(null); }} 
                                className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                            >
                                <CheckCircle size={16} className="mr-3 text-green-600" /> Valider
                            </button>
                        )}

                        {activeNote.status === CreditNoteStatus.Validated && (
                             <button 
                                onClick={() => { onUpdateCreditNoteStatus(activeNote.id, CreditNoteStatus.Refunded); setActiveMenuId(null); }} 
                                className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                            >
                                <RefreshCw size={16} className="mr-3 text-blue-600" /> Marquer Remboursé
                            </button>
                        )}
                        
                        <div className="border-t border-gray-100 my-1"></div>

                        <button 
                            onClick={() => { handlePrint(activeNote); setActiveMenuId(null); }}
                            className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                        >
                            <Printer size={16} className="mr-3 text-neutral-500" /> Imprimer
                        </button>

                        <button 
                            onClick={() => { handleDownload(activeNote); setActiveMenuId(null); }}
                            className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                        >
                            <Download size={16} className="mr-3 text-neutral-500" /> Télécharger PDF
                        </button>

                        <button 
                            onClick={() => handleDeleteClick(activeNote.id)} 
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

export default CreditNotes;
