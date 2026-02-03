
import React, { useState, useEffect } from 'react';
import { Supplier } from '../types';
import { X, Building2, User, MapPin } from 'lucide-react';

interface AddSupplierModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (supplier: Omit<Supplier, 'id' | 'supplierCode'>, id?: string) => void;
    supplierToEdit: Supplier | null;
}

const AddSupplierModal: React.FC<AddSupplierModalProps> = ({ isOpen, onClose, onSave, supplierToEdit }) => {
    const [type, setType] = useState<'Entreprise' | 'Particulier'>('Entreprise');
    const [name, setName] = useState('');
    const [company, setCompany] = useState('');
    const [ice, setIce] = useState('');
    const [rc, setRc] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [isVisible, setIsVisible] = useState(false);

    const isEditMode = supplierToEdit !== null;

    useEffect(() => {
        if (isOpen) {
            if (isEditMode) {
                setType(supplierToEdit.type || (supplierToEdit.company ? 'Entreprise' : 'Particulier'));
                setName(supplierToEdit.name);
                setCompany(supplierToEdit.company || '');
                setIce(supplierToEdit.ice || '');
                setRc(supplierToEdit.rc || '');
                setEmail(supplierToEdit.email);
                setPhone(supplierToEdit.phone);
                setAddress(supplierToEdit.address || '');
            } else {
                setType('Entreprise');
                setName('');
                setCompany('');
                setIce('');
                setRc('');
                setEmail('');
                setPhone('');
                setAddress('');
            }
            setTimeout(() => setIsVisible(true), 10);
        } else {
            setIsVisible(false);
        }
    }, [supplierToEdit, isOpen]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 200);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (type === 'Entreprise' && !company) {
            alert('Le nom de la société est obligatoire.');
            return;
        }
        if (type === 'Particulier' && !name) {
            alert('Le nom est obligatoire.');
            return;
        }

        onSave({ 
            type,
            name, 
            company: type === 'Entreprise' ? company : undefined,
            ice,
            rc,
            email, 
            phone,
            address
        }, supplierToEdit?.id);
        handleClose();
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`} aria-modal="true">
             <div className="absolute inset-0 bg-neutral-900/75 backdrop-blur-sm" onClick={handleClose}></div>
            <div className={`relative w-full max-w-lg p-6 bg-white rounded-lg shadow-xl transition-all duration-200 ease-in-out flex flex-col max-h-[90vh] ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                
                {/* Header */}
                <div className="flex items-start justify-between pb-4 border-b border-neutral-200">
                     <div>
                        <h3 className="text-lg font-semibold text-neutral-900">{isEditMode ? 'Modifier le fournisseur' : 'Ajouter un nouveau fournisseur'}</h3>
                        <p className="text-sm text-neutral-500">Remplissez les informations ci-dessous.</p>
                    </div>
                    <button onClick={handleClose} className="p-1 -mt-1 -mr-1 text-neutral-400 rounded-full hover:bg-neutral-100 hover:text-neutral-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="mt-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
                    <form id="supplierForm" onSubmit={handleSubmit} className="space-y-5">
                        
                        {/* Type Selector */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">Type de fournisseur</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setType('Entreprise')}
                                    className={`flex items-center justify-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all ${type === 'Entreprise' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50'}`}
                                >
                                    <Building2 size={18} /> Entreprise
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('Particulier')}
                                    className={`flex items-center justify-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all ${type === 'Particulier' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50'}`}
                                >
                                    <User size={18} /> Particulier
                                </button>
                            </div>
                        </div>

                        {/* Fields specific to Enterprise */}
                        {type === 'Entreprise' && (
                            <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 space-y-4">
                                <div>
                                    <label htmlFor="company" className="block text-sm font-medium text-neutral-700">Nom de la Société <span className="text-red-500">*</span></label>
                                    <input type="text" id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Ex: Fournisseur SARL" className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="ice" className="block text-sm font-medium text-neutral-700">ICE</label>
                                        <input type="text" id="ice" value={ice} onChange={(e) => setIce(e.target.value)} placeholder="Identifiant Commun" className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                                    </div>
                                    <div>
                                        <label htmlFor="rc" className="block text-sm font-medium text-neutral-700">RC</label>
                                        <input type="text" id="rc" value={rc} onChange={(e) => setRc(e.target.value)} placeholder="Registre Commerce" className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Common Fields */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-neutral-700">
                                {type === 'Entreprise' ? 'Personne de contact' : 'Nom complet'} <span className="text-red-500">*</span>
                            </label>
                            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={type === 'Entreprise' ? "Ex: M. Responsable" : "Ex: Ahmed Fournisseur"} className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" required/>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-neutral-700">Téléphone</label>
                                <input type="text" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-neutral-700">Email</label>
                                <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="address" className="block text-sm font-medium text-neutral-700 flex items-center gap-1">
                                <MapPin size={14}/> Adresse complète
                            </label>
                            <textarea id="address" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="pt-4 mt-2 border-t border-neutral-200 flex justify-end space-x-3">
                    <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-semibold text-neutral-900 bg-white border border-neutral-300 rounded-lg shadow-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all">
                        Annuler
                    </button>
                    <button type="submit" form="supplierForm" className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 border border-transparent rounded-lg shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 transition-all">
                        {isEditMode ? 'Mettre à jour' : 'Enregistrer'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddSupplierModal;
