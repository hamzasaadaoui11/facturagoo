
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Header from './Header';
import CreatePurchaseOrderModal from './CreatePurchaseOrderModal';
import ConfirmationModal from './ConfirmationModal';
import { Plus, Search, Pencil, RefreshCw, Download, FileText, MoreVertical, Truck, Loader2, Printer, Trash2, ShoppingBag } from 'lucide-react';
import { PurchaseOrder, PurchaseOrderStatus, Supplier, Product, CompanySettings } from '../types';
import { generatePDF, printDocument } from '../services/pdfService';
import { useLanguage } from '../contexts/LanguageContext';

const statusColors: { [key in PurchaseOrderStatus]: string } = {
    [PurchaseOrderStatus.Draft]: 'bg-neutral-100 text-neutral-600',
    [PurchaseOrderStatus.Sent]: 'bg-blue-100 text-blue-700',
    [PurchaseOrderStatus.Received]: 'bg-green-100 text-green-700',
    [PurchaseOrderStatus.Cancelled]: 'bg-red-100 text-red-700',
};

interface PurchaseOrdersProps {
    orders: PurchaseOrder[];
    suppliers: Supplier[];
    products: Product[];
    onAddOrder: (order: Omit<PurchaseOrder, 'id'>) => void;
    onUpdateOrder: (order: PurchaseOrder) => void;
    onUpdateStatus: (id: string, status: PurchaseOrderStatus) => void;
    onDeleteOrder?: (id: string) => void;
    companySettings?: CompanySettings | null;
}

const PurchaseOrders: React.FC<PurchaseOrdersProps> = ({ 
    orders, 
    suppliers,
    products,
    onAddOrder,
    onUpdateOrder,
    onUpdateStatus,
    onDeleteOrder,
    companySettings
}) => {
    const { t, isRTL } = useLanguage();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [orderToEdit, setOrderToEdit] = useState<PurchaseOrder | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [orderIdToDelete, setOrderIdToDelete] = useState<string | null>(null);

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

    const filteredOrders = orders.filter(order => {
        const term = searchTerm.toLowerCase();
        return (
            (order.documentId || order.id).toLowerCase().includes(term) ||
            (order.supplierName || '').toLowerCase().includes(term)
        );
    });

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
                left: isRTL ? rect.left + window.scrollX : rect.right + window.scrollX - 192 // 192px width
            });
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
                    className="inline-flex items-center gap-x-2 rounded-lg bg-emerald-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.97]"
                >
                    <Plus className="-ml-0.5 h-5 w-5 rtl:ml-0.5 rtl:-mr-0.5" />
                    {t('newPurchaseOrder')}
                </button>
            </Header>

            <CreatePurchaseOrderModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleSaveOrder}
                suppliers={suppliers}
                products={products}
                orderToEdit={orderToEdit}
            />

            <ConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title={t('confirmDelete')}
                message={t('confirmDeleteMessage')}
            />

            <div className="rounded-lg bg-white shadow-sm ring-1 ring-neutral-200">
                <div className="p-4 border-b border-neutral-200">
                     <div className="relative">
                        <div className={`pointer-events-none absolute inset-y-0 flex items-center ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'}`}>
                           <Search className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                        </div>
                        <input
                           type="search"
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                           placeholder={t('searchOrderPlaceholder')}
                           className={`block w-full rounded-lg border-neutral-300 py-2 text-neutral-900 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm ${isRTL ? 'pr-10' : 'pl-10'}`}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto rounded-lg">
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
                            {filteredOrders.length > 0 ? (
                                filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-emerald-50/60 transition-colors duration-200">
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm md:text-base font-medium text-emerald-600 ${isRTL ? 'text-right' : 'text-left'}`}>{order.documentId || order.id}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm md:text-base text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{new Date(order.date).toLocaleDateString()}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm md:text-base text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{order.supplierName}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm md:text-base text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{order.expectedDate ? new Date(order.expectedDate).toLocaleDateString() : '-'}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm md:text-base text-neutral-500 ${isRTL ? 'text-left' : 'text-right'}`}>{order.totalAmount.toLocaleString(undefined, { style: 'currency', currency: 'MAD' })}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm md:text-base ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[order.status]}`}>
                                                {order.status}
                                            </span>
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
                                            <p className="text-sm text-slate-500 mt-1">{t('firstOrderPrompt')}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Menu Dropdown via Portal */}
            {activeMenuId && activeOrder && menuPosition && createPortal(
                <div 
                    className="absolute z-50 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                    style={{ top: menuPosition.top, left: menuPosition.left }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="py-1">
                        <button 
                            onClick={() => handleEdit(activeOrder)} 
                            className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                        >
                            <Pencil size={16} className={`${isRTL ? 'ml-3' : 'mr-3'} text-emerald-600`} /> {t('edit')}
                        </button>
                        
                        <div className="border-t border-gray-100 my-1"></div>

                        {activeOrder.status === PurchaseOrderStatus.Draft && (
                            <button 
                                onClick={() => handleStatusChange(activeOrder.id, PurchaseOrderStatus.Sent)} 
                                className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                            >
                                <RefreshCw size={16} className={`${isRTL ? 'ml-3' : 'mr-3'} text-blue-600`} /> {t('markSent')}
                            </button>
                        )}
                        
                        {activeOrder.status === PurchaseOrderStatus.Sent && (
                             <button 
                                onClick={() => handleStatusChange(activeOrder.id, PurchaseOrderStatus.Received)} 
                                className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                            >
                                <Truck size={16} className={`${isRTL ? 'ml-3' : 'mr-3'} text-green-600`} /> {t('markReceived')}
                            </button>
                        )}

                        <div className="border-t border-gray-100 my-1"></div>
                        
                        <button 
                            onClick={() => handlePrint(activeOrder)}
                            className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                        >
                            <Printer size={16} className={`${isRTL ? 'ml-3' : 'mr-3'} text-neutral-500`} /> {t('print')}
                        </button>

                        <button 
                            onClick={() => handleDownload(activeOrder)}
                            disabled={isDownloading}
                            className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                        >
                            {isDownloading ? <Loader2 size={16} className={`${isRTL ? 'ml-3' : 'mr-3'} animate-spin`} /> : <Download size={16} className={`${isRTL ? 'ml-3' : 'mr-3'} text-neutral-500`} />} {t('download')}
                        </button>

                        <button 
                            onClick={() => handleDeleteClick(activeOrder.id)} 
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

export default PurchaseOrders;
