
import React, { useState, useEffect } from 'react';
import Header from './Header';
import AddSupplierModal from './AddSupplierModal';
import ConfirmationModal from './ConfirmationModal';
import { Plus, Pencil, Trash2, Building2, User, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Supplier } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface SuppliersProps {
    suppliers: Supplier[];
    onAddSupplier: (supplier: Omit<Supplier, 'id' | 'supplierCode'>) => void;
    onUpdateSupplier: (supplier: Supplier) => void;
    onDeleteSupplier: (supplierId: string) => void;
    onDeleteSuppliers: (supplierIds: string[]) => void;
}

const Suppliers: React.FC<SuppliersProps> = ({ suppliers, onAddSupplier, onUpdateSupplier, onDeleteSupplier, onDeleteSuppliers }) => {
    const { t, isRTL } = useLanguage();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [supplierIdToDelete, setSupplierIdToDelete] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
    const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const filteredSuppliers = suppliers.filter(supplier => {
        const term = searchTerm.toLowerCase();
        return (
            (supplier.name?.toLowerCase() || '').includes(term) ||
            (supplier.company?.toLowerCase() || '').includes(term) ||
            (supplier.email?.toLowerCase() || '').includes(term) ||
            (supplier.phone?.toLowerCase() || '').includes(term) ||
            (supplier.supplierCode?.toLowerCase() || '').includes(term) ||
            (supplier.ice?.toLowerCase() || '').includes(term)
        );
    });

    // Reset to first page when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedSuppliers = filteredSuppliers.slice(startIndex, startIndex + itemsPerPage);

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

    const handleAddClick = () => {
        setSupplierToEdit(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (supplier: Supplier) => {
        setSupplierToEdit(supplier);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (supplierId: string) => {
        setSupplierIdToDelete(supplierId);
        setIsConfirmOpen(true);
    };

    const confirmDeletion = () => {
        if (supplierIdToDelete) {
            onDeleteSupplier(supplierIdToDelete);
        }
        setIsConfirmOpen(false);
        setSupplierIdToDelete(null);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedSupplierIds(filteredSuppliers.map(s => s.id));
        } else {
            setSelectedSupplierIds([]);
        }
    };

    const handleSelectSupplier = (supplierId: string) => {
        setSelectedSupplierIds(prev =>
            prev.includes(supplierId)
                ? prev.filter(id => id !== supplierId)
                : [...prev, supplierId]
        );
    };

    const handleBulkDelete = () => {
        if (selectedSupplierIds.length > 0) {
            setIsBulkConfirmOpen(true);
        }
    };

    const confirmBulkDeletion = () => {
        onDeleteSuppliers(selectedSupplierIds);
        setSelectedSupplierIds([]);
        setIsBulkConfirmOpen(false);
    };

    const handleSaveSupplier = (supplierData: Omit<Supplier, 'id' | 'supplierCode'>, id?: string) => {
        if (id) {
            const existingSupplier = suppliers.find(s => s.id === id);
            if (existingSupplier) {
                onUpdateSupplier({ ...existingSupplier, ...supplierData });
            }
        } else {
            onAddSupplier(supplierData);
        }
        setIsModalOpen(false);
    };

    return (
        <div>
            <Header title={t('suppliers')}>
                <button
                    type="button"
                    onClick={handleAddClick}
                    className="inline-flex items-center gap-x-2 rounded-lg bg-emerald-600 px-3 py-2 md:px-3.5 md:py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.97]"
                >
                    <Plus className="h-5 w-5" />
                    <span className="hidden sm:inline">{t('addSupplier')}</span>
                    <span className="sm:hidden">{t('add')}</span>
                </button>
            </Header>

            <AddSupplierModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveSupplier}
                supplierToEdit={supplierToEdit}
            />

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmDeletion}
            />

            <ConfirmationModal
                isOpen={isBulkConfirmOpen}
                onClose={() => setIsBulkConfirmOpen(false)}
                onConfirm={confirmBulkDeletion}
                title={t('confirmBulkDelete')}
                message={t('confirmBulkDeleteMessage', { count: selectedSupplierIds.length })}
            />

            <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-neutral-200">
                 <div className="p-4 border-b border-neutral-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="relative flex-1">
                            <div className={`pointer-events-none absolute inset-y-0 flex items-center ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'}`}>
                               <Search className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                            </div>
                            <input
                                type="search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={t('search')}
                                className={`block w-full rounded-lg border-neutral-300 py-2 text-neutral-900 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm ${isRTL ? 'pr-10' : 'pl-10'}`}
                            />
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                            <div className="md:hidden flex items-center gap-2 bg-neutral-50 px-3 py-2 rounded-lg border border-neutral-200">
                                <input
                                    type="checkbox"
                                    checked={selectedSupplierIds.length === filteredSuppliers.length && filteredSuppliers.length > 0}
                                    onChange={handleSelectAll}
                                    className="h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-600"
                                />
                                <span className="text-xs font-medium text-neutral-500">{t('selectAll')}</span>
                            </div>
                            {selectedSupplierIds.length > 0 && (
                                <button
                                    onClick={handleBulkDelete}
                                    className="inline-flex items-center gap-x-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 shadow-sm hover:bg-red-100 ring-1 ring-inset ring-red-200 transition-all duration-200"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span>{t('deleteSelected')} ({selectedSupplierIds.length})</span>
                                </button>
                            )}
                        </div>
                    </div>
                 </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-neutral-200">
                    {paginatedSuppliers.length > 0 ? (
                        paginatedSuppliers.map((supplier) => {
                            const isCompany = supplier.type === 'Entreprise' || (!supplier.type && supplier.company);
                            return (
                                <div key={supplier.id} className={`p-4 space-y-3 hover:bg-emerald-50/60 transition-colors duration-200 ${selectedSupplierIds.includes(supplier.id) ? 'bg-emerald-50/40' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                                            <input
                                                type="checkbox"
                                                checked={selectedSupplierIds.includes(supplier.id)}
                                                onChange={() => handleSelectSupplier(supplier.id)}
                                                className="h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-600"
                                            />
                                            <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${isCompany ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                {isCompany ? <Building2 size={20} /> : <User size={20} />}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-neutral-900">
                                                    {isCompany ? supplier.company : supplier.name}
                                                </div>
                                                <div className="text-xs font-mono text-neutral-500">{supplier.supplierCode}</div>
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${isCompany ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                            {isCompany ? t('enterprise') : t('individual')}
                                        </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 text-xs text-neutral-500">
                                        <div>
                                            <div className="font-medium text-neutral-700">{t('contact')}</div>
                                            <div>{isCompany ? supplier.name : '-'}</div>
                                        </div>
                                        <div>
                                            <div className="font-medium text-neutral-700">{t('coordinates')}</div>
                                            <div className="truncate">{supplier.email}</div>
                                            <div>{supplier.phone}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse pt-2 border-t border-neutral-100">
                                        <button 
                                            onClick={() => handleEditClick(supplier)} 
                                            className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors flex items-center gap-1 text-xs font-medium"
                                        >
                                            <Pencil size={16} />
                                            {t('edit')}
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteClick(supplier.id)} 
                                            className="p-2 text-red-600 hover:bg-red-100 rounded-md transition-colors flex items-center gap-1 text-xs font-medium"
                                        >
                                            <Trash2 size={16} />
                                            {t('delete')}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-10 px-4">
                            <Building2 className="h-12 w-12 text-slate-200 mx-auto mb-3" strokeWidth={1.5} />
                            <h3 className="text-sm font-bold text-slate-800">
                                {searchTerm ? t('noFinancialData') : t('noSuppliers')}
                            </h3>
                        </div>
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                        <thead className="bg-neutral-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 hidden md:table-cell">
                                    <input
                                        type="checkbox"
                                        checked={selectedSupplierIds.length === filteredSuppliers.length && filteredSuppliers.length > 0}
                                        onChange={handleSelectAll}
                                        className="h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-600"
                                    />
                                </th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('code')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('supplier')} / {t('company')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('contact')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('coordinates')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('type')}</th>
                                <th scope="col" className="relative px-6 py-3 text-right"><span className="sr-only">{t('actions')}</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 bg-white">
                            {paginatedSuppliers.length > 0 ? (
                                paginatedSuppliers.map((supplier) => {
                                    const isCompany = supplier.type === 'Entreprise' || (!supplier.type && supplier.company);

                                    return (
                                    <tr key={supplier.id} className={`hover:bg-emerald-50/60 transition-colors duration-200 ${selectedSupplierIds.includes(supplier.id) ? 'bg-emerald-50/40' : ''}`}>
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedSupplierIds.includes(supplier.id)}
                                                onChange={() => handleSelectSupplier(supplier.id)}
                                                className="h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-600"
                                            />
                                        </td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm md:text-base text-neutral-500 font-mono ${isRTL ? 'text-right' : 'text-left'}`}>{supplier.supplierCode}</td>
                                        <td className={`px-6 py-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${isCompany ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                    {isCompany ? <Building2 size={16} /> : <User size={16} />}
                                                </div>
                                                <div className={`${isRTL ? 'mr-3' : 'ml-3'}`}>
                                                    <div className="text-sm md:text-base font-medium text-neutral-900">
                                                        {isCompany ? supplier.company : supplier.name}
                                                    </div>
                                                    {isCompany && supplier.ice && (
                                                        <div className="text-xs text-neutral-500">{t('ice')}: {supplier.ice}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm md:text-base text-neutral-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {isCompany ? supplier.name : '-'}
                                        </td>
                                        <td className={`px-6 py-4 text-sm md:text-base text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div>{supplier.email}</div>
                                            <div>{supplier.phone}</div>
                                        </td>
                                         <td className={`whitespace-nowrap px-6 py-4 text-sm md:text-base ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isCompany ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                {isCompany ? t('enterprise') : t('individual')}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                            <div className={`flex items-center justify-end space-x-2 ${isRTL ? 'space-x-reverse' : ''}`}>
                                                <button 
                                                    onClick={() => handleEditClick(supplier)} 
                                                    className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors"
                                                    title={t('edit')}
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteClick(supplier.id)} 
                                                    className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                                                    title={t('delete')}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )})
                            ) : (
                                <tr>
                                     <td colSpan={6} className="text-center py-20 px-6">
                                        <div className="flex flex-col items-center justify-center">
                                            <Building2 className="h-16 w-16 text-slate-200 mb-4" strokeWidth={1.5} />
                                            <h3 className="text-lg font-bold text-slate-800">
                                                {searchTerm ? t('noFinancialData') : t('noSuppliers')}
                                            </h3>
                                            {!searchTerm && (
                                                <p className="text-sm text-slate-500 mt-1">
                                                    {t('firstSupplierPrompt')}
                                                </p>
                                            )}
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
                                    Affichage de <span className="font-bold">{startIndex + 1}</span> à <span className="font-bold">{Math.min(startIndex + itemsPerPage, filteredSuppliers.length)}</span> sur <span className="font-bold">{filteredSuppliers.length}</span> fournisseurs
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
        </div>
    );
};

export default Suppliers;
