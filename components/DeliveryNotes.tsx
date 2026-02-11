import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import { Truck, FileText, Plus, Pencil, Download, Trash2, CheckCircle, AlertCircle, Clock, Loader2, FileCheck, MoreVertical, Printer } from 'lucide-react';
import { DeliveryNote, Invoice, Client, Product, CompanySettings } from '../types';
import CreateDeliveryNoteModal from './CreateDeliveryNoteModal';
import ConfirmationModal from './ConfirmationModal';
import DeliveryNoteOptionModal from './DeliveryNoteOptionModal';
import { generatePDF, printDocument } from '../services/pdfService';

interface DeliveryNotesProps {
    deliveryNotes: DeliveryNote[];
    invoices: Invoice[];
    onCreateDeliveryNote: (note: Omit<DeliveryNote, 'id'>) => void;
    onUpdateDeliveryNote: (note: DeliveryNote) => void;
    onDeleteDeliveryNote: (id: string) => void;
    onCreateInvoice?: (deliveryNoteId: string) => void;
    clients?: Client[];
    products?: Product[];
    companySettings?: CompanySettings | null;
}

const DeliveryNotes: React.FC<DeliveryNotesProps> = ({ 
    deliveryNotes, 
    invoices, 
    onCreateDeliveryNote, 
    onUpdateDeliveryNote, 
    onDeleteDeliveryNote, 
    onCreateInvoice, 
    clients = [], 
    products = [],
    companySettings
}) => {
    const navigate = useNavigate();
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [convertingId, setConvertingId] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    
    // Menu Dropdown State
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<{top: number, left: number} | null>(null);
    
    // Edit & Delete State
    const [noteToEdit, setNoteToEdit] = useState<DeliveryNote | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [noteIdToDelete, setNoteIdToDelete] = useState<string | null>(null);

    // Print/PDF Option Modal State
    const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
    const [selectedNoteForOutput, setSelectedNoteForOutput] = useState<DeliveryNote | null>(null);
    const [outputAction, setOutputAction] = useState<'print' | 'download'>('download');

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        if(activeMenuId) {
            document.addEventListener('click', handleClickOutside);
            // Handle window resize/scroll to close menu as position might become invalid
            window.addEventListener('scroll', handleClickOutside, true);
            window.addEventListener('resize', handleClickOutside);
        }
        return () => {
            document.removeEventListener('click', handleClickOutside);
            window.removeEventListener('scroll', handleClickOutside, true);
            window.removeEventListener('resize', handleClickOutside);
        };
    }, [activeMenuId]);

    const handleCreateFromInvoice = (invoiceId: string) => {
        const invoice = invoices.find(i => i.id === invoiceId);
        if(invoice) {
            onCreateDeliveryNote({
                invoiceId: invoice.id,
                clientId: invoice.clientId,
                clientName: invoice.clientName,
                date: new Date().toISOString().split('T')[0],
                lineItems: invoice.lineItems,
                status: 'Payé', 
                subTotal: invoice.subTotal,
                vatAmount: invoice.vatAmount,
                totalAmount: invoice.amount,
                paymentAmount: invoice.amountPaid
            });
            setIsInvoiceModalOpen(false);
        }
    };

    const handleSaveManual = (noteData: Omit<DeliveryNote, 'id'>, id?: string) => {
        if (id) {
            onUpdateDeliveryNote({ ...noteData, id });
        } else {
            onCreateDeliveryNote(noteData);
        }
    };

    const handleEditClick = (note: DeliveryNote) => {
        setNoteToEdit(note);
        setIsCreateModalOpen(true);
        setActiveMenuId(null);
    };

    const handleDeleteClick = (id: string) => {
        setNoteIdToDelete(id);
        setIsDeleteModalOpen(true);
        setActiveMenuId(null);
    };

    const confirmDelete = () => {
        if (noteIdToDelete) {
            onDeleteDeliveryNote(noteIdToDelete);
            setIsDeleteModalOpen(false);
            setNoteIdToDelete(null);
        }
    };

    // Open Option Modal instead of direct action
    const handlePDFClick = (note: DeliveryNote) => {
        setSelectedNoteForOutput(note);
        setOutputAction('download');
        setIsOptionModalOpen(true);
        setActiveMenuId(null);
    };

    const handlePrintClick = (note: DeliveryNote) => {
        setSelectedNoteForOutput(note);
        setOutputAction('print');
        setIsOptionModalOpen(true);
        setActiveMenuId(null);
    };

    // Callback from Option Modal
    const handleOptionConfirm = async (showPrices: boolean) => {
        const note = selectedNoteForOutput;
        if (!note) return;

        setIsOptionModalOpen(false); // Close modal first

        try {
            const client = clients.find(c => c.id === note.clientId);
            if (outputAction === 'download') {
                setDownloadingId(note.id);
                await generatePDF('Bon de Livraison', note, companySettings || null, client, { showPrices });
            } else {
                printDocument('Bon de Livraison', note, companySettings || null, client, { showPrices });
            }
        } catch (error: any) {
            alert(error.message);
        } finally {
            setDownloadingId(null);
            setSelectedNoteForOutput(null);
        }
    };
    
    const openNewModal = () => {
        setNoteToEdit(null);
        setIsCreateModalOpen(true);
    };

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
                left: rect.right + window.scrollX - 192 // 192px = w-48
            });
        }
    };

    const handleConvertToInvoice = async (noteId: string) => {
        if(onCreateInvoice && !convertingId) {
            setConvertingId(noteId);
            try {
                await onCreateInvoice(noteId);
            } catch (error) {
                console.error("Erreur conversion", error);
            } finally {
                setConvertingId(null);
                setActiveMenuId(null);
            }
        }
    };

    const getStatusDisplay = (note: DeliveryNote) => {
        const total = note.totalAmount || 0;
        const paid = note.paymentAmount || 0;

        if (note.invoiceId) {
            return { label: 'Facturé', color: 'bg-purple-100 text-purple-800', icon: FileText };
        }

        if (total === 0) return { label: 'Gratuit', color: 'bg-gray-100 text-gray-800', icon: CheckCircle };

        if (paid >= total) {
            return { label: 'Payé', color: 'bg-green-100 text-green-800', icon: CheckCircle };
        } else if (paid > 0) {
            return { label: 'Partiel', color: 'bg-blue-100 text-blue-800', icon: Clock };
        } else {
            return { label: 'Non Payé', color: 'bg-red-100 text-red-800', icon: AlertCircle };
        }
    };

    const activeNote = deliveryNotes.find(n => n.id === activeMenuId);
    const isConverting = activeNote ? convertingId === activeNote.id : false;
    const isDownloading = activeNote ? downloadingId === activeNote.id : false;

    return (
        <div>
            <Header title="Bons de Livraison">
                 <div className="flex gap-3">
                    <button 
                        onClick={() => setIsInvoiceModalOpen(true)}
                        className="inline-flex items-center gap-x-2 rounded-lg bg-white px-3.5 py-2.5 text-sm font-semibold text-neutral-700 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 transition-all"
                    >
                        <FileText className="-ml-0.5 h-5 w-5 text-neutral-500" />
                        Depuis Facture
                    </button>
                    <button 
                        onClick={openNewModal}
                        className="inline-flex items-center gap-x-2 rounded-lg bg-emerald-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-all"
                    >
                        <Plus className="-ml-0.5 h-5 w-5" />
                        Nouveau Bon
                    </button>
                 </div>
            </Header>
            
            <CreateDeliveryNoteModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleSaveManual}
                clients={clients}
                products={products}
                noteToEdit={noteToEdit || undefined}
            />
            
            <ConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Supprimer le bon de livraison"
                message="Êtes-vous sûr de vouloir supprimer ce bon de livraison ? Cette action est irréversible."
            />

            <DeliveryNoteOptionModal 
                isOpen={isOptionModalOpen}
                onClose={() => setIsOptionModalOpen(false)}
                onConfirm={handleOptionConfirm}
            />
            
            {isInvoiceModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Générer un Bon de Livraison</h3>
                        <p className="text-sm text-gray-500 mb-4">Sélectionnez une facture pour générer le BL correspondant.</p>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                            {invoices.filter(inv => !deliveryNotes.some(dn => dn.invoiceId === inv.id)).map(invoice => (
                                <button 
                                    key={invoice.id} 
                                    onClick={() => handleCreateFromInvoice(invoice.id)}
                                    className="w-full text-left p-3 rounded-lg border hover:bg-emerald-50 hover:border-emerald-500 transition-colors flex justify-between items-center"
                                >
                                    <span>#{invoice.documentId || invoice.id} - {invoice.clientName}</span>
                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">{new Date(invoice.date).toLocaleDateString()}</span>
                                </button>
                            ))}
                            {invoices.filter(inv => !deliveryNotes.some(dn => dn.invoiceId === inv.id)).length === 0 && (
                                <p className="text-center text-gray-500 italic">Aucune facture disponible pour livraison.</p>
                            )}
                        </div>
                         <div className="flex justify-end gap-2 mt-4">
                            <button type="button" onClick={() => setIsInvoiceModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Fermer</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="rounded-lg bg-white shadow-sm ring-1 ring-neutral-200">
                <div className="overflow-x-auto rounded-lg">
                    <table className="min-w-full divide-y divide-neutral-200">
                        <thead className="bg-neutral-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">N° BL</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Date</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Client</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Référence</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-500">Montant</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Statut</th>
                                <th scope="col" className="relative px-6 py-3 text-right"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 bg-white">
                            {deliveryNotes.length > 0 ? (
                                deliveryNotes.slice().reverse().map((note) => {
                                    const statusInfo = getStatusDisplay(note);
                                    const StatusIcon = statusInfo.icon;
                                    
                                    return (
                                    <tr key={note.id} className="hover:bg-emerald-50/60 transition-colors duration-200">
                                        <td className="whitespace-nowrap px-6 py-4 text-sm md:text-base font-medium text-emerald-600">{note.documentId || note.id}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm md:text-base text-neutral-500">{new Date(note.date).toLocaleDateString('fr-FR')}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm md:text-base font-medium text-neutral-900">{note.clientName}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm md:text-base text-neutral-500">
                                            {note.invoiceId ? `#${note.invoiceId}` : 'Manuel'}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm md:text-base font-medium text-neutral-900">
                                            {note.totalAmount ? note.totalAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' }) : '-'}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm md:text-base">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}>
                                                <StatusIcon size={12} className="mr-1" /> {statusInfo.label}
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
                                )})
                            ) : (
                                <tr>
                                    <td colSpan={7} className="text-center py-20 px-6">
                                        <div className="flex flex-col items-center justify-center">
                                            <Truck className="h-12 w-12 text-slate-300 mb-4" />
                                            <h3 className="text-lg font-bold text-slate-800">Aucun bon de livraison trouvé</h3>
                                            <p className="text-sm text-slate-500 mt-1">Générez votre premier bon de livraison pour commencer.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Menu Dropdown - Rendered in Portal */}
            {activeMenuId && activeNote && menuPosition && createPortal(
                <div 
                    className="absolute z-50 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                    style={{ top: menuPosition.top, left: menuPosition.left }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="py-1">
                        <button 
                            onClick={() => handleEditClick(activeNote)} 
                            className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                        >
                            <Pencil size={16} className="mr-3 text-emerald-600" /> Modifier
                        </button>
                        
                        {!activeNote.invoiceId ? (
                            onCreateInvoice && (
                                <button 
                                    onClick={() => handleConvertToInvoice(activeNote.id)} 
                                    disabled={isConverting}
                                    className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                                >
                                    {isConverting ? (
                                        <Loader2 size={16} className="mr-3 animate-spin text-purple-600" />
                                    ) : (
                                        <FileText size={16} className="mr-3 text-purple-600" />
                                    )}
                                    Convertir Facture
                                </button>
                            )
                        ) : (
                            <button 
                                onClick={() => navigate('/sales/invoices')} 
                                className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                            >
                                <FileCheck size={16} className="mr-3 text-teal-600" /> Voir Facture
                            </button>
                        )}
                        
                        <button 
                            onClick={() => handlePrintClick(activeNote)}
                            className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                        >
                            <Printer size={16} className="mr-3 text-neutral-500" /> Imprimer
                        </button>

                        <button 
                            onClick={() => handlePDFClick(activeNote)}
                            disabled={isDownloading}
                            className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                        >
                            {isDownloading ? <Loader2 size={16} className="mr-3 animate-spin" /> : <Download size={16} className="mr-3 text-neutral-500" />} Télécharger PDF
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

export default DeliveryNotes;