
import { CompanySettings, Invoice, Quote, DeliveryNote, PurchaseOrder, Client, Supplier, LineItem, DocumentColumn, CreditNote } from '../types';

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
    reference?: string;
    dueDate?: string; 
    expiryDate?: string; 
    expectedDate?: string; 
    invoiceId?: string; // For Credit Notes
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

    let result = convertInteger(integerPart) + ' dirhams';
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

    const showPrices = options?.showPrices !== false;

    // Extract custom labels with defaults
    const labels = settings.documentLabels || {};
    const txtTotalHt = labels.totalHt || 'Total HT';
    const txtTotalTax = labels.totalTax || 'Total TVA';
    const txtTotalNet = labels.totalNet || (docType === 'Avoir' ? 'Total Avoir' : 'Net à Payer');
    const txtAmountInWords = labels.amountInWordsPrefix || 'Arrêté le présent document à la somme de :';
    const txtSigSender = labels.signatureSender || 'Signature Expéditeur';
    const txtSigRecipient = labels.signatureRecipient || 'Signature & Cachet Client';

    const primaryColor = settings.primaryColor || '#10b981';
    const totalAmount = doc.amount !== undefined ? doc.amount : (doc.totalAmount || 0);
    const subTotal = doc.subTotal || 0;
    const vatAmount = doc.vatAmount || 0;
    const dateStr = new Date(doc.date).toLocaleDateString('fr-FR');
    const amountInLetters = numberToWordsFr(totalAmount);
    
    const displayId = doc.documentId || doc.id;
    const isDeliveryNote = docType === 'Bon de Livraison';

    // Ensure document type title is uppercase and correct
    let titleDisplay = docType.toUpperCase();
    if (docType === 'Avoir') titleDisplay = "FACTURE D’AVOIR";

    let activeColumns = (settings.documentColumns && settings.documentColumns.length > 0) 
        ? settings.documentColumns.filter(c => c.visible).sort((a, b) => a.order - b.order)
        : DEFAULT_COLUMNS.filter(c => c.visible);

    if (isDeliveryNote && !showPrices) {
        activeColumns = activeColumns.filter(c => c.id === 'name' || c.id === 'quantity' || c.id === 'reference');
    }

    let extraDateLabel = '';
    let extraDateValue = '';
    if (docType === 'Bon de Commande' && doc.expectedDate) {
        extraDateLabel = 'Livraison prévue';
        extraDateValue = new Date(doc.expectedDate).toLocaleDateString('fr-FR');
    }

    const logoHtml = settings.logo 
        ? `<img src="${settings.logo}" style="max-height: 80px; max-width: 200px; object-fit: contain;" />` 
        : `<h1 style="font-size: 24px; font-weight: bold; color: ${primaryColor}; margin: 0;">${settings.companyName}</h1>`;

    const recipientName = recipient.name;
    const recipientCompany = recipient.company ? `<div style="font-weight: bold;">${recipient.company}</div>` : '';
    const recipientEmail = recipient.email ? `<div>${recipient.email}</div>` : '';
    const recipientPhone = recipient.phone ? `<div>${recipient.phone}</div>` : '';
    const recipientAddress = recipient.address ? `<div style="margin-bottom:4px;">${recipient.address.replace(/\n/g, '<br/>')}</div>` : '';
    const recipientIce = recipient.ice ? `<div>ICE: ${recipient.ice}</div>` : '';

    const companyAddress = settings.address ? settings.address.replace(/\n/g, '<br/>') : '';
    const companyContact = [settings.phone, settings.email, settings.website].filter(Boolean).join(' | ');

    const capitalDisplay = settings.capital ? `Capital: ${settings.capital}` : '';
    const legalIds = [
        settings.ice ? `ICE: ${settings.ice}` : '',
        settings.rc ? `RC: ${settings.rc}` : '',
        settings.fiscalId ? `IF: ${settings.fiscalId}` : '',
        settings.patente ? `TP: ${settings.patente}` : '',
        settings.cnss ? `CNSS: ${settings.cnss}` : '',
        capitalDisplay
    ].filter(Boolean).join(' &nbsp;|&nbsp; ');

    const headerRowHtml = activeColumns.map(col => {
        let align = 'left';
        let width = '';
        // Adjusted widths and padding for better spacing
        if (col.id === 'reference') { align = 'left'; width = 'width: 12%;'; }
        else if (col.id === 'quantity') { align = 'center'; width = 'width: 11%;'; }
        else if (col.id === 'vat') { align = 'center'; width = 'width: 11%;'; }
        else if (col.id === 'unitPrice') { align = 'right'; width = 'width: 18%;'; }
        else if (col.id === 'total') { align = 'right'; width = 'width: 18%;'; }
        
        return `<th style="padding: 10px 12px; text-align: ${align}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; ${width}">${col.label}</th>`;
    }).join('');

    const rowsHtml = doc.lineItems.map((item, index) => {
        const cellsHtml = activeColumns.map(col => {
            let content = '';
            let align = 'left';
            let style = '';

            switch (col.id) {
                case 'reference':
                    content = item.productCode || '-';
                    align = 'left';
                    style = 'font-size: 11px; color: #4b5563;';
                    break;
                case 'name':
                    content = `
                        <div style="font-weight: 600; color: #111827;">${item.name}</div>
                        ${item.description ? `<div style="font-size: 10px; color: #6b7280;">${item.description}</div>` : ''}
                    `;
                    break;
                case 'quantity':
                    content = item.quantity.toString();
                    align = 'center';
                    style = 'font-weight: 600; font-size: 12px;';
                    break;
                case 'unitPrice':
                    content = item.unitPrice.toLocaleString('fr-MA', { minimumFractionDigits: 2 });
                    align = 'right';
                    break;
                case 'vat':
                    content = `${item.vat}%`;
                    align = 'center';
                    break;
                case 'total':
                    content = (item.quantity * item.unitPrice).toLocaleString('fr-MA', { minimumFractionDigits: 2 });
                    align = 'right';
                    style = 'font-weight: 600;';
                    break;
            }

            return `<td style="padding: 12px 12px; border-bottom: 1px solid #e5e7eb; text-align: ${align}; ${style}">${content}</td>`;
        }).join('');

        return `<tr class="item-row" style="background-color: ${index % 2 === 0 ? '#fff' : '#f9fafb'};">${cellsHtml}</tr>`;
    }).join('');

    let paymentInfoHtml = '';
    // Show payment info for Invoice AND Delivery Note if payment recorded AND prices shown
    if ((docType === 'Facture' || docType === 'Bon de Livraison') && showPrices) {
        const paid = doc.amountPaid || doc.paymentAmount || 0;
        const remaining = totalAmount - paid;
        if (paid > 0) {
            paymentInfoHtml = `
                <div style="margin-top: 10px; font-size: 12px; color: #059669;">
                    Déjà réglé : <b>${paid.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}</b>
                    ${remaining > 0 ? `<br/><span style="color: #d97706;">Reste à payer : <b>${remaining.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}</b></span>` : '<br/><span style="color: #059669; font-weight: bold;">Soldé</span>'}
                </div>
            `;
        }
    }

    const topHeaderHtml = `
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
                <div style="font-size: 26px; font-weight: bold; text-transform: uppercase; color: ${primaryColor}; margin-bottom: 10px;">${titleDisplay}</div>
                <div style="font-size: 16px; font-weight: 600; color: #111827;">N° ${displayId}</div>
                <div style="margin-top: 10px; font-size: 12px;">
                    <div>Date : <b>${dateStr}</b></div>
                    ${extraDateLabel ? `<div>${extraDateLabel} : <b>${extraDateValue}</b></div>` : ''}
                    ${doc.reference ? `<div>Réf : <b>${doc.reference}</b></div>` : ''}
                    ${doc.invoiceId ? `<div>Réf. Facture : <b>${doc.invoiceId}</b></div>` : ''}
                </div>
            </div>
        </div>
    `;

    const clientInfoHtml = `
        <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
            <div style="width: 45%; background-color: #f9fafb; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
                <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: #9ca3af; margin-bottom: 8px;">Adressé à</div>
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

    const subjectHtml = doc.subject ? `<div style="margin-bottom: 15px; font-weight: 600;">Objet : <span style="font-weight: normal;">${doc.subject}</span></div>` : '';

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
                <div style="background-color: #f3f4f6; padding: 10px; border-radius: 4px; border-left: 3px solid ${primaryColor};">
                    <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold; margin-bottom: 4px;">${txtAmountInWords}</div>
                    <div style="font-size: 13px; color: #111827; font-weight: 600; font-style: italic;">
                        ${amountInLetters}
                    </div>
                </div>
                ${doc.notes ? `
                    <div style="margin-top: 15px; font-size: 11px; color: #6b7280;">
                        <span style="font-weight: 600;">Notes:</span> ${doc.notes}
                    </div>
                ` : ''}
            </div>
            <div style="width: 40%;">
                <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e5e7eb;">
                    <span>${txtTotalHt}</span>
                    <span style="font-weight: 600;">${subTotal.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e5e7eb;">
                    <span>${txtTotalTax}</span>
                    <span>${vatAmount.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 16px; color: #000000; font-weight: bold; margin-top: 5px;">
                    <span>${txtTotalNet}</span>
                    <span>${totalAmount.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}</span>
                </div>
                ${paymentInfoHtml}
            </div>
        </div>
    `;

    // Notes only block (for when prices are hidden)
    const notesOnlyHtml = doc.notes ? `
        <div style="margin-bottom: 20px; font-size: 11px; color: #6b7280;">
            <span style="font-weight: 600;">Notes:</span> ${doc.notes}
        </div>
    ` : '';

    // Signatures Block
    const signaturesHtml = `
        <div class="totals-section" style="display: flex; justify-content: space-between; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            <div style="width: 45%;">
                <div style="font-weight: bold; margin-bottom: 40px;">${txtSigSender}</div>
            </div>
            <div style="width: 45%; text-align: right;">
                <div style="font-weight: bold; margin-bottom: 40px;">${txtSigRecipient}</div>
            </div>
        </div>
    `;

    // Construct final HTML based on type and options
    let totalsHtml = '';
    
    if (isDeliveryNote) {
        if (!showPrices) {
            totalsHtml = notesOnlyHtml + signaturesHtml;
        } else {
            totalsHtml = financialsHtml + signaturesHtml;
        }
    } else {
        totalsHtml = financialsHtml;
    }

    const footerHtml = `
        <div style="text-align: center;">
            ${settings.footerNotes ? `<div style="font-size: 12px; color: #000000; margin-bottom: 5px; white-space: pre-wrap;">${settings.footerNotes}</div>` : ''}
            <div style="font-size: 10px; color: #000000; font-weight: normal;">
                ${legalIds}
            </div>
        </div>
    `;

    return `
    <div style="width: 210mm; min-height: 296mm; background: white; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #374151; display: flex; flex-direction: column; box-sizing: border-box; padding: 15mm 15mm 8mm 15mm; position: relative; overflow: hidden;">
        <style>
            @media print {
                @page { margin: 0; size: A4; }
                body { margin: 0; }
            }
            * { box-sizing: border-box; }
            .content-grow { flex: 1; z-index: 2; position: relative; }
            tr.item-row { page-break-inside: avoid; break-inside: avoid; }
            .totals-section { page-break-inside: avoid; break-inside: avoid; }
        </style>
        
        <!-- WATERMARK -->
        ${settings.logo ? `
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 85%; z-index: 0; opacity: 0.08; pointer-events: none;">
                <img src="${settings.logo}" style="width: 100%; height: auto; object-fit: contain; filter: grayscale(100%);" />
            </div>
        ` : ''}

        <!-- HEADER -->
        <div style="position: relative; z-index: 2;">
            ${topHeaderHtml}
            ${clientInfoHtml}
            ${subjectHtml}
        </div>

        <!-- CONTENT (Grows to push footer) -->
        <div class="content-grow">
            ${itemsTableHtml}
            ${totalsHtml}
        </div>

        <!-- FOOTER (Pushed to bottom) -->
        <div style="margin-top: auto; padding-top: 10px; border-top: 1px solid #000000; position: relative; z-index: 2;">
            ${footerHtml}
        </div>
    </div>
    `;
};

// Generates PDF and triggers Download
export const generatePDF = async (
    docType: DocumentType,
    doc: DocumentData,
    settings: CompanySettings | null,
    recipient: Client | Supplier | undefined,
    options?: PDFOptions
): Promise<void> => {
    if (typeof (window as any).html2pdf === 'undefined') {
        throw new Error("Le module de génération PDF n'est pas encore chargé. Veuillez vérifier votre connexion internet et rafraîchir la page.");
    }

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
        
        const opt = {
            margin: 0, // Zero margin here, handling padding inside CSS to control height better
            filename: `${docType.toLowerCase()}_${displayId}.pdf`,
            image: { type: 'jpeg', quality: 1 },
            // CSS mode respects flexbox better for footer positioning
            pagebreak: { mode: ['css', 'legacy'] },
            html2canvas: { 
                scale: 2, 
                useCORS: true, 
                logging: false,
                letterRendering: true
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        await (window as any).html2pdf().set(opt).from(contentElement).toPdf().get('pdf').then((pdf: any) => {
            const totalPages = pdf.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);
                pdf.setFontSize(9);
                pdf.setTextColor(100);
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                // Right aligned page numbering
                pdf.text(`Page ${i} / ${totalPages}`, pageWidth - 15, pageHeight - 10, { align: 'right' });
            }
        }).save();
    } finally {
        document.body.removeChild(container);
    }
};

// Opens Print Dialog Directly
export const printDocument = (
    docType: DocumentType,
    doc: DocumentData,
    settings: CompanySettings | null,
    recipient: Client | Supplier | undefined,
    options?: PDFOptions
): void => {
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
