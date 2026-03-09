
import { CompanySettings, Invoice, Quote, DeliveryNote, PurchaseOrder, Client, Supplier, LineItem, DocumentColumn, CreditNote } from '../types';
import { translations } from '../i18n/translations';
import html2pdf from 'html2pdf.js';

interface DocumentData {
    id: string;
    documentId?: string; 
    date: string;
    lineItems: LineItem[];
    subTotal?: number;
    vatAmount?: number;
    totalAmount?: number; 
    amount?: number; 
    amountPaid?: number; 
    paymentAmount?: number; 
    notes?: string;
    subject?: string;
    paymentMethod?: string;
    reference?: string;
    dueDate?: string; 
    expiryDate?: string; 
    expectedDate?: string; 
    invoiceId?: string; // For Credit Notes
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
    showDimensions?: boolean;
}

interface PDFOptions {
    showPrices?: boolean;
}

type DocumentType = 'Facture' | 'Devis' | 'Bon de Livraison' | 'Bon de Commande' | 'Avoir';

// --- Utilitaires de conversion Chiffres vers Lettres (Français) ---

const UNITS = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
const TEENS = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

const convertGroup = (n: number): string => {
    if (n === 0) return '';
    if (n < 10) return UNITS[n];
    if (n < 20) return TEENS[n - 10];
    
    const ten = Math.floor(n / 10);
    const unit = n % 10;

    if (ten === 7 || ten === 9) {
        const base = TENS[ten - 1];
        const sub = unit + 10;
        // Cas 71, 91 -> soixante-et-onze
        if (unit === 1 && ten === 7) return `${base}-et-onze`;
        return `${base}-${TEENS[sub - 10]}`;
    }

    const tenString = TENS[ten];
    
    if (unit === 0) return tenString;
    // Fix: replaced undefined 'maxCode' with 'tenString' for correct French number formation (e.g., vingt-et-un)
    if (unit === 1 && ten < 8) return `${tenString}-et-un`;
    
    return `${tenString}-${UNITS[unit]}`;
};

const numberToWordsFr = (amount: number): string => {
    if (amount === 0) return 'zéro dirham';

    const absAmount = Math.abs(amount);
    const integerPart = Math.floor(absAmount);
    const decimalPart = Math.round((absAmount - integerPart) * 100);

    const convertInteger = (n: number): string => {
        if (n === 0) return '';
        
        let words = '';
        
        // Millions
        const millions = Math.floor(n / 1000000);
        const remainderMillion = n % 1000000;
        if (millions > 0) {
            words += (millions === 1 ? 'un million' : `${convertGroup(millions)} millions`) + ' ';
        }

        // Thousands
        const thousands = Math.floor(remainderMillion / 1000);
        const remainderThousand = remainderMillion % 1000;
        if (thousands > 0) {
            if (thousands === 1) words += 'mille ';
            else words += `${convertIntegerGroup(thousands)} mille `;
        }

        // Hundreds
        if (remainderThousand > 0) {
            words += convertIntegerGroup(remainderThousand);
        }

        return words.trim();
    };

    const convertIntegerGroup = (n: number): string => {
        let str = '';
        const hundreds = Math.floor(n / 100);
        const remainder = n % 100;

        if (hundreds > 0) {
            if (hundreds === 1) str += 'cent ';
            else str += `${UNITS[hundreds]} cents `; 
        }

        if (remainder > 0) {
            str += convertGroup(remainder);
        }
        
        return str.trim();
    };

    let result = convertInteger(integerPart) + (integerPart === 1 ? ' dirham' : ' dirhams');
    if (decimalPart > 0) {
        result += ` et ${convertInteger(decimalPart)} centimes`;
    }

    return result.charAt(0).toUpperCase() + result.slice(1);
};

const DEFAULT_COLUMNS: DocumentColumn[] = [
    { id: 'reference', label: 'Réf', visible: false, order: 0 },
    { id: 'name', label: 'Désignation', visible: true, order: 1 },
    { id: 'quantity', label: 'Qté', visible: true, order: 2 },
    { id: 'unitPrice', label: 'P.U. HT', visible: true, order: 3 },
    { id: 'vat', label: 'TVA', visible: true, order: 4 },
    { id: 'total', label: 'Total HT', visible: true, order: 5 },
];

const generateDocumentHTML = (
    docType: DocumentType,
    doc: DocumentData,
    settings: CompanySettings | null,
    recipient: Client | Supplier | undefined,
    options?: PDFOptions
): string => {
    if (!settings || !settings.companyName) {
        throw new Error("Impossible de générer le document : Les informations de l'entreprise (Nom) sont manquantes dans les paramètres.");
    }

    if (!recipient) {
        throw new Error("Impossible de générer le document : Les informations du client/fournisseur sont introuvables.");
    }

    const lang = localStorage.getItem('app_language') || 'fr';
    const dict = (translations as any)[lang] || translations['fr'];
    const showPrices = options?.showPrices !== false;
    const showAmountInWords = settings.showAmountInWords !== false;
    const isModeTTC = settings.priceDisplayMode === 'TTC';
    const calculationMode = doc.lineItems[0]?.calculationMode || 'piece';
    const legacyShowDimensions = (doc as any).showDimensions || doc.lineItems[0]?.showDimensions;
    
    const isM2 = calculationMode === 'm2' || (legacyShowDimensions && calculationMode === 'piece');
    const isML = calculationMode === 'ml';
    const isKg = calculationMode === 'kg';

    const getLineMultiplier = (item: any) => {
        if (isM2) return (item.length || 1) * (item.height || 1);
        if (isML) return (item.length || 1);
        return 1;
    };

    const subTotal = doc.lineItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity * getLineMultiplier(item)), 0);
    let discountAmount = 0;
    if (doc.discountType && doc.discountValue && doc.discountValue > 0) {
        if (doc.discountType === 'percentage') {
            discountAmount = subTotal * (doc.discountValue / 100);
        } else {
            discountAmount = doc.discountValue;
        }
    }

    const subTotalAfterDiscount = subTotal - discountAmount;

    const vatAmount = doc.lineItems.reduce((acc, item) => {
        const itemTotalHT = item.unitPrice * item.quantity * getLineMultiplier(item);
        const itemDiscount = subTotal > 0 ? (itemTotalHT / subTotal) * discountAmount : 0;
        const itemBaseForVat = itemTotalHT - itemDiscount;
        return acc + (itemBaseForVat * (item.vat / 100));
    }, 0);

    const totalAmount = subTotalAfterDiscount + vatAmount;

    // Extract custom labels with defaults from translations
    const labels = settings.documentLabels || {};
    
    // Core Labels for Totals using the specific pdf prefixes
    let txtTotalHt = labels.totalHt || dict.pdfTotalHT || 'Total HT';
    let txtTotalTax = labels.totalTax || dict.pdfTotalTax || 'Total TVA';
    let txtTotalNet = labels.totalNet || dict.pdfTotalNet || 'Net à Payer';
    
    let txtAmountInWords = labels.amountInWordsPrefix || dict.pdfAmountPrefix || 'Arrêté le présent document à la somme de :';
    if (docType === 'Facture') {
        txtAmountInWords = txtAmountInWords.replace('le présent document', 'la présente facture');
    } else {
        txtAmountInWords = txtAmountInWords.replace('document', docType.toLowerCase());
    }
    let txtSigSender = labels.signatureSender || dict.pdfSigSender || 'Signature Expéditeur';
    let txtSigRecipient = labels.signatureRecipient || dict.pdfSigRecipient || 'Signature & Cachet';

    // Strict ICE -> NIF mapping for Spanish
    const taxIdLabel = dict.ice || (lang === 'es' ? 'NIF' : (lang === 'en' ? 'Tax ID' : 'ICE'));

    let primaryColor = settings.primaryColor || '#10b981';
    if (primaryColor.includes('oklch')) primaryColor = '#10b981';
    
    const dateStr = new Date(doc.date).toLocaleDateString(lang === 'es' ? 'es-ES' : (lang === 'en' ? 'en-US' : 'fr-FR'));
    
    let amountInLetters = '';
    if (lang === 'fr') {
        amountInLetters = numberToWordsFr(totalAmount);
    } else if (lang === 'en') {
        amountInLetters = numberToWordsEn(totalAmount);
    } else if (lang === 'es') {
        amountInLetters = numberToWordsEs(totalAmount);
    } else {
        amountInLetters = `${totalAmount.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD`;
    }
    
    const displayId = doc.documentId || doc.id;
    const isDeliveryNote = docType === 'Bon de Livraison';

    // Document Titles translation
    let titleDisplay = docType.toUpperCase();
    if (lang === 'es') {
        if (docType === 'Facture') titleDisplay = "FACTURA";
        else if (docType === 'Devis') titleDisplay = "PRESUPUESTO";
        else if (docType === 'Bon de Livraison') titleDisplay = "ALBARÁN";
        else if (docType === 'Bon de Commande') titleDisplay = "PEDIDO";
        else if (docType === 'Avoir') titleDisplay = "NOTA DE CRÉDITO";
    } else if (lang === 'en') {
        if (docType === 'Facture') titleDisplay = "INVOICE";
        else if (docType === 'Devis') titleDisplay = "QUOTE";
        else if (docType === 'Bon de Livraison') titleDisplay = "DELIVERY NOTE";
        else if (docType === 'Bon de Commande') titleDisplay = "PURCHASE ORDER";
        else if (docType === 'Avoir') titleDisplay = "CREDIT NOTE";
    } else if (docType === 'Avoir') {
        titleDisplay = "FACTURE D’AVOIR";
    }

    let activeColumns = (settings.documentColumns && settings.documentColumns.length > 0) 
        ? settings.documentColumns.filter(c => c.visible).sort((a, b) => a.order - b.order)
        : DEFAULT_COLUMNS.filter(c => c.visible);

    if (isDeliveryNote && !showPrices) {
        activeColumns = activeColumns.filter(c => c.id === 'name' || c.id === 'quantity' || c.id === 'reference');
    }

    if (isM2) {
        const qtyIndex = activeColumns.findIndex(c => c.id === 'quantity');
        if (qtyIndex !== -1) {
            activeColumns.splice(qtyIndex + 1, 0, 
                { id: 'length' as any, label: lang === 'es' ? 'Largo' : (lang === 'en' ? 'Length' : 'Long.'), visible: true, order: 2.1 },
                { id: 'height' as any, label: lang === 'es' ? 'Alto' : (lang === 'en' ? 'Height' : 'Haut.'), visible: true, order: 2.2 },
                { id: 'm2' as any, label: 'M²', visible: true, order: 2.3 }
            );
        }
    } else if (isML) {
        const qtyIndex = activeColumns.findIndex(c => c.id === 'quantity');
        if (qtyIndex !== -1) {
            activeColumns.splice(qtyIndex + 1, 0, 
                { id: 'length' as any, label: lang === 'es' ? 'Largo' : (lang === 'en' ? 'Length' : 'Long.'), visible: true, order: 2.1 },
                { id: 'ml' as any, label: 'ML', visible: true, order: 2.2 }
            );
        }
    }

    // Override labels for Language context
    activeColumns = activeColumns.map(col => {
        let label = col.label;
        if (isDeliveryNote && !showPrices) {
            if (col.id === 'unitPrice' || col.id === 'vat' || col.id === 'total') return null;
        }
        
        if (col.id === 'quantity' && isKg) {
            label = lang === 'es' ? 'Peso (kg)' : (lang === 'en' ? 'Weight (kg)' : 'Poids (kg)');
        } else if (lang === 'es') {
            if (col.id === 'unitPrice') label = isModeTTC ? 'P.U. Total' : 'P.U. Base';
            if (col.id === 'total') label = isModeTTC ? 'Total con IVA' : 'Base imponible';
            if (col.id === 'vat') label = 'IVA';
            if (col.id === 'name') label = 'Descripción';
            if (col.id === 'quantity') label = 'Cant.';
        } else if (lang === 'en') {
            if (col.id === 'unitPrice') label = isModeTTC ? 'Unit Price (Incl.)' : 'Unit Price';
            if (col.id === 'total') label = isModeTTC ? 'Total (Incl.)' : 'Total';
            if (col.id === 'vat') label = 'VAT';
            if (col.id === 'name') label = 'Description';
            if (col.id === 'quantity') label = 'Qty';
        } else if (isModeTTC) {
            if (col.id === 'unitPrice' && (col.label === 'P.U. HT' || col.label === 'P.U.')) label = 'P.U. TTC';
            if (col.id === 'total' && (col.label === 'Total HT' || col.label === 'Total')) label = 'Total TTC';
        }
        return { ...col, label };
    }).filter(Boolean) as DocumentColumn[];

    let extraDateLabel = '';
    let extraDateValue = '';
    if (settings.showExpiryDate !== false) {
        if (docType === 'Bon de Commande' && (doc.expectedDate || doc.lineItems[0]?.expectedDate)) {
            const dateVal = doc.expectedDate || doc.lineItems[0]?.expectedDate;
            extraDateLabel = lang === 'es' ? 'Entrega prevista' : (lang === 'en' ? 'Expected delivery' : 'Livraison prévue');
            extraDateValue = new Date(dateVal).toLocaleDateString(lang === 'es' ? 'es-ES' : (lang === 'en' ? 'en-US' : 'fr-FR'));
        } else if (docType === 'Devis' && (doc.expiryDate || doc.lineItems[0]?.expiryDate)) {
            const dateVal = doc.expiryDate || doc.lineItems[0]?.expiryDate;
            extraDateLabel = lang === 'es' ? 'Válido hasta' : (lang === 'en' ? 'Valid until' : 'Valable jusqu\'au');
            extraDateValue = new Date(dateVal).toLocaleDateString(lang === 'es' ? 'es-ES' : (lang === 'en' ? 'en-US' : 'fr-FR'));
        } else if (docType === 'Facture' && (doc.dueDate || doc.lineItems[0]?.dueDate)) {
            const dateVal = doc.dueDate || doc.lineItems[0]?.dueDate;
            extraDateLabel = lang === 'es' ? 'Vencimiento' : (lang === 'en' ? 'Due date' : 'Échéance');
            extraDateValue = new Date(dateVal).toLocaleDateString(lang === 'es' ? 'es-ES' : (lang === 'en' ? 'en-US' : 'fr-FR'));
        }
    }

    const logoHtml = settings.logo 
        ? `<img src="${settings.logo}" style="max-height: 80px; max-width: 200px; object-fit: contain;" />` 
        : `<h1 style="font-size: 24px; font-weight: bold; color: ${primaryColor}; margin: 0;">${settings.companyName}</h1>`;

    const recipientName = recipient.name;
    const recipientCompany = recipient.company ? `<div style="font-weight: bold;">${recipient.company}</div>` : '';
    const recipientEmail = recipient.email ? `<div>${recipient.email}</div>` : '';
    const recipientPhone = recipient.phone ? `<div>${recipient.phone}</div>` : '';
    const recipientAddress = recipient.address ? `<div style="margin-bottom:4px;">${recipient.address.replace(/\n/g, '<br/>')}</div>` : '';
    const recipientIce = recipient.ice ? `<div>${taxIdLabel}: ${recipient.ice}</div>` : '';

    const companyAddress = settings.address ? settings.address.replace(/\n/g, '<br/>') : '';
    const companyContact = [settings.phone, settings.email, settings.website].filter(Boolean).join(' | ');

    const capitalDisplay = settings.capital ? `Capital: ${settings.capital}` : '';
    const legalIds = [
        settings.ice ? `${taxIdLabel}: ${settings.ice}` : '',
        settings.rc ? `RC: ${settings.rc}` : '',
        settings.fiscalId ? `IF: ${settings.fiscalId}` : '',
        settings.patente ? `TP: ${settings.patente}` : '',
        settings.cnss ? `CNSS: ${settings.cnss}` : '',
        capitalDisplay
    ].filter(Boolean).join(' &nbsp;|&nbsp; ');

    const headerRowHtml = activeColumns.map(col => {
        let align = 'left';
        let width = '';
        if (col.id === 'reference') { align = 'left'; width = 'width: 12%;'; }
        else if (col.id === 'quantity') { align = 'center'; width = 'width: 11%;'; }
        else if (col.id === 'length' as any) { align = 'center'; width = 'width: 10%;'; }
        else if (col.id === 'height' as any) { align = 'center'; width = 'width: 10%;'; }
        else if (col.id === 'm2' as any) { align = 'center'; width = 'width: 10%;'; }
        else if (col.id === 'ml' as any) { align = 'center'; width = 'width: 10%;'; }
        else if (col.id === 'vat') { align = 'center'; width = 'width: 11%;'; }
        else if (col.id === 'unitPrice') { align = 'right'; width = 'width: 18%;'; }
        else if (col.id === 'total') { align = 'right'; width = 'width: 18%;'; }
        
        return `<th style="padding: 6px 12px 16px 12px; text-align: ${align}; vertical-align: middle; line-height: 1.2; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; ${width}">${col.label}</th>`;
    }).join('');

    const rowsHtml = doc.lineItems.map((item, index) => {
        const cellsHtml = activeColumns.map(col => {
            let content = '';
            let align = 'left';
            let style = '';

            const unitPriceTTC = item.unitPrice * (1 + item.vat / 100);
            const totalTTC = (item.quantity * getLineMultiplier(item) * item.unitPrice) * (1 + item.vat / 100);

            switch (col.id) {
                case 'reference':
                    content = item.productCode || '-';
                    align = 'left';
                    style = 'font-size: 12.3px; color: #4b5563;';
                    break;
                case 'name':
                    // MICRO AJUSTEMENT (+0,3px) POUR TOUTE LA TABLE (12px -> 12.3px)
                    content = `
                        <div style="font-weight: 700; color: #111827; font-size: 12.3px; line-height: 1.2;">${item.name}</div>
                        ${item.description ? `<div style="font-size: 10.5px; color: #6b7280; margin-top: 1px; line-height: 1.1;">${item.description}</div>` : ''}
                    `;
                    break;
                case 'quantity':
                    content = item.quantity.toString();
                    align = 'center';
                    style = 'font-weight: 700; font-size: 12.3px;';
                    break;
                case 'length' as any:
                    content = (item.length || 1).toString();
                    align = 'center';
                    style = 'font-size: 12.3px;';
                    break;
                case 'height' as any:
                    content = (item.height || 1).toString();
                    align = 'center';
                    style = 'font-size: 12.3px;';
                    break;
                case 'm2' as any:
                    content = ((item.quantity * (item.length || 1) * (item.height || 1))).toLocaleString('fr-MA', { maximumFractionDigits: 2 });
                    align = 'center';
                    style = 'font-size: 12.3px; font-weight: 500;';
                    break;
                case 'ml' as any:
                    content = ((item.quantity * (item.length || 1))).toLocaleString('fr-MA', { maximumFractionDigits: 2 });
                    align = 'center';
                    style = 'font-size: 12.3px; font-weight: 500;';
                    break;
                case 'unitPrice':
                    content = (isModeTTC ? unitPriceTTC : item.unitPrice).toLocaleString('fr-MA', { minimumFractionDigits: 2 });
                    align = 'right';
                    style = 'font-size: 12.3px;';
                    break;
                case 'vat':
                    content = `${item.vat}%`;
                    align = 'center';
                    style = 'font-size: 12.3px;';
                    break;
                case 'total':
                    content = (isModeTTC ? totalTTC : (item.quantity * getLineMultiplier(item) * item.unitPrice)).toLocaleString('fr-MA', { minimumFractionDigits: 2 });
                    align = 'right';
                    style = 'font-weight: 700; font-size: 12.3px;';
                    break;
            }

            return `<td style="padding: 8px 12px 16px 12px; border-bottom: 1px solid #e5e7eb; text-align: ${align}; vertical-align: middle; ${style}">${content}</td>`;
        }).join('');

        return `<tr class="item-row" style="background-color: ${index % 2 === 0 ? '#fff' : '#f9fafb'};">${cellsHtml}</tr>`;
    }).join('');

    let paymentInfoHtml = '';
    if ((docType === 'Facture' || docType === 'Bon de Livraison') && showPrices) {
        const paid = doc.amountPaid || doc.paymentAmount || 0;
        const remaining = totalAmount - paid;
        if (paid > 0) {
            paymentInfoHtml = `
                <div style="margin-top: 10px; font-size: 12px; color: #059669;">
                    ${lang === 'es' ? 'Ya pagado' : (lang === 'en' ? 'Already paid' : 'Déjà réglé')} : <b>${paid.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}</b>
                    ${remaining > 0 ? `<br/><span style="color: #d97706;">${lang === 'es' ? 'Importe pendiente' : (lang === 'en' ? 'Balance due' : 'Reste à payer')} : <b>${remaining.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}</b></span>` : `<br/><span style="color: #059669; font-weight: bold;">${lang === 'es' ? 'Liquidado' : (lang === 'en' ? 'Settled' : 'Soldé')}</span>`}
                </div>
            `;
        }
    }

    const isInfoOnLeft = settings.documentInfoPosition === 'left';

    const docInfoHtml = `
        <div style="font-size: 26px; font-weight: bold; text-transform: uppercase; color: ${primaryColor}; margin-bottom: 10px;">${titleDisplay}</div>
        <div style="font-size: 16px; font-weight: 600; color: #111827;">N° ${displayId}</div>
        <div style="margin-top: 10px; font-size: 12px;">
            <div>${dict.date || 'Date'} : <b>${dateStr}</b></div>
            ${extraDateLabel ? `<div>${extraDateLabel} : <b>${extraDateValue}</b></div>` : ''}
            ${doc.reference ? `<div>${dict.reference || 'Réf'} : <b>${doc.reference}</b></div>` : ''}
            ${doc.invoiceId ? `<div>${lang === 'es' ? 'Ref. Factura' : (lang === 'en' ? 'Invoice Ref' : 'Réf. Facture')} : <b>${doc.invoiceId}</b></div>` : ''}
        </div>
    `;

    const topHeaderHtml = isInfoOnLeft ? `
        <div style="margin-bottom: 20px;">
            <div style="width: 100%; margin-bottom: 20px;">
                ${logoHtml}
                <div style="margin-top: 15px; font-size: 12px; line-height: 1.5;">
                    <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${settings.companyName}</div>
                    ${companyAddress}<br/>
                    <div style="margin-top: 5px; color: #6b7280;">${companyContact}</div>
                </div>
            </div>
            <div style="text-align: left; margin-top: 20px;">
                ${docInfoHtml}
            </div>
        </div>
    ` : `
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div style="width: 50%;">
                ${logoHtml}
                <div style="margin-top: 15px; font-size: 12px; line-height: 1.5;">
                    <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${settings.companyName}</div>
                    ${companyAddress}<br/>
                    <div style="margin-top: 5px; color: #6b7280;">${companyContact}</div>
                </div>
            </div>
            <div style="width: 45%; text-align: right;">
                ${docInfoHtml}
            </div>
        </div>
    `;

    const clientInfoHtml = `
        <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
            <div style="width: 45%; background-color: #f9fafb; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
                <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: #9ca3af; margin-bottom: 8px;">${dict.pdfAddressedTo || 'Adressé à'}</div>
                <div style="font-size: 14px; color: #111827;">
                    ${recipientCompany}
                    <div>${recipientName}</div>
                </div>
                <div style="margin-top: 8px; font-size: 12px; color: #4b5563;">
                    ${recipientAddress}
                    ${recipientIce}
                    ${recipientEmail}
                    ${recipientPhone}
                </div>
            </div>
        </div>
    `;

    const itemsTableHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr style="background-color: ${primaryColor}; color: white; -webkit-print-color-adjust: exact;">
                    ${headerRowHtml}
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>
    `;

    // Financials Block
    const financialsHtml = `
        <div class="totals-section" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
            <div style="width: 55%; padding-top: 10px;">
                ${showAmountInWords ? `
                    <div style="background-color: #f3f4f6; padding: 6px 10px 14px 10px; border-radius: 4px; border-left: 3px solid ${primaryColor};">
                        <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold; margin-bottom: 4px; line-height: 1.2;">${txtAmountInWords}</div>
                        <div style="font-size: 13px; color: #111827; font-weight: 600; font-style: italic; line-height: 1.2;">
                            ${amountInLetters}
                        </div>
                    </div>
                ` : ''}
                ${settings.defaultPaymentTerms ? `
                    <div style="margin-top: 10px; font-size: 11px; color: #4b5563;">
                        ${settings.defaultPaymentTerms}
                    </div>
                ` : ''}
                ${doc.notes ? `
                    <div style="margin-top: 15px; font-size: 11px; color: #6b7280;">
                        <span style="font-weight: 600;">${dict.notes || 'Notes'}:</span> ${doc.notes}
                    </div>
                ` : ''}
            </div>
            <div style="width: 40%;">
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb;">
                    <span>${txtTotalHt}</span>
                    <span style="font-weight: 600;">${subTotal.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}</span>
                </div>
                ${discountAmount > 0 ? `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb;">
                    <span>${dict.globalDiscount || 'Remise exceptionnelle'} ${doc.discountType === 'percentage' ? `(-${doc.discountValue}%)` : ''}</span>
                    <span style="font-weight: 600; color: #dc2626;">- ${discountAmount.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}</span>
                </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb;">
                    <span>${txtTotalTax}</span>
                    <span>${vatAmount.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 12px 0 4px 0; font-size: 16px; color: #000000; font-weight: bold; margin-top: 4px;">
                    <span>${txtTotalNet}</span>
                    <span>${totalAmount.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}</span>
                </div>
                ${paymentInfoHtml}
            </div>
        </div>
    `;

    const notesOnlyHtml = doc.notes ? `
        <div style="margin-bottom: 20px; font-size: 11px; color: #6b7280;">
            <span style="font-weight: 600;">${dict.notes || 'Notes'}:</span> ${doc.notes}
        </div>
    ` : '';

    const signaturesHtml = `
        <div class="totals-section" style="display: flex; justify-content: flex-end; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
            <div style="width: 45%; text-align: center;">
                <div style="font-weight: bold; margin-bottom: 5px; text-decoration: underline;">${txtSigRecipient}</div>
                ${settings.showSignatureRecipient && settings.stamp ? `<img src="${settings.stamp}" style="max-height: 110px; max-width: 220px; object-fit: contain; margin-top: 2px;" />` : settings.showSignatureRecipient ? '<div style="height: 80px;"></div>' : ''}
            </div>
        </div>
    `;

    let totalsHtml = '';
    if (isDeliveryNote && !showPrices) {
        totalsHtml = notesOnlyHtml + (settings?.showSignatureRecipient ? signaturesHtml : '');
    } else if (docType === 'Facture' || docType === 'Devis' || docType === 'Avoir' || isDeliveryNote) {
        totalsHtml = financialsHtml + (settings?.showSignatureRecipient ? signaturesHtml : '');
    } else {
        totalsHtml = financialsHtml;
    }

    const footerHtml = `
        <div style="text-align: center; padding-top: 5px; margin-top: auto;">
            ${settings.footerNotes ? `<div style="font-size: 11px; color: #000000; margin-bottom: 8px; white-space: pre-wrap; font-style: normal;">${settings.footerNotes}</div>` : ''}
            <div style="font-size: 10px; color: #000000; font-weight: normal; letter-spacing: 0.02em;">
                ${legalIds}
            </div>
        </div>
    `;

    // --- Pagination Logic ---
    const items = [...doc.lineItems];
    const pages: string[] = [];
    
    // Helper to calculate item "weight" (height)
    const getItemWeight = (item: any) => {
        let weight = 1;
        if (item.description) {
            // Estimate lines in description
            const descLines = Math.ceil(item.description.length / 60);
            weight += Math.min(descLines, 3) * 0.5;
        }
        return weight;
    };

    let currentItemIndex = 0;
    let pageNum = 1;

    while (currentItemIndex < items.length) {
        const isFirstPage = pageNum === 1;
        // First page has less space due to client info and subject
        const maxWeight = isFirstPage ? 10 : 18;
        
        let currentWeight = 0;
        const pageItems: any[] = [];
        
        while (currentItemIndex < items.length) {
            const item = items[currentItemIndex];
            const weight = getItemWeight(item);
            
            if (currentWeight + weight > maxWeight && pageItems.length > 0) {
                break;
            }
            
            pageItems.push(item);
            currentWeight += weight;
            currentItemIndex++;
        }

        const isLastPage = currentItemIndex >= items.length;

        const pageRowsHtml = pageItems.map((item, idx) => {
            const cellsHtml = activeColumns.map(col => {
                let content = '';
                let align = 'left';
                let style = '';

                const unitPriceTTC = item.unitPrice * (1 + item.vat / 100);
                const totalTTC = (item.quantity * getLineMultiplier(item) * item.unitPrice) * (1 + item.vat / 100);

                switch (col.id) {
                    case 'reference': content = item.productCode || '-'; align = 'left'; style = 'font-size: 12.3px; color: #4b5563;'; break;
                    case 'name':
                        content = `
                            <div style="font-weight: 700; color: #111827; font-size: 12.3px; line-height: 1.2;">${item.name}</div>
                            ${item.description ? `<div style="font-size: 10.5px; color: #6b7280; margin-top: 1px; line-height: 1.1;">${item.description}</div>` : ''}
                        `;
                        break;
                    case 'quantity': content = item.quantity.toString(); align = 'center'; style = 'font-weight: 700; font-size: 12.3px;'; break;
                    case 'length' as any: content = (item.length || 1).toString(); align = 'center'; style = 'font-size: 12.3px;'; break;
                    case 'height' as any: content = (item.height || 1).toString(); align = 'center'; style = 'font-size: 12.3px;'; break;
                    case 'm2' as any: content = ((item.quantity * (item.length || 1) * (item.height || 1))).toLocaleString('fr-MA', { maximumFractionDigits: 2 }); align = 'center'; style = 'font-size: 12.3px; font-weight: 500;'; break;
                    case 'ml' as any: content = ((item.quantity * (item.length || 1))).toLocaleString('fr-MA', { maximumFractionDigits: 2 }); align = 'center'; style = 'font-size: 12.3px; font-weight: 500;'; break;
                    case 'unitPrice': content = (isModeTTC ? unitPriceTTC : item.unitPrice).toLocaleString('fr-MA', { minimumFractionDigits: 2 }); align = 'right'; style = 'font-size: 12.3px;'; break;
                    case 'vat': content = `${item.vat}%`; align = 'center'; style = 'font-size: 12.3px;'; break;
                    case 'total': content = (isModeTTC ? totalTTC : (item.quantity * getLineMultiplier(item) * item.unitPrice)).toLocaleString('fr-MA', { minimumFractionDigits: 2 }); align = 'right'; style = 'font-weight: 700; font-size: 12.3px;'; break;
                }

                return `<td style="padding: 8px 12px 16px 12px; border-bottom: 1px solid #e5e7eb; text-align: ${align}; vertical-align: middle; ${style}">${content}</td>`;
            }).join('');

            return `<tr class="item-row" style="background-color: ${idx % 2 === 0 ? '#fff' : '#f9fafb'};">${cellsHtml}</tr>`;
        }).join('');

        const pageHtml = `
            <div class="pdf-page" style="width: 210mm; height: 296mm; background: white; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #374151; display: flex; flex-direction: column; box-sizing: border-box; padding: 15mm 15mm 8mm 15mm; position: relative; overflow: hidden; page-break-after: always;">
                <style>
                    * { box-sizing: border-box; }
                    .content-grow { flex: 1; z-index: 2; position: relative; }
                </style>
                
                ${settings.logo ? `
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 85%; z-index: 0; opacity: 0.08; pointer-events: none;">
                        <img src="${settings.logo}" style="width: 100%; height: auto; object-fit: contain; filter: grayscale(100%);" />
                    </div>
                ` : ''}

                <div style="position: relative; z-index: 2;">
                    ${topHeaderHtml}
                    ${clientInfoHtml}
                    <div style="display: flex; gap: 40px; margin-bottom: 15px;">
                        ${doc.subject ? `<div style="font-weight: 600;">${dict.pdfSubject || 'Objet'} : <span style="font-weight: normal;">${doc.subject}</span></div>` : ''}
                        ${doc.paymentMethod ? `<div style="font-weight: 600;">${dict.paymentMethod || 'Mode de paiement'} : <span style="font-weight: normal;">${doc.paymentMethod}</span></div>` : ''}
                    </div>
                </div>

                <div class="content-grow">
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <thead>
                            <tr style="background-color: ${primaryColor}; color: white; -webkit-print-color-adjust: exact;">
                                ${headerRowHtml}
                            </tr>
                        </thead>
                        <tbody>
                            ${pageRowsHtml}
                        </tbody>
                    </table>
                    ${isLastPage ? totalsHtml : ''}
                </div>

                <div style="margin-top: auto; padding-top: 5px; border-top: 1px solid #000000; position: relative; z-index: 2;">
                    ${footerHtml}
                </div>
            </div>
        `;
        
        pages.push(pageHtml);
        pageNum++;
    }

    return `<div id="pdf-container">${pages.join('')}</div>`;
};

export const generatePDF = async (
    docType: DocumentType,
    doc: DocumentData,
    settings: CompanySettings | null,
    recipient: Client | Supplier | undefined,
    options?: PDFOptions
): Promise<void> => {
    const template = generateDocumentHTML(docType, doc, settings, recipient, options);
    const displayId = doc.documentId || doc.id;

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px'; 
    container.style.top = '0';
    container.innerHTML = template;
    
    document.body.appendChild(container);

    try {
        const contentElement = container.firstElementChild;
        
        const opt: any = {
            margin: 0,
            filename: `${docType.toLowerCase()}_${displayId}.pdf`,
            image: { type: 'jpeg', quality: 1 },
            pagebreak: { mode: ['css', 'legacy'] },
            html2canvas: { 
                scale: 2, 
                useCORS: true, 
                logging: false,
                letterRendering: true,
                onclone: (clonedDoc: Document) => {
                    // Remove all oklch color references from styles to prevent html2canvas crash
                    const styleTags = clonedDoc.getElementsByTagName('style');
                    for (let i = 0; i < styleTags.length; i++) {
                        styleTags[i].innerHTML = styleTags[i].innerHTML.replace(/oklch\([^)]+\)/g, '#000000');
                    }
                    // Also check for link tags that might contain oklch
                    const linkTags = clonedDoc.getElementsByTagName('link');
                    for (let i = linkTags.length - 1; i >= 0; i--) {
                        if (linkTags[i].rel === 'stylesheet') {
                            linkTags[i].parentNode?.removeChild(linkTags[i]);
                        }
                    }
                }
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        await (html2pdf() as any).set(opt).from(contentElement).toPdf().get('pdf').then((pdf: any) => {
            const totalPages = pdf.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);
                pdf.setFontSize(9);
                pdf.setTextColor(100);
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                pdf.text(`Page ${i} / ${totalPages}`, pageWidth - 15, pageHeight - 10, { align: 'right' });
            }
        }).save();
    } finally {
        document.body.removeChild(container);
    }
};

export const printDocument = (
    docType: DocumentType,
    doc: DocumentData,
    settings: CompanySettings | null,
    recipient: Client | Supplier | undefined,
    options?: PDFOptions
): void => {
    const lang = localStorage.getItem('app_language') || 'fr';
    const dict = (translations as any)[lang] || translations['fr'];
    const htmlContent = generateDocumentHTML(docType, doc, settings, recipient, options);
    const displayId = doc.documentId || doc.id;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(`
            <html>
                <head>
                    <title>${docType} #${displayId}</title>
                    <style>
                        body { margin: 0; padding: 0; }
                        @media print {
                            @page { margin: 0; size: A4; }
                            body { -webkit-print-color-adjust: exact; }
                            tr.item-row { page-break-inside: avoid; }
                            .totals-section { page-break-inside: avoid; }
                        }
                    </style>
                </head>
                <body>
                    ${htmlContent}
                </body>
            </html>
        `);
        printWindow.document.close();
        
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    } else {
        alert("Veuillez autoriser les pop-ups pour utiliser la fonction d'impression directe.");
    }
};

// --- English Number to Words ---
const numberToWordsEn = (amount: number): string => {
    const units = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const scales = ['', 'thousand', 'million', 'billion'];

    const convertGroup = (n: number): string => {
        if (n === 0) return '';
        let res = '';
        if (n >= 100) {
            res += units[Math.floor(n / 100)] + ' hundred ';
            n %= 100;
        }
        if (n >= 20) {
            res += tens[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + units[n % 10] : '');
        } else if (n >= 10) {
            res += teens[n - 10];
        } else if (n > 0) {
            res += units[n];
        }
        return res.trim();
    };

    if (amount === 0) return 'Zero dirhams';
    const integerPart = Math.floor(Math.abs(amount));
    const decimalPart = Math.round((Math.abs(amount) - integerPart) * 100);

    let words = '';
    let num = integerPart;
    let scaleIdx = 0;

    while (num > 0) {
        const group = num % 1000;
        if (group > 0) {
            words = convertGroup(group) + (scales[scaleIdx] ? ' ' + scales[scaleIdx] : '') + (words ? ' ' + words : '');
        }
        num = Math.floor(num / 1000);
        scaleIdx++;
    }

    let result = words.trim() + (integerPart === 1 ? ' dirham' : ' dirhams');
    if (decimalPart > 0) {
        result += ' and ' + convertGroup(decimalPart) + ' centimes';
    }

    return result.charAt(0).toUpperCase() + result.slice(1);
};

// --- Spanish Number to Words ---
const numberToWordsEs = (amount: number): string => {
    const units = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const tens = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const special = {
        11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince',
        21: 'veintiuno', 22: 'veintidós', 23: 'veintitrés', 24: 'veinticuatro', 25: 'veinticinco'
    };

    const convertGroup = (n: number): string => {
        if (n === 0) return '';
        if (n === 100) return 'cien';
        let res = '';
        if (n >= 100) {
            const h = Math.floor(n / 100);
            if (h === 1) res += 'ciento ';
            else if (h === 5) res += 'quinientos ';
            else if (h === 7) res += 'setecientos ';
            else if (h === 9) res += 'novecientos ';
            else res += units[h] + 'cientos ';
            n %= 100;
        }
        if (n > 0) {
            if ((special as any)[n]) res += (special as any)[n];
            else if (n >= 10 && n < 20) res += 'dieci' + units[n - 10];
            else if (n >= 20 && n < 30) res += 'veinti' + units[n - 20];
            else if (n >= 30) {
                res += tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' y ' + units[n % 10] : '');
            } else {
                res += units[n];
            }
        }
        return res.trim();
    };

    if (amount === 0) return 'Cero dirhams';
    const integerPart = Math.floor(Math.abs(amount));
    const decimalPart = Math.round((Math.abs(amount) - integerPart) * 100);

    let words = '';
    if (integerPart === 0) words = 'cero';
    else if (integerPart === 1) words = 'un';
    else if (integerPart < 1000) words = convertGroup(integerPart);
    else {
        const thousands = Math.floor(integerPart / 1000);
        const remainder = integerPart % 1000;
        words = (thousands === 1 ? 'mil' : convertGroup(thousands) + ' mil') + ' ' + convertGroup(remainder);
    }

    let result = words.trim() + (integerPart === 1 ? ' dirham' : ' dirhams');
    if (decimalPart > 0) {
        result += ' con ' + convertGroup(decimalPart) + ' céntimos';
    }

    return result.charAt(0).toUpperCase() + result.slice(1);
};
