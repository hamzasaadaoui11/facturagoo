
import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, ScanLine, Calculator, FileText } from 'lucide-react';
import { Client, Product, Quote, LineItem, QuoteStatus } from '../types';

interface CreateQuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (quote: Omit<Quote, 'id' | 'amount'>, id?: string) => void;
    clients: Client[];
    products: Product[];
    quoteToEdit?: Quote | null;
}

const CreateQuoteModal: React.FC<CreateQuoteModalProps> = ({ isOpen, onClose, onSave, clients, products, quoteToEdit }) => {
    const [isVisible, setIsVisible] = useState(false);
    
    // Form State
    const [clientId, setClientId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [expiryDate, setExpiryDate] = useState('');
    const [subject, setSubject] = useState('');
    const [reference, setReference] = useState('');
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    
    // Item Addition State
    const [selectedProductId, setSelectedProductId] = useState('');
    const [itemQuantity, setItemQuantity] = useState(1);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setIsVisible(true), 10);
            
            if (quoteToEdit) {
                // Edit Mode
                setClientId(quoteToEdit.clientId);
                setDate(quoteToEdit.date);
                setExpiryDate(quoteToEdit.expiryDate === 'Non spécifiée' ? '' : quoteToEdit.expiryDate);
                setSubject(quoteToEdit.subject || '');
                setReference(quoteToEdit.reference || '');
                setLineItems(quoteToEdit.lineItems);
            } else {
                // Create Mode
                setClientId('');
                setDate(new Date().toISOString().split('T')[0]);
                // Default expiry: 30 days from now
                const nextMonth = new Date();
                nextMonth.setDate(nextMonth.getDate() + 30);
                setExpiryDate(nextMonth.toISOString().split('T')[0]);
                setSubject('');
                setReference('');
                setLineItems([]);
                setSelectedProductId('');
                setItemQuantity(1);
            }
        } else {
            setIsVisible(false);
        }
    }, [isOpen, quoteToEdit]);

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

    const handleSave = () => {
        if (!clientId) {
            alert('Veuillez sélectionner un client.');
            return;
        }
        if (lineItems.length === 0) {
            alert('Veuillez ajouter au moins un article.');
            return;
        }

        const client = clients.find(c => c.id === clientId);
        
        onSave({
            clientId,
            clientName: client?.name || 'Client inconnu',
            date,
            expiryDate: expiryDate || 'Non spécifiée',
            subject,
            reference,
            lineItems,
            status: quoteToEdit ? quoteToEdit.status : QuoteStatus.Draft,
            subTotal: totals.subTotal,
            vatAmount: totals.vatAmount,
        }, quoteToEdit?.id);
        handleClose();
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`} aria-modal="true">
            <div className="absolute inset-0 bg-neutral-900/75 backdrop-blur-sm" onClick={handleClose}></div>
            
            <div className={`relative w-full max-w-3xl bg-white rounded-lg shadow-xl transition-all duration-200 ease-in-out flex flex-col max-h-[90vh] ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
                    <div>
                        <h3 className="text-lg font-semibold text-neutral-900">{quoteToEdit ? 'Modifier Devis' : 'Nouveau Devis'}</h3>
                        <p className="text-sm text-neutral-500">{quoteToEdit ? `Modification du devis #${quoteToEdit.id}` : 'Créer une proposition commerciale.'}</p>
                    </div>
                    <button onClick={handleClose} className="p-1 text-neutral-400 hover:text-neutral-600 rounded-full hover:bg-neutral-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="px-6 py-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                    
                    {/* Client & Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="sm:col-span-1">
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Client *</label>
                            <select 
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                            >
                                <option value="">-- Sélectionner --</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Date d'émission *</label>
                            <input 
                                type="date" 
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Date d'échéance</label>
                            <input 
                                type="date" 
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                                className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                            />
                        </div>
                    </div>

                    {/* Subject & Reference */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                         <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Objet</label>
                            <input 
                                type="text" 
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Ex: Projet Site Web"
                                className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Référence (Optionnel)</label>
                            <input 
                                type="text" 
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
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
                            Aucun article ajouté au devis.
                        </div>
                    )}

                    {/* Footer Totals */}
                    <div className="flex justify-end border-t border-neutral-200 pt-6">
                        <div className="w-full max-w-xs space-y-3">
                             <div className="flex justify-between text-sm text-neutral-600">
                                <span>Total HT</span>
                                <span>{totals.subTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span>
                            </div>
                            <div className="flex justify-between text-sm text-neutral-600">
                                <span>TVA (20%)</span>
                                <span>{totals.vatAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span>
                            </div>
                            <div className="h-px bg-neutral-200 my-1"></div>
                            <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                <span className="text-base font-bold text-emerald-800">Total TTC</span>
                                <span className="text-lg font-bold text-emerald-700">{totals.totalTTC.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 px-6 py-4 bg-neutral-50 border-t border-neutral-200 rounded-b-lg">
                     <button 
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg shadow-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all"
                    >
                        Annuler
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-lg shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all flex items-center gap-2"
                    >
                        <FileText size={16} /> {quoteToEdit ? 'Mettre à jour' : 'Enregistrer Devis'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CreateQuoteModal;
