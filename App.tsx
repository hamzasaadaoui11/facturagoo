
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Menu, X, Files } from 'lucide-react';
import { Client, Product, Supplier, Quote, QuoteStatus, Invoice, InvoiceStatus, CompanySettings, Payment, StockMovement, DeliveryNote, PurchaseOrder, PurchaseOrderStatus, CreditNote, CreditNoteStatus } from './types';
import { dbService, initDB } from './db';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';

import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import InvoicesComponent from './components/Invoices';
import ClientsComponent from './components/Clients';
import SuppliersComponent from './components/Suppliers';
import ProductsComponent from './components/Products';
import Quotes from './components/Quotes';
import CreateQuote from './components/CreateQuote';
import TemplateCustomizer from './components/TemplateCustomizer';
import StockManagement from './components/StockManagement';
import DeliveryNotesComponent from './components/DeliveryNotes';
import PurchaseOrders from './components/PurchaseOrders';
import CreditNotesComponent from './components/CreditNotes';
import PaymentTracking from './components/PaymentTracking';
import Statistics from './components/Statistics';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import UserProfile from './components/UserProfile';

const LoadingScreen = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white relative overflow-hidden">
        {/* Background decorative blobs */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

        <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-500">
            {/* Animated Logo Container */}
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-emerald-200 rounded-2xl blur-xl opacity-40 animate-pulse"></div>
                <div className="relative h-24 w-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white shadow-2xl">
                    <Files size={48} />
                </div>
            </div>

            <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-4">Facturago</h1>
            
            <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce"></div>
            </div>
            
            <p className="text-sm text-slate-400 font-medium">Chargement de votre espace...</p>
        </div>
    </div>
);

const MainContent: React.FC = () => {
    const navigate = useNavigate();
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
    const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
    const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                await initDB();
                
                const [clientsData, productsData, suppliersData, quotesData, invoicesData, creditNotesData, settingsData, paymentsData, movementsData, deliveryData, purchaseOrdersData] = await Promise.all([
                    dbService.clients.getAll(),
                    dbService.products.getAll(),
                    dbService.suppliers.getAll(),
                    dbService.quotes.getAll(),
                    dbService.invoices.getAll(),
                    dbService.creditNotes.getAll().catch(() => []), // Fail gracefully if table missing
                    dbService.settings.get(),
                    dbService.payments.getAll(),
                    dbService.stockMovements.getAll(),
                    dbService.deliveryNotes.getAll(),
                    dbService.purchaseOrders.getAll()
                ]);

                setClients(clientsData.sort((a,b) => (b.clientCode || '').localeCompare(a.clientCode || '')));
                setProducts(productsData.sort((a,b) => (b.productCode || '').localeCompare(a.productCode || '')));
                setSuppliers(suppliersData.sort((a,b) => (b.supplierCode || '').localeCompare(a.supplierCode || '')));
                setQuotes(quotesData.sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
                setInvoices(invoicesData.sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
                setCreditNotes(creditNotesData.sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
                setPayments(paymentsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                setStockMovements(movementsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                setDeliveryNotes(deliveryData.sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
                setPurchaseOrders(purchaseOrdersData.sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
                setCompanySettings(settingsData);
            } catch (err: any) {
                console.error("Failed to load data:", err);
                setError(`Impossible de charger les données. Erreur: ${err.message || err}.`);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    const updateCompanySettings = async (settings: CompanySettings) => {
        try {
            const updatedSettings = await dbService.settings.update(settings);
            setCompanySettings(updatedSettings);
        } catch (err: any) { 
            console.error(err); 
            alert("Erreur: " + (err.message || "Erreur inconnue"));
            throw err;
        }
    };

    const getNextCode = (prefix: 'C' | 'P' | 'F', items: { clientCode?: string; productCode?: string; supplierCode?: string }[]) => {
        if (items.length === 0) return `${prefix}${(1).toString().padStart(3, '0')}`;
        const codes = items.map(item => {
            let code;
            if (prefix === 'C') code = item.clientCode;
            else if (prefix === 'P') code = item.productCode;
            else if (prefix === 'F') code = item.supplierCode;
            return parseInt(code?.substring(prefix.length) || '0', 10);
        });
        const maxCode = Math.max(0, ...codes);
        return `${prefix}${(maxCode + 1).toString().padStart(3, '0')}`;
    };

    const generateDocumentId = (type: 'quote' | 'invoice' | 'purchaseOrder' | 'deliveryNote' | 'creditNote', currentItems: { id: string, documentId?: string }[]) => {
        const currentYear = new Date().getFullYear();
        let prefix = '';
        
        switch (type) {
            case 'invoice': prefix = 'FAC'; break;
            case 'quote': prefix = 'DEV'; break;
            case 'deliveryNote': prefix = 'BL'; break;
            case 'purchaseOrder': prefix = 'BC'; break;
            case 'creditNote': prefix = 'AV'; break;
            default: prefix = 'DOC';
        }

        const pattern = `${prefix}/${currentYear}/`;

        const numbers = currentItems.map(item => {
            const idToCheck = item.documentId || item.id;
            if (idToCheck && idToCheck.startsWith(pattern)) {
                const numberPart = idToCheck.replace(pattern, '');
                return !isNaN(Number(numberPart)) ? parseInt(numberPart, 10) : 0;
            }
            return 0;
        });

        let nextNumber = (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;

        if (nextNumber === 1 && currentItems.length > 0) {
            nextNumber = currentItems.length + 1;
        }

        return `${pattern}${nextNumber.toString().padStart(5, '0')}`;
    };

    // --- Core Logic ---
    
    // Clients
    const addClient = async (client: Omit<Client, 'id' | 'clientCode'>) => {
        const newClient = { id: crypto.randomUUID(), clientCode: getNextCode('C', clients), ...client };
        await dbService.clients.add(newClient);
        setClients(prev => [newClient, ...prev].sort((a,b) => (b.clientCode || '').localeCompare(a.clientCode || '')));
    };
    const updateClient = async (updatedClient: Client) => {
        await dbService.clients.update(updatedClient);
        setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    };
    const deleteClient = async (clientId: string) => {
        await dbService.clients.delete(clientId);
        setClients(prev => prev.filter(c => c.id !== clientId));
    };

    // Products
    const updateProductStock = async (productId: string, quantityChange: number) => {
        const product = products.find(p => p.id === productId);
        if(product) {
            const updatedProduct = { ...product, stockQuantity: (product.stockQuantity || 0) + quantityChange };
            await dbService.products.update(updatedProduct);
            setProducts(prev => prev.map(p => p.id === productId ? updatedProduct : p));
        }
    };

    const addStockMovement = async (movement: Omit<StockMovement, 'id'>) => {
        const newMovement = { id: crypto.randomUUID(), ...movement };
        await dbService.stockMovements.add(newMovement);
        setStockMovements(prev => [newMovement, ...prev]);
        await updateProductStock(movement.productId, movement.quantity);
    };

    const addProduct = async (product: Omit<Product, 'id'>) => {
        const newProduct: Product = { id: crypto.randomUUID(), productCode: product.productCode || getNextCode('P', products), ...product };
        await dbService.products.add(newProduct);
        setProducts(prev => [newProduct, ...prev].sort((a,b) => (b.productCode || '').localeCompare(a.productCode || '')));
        
        if(product.stockQuantity && product.stockQuantity > 0) {
            await addStockMovement({
                productId: newProduct.id,
                productName: newProduct.name,
                date: new Date().toISOString().split('T')[0],
                quantity: product.stockQuantity,
                type: 'Initial',
                reference: 'Creation'
            });
        }
    };
    const updateProduct = async (updatedProduct: Product) => {
        await dbService.products.update(updatedProduct);
        setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    };
    const deleteProduct = async (productId: string) => {
        await dbService.products.delete(productId);
        setProducts(prev => prev.filter(p => p.id !== productId));
    };

    // Suppliers
    const addSupplier = async (supplier: Omit<Supplier, 'id' | 'supplierCode'>) => {
        const newSupplier = { id: crypto.randomUUID(), supplierCode: getNextCode('F', suppliers), ...supplier };
        await dbService.suppliers.add(newSupplier);
        setSuppliers(prev => [newSupplier, ...prev].sort((a,b) => (b.supplierCode || '').localeCompare(a.supplierCode || '')));
    };
    const updateSupplier = async (updatedSupplier: Supplier) => {
        await dbService.suppliers.update(updatedSupplier);
        setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
    };
    const deleteSupplier = async (supplierId: string) => {
        await dbService.suppliers.delete(supplierId);
        setSuppliers(prev => prev.filter(s => s.id !== supplierId));
    };

    // Quotes
    const addQuote = async (quoteData: Omit<Quote, 'id' | 'amount'>) => {
        try {
            const documentId = generateDocumentId('quote', quotes);
            const newQuote: Quote = { 
                id: crypto.randomUUID(),
                documentId: documentId,
                amount: quoteData.subTotal + quoteData.vatAmount, 
                ...quoteData 
            };
            await dbService.quotes.add(newQuote);
            setQuotes(prev => [newQuote, ...prev].sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
        } catch (e: any) {
            console.error("Error creating quote", e);
            alert("Erreur création devis: " + e.message);
            throw e;
        }
    };
    const updateQuote = async (updatedQuote: Quote) => {
        await dbService.quotes.update(updatedQuote);
        setQuotes(prev => prev.map(q => q.id === updatedQuote.id ? updatedQuote : q));
    };
    const updateQuoteStatus = async (quoteId: string, newStatus: QuoteStatus) => {
        const quoteToUpdate = quotes.find(q => q.id === quoteId);
        if (quoteToUpdate) {
            const updatedQuote = { ...quoteToUpdate, status: newStatus };
            await dbService.quotes.update(updatedQuote);
            setQuotes(prev => prev.map(q => q.id === quoteId ? updatedQuote : q));
        }
    };
    const deleteQuote = async (quoteId: string) => {
        try {
            await dbService.quotes.delete(quoteId);
            setQuotes(prev => prev.filter(q => q.id !== quoteId));
        } catch (e: any) {
            alert("Erreur suppression devis: " + e.message);
        }
    };

    // Invoices & Payments
    const addInvoice = async (invoiceData: Omit<Invoice, 'id' | 'amount' | 'amountPaid'> & { initialPayment?: any }) => {
        try {
            const { initialPayment, ...invoiceFields } = invoiceData;
            const documentId = generateDocumentId('invoice', invoices);
            const newInvoice: Invoice = { 
                id: crypto.randomUUID(),
                documentId: documentId,
                amount: invoiceFields.subTotal + invoiceFields.vatAmount, 
                amountPaid: initialPayment ? initialPayment.amount : 0,
                ...invoiceFields 
            };
            
            await dbService.invoices.add(newInvoice);
            setInvoices(prev => [newInvoice, ...prev].sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));

            if (initialPayment && initialPayment.amount > 0) {
                 const newPayment: Payment = {
                    id: crypto.randomUUID(),
                    invoiceId: newInvoice.id,
                    invoiceNumber: newInvoice.documentId || newInvoice.id,
                    clientId: newInvoice.clientId,
                    clientName: newInvoice.clientName,
                    date: initialPayment.date,
                    amount: initialPayment.amount,
                    method: initialPayment.method,
                    notes: 'Règlement à la création'
                };
                await dbService.payments.add(newPayment);
                setPayments(prev => [newPayment, ...prev]);
            }
            return newInvoice;
        } catch (e: any) {
            console.error("Error creating invoice", e);
            alert("Erreur création facture: " + e.message);
            throw e;
        }
    };

    const updateInvoice = async (invoiceData: Invoice & { initialPayment?: any }, id: string) => {
        try {
            const existingInvoice = invoices.find(i => i.id === id);
            if (!existingInvoice) return;

            const { initialPayment, ...invoiceFields } = invoiceData;
            const updatedInvoice: Invoice = { ...existingInvoice, ...invoiceFields };
            updatedInvoice.id = id; 

            await dbService.invoices.update(updatedInvoice);
            setInvoices(prev => prev.map(inv => inv.id === id ? updatedInvoice : inv));

            if (initialPayment && initialPayment.amount > 0) {
                 const newPayment: Payment = {
                    id: crypto.randomUUID(),
                    invoiceId: id,
                    invoiceNumber: updatedInvoice.documentId || updatedInvoice.id,
                    clientId: updatedInvoice.clientId,
                    clientName: updatedInvoice.clientName,
                    date: initialPayment.date,
                    amount: initialPayment.amount,
                    method: initialPayment.method,
                    notes: 'Règlement ajouté lors de la modification'
                };
                await dbService.payments.add(newPayment);
                setPayments(prev => [newPayment, ...prev]);
            }
        } catch (e: any) {
            console.error("Error updating invoice", e);
            alert("Erreur mise à jour facture: " + e.message);
            throw e;
        }
    };

    const deleteInvoice = async (invoiceId: string) => {
        try {
            // 1. Delete associated payments first (if any) to clean up and adjust revenue
            const relatedPayments = payments.filter(p => p.invoiceId === invoiceId);
            for(const p of relatedPayments) {
                await dbService.payments.delete(p.id);
            }
            
            // 2. Delete the invoice
            await dbService.invoices.delete(invoiceId);
            
            // 3. Update local state
            setPayments(prev => prev.filter(p => p.invoiceId !== invoiceId));
            setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
            
        } catch (e: any) {
            alert("Erreur suppression facture: " + e.message);
        }
    };

    const addPayment = async (paymentData: Omit<Payment, 'id'>) => {
        try {
            const newPayment = { id: crypto.randomUUID(), ...paymentData };
            await dbService.payments.add(newPayment);
            setPayments(prev => [newPayment, ...prev]);

            const invoice = invoices.find(inv => inv.id === paymentData.invoiceId);
            if (invoice) {
                const newAmountPaid = (invoice.amountPaid || 0) + paymentData.amount;
                let newStatus = invoice.status;
                if (newAmountPaid >= invoice.amount - 0.1) {
                    newStatus = InvoiceStatus.Paid;
                } else if (newAmountPaid > 0) {
                    newStatus = InvoiceStatus.Partial;
                }

                const updatedInvoice = { 
                    ...invoice, 
                    amountPaid: newAmountPaid, 
                    status: newStatus,
                    paymentDate: newStatus === InvoiceStatus.Paid ? paymentData.date : invoice.paymentDate
                };
                await dbService.invoices.update(updatedInvoice);
                setInvoices(prev => prev.map(inv => inv.id === invoice.id ? updatedInvoice : inv));
            }
        } catch (e: any) {
            console.error("Error adding payment", e);
            alert("Erreur ajout paiement: " + e.message);
            throw e;
        }
    };

    const updateInvoiceStatus = async (invoiceId: string, newStatus: InvoiceStatus) => {
        const invoiceToUpdate = invoices.find(inv => inv.id === invoiceId);
        if (invoiceToUpdate) {
            const updatedInvoice = { ...invoiceToUpdate, status: newStatus };
            await dbService.invoices.update(updatedInvoice);
            setInvoices(prev => prev.map(inv => inv.id === invoiceId ? updatedInvoice : inv));
        }
    };

    const createInvoiceFromQuote = async (quoteId: string) => {
        const quote = quotes.find(q => q.id === quoteId);
        if (!quote) return;
        
        try {
            const documentId = generateDocumentId('invoice', invoices);
            const newInvoiceData: Invoice = {
                id: crypto.randomUUID(),
                documentId: documentId,
                quoteId: quote.id, 
                clientId: quote.clientId, 
                clientName: quote.clientName,
                date: new Date().toISOString().split('T')[0],
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: InvoiceStatus.Pending, 
                subject: quote.subject, 
                reference: quote.reference,
                lineItems: quote.lineItems, 
                subTotal: quote.subTotal, 
                vatAmount: quote.vatAmount,
                amount: quote.amount,
                amountPaid: 0
            };
            
            await dbService.invoices.add(newInvoiceData);
            setInvoices(prev => [newInvoiceData, ...prev].sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
            await updateQuoteStatus(quoteId, QuoteStatus.Converted);
        } catch (e: any) {
            alert("Erreur conversion: " + e.message);
        }
    };

    // --- Credit Notes Logic ---
    const addCreditNote = async (creditNoteData: Omit<CreditNote, 'id'>) => {
        try {
            const documentId = generateDocumentId('creditNote', creditNotes);
            const newCreditNote: CreditNote = {
                id: crypto.randomUUID(),
                documentId: documentId,
                ...creditNoteData
            };
            await dbService.creditNotes.add(newCreditNote);
            setCreditNotes(prev => [newCreditNote, ...prev].sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
        } catch (e: any) {
            console.error("Error creating credit note", e);
            alert("Erreur création avoir: " + e.message);
            throw e;
        }
    };

    const updateCreditNote = async (updatedCreditNote: CreditNote) => {
        await dbService.creditNotes.update(updatedCreditNote);
        setCreditNotes(prev => prev.map(cn => cn.id === updatedCreditNote.id ? updatedCreditNote : cn));
    };

    const deleteCreditNote = async (id: string) => {
        try {
            await dbService.creditNotes.delete(id);
            setCreditNotes(prev => prev.filter(cn => cn.id !== id));
        } catch (e: any) {
            alert("Erreur suppression avoir: " + e.message);
        }
    };

    const updateCreditNoteStatus = async (id: string, newStatus: CreditNoteStatus) => {
        const cn = creditNotes.find(c => c.id === id);
        if (cn) {
            const updatedCn = { ...cn, status: newStatus };
            await dbService.creditNotes.update(updatedCn);
            setCreditNotes(prev => prev.map(c => c.id === id ? updatedCn : c));
        }
    };

    const createCreditNoteFromInvoice = async (invoiceId: string) => {
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (!invoice) return;

        try {
            const documentId = generateDocumentId('creditNote', creditNotes);
            const newCreditNote: CreditNote = {
                id: crypto.randomUUID(),
                documentId: documentId,
                invoiceId: invoice.documentId || invoice.id,
                clientId: invoice.clientId,
                clientName: invoice.clientName,
                date: new Date().toISOString().split('T')[0],
                status: CreditNoteStatus.Draft,
                subject: `Avoir sur facture ${invoice.documentId || invoice.id}`,
                reference: invoice.reference,
                lineItems: invoice.lineItems,
                subTotal: invoice.subTotal,
                vatAmount: invoice.vatAmount,
                amount: invoice.amount
            };
            await dbService.creditNotes.add(newCreditNote);
            setCreditNotes(prev => [newCreditNote, ...prev].sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
            // Redirect to credit notes page optionally or show success
            navigate('/sales/credit-notes');
        } catch (e: any) {
            alert("Erreur création avoir: " + e.message);
        }
    };

    // Delivery Notes
    const createDeliveryNote = async (noteData: Omit<DeliveryNote, 'id'>) => {
        try {
            const documentId = generateDocumentId('deliveryNote', deliveryNotes);
            const newNote: DeliveryNote = { 
                id: crypto.randomUUID(),
                documentId: documentId,
                ...noteData 
            };
            await dbService.deliveryNotes.add(newNote);
            setDeliveryNotes(prev => [newNote, ...prev]);

            for (const item of noteData.lineItems) {
                if (item.productId) {
                    await addStockMovement({
                        productId: item.productId,
                        productName: item.name,
                        date: noteData.date,
                        quantity: -item.quantity, 
                        type: 'Vente',
                        reference: `${documentId} ${noteData.invoiceId ? '(Facture ' + noteData.invoiceId + ')' : '(Manuel)'}`
                    });
                }
            }
        } catch (e: any) {
            console.error("Error creating delivery note", e);
            alert("Erreur création BL: " + e.message);
            throw e;
        }
    };
    
    const updateDeliveryNote = async (updatedNote: DeliveryNote) => {
        await dbService.deliveryNotes.update(updatedNote); 
        setDeliveryNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
    };

    const deleteDeliveryNote = async (noteId: string) => {
        await dbService.deliveryNotes.delete(noteId);
        setDeliveryNotes(prev => prev.filter(n => n.id !== noteId));
    };

    const createInvoiceFromDeliveryNote = async (deliveryNoteId: string) => {
        try {
            const note = deliveryNotes.find(n => n.id === deliveryNoteId);
            if (!note) return;
            if (note.invoiceId) return; 

            const documentId = generateDocumentId('invoice', invoices);
            const invoiceId = crypto.randomUUID();
            
            const subTotal = note.subTotal ?? note.lineItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
            const vatAmount = note.vatAmount ?? note.lineItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity * (item.vat / 100)), 0);
            const totalAmount = subTotal + vatAmount;
            const paidAmount = note.paymentAmount || 0;
            
            let status = InvoiceStatus.Pending;
            if (paidAmount >= totalAmount && totalAmount > 0) {
                status = InvoiceStatus.Paid;
            } else if (paidAmount > 0) {
                status = InvoiceStatus.Partial;
            }

            const newInvoice: Invoice = {
                id: invoiceId,
                documentId: documentId,
                clientId: note.clientId,
                clientName: note.clientName,
                date: new Date().toISOString().split('T')[0],
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: status,
                subject: `Facture issue du ${note.documentId || note.id}`,
                reference: note.documentId || note.id,
                lineItems: note.lineItems,
                subTotal: subTotal,
                vatAmount: vatAmount,
                amount: totalAmount,
                amountPaid: paidAmount,
                paymentDate: status === InvoiceStatus.Paid ? note.date : undefined
            };

            await dbService.invoices.add(newInvoice);
            setInvoices(prev => [newInvoice, ...prev].sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));

            if (paidAmount > 0) {
                 const newPayment: Payment = {
                    id: crypto.randomUUID(),
                    invoiceId: invoiceId,
                    invoiceNumber: documentId,
                    clientId: note.clientId,
                    clientName: note.clientName,
                    date: note.date,
                    amount: paidAmount,
                    method: (note.paymentMethod as any) || 'Espèces',
                    notes: 'Règlement initial via Bon de Livraison'
                };
                await dbService.payments.add(newPayment);
                setPayments(prev => [newPayment, ...prev]);
            }

            const updatedNote = { ...note, invoiceId: invoiceId };
            await updateDeliveryNote(updatedNote);
            
        } catch (error: any) {
            console.error("Erreur conversion BL:", error);
            alert("Erreur conversion: " + error.message);
        }
    };

    // Purchase Orders
    const addPurchaseOrder = async (orderData: Omit<PurchaseOrder, 'id'>) => {
        try {
            const documentId = generateDocumentId('purchaseOrder', purchaseOrders);
            const newOrder: PurchaseOrder = { 
                id: crypto.randomUUID(), 
                documentId: documentId,
                ...orderData 
            };
            await dbService.purchaseOrders.add(newOrder);
            setPurchaseOrders(prev => [newOrder, ...prev].sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
        } catch (e: any) {
            console.error("Error creating purchase order", e);
            alert("Erreur création BC: " + e.message);
            throw e;
        }
    };
    
    const updatePurchaseOrder = async (updatedOrder: PurchaseOrder) => {
        await dbService.purchaseOrders.update(updatedOrder);
        setPurchaseOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    };

    const updatePurchaseOrderStatus = async (orderId: string, newStatus: PurchaseOrderStatus) => {
        const order = purchaseOrders.find(o => o.id === orderId);
        if (order) {
            const updatedOrder = { ...order, status: newStatus };
            await dbService.purchaseOrders.update(updatedOrder);
            setPurchaseOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
            
            if (newStatus === PurchaseOrderStatus.Received && order.status !== PurchaseOrderStatus.Received) {
                 for (const item of order.lineItems) {
                    if (item.productId) {
                        await addStockMovement({
                            productId: item.productId,
                            productName: item.name,
                            date: new Date().toISOString().split('T')[0],
                            quantity: item.quantity, 
                            type: 'Achat',
                            reference: `Reception ${order.documentId || order.id}`
                        });
                    }
                }
            }
        }
    };

    const deletePurchaseOrder = async (orderId: string) => {
        try {
            await dbService.purchaseOrders.delete(orderId);
            setPurchaseOrders(prev => prev.filter(o => o.id !== orderId));
        } catch (e: any) {
            alert("Erreur suppression commande: " + e.message);
        }
    };

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center bg-red-50 p-4">
                <div className="w-full max-w-lg text-center">
                    <h2 className="text-xl font-bold text-red-700">Erreur de Chargement</h2>
                    <p className="mt-2 text-neutral-700 bg-red-100 p-4 rounded-lg border border-red-200">{error}</p>
                    <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 text-sm font-medium text-white bg-neutral-800 border border-transparent rounded-lg shadow-sm hover:bg-neutral-700">
                        Réessayer
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-100 text-neutral-800 overflow-hidden">
            <div className="hidden md:flex md:w-64 md:flex-col md:shrink-0 transition-all duration-300">
                <Sidebar />
            </div>
            
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-50 flex md:hidden">
                    <div 
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out" 
                        onClick={() => setSidebarOpen(false)}
                    ></div>
                    <div className="relative flex w-64 max-w-xs flex-1 flex-col bg-emerald-600 shadow-2xl transition-transform duration-300 ease-in-out transform translate-x-0">
                        <div className="absolute top-0 right-0 -mr-12 pt-2">
                            <button 
                                type="button" 
                                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white" 
                                onClick={() => setSidebarOpen(false)}
                            >
                                <X className="h-6 w-6 text-white" />
                            </button>
                        </div>
                        <Sidebar />
                    </div>
                </div>
            )}

            <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto bg-slate-50">
                    {/* Mobile Header Toggle */}
                    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md px-4 py-3 md:hidden border-b border-slate-200 shadow-sm flex items-center justify-between">
                        <h1 className="text-lg font-bold text-emerald-700">Facturago</h1>
                        <button 
                            type="button" 
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 focus:outline-none" 
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                    </div>
                    
                    <main className="p-4 sm:p-6 lg:p-8 flex-1">
                        <Routes>
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="/dashboard" element={<Dashboard invoices={invoices} clients={clients} products={products} companySettings={companySettings} creditNotes={creditNotes} />} />
                            <Route path="/statistics" element={
                                <Statistics 
                                    invoices={invoices} 
                                    payments={payments} 
                                    purchaseOrders={purchaseOrders} 
                                    products={products}
                                    creditNotes={creditNotes}
                                />
                            } />
                            
                            <Route path="/sales/quotes" element={
                                <Quotes 
                                    quotes={quotes} 
                                    onUpdateQuoteStatus={updateQuoteStatus} 
                                    onCreateInvoice={createInvoiceFromQuote} 
                                    onAddQuote={addQuote}
                                    onUpdateQuote={updateQuote}
                                    onDeleteQuote={deleteQuote}
                                    clients={clients}
                                    products={products}
                                    companySettings={companySettings}
                                />
                            } />
                            
                            <Route path="/sales/invoices" element={
                                <InvoicesComponent 
                                    invoices={invoices} 
                                    onUpdateInvoiceStatus={updateInvoiceStatus} 
                                    onAddPayment={addPayment}
                                    onCreateInvoice={addInvoice}
                                    onUpdateInvoice={updateInvoice}
                                    onDeleteInvoice={deleteInvoice}
                                    onCreateCreditNote={createCreditNoteFromInvoice}
                                    clients={clients}
                                    products={products}
                                    companySettings={companySettings}
                                />
                            } />

                            <Route path="/sales/credit-notes" element={
                                <CreditNotesComponent
                                    creditNotes={creditNotes}
                                    onUpdateCreditNoteStatus={updateCreditNoteStatus}
                                    onCreateCreditNote={addCreditNote}
                                    onUpdateCreditNote={updateCreditNote}
                                    onDeleteCreditNote={deleteCreditNote}
                                    clients={clients}
                                    products={products}
                                    companySettings={companySettings}
                                />
                            } />

                            <Route path="/sales/payments" element={
                                <PaymentTracking
                                    invoices={invoices}
                                    payments={payments}
                                    onAddPayment={addPayment}
                                />
                            } />
                            
                            <Route path="/sales/delivery" element={
                                <DeliveryNotesComponent 
                                    deliveryNotes={deliveryNotes} 
                                    invoices={invoices} 
                                    onCreateDeliveryNote={createDeliveryNote} 
                                    onUpdateDeliveryNote={updateDeliveryNote}
                                    onDeleteDeliveryNote={deleteDeliveryNote}
                                    onCreateInvoice={createInvoiceFromDeliveryNote}
                                    clients={clients} 
                                    products={products} 
                                    companySettings={companySettings}
                                />
                            } />

                            <Route path="/purchases/orders" element={
                                <PurchaseOrders 
                                    orders={purchaseOrders} 
                                    suppliers={suppliers} 
                                    products={products} 
                                    onAddOrder={addPurchaseOrder} 
                                    onUpdateOrder={updatePurchaseOrder}
                                    onUpdateStatus={updatePurchaseOrderStatus}
                                    onDeleteOrder={deletePurchaseOrder}
                                    companySettings={companySettings}
                                />
                            } />
                            
                            <Route path="/stock" element={<StockManagement products={products} movements={stockMovements} onAddMovement={addStockMovement} />} />
                            
                            <Route path="/clients" element={<ClientsComponent clients={clients} onAddClient={addClient} onUpdateClient={updateClient} onDeleteClient={deleteClient} />} />
                            <Route path="/suppliers" element={<SuppliersComponent suppliers={suppliers} onAddSupplier={addSupplier} onUpdateSupplier={updateSupplier} onDeleteSupplier={deleteSupplier} />} />
                            
                            <Route path="/products" element={<ProductsComponent products={products} onAddProduct={addProduct} onUpdateProduct={updateProduct} onDeleteProduct={deleteProduct} />} />
                            <Route path="/products/new" element={<ProductsComponent products={products} onAddProduct={addProduct} onUpdateProduct={updateProduct} onDeleteProduct={deleteProduct} />} />
                            <Route path="/products/edit/:productId" element={<ProductsComponent products={products} onAddProduct={addProduct} onUpdateProduct={updateProduct} onDeleteProduct={deleteProduct} />} />
                            
                            <Route path="/settings" element={<TemplateCustomizer settings={companySettings} onSave={updateCompanySettings} />} />
                            <Route path="/profile" element={<UserProfile />} />
                        </Routes>
                    </main>
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    console.error("Session error:", error);
                    await supabase.auth.signOut().catch(console.error);
                    setSession(null);
                } else {
                    setSession(session);
                }
            } catch (err) {
                console.error("Auth error:", err);
                setSession(null);
            } finally {
                setLoading(false);
            }
        };

        initSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <HashRouter>
            <Routes>
                <Route path="/" element={!session ? <LandingPage /> : <Navigate to="/dashboard" replace />} />
                <Route path="/login" element={!session ? <Login /> : <Navigate to="/dashboard" replace />} />
                <Route path="/*" element={session ? <MainContent /> : <Navigate to="/" replace />} />
            </Routes>
        </HashRouter>
    );
};

export default App;
