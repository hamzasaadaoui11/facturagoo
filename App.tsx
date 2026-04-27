
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Menu, X, Files } from 'lucide-react';
import { Client, Product, Supplier, Quote, QuoteStatus, Invoice, InvoiceStatus, CompanySettings, Payment, StockMovement, DeliveryNote, PurchaseOrder, PurchaseOrderStatus, CreditNote, CreditNoteStatus, Expense } from './types';
import { dbService, initDB, getCurrentUserAndCompany, resetDBCache } from './db';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';
import { AnimatePresence, motion } from 'framer-motion';
import { LanguageProvider } from './contexts/LanguageContext';
import { generateUUID } from './src/utils/uuid';

import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import InvoicesComponent from './components/Invoices';
import ClientsComponent from './components/Clients';
import SuppliersComponent from './components/Suppliers';
import ProductsComponent from './components/Products';
import Quotes from './components/Quotes';
import TemplateCustomizer from './components/TemplateCustomizer';
import StockManagement from './components/StockManagement';
import DeliveryNotesComponent from './components/DeliveryNotes';
import PurchaseOrders from './components/PurchaseOrders';
import CreditNotesComponent from './components/CreditNotes';
import PaymentTracking from './components/PaymentTracking';
import Statistics from './components/Statistics';
import Expenses from './components/Expenses';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import UserProfile from './components/UserProfile';

const LoadingScreen = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-500">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-emerald-200 rounded-2xl blur-xl opacity-40 animate-pulse"></div>
                <div className="relative h-24 w-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white shadow-2xl">
                    <Files size={48} />
                </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-4"><span>Facturago</span></h1>
            <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce"></div>
            </div>
            <p className="text-sm text-slate-400 font-medium"><span>Chargement de votre espace...</span></p>
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
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async (isRetry = false) => {
            setIsLoading(true);
            setError(null);
            try {
                await initDB();
                
                // Group 1: Core setup
                const [clientsData, productsData, suppliersData, settingsData] = await Promise.all([
                    dbService.clients.getAll().catch(e => { throw new Error(`Clients: ${e.message}`); }),
                    dbService.products.getAll().catch(e => { throw new Error(`Produits: ${e.message}`); }),
                    dbService.suppliers.getAll().catch(e => { throw new Error(`Fournisseurs: ${e.message}`); }),
                    dbService.settings.get().catch(e => { throw new Error(`Paramètres: ${e.message}`); })
                ]);

                setClients(clientsData.sort((a,b) => (b.clientCode || '').localeCompare(a.clientCode || '')));
                setProducts(productsData.sort((a,b) => (b.productCode || '').localeCompare(a.productCode || '')));
                setSuppliers(suppliersData.sort((a,b) => (b.supplierCode || '').localeCompare(a.supplierCode || '')));
                setCompanySettings(settingsData);

                // Group 2: Main documents
                const [quotesData, invoicesData, deliveryData, purchaseOrdersData] = await Promise.all([
                    dbService.quotes.getAll().catch(e => { throw new Error(`Devis: ${e.message}`); }),
                    dbService.invoices.getAll().catch(e => { throw new Error(`Factures: ${e.message}`); }),
                    dbService.deliveryNotes.getAll().catch(e => { throw new Error(`Bons de livraison: ${e.message}`); }),
                    dbService.purchaseOrders.getAll().catch(e => { throw new Error(`Commandes: ${e.message}`); })
                ]);

                setQuotes(quotesData.sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
                setInvoices(invoicesData.sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
                setDeliveryNotes(deliveryData.sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
                setPurchaseOrders(purchaseOrdersData.sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));

                // Group 3: Secondary data
                try {
                    const [creditNotesData, paymentsData, movementsData, expensesData] = await Promise.all([
                        dbService.creditNotes.getAll().catch(e => { console.warn("CreditNotes load failed", e); return []; }), 
                        dbService.payments.getAll().catch(e => { console.warn("Payments load failed", e); return []; }),
                        dbService.stockMovements.getAll().catch(e => { console.warn("Mouvements Stock load failed", e); return []; }),
                        dbService.expenses.getAll().catch(e => { console.warn("Dépenses load failed", e); return []; })
                    ]);

                    setCreditNotes(creditNotesData.sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
                    setPayments(paymentsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    setStockMovements(movementsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    setExpenses(expensesData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                } catch (secondaryErr) {
                    console.warn("Some secondary data failed to load, but continuing...", secondaryErr);
                }
            } catch (err: any) {
                console.error("Failed to load data:", err);
                
                // Handle JWT expiration specifically
                if (!isRetry && (err?.message?.includes('JWT') || err?.message?.includes('expired'))) {
                    console.warn("JWT expired in loadData, attempting refresh...");
                    const { data, error: refreshError } = await supabase.auth.refreshSession();
                    if (!refreshError && data.session) {
                        return loadData(true); // Retry once
                    }
                }
                
                setError(err.message || "Impossible de charger les données.");
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
            console.error("Save failed:", err);
            alert("Save failed\n" + (err.message || "Unknown error"));
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
        const configKeys: Record<string, keyof CompanySettings> = {
            invoice: 'invoiceNumbering',
            quote: 'quoteNumbering',
            deliveryNote: 'deliveryNoteNumbering',
            purchaseOrder: 'purchaseOrderNumbering',
            creditNote: 'creditNoteNumbering'
        };
        const config = companySettings?.[configKeys[type]] as any;
        if (config) {
            const customPrefix = config.prefix || '';
            const sep = config.separator || '/';
            let yearStr = '';
            if (config.yearFormat === 'YYYY') yearStr = String(currentYear);
            else if (config.yearFormat === 'YY') yearStr = String(currentYear).slice(-2);
            const pattern = yearStr ? `${customPrefix}${sep}${yearStr}${sep}` : `${customPrefix}${sep}`;
            const numbers = currentItems.map(item => {
                const idToCheck = item.documentId || item.id;
                if (idToCheck && idToCheck.startsWith(pattern)) {
                    const numberPart = idToCheck.replace(pattern, '');
                    return !isNaN(Number(numberPart)) ? parseInt(numberPart, 10) : 0;
                }
                return 0;
            });
            const maxExisting = numbers.length > 0 ? Math.max(...numbers) : 0;
            const nextNumber = Math.max(config.startNumber || 1, maxExisting + 1);
            return `${pattern}${String(nextNumber).padStart(config.padding || 5, '0')}`;
        }
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

    const addClient = async (client: Omit<Client, 'id' | 'clientCode'>) => {
        const newClient = { id: generateUUID(), clientCode: getNextCode('C', clients), ...client };
        await dbService.clients.add(newClient);
        setClients(prev => [newClient, ...prev].sort((a,b) => (b.clientCode || '').localeCompare(a.clientCode || '')));
    };
    const updateClient = async (updatedClient: Client) => {
        await dbService.clients.update(updatedClient);
        setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    };
    const deleteClient = async (clientIds: string | string[]) => {
        try {
            await dbService.clients.delete(clientIds);
            setClients(prev => prev.filter(c => Array.isArray(clientIds) ? !clientIds.includes(c.id) : c.id !== clientIds));
        } catch (error) {
            console.error('Error deleting client(s):', error);
        }
    };

    const updateProductStock = async (productId: string, quantityChange: number, variantId?: string) => {
        const product = products.find(p => p.id === productId);
        if(product) {
            let updatedProduct = { ...product };
            if (variantId && product.hasVariants && product.variants) {
                updatedProduct.variants = product.variants.map(v => 
                    v.id === variantId ? { ...v, stockQuantity: (v.stockQuantity || 0) + quantityChange } : v
                );
                // Recompute total stock from variants
                updatedProduct.stockQuantity = updatedProduct.variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
            } else {
                updatedProduct.stockQuantity = (product.stockQuantity || 0) + quantityChange;
            }
            await dbService.products.update(updatedProduct);
            setProducts(prev => prev.map(p => p.id === productId ? updatedProduct : p));
        }
    };
    const addStockMovement = async (movement: Omit<StockMovement, 'id'>) => {
        const newMovement = { id: generateUUID(), ...movement };
        await dbService.stockMovements.add(newMovement);
        setStockMovements(prev => [newMovement, ...prev]);
        await updateProductStock(movement.productId, movement.quantity, movement.variantId);
    };
    const addProduct = async (product: Omit<Product, 'id'>) => {
        const newProduct: Product = { id: generateUUID(), productCode: product.productCode || getNextCode('P', products), ...product };
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
    const deleteProducts = async (productIds: string[]) => {
        await dbService.products.delete(productIds);
        setProducts(prev => prev.filter(p => !productIds.includes(p.id)));
    };

    const addSupplier = async (supplier: Omit<Supplier, 'id' | 'supplierCode'>) => {
        const newSupplier = { id: generateUUID(), supplierCode: getNextCode('F', suppliers), ...supplier };
        await dbService.suppliers.add(newSupplier);
        setSuppliers(prev => [newSupplier, ...prev].sort((a,b) => (b.supplierCode || '').localeCompare(a.supplierCode || '')));
    };
    const updateSupplier = async (updatedSupplier: Supplier) => {
        await dbService.suppliers.update(updatedSupplier);
        setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
    };
    const deleteSupplier = async (supplierIds: string | string[]) => {
        try {
            await dbService.suppliers.delete(supplierIds);
            setSuppliers(prev => prev.filter(s => Array.isArray(supplierIds) ? !supplierIds.includes(s.id) : s.id !== supplierIds));
        } catch (error) {
            console.error('Error deleting supplier(s):', error);
        }
    };

    const addQuote = async (quoteData: any) => {
        try {
            const documentId = generateDocumentId('quote', quotes);
            const { totalAmount, ...cleanQuoteData } = quoteData;
            const newQuote: Quote = { 
                id: generateUUID(), 
                documentId: documentId, 
                amount: quoteData.amount || (quoteData.subTotal + quoteData.vatAmount), 
                ...cleanQuoteData 
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
        try {
            const savedQuote = await dbService.quotes.update(updatedQuote);
            setQuotes(prev => prev.map(q => q.id === updatedQuote.id ? savedQuote : q));
        } catch (e: any) {
            console.error("Error updating quote", e);
            alert("Erreur mise à jour devis: " + e.message);
        }
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

    const addInvoice = async (invoiceData: Omit<Invoice, 'id' | 'amount' | 'amountPaid'> & { initialPayment?: any }) => {
        try {
            const { initialPayment, ...invoiceFields } = invoiceData;
            const documentId = generateDocumentId('invoice', invoices);
            const newInvoice: Invoice = { id: generateUUID(), documentId: documentId, amount: invoiceFields.subTotal + invoiceFields.vatAmount, amountPaid: initialPayment ? initialPayment.amount : 0, ...invoiceFields };
            
            // Update stock if not draft
            if (newInvoice.status !== InvoiceStatus.Draft) {
                for (const item of newInvoice.lineItems) {
                    if (item.productId) {
                        await addStockMovement({
                            productId: item.productId,
                            variantId: item.variantId,
                            productName: item.name,
                            date: newInvoice.date,
                            quantity: -item.quantity,
                            type: 'Vente',
                            reference: `Facture ${newInvoice.documentId || newInvoice.id}`
                        });
                    }
                }
            }

            await dbService.invoices.add(newInvoice);
            setInvoices(prev => [newInvoice, ...prev].sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
            if (initialPayment && initialPayment.amount > 0) {
                 const newPayment: Payment = { id: generateUUID(), invoiceId: newInvoice.id, invoiceNumber: newInvoice.documentId || newInvoice.id, clientId: newInvoice.clientId, clientName: newInvoice.clientName, date: initialPayment.date, amount: initialPayment.amount, method: initialPayment.method, notes: 'Règlement à la création' };
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

            // Handle stock changes
            const hasRelatedBL = deliveryNotes.some(dn => dn.invoiceId === existingInvoice.id || dn.invoiceId === existingInvoice.documentId);
            
            if (!hasRelatedBL) {
                if (existingInvoice.status !== InvoiceStatus.Draft) {
                    // Restore old stock
                    for (const item of existingInvoice.lineItems) {
                        if (item.productId) {
                            await addStockMovement({
                                productId: item.productId,
                                variantId: item.variantId,
                                productName: item.name,
                                date: new Date().toISOString().split('T')[0],
                                quantity: item.quantity,
                                type: 'Retour',
                                reference: `Modif Facture ${existingInvoice.documentId || existingInvoice.id} (Restaurer)`
                            });
                        }
                    }
                }

                if (updatedInvoice.status !== InvoiceStatus.Draft) {
                    // Deduct new stock
                    for (const item of updatedInvoice.lineItems) {
                        if (item.productId) {
                            await addStockMovement({
                                productId: item.productId,
                                variantId: item.variantId,
                                productName: item.name,
                                date: updatedInvoice.date,
                                quantity: -item.quantity,
                                type: 'Vente',
                                reference: `Modif Facture ${updatedInvoice.documentId || updatedInvoice.id}`
                            });
                        }
                    }
                }
            }

            const savedInvoice = await dbService.invoices.update(updatedInvoice);
            setInvoices(prev => prev.map(inv => inv.id === id ? savedInvoice : inv));
            if (initialPayment && initialPayment.amount > 0) {
                 const newPayment: Payment = { id: generateUUID(), invoiceId: id, invoiceNumber: updatedInvoice.documentId || updatedInvoice.id, clientId: updatedInvoice.clientId, clientName: updatedInvoice.clientName, date: initialPayment.date, amount: initialPayment.amount, method: initialPayment.method, notes: 'Règlement ajouté lors de la modification' };
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
            const invoiceToDelete = invoices.find(inv => inv.id === invoiceId);
            if (invoiceToDelete && invoiceToDelete.status !== InvoiceStatus.Draft) {
                // Restore stock ONLY if no active Delivery Note (BL) exists for this invoice
                // (because if a BL exists, it's the one responsible for the stock deduction/holding)
                const hasRelatedBL = deliveryNotes.some(dn => dn.invoiceId === invoiceToDelete.id || dn.invoiceId === invoiceToDelete.documentId);
                
                if (!hasRelatedBL) {
                    // Restore stock
                    for (const item of invoiceToDelete.lineItems) {
                        if (item.productId) {
                            await addStockMovement({
                                productId: item.productId,
                                variantId: item.variantId,
                                productName: item.name,
                                date: new Date().toISOString().split('T')[0],
                                quantity: item.quantity,
                                type: 'Retour',
                                reference: `Suppr Facture ${invoiceToDelete.documentId || invoiceToDelete.id}`
                            });
                        }
                    }
                }
            }

            const relatedPayments = payments.filter(p => p.invoiceId === invoiceId);
            for(const p of relatedPayments) {
                await dbService.payments.delete(p.id);
            }
            await dbService.invoices.delete(invoiceId);
            setPayments(prev => prev.filter(p => p.invoiceId !== invoiceId));
            setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
        } catch (e: any) {
            alert("Erreur suppression facture: " + e.message);
        }
    };

    const addPayment = async (paymentData: Omit<Payment, 'id'>) => {
        try {
            const newPayment = { id: generateUUID(), ...paymentData };
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
                const updatedInvoice = { ...invoice, amountPaid: newAmountPaid, status: newStatus, paymentDate: newStatus === InvoiceStatus.Paid ? paymentData.date : invoice.paymentDate };
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
            const oldStatus = invoiceToUpdate.status;
            const updatedInvoice = { ...invoiceToUpdate, status: newStatus };

            // Handle stock changes
            if (oldStatus === InvoiceStatus.Draft && newStatus !== InvoiceStatus.Draft) {
                // Check if a Delivery Note (BL) already exists for this invoice. 
                // If it does, the BL already handled the stock deduction.
                const hasRelatedBL = deliveryNotes.some(dn => dn.invoiceId === invoiceToUpdate.id || dn.invoiceId === invoiceToUpdate.documentId);
                
                if (!hasRelatedBL) {
                    // Deduct stock
                    for (const item of updatedInvoice.lineItems) {
                        if (item.productId) {
                            await addStockMovement({
                                productId: item.productId,
                                variantId: item.variantId,
                                productName: item.name,
                                date: new Date().toISOString().split('T')[0],
                                quantity: -item.quantity,
                                type: 'Vente',
                                reference: `Validation Facture ${updatedInvoice.documentId || updatedInvoice.id}`
                            });
                        }
                    }
                }
            } else if (oldStatus !== InvoiceStatus.Draft && newStatus === InvoiceStatus.Draft) {
                // Restore stock
                for (const item of updatedInvoice.lineItems) {
                    if (item.productId) {
                        await addStockMovement({
                            productId: item.productId,
                            variantId: item.variantId,
                            productName: item.name,
                            date: new Date().toISOString().split('T')[0],
                            quantity: item.quantity,
                            type: 'Retour',
                            reference: `Brouillon Facture ${updatedInvoice.documentId || updatedInvoice.id}`
                        });
                    }
                }
            }

            await dbService.invoices.update(updatedInvoice);
            setInvoices(prev => prev.map(inv => inv.id === invoiceId ? updatedInvoice : inv));
        }
    };
    const createInvoiceFromQuote = async (quoteId: string) => {
        const quote = quotes.find(q => q.id === quoteId);
        if (!quote) return;
        try {
            const documentId = generateDocumentId('invoice', invoices);
            const newInvoiceData: Invoice = { id: generateUUID(), documentId: documentId, quoteId: quote.id, clientId: quote.clientId, clientName: quote.clientName, date: new Date().toISOString().split('T')[0], dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: InvoiceStatus.Pending, subject: quote.subject, reference: quote.reference, purchaseOrderNumber: quote.purchaseOrderNumber, lineItems: quote.lineItems, subTotal: quote.subTotal, vatAmount: quote.vatAmount, amount: quote.amount, amountPaid: 0 };
            
            // Deduct stock if not draft
            if (newInvoiceData.status !== InvoiceStatus.Draft) {
                for (const item of newInvoiceData.lineItems) {
                    if (item.productId) {
                        await addStockMovement({
                            productId: item.productId,
                            variantId: item.variantId,
                            productName: item.name,
                            date: newInvoiceData.date,
                            quantity: -item.quantity,
                            type: 'Vente',
                            reference: `Facture ${newInvoiceData.documentId || newInvoiceData.id} (depuis Devis)`
                        });
                    }
                }
            }

            await dbService.invoices.add(newInvoiceData);
            setInvoices(prev => [newInvoiceData, ...prev].sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
            await updateQuoteStatus(quoteId, QuoteStatus.Converted);
        } catch (e: any) {
            alert("Erreur conversion: " + e.message);
        }
    };

    const addCreditNote = async (creditNoteData: Omit<CreditNote, 'id'>) => {
        try {
            const documentId = generateDocumentId('creditNote', creditNotes);
            const newCreditNote: CreditNote = { id: generateUUID(), documentId: documentId, ...creditNoteData };
            await dbService.creditNotes.add(newCreditNote);
            setCreditNotes(prev => [newCreditNote, ...prev].sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
        } catch (e: any) {
            console.error("Error creating credit note", e);
            alert("Erreur création avoir: " + e.message);
            throw e;
        }
    };
    const updateCreditNote = async (updatedCreditNote: CreditNote) => {
        try {
            const savedCreditNote = await dbService.creditNotes.update(updatedCreditNote);
            setCreditNotes(prev => prev.map(cn => cn.id === updatedCreditNote.id ? savedCreditNote : cn));
        } catch (e: any) {
            console.error("Error updating credit note", e);
            alert("Erreur mise à jour avoir: " + e.message);
        }
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
            const newCreditNote: CreditNote = { id: generateUUID(), documentId: documentId, invoiceId: invoice.documentId || invoice.id, clientId: invoice.clientId, clientName: invoice.clientName, date: new Date().toISOString().split('T')[0], status: CreditNoteStatus.Draft, subject: `Avoir sur facture ${invoice.documentId || invoice.id}`, reference: invoice.reference, lineItems: invoice.lineItems, subTotal: invoice.subTotal, vatAmount: invoice.vatAmount, amount: invoice.amount };
            await dbService.creditNotes.add(newCreditNote);
            setCreditNotes(prev => [newCreditNote, ...prev].sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
            navigate('/sales/credit-notes');
        } catch (e: any) {
            alert("Erreur création avoir: " + e.message);
        }
    };

    const createDeliveryNote = async (noteData: Omit<DeliveryNote, 'id'>) => {
        try {
            const documentId = generateDocumentId('deliveryNote', deliveryNotes);
            const newNote: DeliveryNote = { id: generateUUID(), documentId: documentId, ...noteData };
            await dbService.deliveryNotes.add(newNote);
            setDeliveryNotes(prev => [newNote, ...prev]);
            // Only deduct stock if this BL is NOT created from an existing invoice that already deducted stock
            const sourceInvoice = noteData.invoiceId ? invoices.find(inv => inv.documentId === noteData.invoiceId || inv.id === noteData.invoiceId) : null;
            const stockAlreadyDeducted = sourceInvoice && sourceInvoice.status !== InvoiceStatus.Draft;

            if (!stockAlreadyDeducted) {
                for (const item of noteData.lineItems) {
                    if (item.productId) {
                        await addStockMovement({ 
                            productId: item.productId, 
                            variantId: item.variantId,
                            productName: item.name, 
                            date: noteData.date, 
                            quantity: -item.quantity, 
                            type: 'Vente', 
                            reference: `${documentId} ${noteData.invoiceId ? '(Facture ' + noteData.invoiceId + ')' : '(Manuel)'}` 
                        });
                    }
                }
            }
        } catch (e: any) {
            console.error("Error creating delivery note", e);
            alert("Erreur création BL: " + e.message);
            throw e;
        }
    };
    const updateDeliveryNote = async (updatedNote: DeliveryNote) => {
        try {
            const savedNote = await dbService.deliveryNotes.update(updatedNote); 
            setDeliveryNotes(prev => prev.map(n => n.id === updatedNote.id ? savedNote : n));
        } catch (e: any) {
            console.error("Error updating delivery note", e);
            alert("Erreur mise à jour BL: " + e.message);
        }
    };
    const deleteDeliveryNote = async (noteId: string) => {
        try {
            const note = deliveryNotes.find(n => n.id === noteId);
            if (note) {
                // Restore stock ONLY if this BL was the one that deducted it
                const sourceInvoice = note.invoiceId ? invoices.find(inv => inv.documentId === note.invoiceId || inv.id === note.invoiceId) : null;
                const stockWasDeductedByInvoice = sourceInvoice && sourceInvoice.status !== InvoiceStatus.Draft;
                
                if (!stockWasDeductedByInvoice) {
                    // Restore stock
                    for (const item of note.lineItems) {
                        if (item.productId) {
                            await addStockMovement({ 
                                productId: item.productId, 
                                variantId: item.variantId,
                                productName: item.name, 
                                date: new Date().toISOString().split('T')[0], 
                                quantity: item.quantity, 
                                type: 'Retour', 
                                reference: `Suppr BL ${note.documentId || note.id}` 
                            });
                        }
                    }
                }
            }
            await dbService.deliveryNotes.delete(noteId);
            setDeliveryNotes(prev => prev.filter(n => n.id !== noteId));
        } catch (e: any) {
            alert("Erreur suppression BL: " + e.message);
        }
    };
    const createInvoiceFromDeliveryNote = async (deliveryNoteId: string) => {
        // ... (existing code minimized for brevity)
    };

    const addExpense = async (expenseData: Omit<Expense, 'id'>) => {
        try {
            const newExpense = { id: generateUUID(), ...expenseData };
            await dbService.expenses.add(newExpense);
            setExpenses(prev => [newExpense, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        } catch (e: any) {
            console.error("Error adding expense", e);
            alert("Erreur ajout dépense: " + e.message);
            throw e;
        }
    };

    const updateExpense = async (updatedExpense: Expense) => {
        try {
            const savedExpense = await dbService.expenses.update(updatedExpense);
            setExpenses(prev => prev.map(e => e.id === updatedExpense.id ? savedExpense : e));
        } catch (e: any) {
            console.error("Error updating expense", e);
            alert("Erreur mise à jour dépense: " + e.message);
            throw e;
        }
    };

    const deleteExpense = async (id: string | string[]) => {
        try {
            await dbService.expenses.delete(id);
            setExpenses(prev => prev.filter(e => Array.isArray(id) ? !id.includes(e.id) : e.id !== id));
        } catch (e: any) {
            console.error("Error deleting expense", e);
            alert("Erreur suppression dépense: " + e.message);
        }
    };

    const addPurchaseOrder = async (orderData: Omit<PurchaseOrder, 'id'>) => {
        try {
            const documentId = generateDocumentId('purchaseOrder', purchaseOrders);
            const newOrder: PurchaseOrder = { id: generateUUID(), documentId: documentId, ...orderData };
            await dbService.purchaseOrders.add(newOrder);
            setPurchaseOrders(prev => [newOrder, ...prev].sort((a, b) => (b.documentId || b.id).localeCompare(a.documentId || a.id)));
        } catch (e: any) {
            console.error("Error creating purchase order", e);
            alert("Erreur création BC: " + e.message);
            throw e;
        }
    };
    const updatePurchaseOrder = async (updatedOrder: PurchaseOrder) => {
        try {
            const savedOrder = await dbService.purchaseOrders.update(updatedOrder);
            setPurchaseOrders(prev => prev.map(o => o.id === updatedOrder.id ? savedOrder : o));
        } catch (e: any) {
            console.error("Error updating purchase order", e);
            alert("Erreur mise à jour commande: " + e.message);
        }
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
                            variantId: item.variantId,
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

    if (isLoading) { return <LoadingScreen />; }
    if (error) {
        return (
            <div className="flex h-screen items-center justify-center bg-red-50 p-4">
                <div className="w-full max-w-lg text-center">
                    <h2 className="text-xl font-bold text-red-700"><span>Erreur de Chargement</span></h2>
                    <p className="mt-2 text-neutral-700 bg-red-100 p-4 rounded-lg border border-red-200"><span>{error}</span></p>
                    <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                        <button 
                            onClick={() => window.location.reload()} 
                            className="px-6 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg shadow-sm hover:bg-emerald-700 transition-colors"
                        >
                            <span>Réessayer</span>
                        </button>
                        <button 
                            onClick={async () => {
                                try {
                                    await supabase.auth.signOut();
                                } catch (e) {
                                    console.error("Sign out error", e);
                                }
                                localStorage.clear();
                                sessionStorage.clear();
                                // Clear all cookies if possible
                                document.cookie.split(";").forEach((c) => {
                                    document.cookie = c
                                        .replace(/^ +/, "")
                                        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                                });
                            }} 
                            className="px-6 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
                        >
                            <span>Déconnexion</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-100 text-neutral-800 overflow-hidden">
            <div className="hidden md:flex md:w-64 md:flex-col md:shrink-0 transition-all duration-300"><Sidebar /></div>
            {isSidebarOpen && (
                <div className="fixed inset-0 z-50 flex md:hidden">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out" onClick={() => setSidebarOpen(false)}></div>
                    <div className="relative flex w-72 max-w-[80%] flex-1 flex-col bg-emerald-600 shadow-2xl animate-slide-in">
                        <div className="absolute top-0 right-0 -mr-12 pt-4">
                            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus:outline-none ring-1 ring-white/20" onClick={() => setSidebarOpen(false)}>
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <Sidebar onClose={() => setSidebarOpen(false)} />
                    </div>
                </div>
            )}
            <div className="flex flex-1 flex-col min-h-0 overflow-hidden w-full">
                <div className="flex-1 overflow-y-auto bg-slate-50 w-full">
                    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md px-4 py-3 md:hidden border-b border-slate-200 shadow-sm flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                                <Files size={18} />
                            </div>
                            <h1 className="text-lg font-bold text-emerald-700 tracking-tight">Facturago</h1>
                        </div>
                        <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 focus:outline-none" onClick={() => setSidebarOpen(true)}>
                            <Menu className="h-6 w-6" />
                        </button>
                    </div>
                    <main className="p-4 sm:p-6 lg:p-8 w-full">
                        <Routes>
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="/dashboard" element={<Dashboard invoices={invoices} clients={clients} products={products} companySettings={companySettings} creditNotes={creditNotes} expenses={expenses} />} />
                            <Route path="/statistics" element={<Statistics invoices={invoices} payments={payments} purchaseOrders={purchaseOrders} products={products} creditNotes={creditNotes} expenses={expenses} />} />
                            <Route path="/sales/quotes" element={<Quotes quotes={quotes} onUpdateQuoteStatus={updateQuoteStatus} onCreateInvoice={createInvoiceFromQuote} onAddQuote={addQuote} onUpdateQuote={updateQuote} onDeleteQuote={deleteQuote} clients={clients} products={products} companySettings={companySettings} />} />
                            <Route path="/sales/invoices" element={<InvoicesComponent invoices={invoices} onUpdateInvoiceStatus={updateInvoiceStatus} onAddPayment={addPayment} onCreateInvoice={addInvoice} onUpdateInvoice={updateInvoice} onDeleteInvoice={deleteInvoice} onCreateCreditNote={createCreditNoteFromInvoice} clients={clients} products={products} companySettings={companySettings} />} />
                            <Route path="/sales/credit-notes" element={<CreditNotesComponent creditNotes={creditNotes} onUpdateCreditNoteStatus={updateCreditNoteStatus} onCreateCreditNote={addCreditNote} onUpdateCreditNote={updateCreditNote} onDeleteCreditNote={deleteCreditNote} clients={clients} products={products} companySettings={companySettings} />} />
                            <Route path="/sales/payments" element={<PaymentTracking invoices={invoices} payments={payments} onAddPayment={addPayment} clients={clients} />} />
                            <Route path="/sales/delivery" element={<DeliveryNotesComponent deliveryNotes={deliveryNotes} invoices={invoices} onCreateDeliveryNote={createDeliveryNote} onUpdateDeliveryNote={updateDeliveryNote} onDeleteDeliveryNote={deleteDeliveryNote} onCreateInvoice={createInvoiceFromDeliveryNote} clients={clients} products={products} companySettings={companySettings} />} />
                            <Route path="/purchases/orders" element={<PurchaseOrders orders={purchaseOrders} suppliers={suppliers} products={products} onAddOrder={addPurchaseOrder} onUpdateOrder={updatePurchaseOrder} onUpdateStatus={updatePurchaseOrderStatus} onDeleteOrder={deletePurchaseOrder} onConvertToInvoice={(order) => navigate('/sales/invoices', { state: { prefilledPO: order.documentId || order.id } })} companySettings={companySettings} />} />
                            <Route path="/stock" element={<StockManagement products={products} movements={stockMovements} onAddMovement={addStockMovement} />} />
                            <Route path="/expenses" element={<Expenses expenses={expenses} onAddExpense={addExpense} onUpdateExpense={updateExpense} onDeleteExpense={deleteExpense} />} />
                            <Route path="/clients" element={<ClientsComponent clients={clients} onAddClient={addClient} onUpdateClient={updateClient} onDeleteClient={deleteClient} onDeleteClients={deleteClient} />} />
                            <Route path="/suppliers" element={<SuppliersComponent suppliers={suppliers} onAddSupplier={addSupplier} onUpdateSupplier={updateSupplier} onDeleteSupplier={deleteSupplier} onDeleteSuppliers={deleteSupplier} />} />
                            <Route path="/products" element={<ProductsComponent products={products} onAddProduct={addProduct} onUpdateProduct={updateProduct} onDeleteProduct={deleteProduct} onDeleteProducts={deleteProducts} />} />
                            <Route path="/products/new" element={<ProductsComponent products={products} onAddProduct={addProduct} onUpdateProduct={updateProduct} onDeleteProduct={deleteProduct} onDeleteProducts={deleteProducts} />} />
                            <Route path="/products/edit/:productId" element={<ProductsComponent products={products} onAddProduct={addProduct} onUpdateProduct={updateProduct} onDeleteProduct={deleteProduct} onDeleteProducts={deleteProducts} />} />
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
                const { data: { session } } = await supabase.auth.getSession();
                setSession(session);
            } catch (err) {
                console.error("Auth initialization exception:", err);
            } finally {
                setLoading(false);
            }
        };

        initSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            console.log("Auth state change:", _event, session?.user?.email);
            if (_event === 'SIGNED_OUT' || _event === 'USER_UPDATED' && !session) {
                resetDBCache();
                // Clear any local storage that might interfere
                localStorage.removeItem('supabase.auth.token');
            }
            setSession(session);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);
    if (loading) { return <LoadingScreen />; }

    return (
        <LanguageProvider>
            <HashRouter>
                <AnimatePresence mode="wait" key={session?.user?.id || 'public'}>
                    <Routes>
                        <Route 
                            path="/" 
                            element={
                                !session ? (
                                    <motion.div
                                        key="landing-wrapper"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="min-h-screen w-full bg-white"
                                    >
                                        <LandingPage />
                                    </motion.div>
                                ) : (
                                    <Navigate to="/dashboard" replace />
                                )
                            } 
                        />
                        <Route 
                            path="/login" 
                            element={
                                !session ? (
                                    <motion.div
                                        key="login-wrapper"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="min-h-screen w-full bg-slate-100"
                                    >
                                        <Login />
                                    </motion.div>
                                ) : (
                                    <Navigate to="/dashboard" replace />
                                )
                            } 
                        />
                        <Route 
                            path="/*" 
                            element={
                                session ? (
                                    <motion.div
                                        key={`app-wrapper-${session.user.id}`}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="h-full w-full"
                                    >
                                        <MainContent />
                                    </motion.div>
                                ) : (
                                    <Navigate to="/" replace />
                                )
                            } 
                        />
                    </Routes>
                </AnimatePresence>
            </HashRouter>
        </LanguageProvider>
    );
};

export default App;
