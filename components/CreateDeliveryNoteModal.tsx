
import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, ScanLine, Calculator, CreditCard, Loader2 } from 'lucide-react';
import { Client, Product, DeliveryNote, LineItem } from '../types';

interface CreateDeliveryNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (note: Omit<DeliveryNote, 'id'>, id?: string) => Promise<any> | void;
    clients: Client[];
    products: Product[];
    noteToEdit?: DeliveryNote | null;
}

const CreateDeliveryNoteModal: React.FC<CreateDeliveryNoteModalProps> = ({ isOpen, onClose, onSave, clients, products, noteToEdit }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form State
    const [clientId, setClientId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    
    // Item Addition State
    const [selectedProductId, setSelectedProductId] = useState('');
    const [itemQuantity, setItemQuantity] = useState(1);
    
    // Payment State
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState('Espèces');

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setIsVisible(true), 10);
            
            if (noteToEdit) {
                // Edit Mode
                setClientId(noteToEdit.clientId);
                setDate(noteToEdit.date);
                setLineItems(noteToEdit.lineItems);
                setPaymentAmount(noteToEdit.paymentAmount || 0);
                setPaymentMethod(noteToEdit.paymentMethod || 'Espèces');
            } else {
                // Create Mode
                setClientId('');
                setDate(new Date().toISOString().split('T')[0]);
                setLineItems([]);
                setPaymentAmount(0);
                setSelectedProductId('');
                setItemQuantity(1);
            }
        } else {
            setIsVisible(false);
        }
    }, [isOpen, noteToEdit]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 200);
    };

    const handleAddItem = () => {
        if (!selectedProductId) return;
        const product = products.find(p => p.id === selectedProductId);
        if (!product) return;

        const newItem: LineItem = {
            id: `temp-${Date.now()}`,
            productId: product.id,
            name: product.name,
            description: product.description || '',
            quantity: itemQuantity,
            unitPrice: product.salePrice,
            vat: product.vat
        };

        setLineItems(prev => [...prev, newItem]);
        setSelectedProductId('');
        setItemQuantity(1);
    };

    const handleRemoveItem = (id: string) => {
        setLineItems(prev => prev.filter(item => item.id !== id));
    };

    const totals = useMemo(() => {
        const subTotal = lineItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
        const vatAmount = lineItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity * (item.vat / 100)), 0);
        const totalTTC = subTotal + vatAmount;
        return { subTotal, vatAmount, totalTTC };
    }, [lineItems]);

    // Update payment amount when total changes, ONLY if creating new
    useEffect(() => {
        if (!noteToEdit) {
            setPaymentAmount(totals.totalTTC);
        }
    }, [totals.totalTTC, noteToEdit]);

    const handleSave = async () => {
        if (!clientId) {
            alert('Veuillez sélectionner un client.');
            return;
        }
        if (lineItems.length === 0) {
            alert('Veuillez ajouter au moins un article.');
            return;
        }

        const client = clients.find(c => c.id === clientId);
        
        setIsSubmitting(true);
        try {
            await onSave({
                clientId,
                clientName: client?.name || 'Client inconnu',
                date,
                lineItems,
                status: 'Livré',
                subTotal: totals.subTotal,
                vatAmount: totals.vatAmount,
                totalAmount: totals.totalTTC,
                paymentAmount: paymentAmount,
                paymentMethod: paymentMethod,
                invoiceId: noteToEdit?.invoiceId // Keep invoice link if existing
            }, noteToEdit?.id);
            handleClose();
        } catch (error) {
            console.error("Save failed", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const remainingAmount = totals.totalTTC - paymentAmount;

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`} aria-modal="true">
            <div className="absolute inset-0 bg-neutral-900/75 backdrop-blur-sm" onClick={handleClose}></div>
            
            <div className={`relative w-full max-w-2xl bg-white rounded-lg shadow-xl transition-all duration-200 ease-in-out flex flex-col max-h-[90vh] ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                
                {/* Header Standard Zenith */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
                    <div>
                        <h3 className="text-lg font-semibold text-neutral-900">{noteToEdit ? 'Modifier Bon de Livraison' : 'Nouveau Bon de Livraison'}</h3>
                        <p className="text-sm text-neutral-500">{noteToEdit ? `Modification du BL-${noteToEdit.documentId || noteToEdit.id}` : 'Créez un BL et enregistrez un règlement immédiat.'}</p>
                    </div>
                    <button onClick={handleClose} className="p-1 text-neutral-400 hover:text-neutral-600 rounded-full hover:bg-neutral-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="px-6 py-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                    {/* ... (Existing Body Content same as before) ... */}
                    {/* Client & Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Client *</label>
                            <select 
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                            >
                                <option value="">-- Sélectionner un client --</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Date *</label>
                            <input 
                                type="date" 
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                            />
                        </div>
                    </div>

                    {/* Product Selection Area */}
                    <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-medium text-neutral-900 flex items-center gap-2">
                                <ScanLine size={16} className="text-emerald-600"/> Ajouter des articles
                            </h4>
                        </div>
                        
                        <div className="flex gap-3 items-end">
                            <div className="flex-grow">
                                <label className="block text-xs font-medium text-neutral-500 mb-1">Produit</label>
                                <select 
                                    value={selectedProductId}
                                    onChange={(e) => setSelectedProductId(e.target.value)}
                                    className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                                >
                                    <option value="">-- Choisir Produit --</option>
                                    {products.map(product => (
                                        <option key={product.id} value={product.id}>{product.name} ({product.salePrice} MAD)</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-24">
                                <label className="block text-xs font-medium text-neutral-500 mb-1">Qté</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    value={itemQuantity}
                                    onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                                    className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm text-center"
                                />
                            </div>
                            <button 
                                onClick={handleAddItem}
                                disabled={!selectedProductId}
                                className="inline-flex items-center justify-center h-[38px] px-4 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Items Table */}
                    {lineItems.length > 0 ? (
                        <div className="border border-neutral-200 rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-neutral-200">
                                <thead className="bg-neutral-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Désignation</th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-neutral-500 uppercase">Qté</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Prix</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Total</th>
                                        <th className="px-4 py-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-neutral-200">
                                    {lineItems.map(item => (
                                        <tr key={item.id}>
                                            <td className="px-4 py-2 text-sm text-neutral-900">{item.name}</td>
                                            <td className="px-4 py-2 text-sm text-center text-neutral-600">{item.quantity}</td>
                                            <td className="px-4 py-2 text-sm text-right text-neutral-600">{item.unitPrice.toLocaleString('fr-FR')}</td>
                                            <td className="px-4 py-2 text-sm text-right font-medium text-neutral-900">{(item.quantity * item.unitPrice).toLocaleString('fr-FR')}</td>
                                            <td className="px-4 py-2 text-center">
                                                <button onClick={() => handleRemoveItem(item.id)} className="text-neutral-400 hover:text-red-500 transition-colors">
                                                    <Trash2 size={16}/>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-neutral-50 rounded-lg border border-dashed border-neutral-300 text-neutral-500 text-sm">
                            Aucun article ajouté au bon de livraison.
                        </div>
                    )}

                    {/* Footer Calculation Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-neutral-200 pt-6">
                        
                        {/* Payment Input Section */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                                <CreditCard size={16} className="text-emerald-600"/> Règlement immédiat
                            </h4>
                            <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-sm space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-neutral-500 mb-1">Montant perçu</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                                            className="block w-full rounded-lg border-neutral-300 pl-3 pr-12 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm font-semibold"
                                            placeholder="0.00"
                                        />
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                            <span className="text-neutral-500 sm:text-sm">MAD</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-neutral-500 mb-1">Mode de règlement</label>
                                    <select 
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                                    >
                                        <option>Espèces</option>
                                        <option>Chèque</option>
                                        <option>Virement</option>
                                        <option>Carte Bancaire</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Totals Section */}
                        <div className="space-y-3">
                             <div className="flex justify-between text-sm text-neutral-600">
                                <span>Total HT</span>
                                <span>{totals.subTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span>
                            </div>
                            <div className="flex justify-between text-sm text-neutral-600">
                                <span>TVA (20%)</span>
                                <span>{totals.vatAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span>
                            </div>
                            <div className="h-px bg-neutral-200 my-1"></div>
                            <div className="flex justify-between items-center">
                                <span className="text-base font-bold text-neutral-900">Total TTC</span>
                                <span className="text-base font-bold text-neutral-900">{totals.totalTTC.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span>
                            </div>
                            <div className="flex justify-between items-center text-emerald-600">
                                <span className="text-sm font-medium">Déjà réglé</span>
                                <span className="text-sm font-medium">- {paymentAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span>
                            </div>
                            
                            {/* Reste à payer Box */}
                            <div className={`mt-4 p-4 rounded-lg border ${remainingAmount > 0 ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold uppercase tracking-wider">Reste à payer</span>
                                    <span className="text-xl font-bold">{remainingAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 px-6 py-4 bg-neutral-50 border-t border-neutral-200 rounded-b-lg">
                     <button 
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg shadow-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
                    >
                        Annuler
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-lg shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />} 
                        {isSubmitting ? 'Traitement...' : (noteToEdit ? 'Mettre à jour' : 'Enregistrer')}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CreateDeliveryNoteModal;
