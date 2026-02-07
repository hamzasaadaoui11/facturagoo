
import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, ScanLine, Calculator, FileText, CreditCard, Loader2 } from 'lucide-react';
import { Client, Product, Invoice, LineItem, InvoiceStatus } from '../types';

interface CreateInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (invoice: any, id?: string) => Promise<any> | void;
    clients: Client[];
    products: Product[];
    invoiceToEdit?: Invoice | null;
}

const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({ isOpen, onClose, onSave, clients, products, invoiceToEdit }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form State
    const [clientId, setClientId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    // dueDate removed from UI, will be handled internally
    const [subject, setSubject] = useState('');
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    
    // Payment State
    const [existingAmountPaid, setExistingAmountPaid] = useState<number>(0); 
    const [newPaymentAmount, setNewPaymentAmount] = useState<number>(0); 
    const [paymentMethod, setPaymentMethod] = useState('Virement');
    
    // Item Addition State (Free Text Support)
    const [selectedProductId, setSelectedProductId] = useState('');
    const [tempName, setTempName] = useState('');
    const [tempDesc, setTempDesc] = useState('');
    const [tempPrice, setTempPrice] = useState(0);
    const [tempVat, setTempVat] = useState(20);
    const [itemQuantity, setItemQuantity] = useState(1);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setIsVisible(true), 10);
            
            if (invoiceToEdit) {
                setClientId(invoiceToEdit.clientId);
                setDate(invoiceToEdit.date);
                setSubject(invoiceToEdit.subject || '');
                setLineItems(JSON.parse(JSON.stringify(invoiceToEdit.lineItems)));
                setExistingAmountPaid(invoiceToEdit.amountPaid || 0);
                setNewPaymentAmount(0);
            } else {
                setClientId('');
                setDate(new Date().toISOString().split('T')[0]);
                setSubject('');
                setLineItems([]);
                setExistingAmountPaid(0);
                setNewPaymentAmount(0);
            }
            resetItemForm();
        } else {
            setIsVisible(false);
        }
    }, [isOpen, invoiceToEdit]);

    const resetItemForm = () => {
        setSelectedProductId('');
        setTempName('');
        setTempDesc('');
        setTempPrice(0);
        setTempVat(20);
        setItemQuantity(1);
    };

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 200);
    };

    // Auto-fill fields when a product is selected
    useEffect(() => {
        if (selectedProductId) {
            const product = products.find(p => p.id === selectedProductId);
            if (product) {
                setTempName(product.name);
                setTempDesc(product.description || '');
                setTempPrice(product.salePrice);
                setTempVat(product.vat);
            }
        }
    }, [selectedProductId, products]);

    const handleAddItem = () => {
        if (!tempName) {
            alert("Veuillez entrer une désignation pour l'article.");
            return;
        }

        const newItem: LineItem = {
            id: `temp-${Date.now()}`,
            productId: selectedProductId || null, // Null if free text
            name: tempName,
            description: tempDesc,
            quantity: itemQuantity,
            unitPrice: tempPrice,
            vat: tempVat
        };

        setLineItems(prev => [...prev, newItem]);
        resetItemForm();
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
        // Utiliser le nom de la société si disponible, sinon le nom du contact
        const clientNameDisplay = client ? (client.company || client.name) : 'Client inconnu';

        const totalPaid = existingAmountPaid + newPaymentAmount;
        let status = InvoiceStatus.Pending;
        
        if (totalPaid >= totals.totalTTC - 0.1) {
            status = InvoiceStatus.Paid;
        } else if (totalPaid > 0) {
            status = InvoiceStatus.Partial;
        }

        const invoiceData = {
            clientId,
            clientName: clientNameDisplay,
            date,
            dueDate: date, // Default due date to same as issue date since field is hidden
            subject,
            lineItems,
            status,
            subTotal: totals.subTotal,
            vatAmount: totals.vatAmount,
            amount: totals.totalTTC, 
            amountPaid: totalPaid, 
            
            initialPayment: newPaymentAmount > 0 ? {
                amount: newPaymentAmount,
                method: paymentMethod,
                date: new Date().toISOString().split('T')[0]
            } : undefined
        };
        
        setIsSubmitting(true);
        try {
            await onSave(invoiceData, invoiceToEdit?.id);
            handleClose();
        } catch (error) {
            console.error("Save failed in modal", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const remainingAmount = Math.max(0, totals.totalTTC - (existingAmountPaid + newPaymentAmount));

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`} aria-modal="true">
            <div className="absolute inset-0 bg-neutral-900/75 backdrop-blur-sm" onClick={handleClose}></div>
            
            <div className={`relative w-full md:max-w-4xl bg-white md:rounded-lg shadow-xl transition-all duration-200 ease-in-out flex flex-col h-full md:h-auto md:max-h-[90vh] ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                
                {/* Header */}
                <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-neutral-200">
                    <div>
                        <h3 className="text-lg font-semibold text-neutral-900">{invoiceToEdit ? 'Modifier la Facture' : 'Nouvelle Facture'}</h3>
                        <p className="text-sm text-neutral-500 hidden md:block">{invoiceToEdit ? `Modification de la facture #${invoiceToEdit.documentId || invoiceToEdit.id}` : 'Création d\'une facture directe.'}</p>
                    </div>
                    <button onClick={handleClose} className="p-1 text-neutral-400 hover:text-neutral-600 rounded-full hover:bg-neutral-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="px-4 md:px-6 py-6 overflow-y-auto custom-scrollbar space-y-6 flex-1 pb-24 md:pb-6">
                    
                    {/* Client & Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Client *</label>
                            <select 
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                            >
                                <option value="">-- Sélectionner --</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>
                                        {client.company || client.name}
                                    </option>
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
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Objet (Optionnel)</label>
                        <input 
                            type="text" 
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Ex: Prestation de service informatique"
                            className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                        />
                    </div>

                    {/* Product Selection / Free Entry Area */}
                    <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-medium text-neutral-900 flex items-center gap-2">
                                <ScanLine size={16} className="text-emerald-600"/> Ajouter des articles
                            </h4>
                        </div>
                        
                        <div className="grid grid-cols-12 gap-3 items-end">
                            {/* Product Selector - Optional Auto-fill */}
                            <div className="col-span-12 md:col-span-3">
                                <label className="block text-xs font-medium text-neutral-500 mb-1">Produit (Auto-remplissage)</label>
                                <select 
                                    value={selectedProductId}
                                    onChange={(e) => setSelectedProductId(e.target.value)}
                                    className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm text-neutral-600"
                                >
                                    <option value="">-- Libre / Manuel --</option>
                                    {products.map(product => (
                                        <option key={product.id} value={product.id}>{product.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Name Input - Required */}
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-xs font-medium text-neutral-500 mb-1">Désignation *</label>
                                <input 
                                    type="text" 
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                    placeholder="Nom du produit ou service"
                                    className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm font-medium"
                                />
                            </div>

                            {/* Price Input */}
                            <div className="col-span-6 md:col-span-2">
                                <label className="block text-xs font-medium text-neutral-500 mb-1">Prix HT</label>
                                <input 
                                    type="number" 
                                    value={tempPrice}
                                    onChange={(e) => setTempPrice(parseFloat(e.target.value) || 0)}
                                    className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                                />
                            </div>

                            {/* Qty Input */}
                            <div className="col-span-3 md:col-span-1">
                                <label className="block text-xs font-medium text-neutral-500 mb-1">Qté</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    value={itemQuantity}
                                    onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                                    className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm text-center"
                                />
                            </div>

                            {/* VAT Input */}
                            <div className="col-span-3 md:col-span-1">
                                <label className="block text-xs font-medium text-neutral-500 mb-1">TVA</label>
                                <select 
                                    value={tempVat} 
                                    onChange={(e) => setTempVat(parseInt(e.target.value))} 
                                    className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-1.5"
                                >
                                    <option value="20">20%</option>
                                    <option value="14">14%</option>
                                    <option value="10">10%</option>
                                    <option value="7">7%</option>
                                    <option value="0">0%</option>
                                </select>
                            </div>

                            {/* Add Button */}
                            <div className="col-span-12 md:col-span-1">
                                <button 
                                    onClick={handleAddItem}
                                    className="w-full inline-flex items-center justify-center h-[38px] rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                                    title="Ajouter la ligne"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    {lineItems.length > 0 ? (
                        <div className="border border-neutral-200 rounded-lg overflow-hidden overflow-x-auto">
                            <table className="min-w-full divide-y divide-neutral-200">
                                <thead className="bg-neutral-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Désignation</th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-neutral-500 uppercase">Qté</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Prix HT</th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-neutral-500 uppercase hidden md:table-cell">TVA</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Total HT</th>
                                        <th className="px-4 py-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-neutral-200">
                                    {lineItems.map(item => (
                                        <tr key={item.id}>
                                            <td className="px-4 py-2 text-sm text-neutral-900">{item.name}</td>
                                            <td className="px-4 py-2 text-sm text-center text-neutral-600">{item.quantity}</td>
                                            <td className="px-4 py-2 text-sm text-right text-neutral-600">{item.unitPrice.toLocaleString('fr-FR')}</td>
                                            <td className="px-4 py-2 text-sm text-center text-neutral-600 hidden md:table-cell">{item.vat}%</td>
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
                            Aucun article ajouté.
                        </div>
                    )}

                    {/* Footer Totals & Payment */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-neutral-200 pt-6">
                        
                        {/* Payment Input Section */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                                <CreditCard size={16} className="text-emerald-600"/> Règlement
                            </h4>
                            <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-sm space-y-3">
                                {invoiceToEdit && existingAmountPaid > 0 && (
                                    <div className="text-sm text-emerald-700 bg-emerald-50 p-2 rounded mb-2 flex justify-between">
                                        <span>Déjà encaissé :</span>
                                        <span className="font-bold">{existingAmountPaid.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-medium text-neutral-500 mb-1">
                                        {invoiceToEdit ? "Ajouter un paiement" : "Montant perçu (Acompte)"}
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            value={newPaymentAmount}
                                            onChange={(e) => setNewPaymentAmount(parseFloat(e.target.value) || 0)}
                                            className="block w-full rounded-lg border-neutral-300 pl-3 pr-12 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm font-semibold"
                                            placeholder="0.00"
                                        />
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                            <span className="text-neutral-500 sm:text-sm">MAD</span>
                                        </div>
                                    </div>
                                </div>
                                {newPaymentAmount > 0 && (
                                    <div>
                                        <label className="block text-xs font-medium text-neutral-500 mb-1">Mode de règlement</label>
                                        <select 
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                                        >
                                            <option>Virement</option>
                                            <option>Chèque</option>
                                            <option>Espèces</option>
                                            <option>Carte Bancaire</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Totals Section */}
                        <div className="space-y-3">
                             <div className="flex justify-between text-sm text-neutral-600">
                                <span>Total HT</span>
                                <span>{totals.subTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span>
                            </div>
                            <div className="flex justify-between text-sm text-neutral-600">
                                <span>TVA (Estimée)</span>
                                <span>{totals.vatAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span>
                            </div>
                            <div className="h-px bg-neutral-200 my-1"></div>
                            <div className="flex justify-between items-center">
                                <span className="text-base font-bold text-neutral-900">Total TTC</span>
                                <span className="text-base font-bold text-emerald-700">{totals.totalTTC.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span>
                            </div>
                             <div className={`mt-2 flex justify-between items-center text-sm p-2 rounded ${remainingAmount === 0 ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-600'}`}>
                                <span>Reste à payer :</span>
                                <span className="font-bold">{remainingAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span>
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
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} 
                        {isSubmitting ? 'Enregistrement...' : (invoiceToEdit ? 'Mettre à jour' : 'Enregistrer')}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CreateInvoiceModal;
