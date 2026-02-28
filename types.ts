
export enum InvoiceStatus {
    Paid = 'Payée',
    Pending = 'En attente',
    Overdue = 'En retard',
    Draft = 'Brouillon',
    Partial = 'Partiellement payée'
}

export enum CreditNoteStatus {
    Draft = 'Brouillon',
    Validated = 'Validé',
    Refunded = 'Remboursé'
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
  productCode?: string; // Reference/SKU display
  name: string;
  description: string;
  quantity: number;
  length?: number;
  height?: number;
  unitPrice: number;
  vat: number;
}

export interface Quote {
    id: string;
    documentId?: string; // Human readable ID (DV00001)
    clientId: string;
    clientName: string;
    date: string;
    expiryDate: string;
    amount: number;
    status: QuoteStatus;
    useDimensions?: boolean;
    subject?: string;
    reference?: string;
    lineItems: LineItem[];
    subTotal: number;
    vatAmount: number;
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
}

export interface PurchaseOrder {
    id: string;
    documentId?: string; // Human readable ID (BC00001)
    supplierId: string;
    supplierName: string;
    date: string;
    expectedDate?: string;
    status: PurchaseOrderStatus;
    useDimensions?: boolean;
    lineItems: LineItem[];
    subTotal: number;
    vatAmount: number;
    totalAmount: number;
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
    notes?: string;
}

export interface Invoice {
    id: string;
    documentId?: string; // Human readable ID (FA00001)
    quoteId?: string;
    clientId: string;
    clientName: string;
    date: string;
    dueDate: string;
    paymentDate?: string;
    amount: number;
    amountPaid: number; // Track received payments
    status: InvoiceStatus;
    useDimensions?: boolean;
    subject?: string;
    reference?: string;
    lineItems: LineItem[];
    subTotal: number;
    vatAmount: number;
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
}

export interface CreditNote {
    id: string;
    documentId?: string; // Human readable ID (AV00001)
    invoiceId?: string; // Link to original invoice
    clientId: string;
    clientName: string;
    date: string;
    amount: number;
    status: CreditNoteStatus;
    useDimensions?: boolean;
    subject?: string; // Reason
    reference?: string;
    lineItems: LineItem[];
    subTotal: number;
    vatAmount: number;
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
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
    documentId?: string; // Human readable ID (BL00001)
    invoiceId?: string; // Optional now
    clientId: string;
    clientName: string;
    date: string;
    useDimensions?: boolean;
    subject?: string; // Champ ajouté
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
    id: 'reference' | 'name' | 'quantity' | 'length' | 'height' | 'unitPrice' | 'vat' | 'total';
    label: string;
    visible: boolean;
    order: number;
    width?: string; // Optional width hint
}

export interface DocumentLabels {
    totalHt?: string;
    totalTax?: string;
    totalNet?: string;
    amountInWordsPrefix?: string;
    signatureSender?: string;
    signatureRecipient?: string;
}

export interface NumberingConfig {
    prefix: string;
    yearFormat: 'YYYY' | 'YY' | 'NONE';
    startNumber: number;
    padding: number;
    separator: string;
}

export interface CompanySettings {
    id: string; 
    companyName?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    rc?: string;       
    ice?: string;      
    fiscalId?: string; 
    patente?: string;  
    cnss?: string;     
    capital?: string;  
    logo?: string;
    stamp?: string;
    primaryColor?: string;
    footerNotes?: string;
    defaultPaymentTerms?: string; 
    documentColumns?: DocumentColumn[]; 
    documentLabels?: DocumentLabels;
    showAmountInWords?: boolean; 
    showSignatureRecipient?: boolean;
    priceDisplayMode?: 'HT' | 'TTC'; // Nouveau mode d'affichage
    // Fix: added defaultCurrencyCode property to match usage in currencyService.ts
    defaultCurrencyCode?: string;
    invoiceNumbering?: NumberingConfig;
    quoteNumbering?: NumberingConfig;
    deliveryNoteNumbering?: NumberingConfig;
    purchaseOrderNumbering?: NumberingConfig;
    creditNoteNumbering?: NumberingConfig;
}
