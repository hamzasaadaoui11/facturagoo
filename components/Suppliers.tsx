
import React, { useState } from 'react';
import Header from './Header';
import AddSupplierModal from './AddSupplierModal';
import ConfirmationModal from './ConfirmationModal';
import { Plus, Pencil, Trash2, Building2, User, Search, Building } from 'lucide-react';
import { Supplier } from '../types';

interface SuppliersProps {
    suppliers: Supplier[];
    onAddSupplier: (supplier: Omit<Supplier, 'id' | 'supplierCode'>) => void;
    onUpdateSupplier: (supplier: Supplier) => void;
    onDeleteSupplier: (supplierId: string) => void;
}

const Suppliers: React.FC<SuppliersProps> = ({ suppliers, onAddSupplier, onUpdateSupplier, onDeleteSupplier }) => {
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
            <Header title="Fournisseurs">
                <button
                    type="button"
                    onClick={handleAddClick}
                    className="inline-flex items-center gap-x-2 rounded-lg bg-emerald-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.97]"
                >
                    <Plus className="-ml-0.5 h-5 w-5" />
                    Ajouter Fournisseur
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
                title="Supprimer le fournisseur"
                message="Êtes-vous sûr de vouloir supprimer ce fournisseur ? Cette action est irréversible."
            />

            <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-neutral-200">
                 <div className="p-4 border-b border-neutral-200">
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                           <Search className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                        </div>
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Rechercher par nom, société, ICE, téléphone..."
                            className="block w-full rounded-lg border-neutral-300 py-2 pl-10 text-neutral-900 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                        />
                    </div>
                 </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                        <thead className="bg-neutral-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Code</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Fournisseur / Société</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Contact</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Coordonnées</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Type</th>
                                <th scope="col" className="relative px-6 py-3 text-right"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 bg-white">
                            {filteredSuppliers.length > 0 ? (
                                filteredSuppliers.map((supplier) => {
                                    const isCompany = supplier.type === 'Entreprise' || (!supplier.type && supplier.company);

                                    return (
                                    <tr key={supplier.id} className="hover:bg-emerald-50/60 transition-colors duration-200">
                                        <td className="whitespace-nowrap px-6 py-4 text-sm md:text-base text-neutral-500 font-mono">{supplier.supplierCode}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${isCompany ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                    {isCompany ? <Building2 size={16} /> : <User size={16} />}
                                                </div>
                                                <div className="ml-3">
                                                    <div className="text-sm md:text-base font-medium text-neutral-900">
                                                        {isCompany ? supplier.company : supplier.name}
                                                    </div>
                                                    {isCompany && supplier.ice && (
                                                        <div className="text-xs text-neutral-500">ICE: {supplier.ice}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm md:text-base text-neutral-600">
                                            {isCompany ? supplier.name : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm md:text-base text-neutral-500">
                                            <div>{supplier.email}</div>
                                            <div>{supplier.phone}</div>
                                        </td>
                                         <td className="whitespace-nowrap px-6 py-4 text-sm md:text-base">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isCompany ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                {isCompany ? 'Entreprise' : 'Particulier'}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button 
                                                    onClick={() => handleEditClick(supplier)} 
                                                    className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors"
                                                    title="Modifier"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteClick(supplier.id)} 
                                                    className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                                                    title="Supprimer"
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
                                                {searchTerm ? "Aucun résultat trouvé" : "Aucun fournisseur trouvé"}
                                            </h3>
                                            <p>{searchTerm ? "Essayez d'autres mots-clés." : "Commencez par ajouter votre premier fournisseur."}</p>
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
