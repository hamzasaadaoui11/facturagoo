
export enum InvoiceStatus {
    Paid = 'Payée',
    Pending = 'En attente',
    Overdue = 'En retard',
    Draft = 'Brouillon',
    Partial = 'Partiellement payée'
}

export interface Client {
    id: string;
    clientCode: string;
    type: 'Entreprise' | 'Particulier'; // Nouveau champ
    name: string; // Nom complet ou Nom du contact
    company?: string; // Nom de la société (optionnel si Particulier)
    ice?: string; // Identifiant Commun de l'Entreprise (optionnel)
    rc?: string; // Registre de Commerce (optionnel)
    email: string;
    phone: string;
    address?: string; // Adresse complète
}

export interface Supplier {
    id: string;
    supplierCode: string;
    type: 'Entreprise' | 'Particulier';
    name: string; // Nom du contact
    company?: string; // Nom de la société
    ice?: string;
    rc?: string;
    email: string;
    phone: string;
    address?: string;
}

export interface Product {
    id: string;
    productCode: string;
    name: string;
    description: string;
    productType: 'Produit' | 'Service';
    unitOfMeasure: string;
    salePrice: number; // Stored as HT
    purchasePrice: number; // Stored as HT
    vat: number;
    stockQuantity: number; // Real stock tracking
    minStockAlert: number;
}

export enum QuoteStatus {
    Draft = 'Brouillon',
    Created = 'Créé',
    Sent = 'Envoyé',
    Approved = 'Accepté',
    Rejected = 'Refusé',
    Converted = 'Converti',
}

export enum PurchaseOrderStatus {
    Draft = 'Brouillon',
    Sent = 'Envoyé',
    Received = 'Reçu', // Updates stock
    Cancelled = 'Annulé'
}

export interface LineItem {
  id: string;
  productId: string | null;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vat: number;
}

export interface Quote {
    id: string;
    clientId: string;
    clientName: string;
    date: string;
    expiryDate: string;
    amount: number;
    status: QuoteStatus;
    subject?: string;
    reference?: string;
    lineItems: LineItem[];
    subTotal: number;
    vatAmount: number;
}

export interface PurchaseOrder {
    id: string;
    supplierId: string;
    supplierName: string;
    date: string;
    expectedDate?: string;
    status: PurchaseOrderStatus;
    lineItems: LineItem[];
    subTotal: number;
    vatAmount: number;
    totalAmount: number;
    notes?: string;
}

export interface Invoice {
    id: string;
    quoteId?: string;
    clientId: string;
    clientName: string;
    date: string;
    dueDate: string;
    paymentDate?: string;
    amount: number;
    amountPaid: number; // Track received payments
    status: InvoiceStatus;
    subject?: string;
    reference?: string;
    lineItems: LineItem[];
    subTotal: number;
    vatAmount: number;
}

export interface Payment {
    id: string;
    invoiceId: string;
    invoiceNumber: string; // Denormalized for easier display
    clientId: string;
    clientName: string;
    date: string;
    amount: number;
    method: 'Virement' | 'Chèque' | 'Espèces' | 'Carte Bancaire';
    reference?: string; // Check number, transaction ID
    notes?: string;
}

export interface StockMovement {
    id: string;
    productId: string;
    productName: string;
    date: string;
    quantity: number; // Positive for IN, Negative for OUT
    type: 'Initial' | 'Vente' | 'Achat' | 'Ajustement' | 'Retour';
    reference?: string; // Invoice ID or Delivery Note ID
}

export interface DeliveryNote {
    id: string;
    invoiceId?: string; // Optional now
    clientId: string;
    clientName: string;
    date: string;
    lineItems: LineItem[];
    status: string; // Changed from fixed union to string to support computed statuses like 'Payé'
    // Financials for standalone BL
    subTotal?: number;
    vatAmount?: number;
    totalAmount?: number;
    paymentAmount?: number;
    paymentMethod?: string;
}

export interface DocumentColumn {
    id: 'name' | 'quantity' | 'unitPrice' | 'vat' | 'total';
    label: string;
    visible: boolean;
    order: number;
    width?: string; // Optional width hint
}

export interface CompanySettings {
    id: string; // Changed from fixed string literal to generic string to support UUIDs
    companyName?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    // New specific fields
    rc?: string;       // Registre de Commerce
    ice?: string;      // Identifiant Commun de l'Entreprise
    fiscalId?: string; // Identifiant Fiscal (IF)
    patente?: string;  // Taxe Professionnelle
    cnss?: string;     // CNSS
    logo?: string;
    primaryColor?: string;
    footerNotes?: string;
    defaultPaymentTerms?: string; // Added field
    documentColumns?: DocumentColumn[]; // New field for custom columns
}
