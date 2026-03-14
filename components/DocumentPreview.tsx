
import React from 'react';
import { CompanySettings, Quote, Invoice, Client, DeliveryNote, CreditNote, PurchaseOrder } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface DocumentPreviewProps {
    settings: Partial<CompanySettings>;
    document: Quote | Invoice | DeliveryNote | CreditNote | PurchaseOrder;
    client: Client;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ settings, document, client }) => {
    const { t, language } = useLanguage();
    const primaryColor = settings.primaryColor || '#059669'; // Default to emerald-600
    
    // Détermination du type de document
    let documentType = 'DOCUMENT';
    let isDeliveryNote = false;
    let isQuote = false;

    if ('expiryDate' in document) {
        documentType = t('quotes').toUpperCase();
        isQuote = true;
    } else if ('dueDate' in document) {
        documentType = t('invoices').toUpperCase();
    } else if ('expectedDate' in document) {
        documentType = t('purchaseOrders').toUpperCase();
    } else if ('subject' in document && !('expiryDate' in document) && !('dueDate' in document) && !('expectedDate' in document)) {
        // This is a bit tricky, CreditNote has subject, but others might too.
        // Let's check if it's a CreditNote by checking if it's not the others.
        // Actually, let's just use the documentId prefix or something if available, 
        // but the current logic is based on properties.
        documentType = t('creditNotes').toUpperCase();
    } else {
        // Logique par défaut pour DeliveryNote
        documentType = t('deliveryNotes').toUpperCase();
        isDeliveryNote = true;
    }

    const calculationMode = document.lineItems[0]?.calculationMode || 'piece';
    const legacyShowDimensions = (document as any).showDimensions || document.lineItems[0]?.showDimensions;
    
    const isM2 = calculationMode === 'm2' || (legacyShowDimensions && calculationMode === 'piece');
    const isML = calculationMode === 'ml';
    const isKg = calculationMode === 'kg';

    const getLineMultiplier = (item: any) => {
        if (isM2) return (item.length || 1) * (item.height || 1);
        if (isML) return (item.length || 1);
        return 1;
    };

    const subTotal = document.lineItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity * getLineMultiplier(item)), 0);
    
    let discountAmount = 0;
    const doc = document as any;
    if (doc.discountType && doc.discountValue && doc.discountValue > 0) {
        if (doc.discountType === 'percentage') {
            discountAmount = subTotal * (doc.discountValue / 100);
        } else {
            discountAmount = doc.discountValue;
        }
    }
    const subTotalAfterDiscount = subTotal - discountAmount;

    const vatAmount = document.lineItems.reduce((acc, item) => {
        const itemTotalHT = item.unitPrice * item.quantity * getLineMultiplier(item);
        const itemDiscount = subTotal > 0 ? (itemTotalHT / subTotal) * discountAmount : 0;
        const itemBaseForVat = itemTotalHT - itemDiscount;
        return acc + (itemBaseForVat * (item.vat / 100));
    }, 0);

    const totalTTC = subTotalAfterDiscount + vatAmount;

    const renderAddress = (address: string) => {
        return address.split('\n').map((line, index) => (
            <React.Fragment key={index}>
                {line}
                <br />
            </React.Fragment>
        ));
    };

    const iceLabel = language === 'es' ? 'NIF' : (language === 'en' ? 'Tax ID' : 'ICE');

    const legalIds = [
        settings.ice ? `${iceLabel}: ${settings.ice}` : '',
        settings.rc ? `RC: ${settings.rc}` : '',
        settings.fiscalId ? `IF: ${settings.fiscalId}` : '',
        settings.patente ? `TP: ${settings.patente}` : '',
        settings.cnss ? `CNSS: ${settings.cnss}` : '',
        settings.capital ? `Capital: ${settings.capital}` : ''
    ].filter(Boolean).join(' | ');

    return (
        <div className="bg-white p-12 shadow-2xl font-sans text-sm text-neutral-800 relative overflow-hidden flex flex-col" style={{ width: '210mm', minHeight: '297mm', margin: 'auto' }}>
            
            {/* Watermark / Logo en arrière-plan */}
            {settings.logo && (
                <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
                    <img 
                        src={settings.logo} 
                        alt="Watermark" 
                        className="w-[80%] max-h-[60%] object-contain opacity-[0.08] translate-y-16"
                        style={{ filter: 'grayscale(100%)' }} 
                    />
                </div>
            )}

            <div className="relative z-10 flex flex-col flex-1">
                {/* Header */}
                <header className="flex justify-between items-start pb-6 border-b-2" style={{ borderColor: primaryColor }}>
                    <div className="w-1/2">
                        {settings.logo ? (
                            <img src={settings.logo} alt="Company Logo" style={{ maxHeight: '80px', maxWidth: '240px' }} />
                        ) : (
                            <h1 className="text-2xl font-bold" style={{ color: primaryColor }}>{settings.companyName || 'Votre Entreprise'}</h1>
                        )}
                        <div className="mt-4 text-xs leading-relaxed text-neutral-600">
                            {settings.address && <p className="font-medium text-neutral-800 mb-1">{renderAddress(settings.address)}</p>}
                            
                            <div className="flex flex-wrap gap-y-1 gap-x-4 mt-2">
                                 {settings.phone && <p>{t('phone')}: {settings.phone}</p>}
                                 {settings.email && <p>{t('email')}: {settings.email}</p>}
                                 {settings.website && <p>Web: {settings.website}</p>}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-3xl font-bold uppercase tracking-widest" style={{ color: primaryColor }}>{documentType}</h2>
                        <p className="font-semibold mt-2 text-lg text-neutral-700">#{document.documentId || document.id}</p>
                        <div className="text-xs mt-4 text-neutral-600 space-y-1">
                            <p>{t('date')} : <span className="font-medium text-neutral-900">{new Date(document.date).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR')}</span></p>
                            {settings.showExpiryDate !== false && (
                                <>
                                    {'dueDate' in document && document.dueDate && (
                                        <p>{t('dueDate')} : <span className="font-medium text-neutral-900">{new Date(document.dueDate).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR')}</span></p>
                                    )}
                                    {'expiryDate' in document && document.expiryDate && (
                                        <p>{t('expiryDate')} : <span className="font-medium text-neutral-900">{new Date(document.expiryDate).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR')}</span></p>
                                    )}
                                    {'expectedDate' in document && document.expectedDate && (
                                        <p>{t('expectedDelivery')} : <span className="font-medium text-neutral-900">{new Date(document.expectedDate).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR')}</span></p>
                                    )}
                                </>
                            )}
                            {('purchaseOrderNumber' in document && document.purchaseOrderNumber) && (
                                <p>{t('purchaseOrderNumber')} : <span className="font-medium text-neutral-900">{document.purchaseOrderNumber}</span></p>
                            )}
                            {document.reference && <p>{t('reference')} : <span className="font-medium text-neutral-900">{document.reference}</span></p>}
                        </div>
                    </div>
                </header>

                {/* Client Info */}
                <section className="mt-8 flex justify-end">
                    <div className="w-1/2 bg-neutral-50 p-4 rounded-lg border border-neutral-100">
                        <p className="text-xs uppercase font-bold text-neutral-500 mb-2">{t('client')} :</p>
                        <div className="font-medium text-base text-neutral-900">
                            {client.company && <p className="font-bold">{client.company}</p>}
                            <p>{client.name}</p>
                        </div>
                        <div className="mt-2 text-sm text-neutral-600">
                            {client.address && <div className="mb-2">{renderAddress(client.address)}</div>}
                            {client.ice && <p>{iceLabel}: {client.ice}</p>}
                            <p>{client.email}</p>
                            <p>{client.phone}</p>
                        </div>
                    </div>
                </section>

                 {document.subject && (
                     <section className="mt-6 mb-4">
                        <p className="text-sm"><span className="font-bold text-neutral-700">{t('subject')} :</span> {document.subject}</p>
                    </section>
                )}

                {/* Line Items Table */}
                <section className="mt-6">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr style={{ backgroundColor: primaryColor, color: 'white' }}>
                                <th className="p-3 font-semibold uppercase text-xs rounded-tl-lg rounded-bl-lg">{t('description')}</th>
                                <th className="p-3 text-center font-semibold uppercase text-xs w-16">{t('quantity')}</th>
                                {isM2 && (
                                    <>
                                        <th className="p-3 text-center font-semibold uppercase text-xs w-16">Long.</th>
                                        <th className="p-3 text-center font-semibold uppercase text-xs w-16">Haut.</th>
                                        <th className="p-3 text-center font-semibold uppercase text-xs w-16">M²</th>
                                    </>
                                )}
                                {isML && (
                                    <>
                                        <th className="p-3 text-center font-semibold uppercase text-xs w-16">Long.</th>
                                        <th className="p-3 text-center font-semibold uppercase text-xs w-16">ML</th>
                                    </>
                                )}
                                {isKg && (
                                    <>
                                        <th className="p-3 text-center font-semibold uppercase text-xs w-16">Poids (kg)</th>
                                        <th className="p-3 text-center font-semibold uppercase text-xs w-16">Total kg</th>
                                    </>
                                )}
                                {!isDeliveryNote && (
                                    <>
                                        <th className="p-3 text-right font-semibold uppercase text-xs w-28">{t('unitPrice')}</th>
                                        <th className="p-3 text-center font-semibold uppercase text-xs w-16">{t('vat')}</th>
                                        <th className="p-3 text-right font-semibold uppercase text-xs w-28 rounded-tr-lg rounded-br-lg">{t('totalHT')}</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200">
                            {document.lineItems.map(item => (
                                <tr key={item.id} className="text-neutral-700">
                                    <td className="p-3">
                                        <p className="text-[12px] font-semibold text-neutral-900">{item.name}</p>
                                        {item.description && <p className="text-[10px] text-neutral-500 mt-0.5">{item.description}</p>}
                                    </td>
                                    <td className="p-3 text-center align-top font-bold text-[12px]">{item.quantity}</td>
                                    {isM2 && (
                                        <>
                                            <td className="p-3 text-center align-top text-[12px]">{item.length || 1}</td>
                                            <td className="p-3 text-center align-top text-[12px]">{item.height || 1}</td>
                                            <td className="p-3 text-center align-top text-[12px] font-medium">{(item.quantity * (item.length || 1) * (item.height || 1)).toLocaleString('fr-MA', { maximumFractionDigits: 2 })}</td>
                                        </>
                                    )}
                                    {isML && (
                                        <>
                                            <td className="p-3 text-center align-top text-[12px]">{item.length || 1}</td>
                                            <td className="p-3 text-center align-top text-[12px] font-medium">{(item.quantity * (item.length || 1)).toLocaleString('fr-MA', { maximumFractionDigits: 2 })}</td>
                                        </>
                                    )}
                                    {isKg && (
                                        <>
                                            <td className="p-3 text-center align-top text-[12px]">{item.weight || 1}</td>
                                            <td className="p-3 text-center align-top text-[12px] font-medium">{(item.quantity * (item.weight || 1)).toLocaleString('fr-MA', { maximumFractionDigits: 2 })}</td>
                                        </>
                                    )}
                                    {!isDeliveryNote && (
                                        <>
                                            <td className="p-3 text-right align-top text-[12px]">{item.unitPrice.toLocaleString('fr-MA', { minimumFractionDigits: 2 })}</td>
                                            <td className="p-3 text-center align-top text-[11px] text-neutral-500">{item.vat}%</td>
                                            <td className="p-3 text-right align-top font-medium text-neutral-900 text-[12px]">{(item.quantity * getLineMultiplier(item) * item.unitPrice).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}</td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                {/* Totals */}
                {!isDeliveryNote && (
                    <section className="flex justify-end mt-8">
                        <div className="w-full max-w-xs space-y-3">
                            <div className="flex justify-between text-neutral-600">
                                <span>{t('totalHT')}</span>
                                <span className="font-medium">{subTotal.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-red-600">
                                    <span>{t('discount')} {doc.discountType === 'percentage' ? `(${doc.discountValue}%)` : ''}</span>
                                    <span className="font-medium">- {discountAmount.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-neutral-600">
                                <span>{t('vat')}</span>
                                <span className="font-medium">{vatAmount.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}</span>
                            </div>
                            <div className="h-px bg-neutral-200 my-2"></div>
                            <div className="flex justify-between text-lg font-bold bg-neutral-50 p-2 rounded" style={{ color: '#000000' }}>
                                <span>{t('totalTTC')}</span>
                                <span>{totalTTC.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}</span>
                            </div>
                        </div>
                    </section>
                )}
                
                {/* Footer */}
                <footer className="mt-auto pt-8 text-center">
                    {settings.footerNotes && <p className="text-sm text-black mb-4 whitespace-pre-line">{settings.footerNotes}</p>}
                    
                    <div className="border-t border-black pt-2 text-[10px] text-black font-normal uppercase tracking-wider">
                         <p>{legalIds}</p>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default DocumentPreview;
