
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import CreatePurchaseOrderModal from './CreatePurchaseOrderModal';
import ConfirmationModal from './ConfirmationModal';
import { Plus, Search, Pencil, RefreshCw, Download, FileText, MoreVertical, Truck, Loader2, Printer, Trash2, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import { PurchaseOrder, PurchaseOrderStatus, Supplier, Product, CompanySettings } from '../types';
import { generatePDF, printDocument } from '../services/pdfService';
import { useLanguage } from '../contexts/LanguageContext';

const statusColors: { [key in PurchaseOrderStatus]: string } = {
    [PurchaseOrderStatus.Draft]: 'bg-neutral-100 text-neutral-600',
    [PurchaseOrderStatus.Sent]: 'bg-blue-100 text-blue-700',
    [PurchaseOrderStatus.Received]: 'bg-green-100 text-green-700',
    [PurchaseOrderStatus.Paid]: 'bg-emerald-100 text-emerald-700',
    [PurchaseOrderStatus.Cancelled]: 'bg-red-100 text-red-700',
};

const getPaymentStatus = (order: PurchaseOrder, language: string) => {
    const total = order.totalAmount || 0;
    const paid = order.amountPaid || 0;
    
    if (paid >= total && total > 0) return { label: language === 'fr' ? 'Payé' : 'Paid', color: 'bg-emerald-100 text-emerald-700' };
    if (paid > 0) return { label: language === 'fr' ? 'Partiel' : 'Partial', color: 'bg-amber-100 text-amber-700' };
    return { label: language === 'fr' ? 'En attente' : 'Unpaid', color: 'bg-slate-100 text-slate-600' };
};

interface PurchaseOrdersProps {
    orders: PurchaseOrder[];
    suppliers: Supplier[];
    products: Product[];
    onAddOrder: (order: Omit<PurchaseOrder, 'id'>) => void;
    onUpdateOrder: (order: PurchaseOrder) => void;
    onUpdateStatus: (id: string, status: PurchaseOrderStatus) => void;
    onDeleteOrder?: (id: string) => void;
    onConvertToInvoice?: (order: PurchaseOrder) => void;
    companySettings?: CompanySettings | null;
    generateDocumentId?: () => string;
}

const PurchaseOrders: React.FC<PurchaseOrdersProps> = ({ 
    orders, 
    suppliers,
    products,
    onAddOrder,
    onUpdateOrder,
    onUpdateStatus,
    onDeleteOrder,
    onConvertToInvoice,
    companySettings,
    generateDocumentId
}) => {
    const { t, isRTL, language } = useLanguage();
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [orderToEdit, setOrderToEdit] = useState<PurchaseOrder | null>(null);
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
    const filteredOrders = orders.filter(order => {
        const term = searchTerm.toLowerCase();
        return (
            (order.documentId || order.id).toLowerCase().includes(term) ||
            (order.supplierName || '').toLowerCase().includes(term)
        );
    });
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

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
    }, [orders.length, searchTerm, itemsPerPage]);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [orderIdToDelete, setOrderIdToDelete] = useState<string | null>(null);

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
            const menuHeight = 300; 
            const menuWidth = 224; // w-56 is 14rem = 224px
            
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

    const handleCreateClick = () => {
        setOrderToEdit(null);
        setIsCreateModalOpen(true);
    };

    const handleEdit = (order: PurchaseOrder) => {
        setOrderToEdit(order);
        setIsCreateModalOpen(true);
        setActiveMenuId(null);
    };

    const handleDeleteClick = (id: string) => {
        setOrderIdToDelete(id);
        setIsDeleteModalOpen(true);
        setActiveMenuId(null);
    };

    const confirmDelete = () => {
        if (orderIdToDelete && onDeleteOrder) {
            onDeleteOrder(orderIdToDelete);
        }
        setIsDeleteModalOpen(false);
        setOrderIdToDelete(null);
    };

    const handleStatusChange = (id: string, newStatus: PurchaseOrderStatus) => {
        onUpdateStatus(id, newStatus);
        setActiveMenuId(null);
    };

    const handleDownload = async (order: PurchaseOrder) => {
        setDownloadingId(order.id);
        setActiveMenuId(null);
        try {
            const supplier = suppliers.find(s => s.id === order.supplierId);
            await generatePDF('Bon de Commande', order, companySettings || null, supplier);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setDownloadingId(null);
        }
    };

    const handlePrint = (order: PurchaseOrder) => {
        setActiveMenuId(null);
        try {
            const supplier = suppliers.find(s => s.id === order.supplierId);
            printDocument('Bon de Commande', order, companySettings || null, supplier);
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleSaveOrder = (orderData: Omit<PurchaseOrder, 'id'>, id?: string) => {
        if (id) {
             const original = orders.find(o => o.id === id);
             if(original) {
                 onUpdateOrder({
                     ...original,
                     ...orderData
                 });
             }
        } else {
            onAddOrder(orderData);
        }
    };

    const activeOrder = orders.find(o => o.id === activeMenuId);
    const isDownloading = activeOrder ? downloadingId === activeOrder.id : false;

    return (
        <div>
            <Header title={t('purchaseOrders')}>
                <button
                    type="button"
                    onClick={handleCreateClick}
                    className="inline-flex items-center gap-x-1 sm:gap-x-2 rounded-lg bg-emerald-600 px-2.5 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.97]"
                >
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden xs:inline">{t('newPurchaseOrder')}</span>
                    <span className="xs:hidden">{t('add')}</span>
                </button>
            </Header>

            <CreatePurchaseOrderModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleSaveOrder}
                suppliers={suppliers}
                products={products}
                orderToEdit={orderToEdit}
                companySettings={companySettings}
                generateDocumentId={generateDocumentId}
            />

            <ConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title={t('confirmDelete')}
                message={t('confirmDeleteMessage')}
            />

            <div className="rounded-lg bg-white shadow-sm ring-1 ring-neutral-200 overflow-hidden">
                <div className="p-4 border-b border-neutral-200">
                     <div className="relative">
                        <div className={`pointer-events-none absolute inset-y-0 flex items-center ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'}`}>
                           <Search className="h-4 w-4 sm:h-5 sm:w-5 text-neutral-400" aria-hidden="true" />
                        </div>
                        <input
                           type="search"
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                           placeholder={t('searchOrderPlaceholder')}
                           className={`block w-full rounded-lg border-neutral-300 py-2 text-neutral-900 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs sm:text-sm ${isRTL ? 'pr-9 sm:pr-10' : 'pl-9 sm:pl-10'}`}
                        />
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                        <thead className="bg-neutral-50">
                            <tr>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('orderNumber')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('date')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('supplier')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('expectedDelivery')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-left' : 'text-right'}`}>{t('amount')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('status')}</th>
                                <th scope="col" className="relative px-6 py-3 text-right"><span className="sr-only">{t('actions')}</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 bg-white">
                            {paginatedOrders.length > 0 ? (
                                paginatedOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-emerald-50/60 transition-colors duration-200">
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-medium text-emerald-600 ${isRTL ? 'text-right' : 'text-left'}`}>{order.documentId || order.id}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{new Date(order.date).toLocaleDateString()}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{order.supplierName}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{order.expectedDate ? new Date(order.expectedDate).toLocaleDateString() : '-'}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm text-neutral-500 ${isRTL ? 'text-left' : 'text-right'}`}>{order.totalAmount.toLocaleString(undefined, { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div className="flex flex-col gap-1">
                                                <span className={`inline-flex items-center w-fit rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusColors[order.status]}`}>
                                                    {order.status}
                                                </span>
                                                <span className={`inline-flex items-center w-fit rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getPaymentStatus(order, language).color}`}>
                                                    {getPaymentStatus(order, language).label}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium relative">
                                            <button 
                                                onClick={(e) => toggleMenu(e, order.id)}
                                                className={`p-1.5 rounded-full transition-colors ${activeMenuId === order.id ? 'bg-neutral-200 text-neutral-800' : 'text-neutral-500 hover:bg-neutral-100'}`}
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
                                            <ShoppingBag className="h-12 w-12 text-slate-300 mb-4" />
                                            <h3 className="text-lg font-bold text-slate-800">{searchTerm ? t('noFinancialData') : t('noOrdersFound')}</h3>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-neutral-200">
                    {paginatedOrders.length > 0 ? (
                        paginatedOrders.map((order) => (
                            <div key={order.id} className="p-4 hover:bg-emerald-50/60 transition-colors duration-200">
                                <div className={`flex justify-between items-start mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div>
                                        <h4 className={`text-sm font-bold text-emerald-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            #{order.documentId || order.id}
                                        </h4>
                                        <p className={`text-xs text-neutral-500 mt-0.5 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {new Date(order.date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={(e) => toggleMenu(e, order.id)}
                                        className={`p-2 rounded-full transition-colors ${activeMenuId === order.id ? 'bg-neutral-200 text-neutral-800' : 'text-neutral-500 hover:bg-neutral-100'}`}
                                    >
                                        <MoreVertical size={20} />
                                    </button>
                                </div>
                                
                                <div className={`mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                                    <p className="text-sm font-medium text-neutral-900">{order.supplierName}</p>
                                    <p className="text-xs text-neutral-500 mt-0.5">{t('expectedDelivery')}: {order.expectedDate ? new Date(order.expectedDate).toLocaleDateString() : '-'}</p>
                                </div>
                                
                                <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div className="flex gap-2">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusColors[order.status]}`}>
                                            {order.status}
                                        </span>
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getPaymentStatus(order, language).color}`}>
                                            {getPaymentStatus(order, language).label}
                                        </span>
                                    </div>
                                    <p className="text-sm font-bold text-neutral-900">
                                        {order.totalAmount.toLocaleString(undefined, { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 px-6">
                            <ShoppingBag className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-800">{searchTerm ? t('noFinancialData') : t('noOrdersFound')}</h3>
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
                                    Affichage de <span className="font-bold">{startIndex + 1}</span> à <span className="font-bold">{Math.min(startIndex + itemsPerPage, filteredOrders.length)}</span> sur <span className="font-bold">{filteredOrders.length}</span> commandes
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
            {activeMenuId && activeOrder && menuPosition && createPortal(
                <div 
                    className="absolute z-50 w-56 rounded-2xl bg-white shadow-xl border border-slate-100/80 p-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: menuPosition.top, left: menuPosition.left, transformOrigin: menuPosition.transformOrigin }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex flex-col gap-0.5">
                        <button 
                            onClick={() => { handleEdit(activeOrder); setActiveMenuId(null); }} 
                            className="flex w-full items-center px-3 py-2.5 text-[13px] font-medium text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <Pencil size={16} className={`text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('edit')}
                        </button>

                        {onConvertToInvoice && (
                            <button 
                                onClick={() => { onConvertToInvoice(activeOrder); setActiveMenuId(null); }} 
                                className="flex w-full items-center px-3 py-2.5 text-[13px] font-medium text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                            >
                                <FileText size={16} className={`text-blue-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('convertToInvoice')}
                            </button>
                        )}
                        
                        <div className="border-t border-slate-100 my-1 mx-2"></div>

                        {activeOrder.status === PurchaseOrderStatus.Draft && (
                            <button 
                                onClick={() => { handleStatusChange(activeOrder.id, PurchaseOrderStatus.Sent); setActiveMenuId(null); }} 
                                className="flex w-full items-center px-3 py-2.5 text-[13px] font-medium text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                            >
                                <RefreshCw size={16} className={`text-blue-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('markSent')}
                            </button>
                        )}
                        
                        {activeOrder.status === PurchaseOrderStatus.Sent && (
                             <button 
                                onClick={() => { handleStatusChange(activeOrder.id, PurchaseOrderStatus.Received); setActiveMenuId(null); }} 
                                className="flex w-full items-center px-3 py-2.5 text-[13px] font-medium text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                            >
                                <Truck size={16} className={`text-green-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('markReceived')}
                            </button>
                        )}

                        {(activeOrder.totalAmount - (activeOrder.amountPaid || 0)) > 0 && (
                            <button 
                                onClick={() => {
                                    navigate('/suppliers', { state: { supplierId: activeOrder.supplierId, tab: 'credit' } });
                                    setActiveMenuId(null);
                                }} 
                                className="flex w-full items-center px-3 py-2.5 text-[13px] font-medium text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                            >
                                <RefreshCw size={16} className={`text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {language === 'fr' ? 'Régler le paiement' : 'Record Payment'}
                            </button>
                        )}

                        <div className="border-t border-slate-100 my-1 mx-2"></div>
                        
                        <button 
                            onClick={() => { handlePrint(activeOrder); setActiveMenuId(null); }}
                            className="flex w-full items-center px-3 py-2.5 text-[13px] font-medium text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <Printer size={16} className={`text-neutral-500 group-hover:text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('print')}
                        </button>

                        <button 
                            onClick={() => { handleDownload(activeOrder); setActiveMenuId(null); }}
                            disabled={isDownloading}
                            className="flex w-full items-center px-3 py-2.5 text-[13px] font-medium text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group disabled:opacity-50"
                        >
                            {isDownloading ? <Loader2 size={16} className={`animate-spin ${isRTL ? 'ml-3' : 'mr-3'}`} /> : <Download size={16} className={`text-neutral-500 group-hover:text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} />} {t('download')}
                        </button>

                        <div className="border-t border-slate-100 my-1 mx-2"></div>

                        <button 
                            onClick={() => { handleDeleteClick(activeOrder.id); setActiveMenuId(null); }} 
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

export default PurchaseOrders;
