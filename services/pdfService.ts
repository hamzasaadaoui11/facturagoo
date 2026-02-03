
import { CompanySettings, Invoice, Quote, DeliveryNote, PurchaseOrder, Client, Supplier, LineItem, DocumentColumn } from '../types';

interface DocumentData {
    id: string;
    date: string;
    lineItems: LineItem[];
    subTotal?: number;
    vatAmount?: number;
    totalAmount?: number; // For PO/DN
    amount?: number; // For Invoice/Quote
    amountPaid?: number; // For Invoice
    paymentAmount?: number; // For DN
    notes?: string;
    subject?: string;
    reference?: string;
    dueDate?: string; // Invoice
    expiryDate?: string; // Quote
    expectedDate?: string; // PO
}

type DocumentType = 'Facture' | 'Devis' | 'Bon de Livraison' | 'Bon de Commande';

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
            else str += `${UNITS[hundreds]} cents `; // Simplification: accord pluriel toujours mis ici
        }

        if (remainder > 0) {
            str += convertGroup(remainder);
        }
        
        // Fix grammar for "cents" at end vs middle (e.g. 200 vs 201) - Simplified here
        return str.trim();
    };

    let result = convertInteger(integerPart) + ' dirhams';
    if (decimalPart > 0) {
        result += ` et ${convertInteger(decimalPart)} centimes`;
    }

    // Capitalize first letter
    return result.charAt(0).toUpperCase() + result.slice(1);
};

const DEFAULT_COLUMNS: DocumentColumn[] = [
    { id: 'name', label: 'Désignation', visible: true, order: 1 },
    { id: 'quantity', label: 'Qté', visible: true, order: 2 },
    { id: 'unitPrice', label: 'P.U. HT', visible: true, order: 3 },
    { id: 'vat', label: 'TVA', visible: true, order: 4 },
    { id: 'total', label: 'Total HT', visible: true, order: 5 },
];

export const generatePDF = async (
    docType: DocumentType,
    doc: DocumentData,
    settings: CompanySettings | null,
    recipient: Client | Supplier | undefined
): Promise<void> => {
    
    // 1. Validation Stricte
    if (!settings || !settings.companyName) {
        throw new Error("Impossible de générer le document : Les informations de l'entreprise (Nom) sont manquantes dans les paramètres.");
    }

    if (!recipient) {
        throw new Error("Impossible de générer le document : Les informations du client/fournisseur sont introuvables.");
    }

    // Check library
    if (typeof (window as any).html2pdf === 'undefined') {
        throw new Error("Le module de génération PDF n'est pas encore chargé. Veuillez vérifier votre connexion internet et rafraîchir la page.");
    }

    // 2. Préparation des données
    const primaryColor = settings.primaryColor || '#10b981';
    const totalAmount = doc.amount !== undefined ? doc.amount : (doc.totalAmount || 0);
    const subTotal = doc.subTotal || 0;
    const vatAmount = doc.vatAmount || 0;
    const dateStr = new Date(doc.date).toLocaleDateString('fr-FR');
    const amountInLetters = numberToWordsFr(totalAmount);
    
    const isDeliveryNote = docType === 'Bon de Livraison';

    // Config des colonnes
    let activeColumns = (settings.documentColumns && settings.documentColumns.length > 0) 
        ? settings.documentColumns.filter(c => c.visible).sort((a, b) => a.order - b.order)
        : DEFAULT_COLUMNS;

    // LOGIQUE SPÉCIALE BON DE LIVRAISON : On force le masquage des colonnes de prix
    if (isDeliveryNote) {
        activeColumns = activeColumns.filter(col => 
            col.id === 'name' || col.id === 'quantity'
        );
    }

    // Calcul date échéance / validité
    let extraDateLabel = '';
    let extraDateValue = '';
    if (docType === 'Facture' && doc.dueDate) {
        extraDateLabel = 'Échéance';
        extraDateValue = new Date(doc.dueDate).toLocaleDateString('fr-FR');
    } else if (docType === 'Devis' && doc.expiryDate) {
        extraDateLabel = 'Validité';
        extraDateValue = doc.expiryDate !== 'Non spécifiée' ? new Date(doc.expiryDate).toLocaleDateString('fr-FR') : 'Illimitée';
    } else if (docType === 'Bon de Commande' && doc.expectedDate) {
        extraDateLabel = 'Livraison prévue';
        extraDateValue = new Date(doc.expectedDate).toLocaleDateString('fr-FR');
    }

    // Logo HTML
    const logoHtml = settings.logo 
        ? `<img src="${settings.logo}" style="max-height: 80px; max-width: 200px; object-fit: contain;" />` 
        : `<h1 style="font-size: 24px; font-weight: bold; color: ${primaryColor}; margin: 0;">${settings.companyName}</h1>`;

    // Recipient Address HTML
    const recipientName = recipient.name;
    const recipientCompany = recipient.company ? `<div style="font-weight: bold;">${recipient.company}</div>` : '';
    const recipientEmail = recipient.email ? `<div>${recipient.email}</div>` : '';
    const recipientPhone = recipient.phone ? `<div>${recipient.phone}</div>` : '';

    // Company Address HTML
    const companyAddress = settings.address ? settings.address.replace(/\n/g, '<br/>') : '';
    const companyContact = [settings.phone, settings.email, settings.website].filter(Boolean).join(' | ');

    // Legal Identifiers
    const legalIds = [
        settings.ice ? `ICE: ${settings.ice}` : '',
        settings.rc ? `RC: ${settings.rc}` : '',
        settings.fiscalId ? `IF: ${settings.fiscalId}` : '',
        settings.patente ? `TP: ${settings.patente}` : '',
        settings.cnss ? `CNSS: ${settings.cnss}` : ''
    ].filter(Boolean).join(' &nbsp;|&nbsp; ');

    // --- Dynamic Table Construction ---

    // Generate Header Row
    const headerRowHtml = activeColumns.map(col => {
        let align = 'left';
        let width = '';
        if (col.id === 'quantity') { align = 'center'; width = 'width: 80px;'; }
        else if (col.id === 'vat') { align = 'center'; width = 'width: 40px;'; }
        else if (col.id === 'unitPrice' || col.id === 'total') { align = 'right'; width = 'width: 90px;'; }
        
        return `<th style="padding: 8px 10px; text-align: ${align}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; ${width}">${col.label}</th>`;
    }).join('');

    // Generate Body Rows
    const rowsHtml = doc.lineItems.map((item, index) => {
        const cellsHtml = activeColumns.map(col => {
            let content = '';
            let align = 'left';
            let style = '';

            switch (col.id) {
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

            return `<td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: ${align}; ${style}">${content}</td>`;
        }).join('');

        return `<tr style="background-color: ${index % 2 === 0 ? '#fff' : '#f9fafb'};">${cellsHtml}</tr>`;
    }).join('');


    // Payment Info (if invoice/DL)
    let paymentInfoHtml = '';
    // On n'affiche pas les infos de paiement sur le BL PDF par défaut (standard métier)
    if (docType === 'Facture') {
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

    // 3. Template HTML
    // Utilisation de Flexbox pour gérer la hauteur de la page et éviter la page vide
    const template = `
    <div style="width: 210mm; min-height: 295mm; padding: 12mm 15mm; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #374151; background: white; box-sizing: border-box; display: flex; flex-direction: column;">
        
        <!-- CONTENT WRAPPER (grows to push footer down) -->
        <div style="flex: 1;">
            <!-- HEADER -->
            <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
                <div style="width: 50%;">
                    ${logoHtml}
                    <div style="margin-top: 15px; font-size: 12px; line-height: 1.5;">
                        <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${settings.companyName}</div>
                        ${companyAddress}<br/>
                        <div style="margin-top: 5px; color: #6b7280;">${companyContact}</div>
                    </div>
                </div>
                <div style="width: 40%; text-align: right;">
                    <div style="font-size: 26px; font-weight: bold; text-transform: uppercase; color: ${primaryColor}; margin-bottom: 10px;">${docType}</div>
                    <div style="font-size: 16px; font-weight: 600; color: #111827;">N° ${doc.id}</div>
                    <div style="margin-top: 10px; font-size: 12px;">
                        <div>Date : <b>${dateStr}</b></div>
                        ${extraDateLabel ? `<div>${extraDateLabel} : <b>${extraDateValue}</b></div>` : ''}
                        ${doc.reference ? `<div>Réf : <b>${doc.reference}</b></div>` : ''}
                    </div>
                </div>
            </div>

            <!-- RECIPIENT -->
            <div style="display: flex; justify-content: flex-end; margin-bottom: 30px;">
                <div style="width: 45%; background-color: #f9fafb; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
                    <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: #9ca3af; margin-bottom: 8px;">Adressé à</div>
                    <div style="font-size: 14px; color: #111827;">
                        ${recipientCompany}
                        <div>${recipientName}</div>
                    </div>
                    <div style="margin-top: 8px; font-size: 12px; color: #4b5563;">
                        ${recipientEmail}
                        ${recipientPhone}
                    </div>
                </div>
            </div>

            <!-- SUBJECT -->
            ${doc.subject ? `<div style="margin-bottom: 15px; font-weight: 600;">Objet : <span style="font-weight: normal;">${doc.subject}</span></div>` : ''}

            <!-- TABLE -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr style="background-color: ${primaryColor}; color: white;">
                        ${headerRowHtml}
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            <!-- TOTALS & AMOUNT IN LETTERS (HIDDEN FOR DELIVERY NOTES) -->
            ${!isDeliveryNote ? `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                
                <!-- Amount in letters (Left side) -->
                <div style="width: 55%; padding-top: 10px;">
                    <div style="background-color: #f3f4f6; padding: 10px; border-radius: 4px; border-left: 3px solid ${primaryColor};">
                        <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold; margin-bottom: 4px;">Arrêté le présent document à la somme de :</div>
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

                <!-- Totals (Right side) -->
                <div style="width: 40%;">
                    <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e5e7eb;">
                        <span>Total HT</span>
                        <span style="font-weight: 600;">${subTotal.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e5e7eb;">
                        <span>Total TVA</span>
                        <span>${vatAmount.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 16px; color: ${primaryColor}; font-weight: bold; margin-top: 5px;">
                        <span>Net à Payer</span>
                        <span>${totalAmount.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}</span>
                    </div>
                    ${paymentInfoHtml}
                </div>
            </div>
            ` : `
                <!-- Delivery Note Footer (Minimal) -->
                <div style="display: flex; justify-content: space-between; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                    <div style="width: 45%;">
                        <div style="font-weight: bold; margin-bottom: 40px;">Signature Expéditeur</div>
                    </div>
                    <div style="width: 45%; text-align: right;">
                        <div style="font-weight: bold; margin-bottom: 40px;">Signature & Cachet Client</div>
                    </div>
                </div>
            `}
        </div>

        <!-- FOOTER (Pushed to bottom via flex layout) -->
        <div style="text-align: center; margin-top: auto;">
            ${settings.footerNotes ? `<div style="font-size: 12px; color: #4b5563; margin-bottom: 10px; white-space: pre-wrap;">${settings.footerNotes}</div>` : ''}
            <div style="font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 8px;">
                ${legalIds}
            </div>
        </div>

    </div>
    `;

    // 4. Conversion HTML to PDF with DOM mounting
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px'; // Hide off-screen
    container.style.top = '0';
    container.innerHTML = template;
    
    document.body.appendChild(container);

    try {
        const contentElement = container.firstElementChild;
        
        // Configurations html2pdf
        const opt = {
            margin: 0, // No margin, handled by CSS padding
            filename: `${docType}_${doc.id}.pdf`,
            image: { type: 'jpeg', quality: 1 }, // Quality 1.0 (Max)
            html2canvas: { 
                scale: 4, // Increased scale for high resolution (was 2)
                useCORS: true, 
                logging: false,
                letterRendering: true // Better text rendering
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Trigger download
        await (window as any).html2pdf().set(opt).from(contentElement).save();
    } finally {
        // Clean up
        document.body.removeChild(container);
    }
};
