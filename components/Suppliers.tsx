
import React, { useState } from 'react';
import Header from './Header';
import AddSupplierModal from './AddSupplierModal';
import ConfirmationModal from './ConfirmationModal';
import { Plus, Pencil, Trash2, Building2, User, Search, Building } from 'lucide-react';
import { Supplier } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface SuppliersProps {
    suppliers: Supplier[];
    onAddSupplier: (supplier: Omit<Supplier, 'id' | 'supplierCode'>) => void;
    onUpdateSupplier: (supplier: Supplier) => void;
    onDeleteSupplier: (supplierId: string) => void;
}

const Suppliers: React.FC<SuppliersProps> = ({ suppliers, onAddSupplier, onUpdateSupplier, onDeleteSupplier }) => {
    const { t, isRTL } = useLanguage();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [supplierIdToDelete, setSupplierIdToDelete] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

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
                    className="inline-flex items-center gap-x-2 rounded-lg bg-emerald-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.97]"
                >
                    <Plus className="-ml-0.5 h-5 w-5 rtl:ml-0.5 rtl:-mr-0.5" />
                    {t('addSupplier')}
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

            <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-neutral-200">
                 <div className="p-4 border-b border-neutral-200">
                    <div className="relative">
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
                 </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                        <thead className="bg-neutral-50">
                            <tr>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('code')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('supplier')} / {t('company')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('contact')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('coordinates')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('type')}</th>
                                <th scope="col" className="relative px-6 py-3 text-right"><span className="sr-only">{t('actions')}</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 bg-white">
                            {filteredSuppliers.length > 0 ? (
                                filteredSuppliers.map((supplier) => {
                                    const isCompany = supplier.type === 'Entreprise' || (!supplier.type && supplier.company);

                                    return (
                                    <tr key={supplier.id} className="hover:bg-emerald-50/60 transition-colors duration-200">
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
                                     <td colSpan={6} className="text-center py-16 px-6 text-sm text-neutral-500">
                                        <div className="flex flex-col items-center">
                                            <Building className="h-10 w-10 text-neutral-400 mb-2" />
                                            <h3 className="font-semibold text-neutral-800">
                                                {searchTerm ? t('noFinancialData') : t('suppliers')}
                                            </h3>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Suppliers;
