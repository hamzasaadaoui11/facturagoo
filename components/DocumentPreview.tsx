
import React from 'react';
import { CompanySettings, Quote, Invoice, Client, DeliveryNote } from '../types';

interface DocumentPreviewProps {
    settings: Partial<CompanySettings>;
    document: Quote | Invoice | DeliveryNote;
    client: Client;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ settings, document, client }) => {
    const primaryColor = settings.primaryColor || '#059669'; // Default to emerald-600
    
    // Détermination du type de document
    let documentType = 'DOCUMENT';
    let isDeliveryNote = false;
    let isQuote = false;

    if ('expiryDate' in document) {
        documentType = 'DEVIS';
        isQuote = true;
    } else if ('dueDate' in document) {
        documentType = 'FACTURE';
    } else {
        // Logique par défaut pour DeliveryNote (qui n'a ni date d'échéance ni validité explicite dans l'interface de base)
        documentType = 'BON DE LIVRAISON';
        isDeliveryNote = true;
    }

    const renderAddress = (address: string) => {
        return address.split('\n').map((line, index) => (
            <React.Fragment key={index}>
                {line}
                <br />
            </React.Fragment>
        ));
    };

    const legalIds = [
        settings.ice ? `ICE: ${settings.ice}` : '',
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
                                 {settings.phone && <p>Tél: {settings.phone}</p>}
                                 {settings.email && <p>Email: {settings.email}</p>}
                                 {settings.website && <p>Web: {settings.website}</p>}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-3xl font-bold uppercase tracking-widest" style={{ color: primaryColor }}>{documentType}</h2>
                        <p className="font-semibold mt-2 text-lg text-neutral-700">#{document.documentId || document.id}</p>
                        <div className="text-xs mt-4 text-neutral-600 space-y-1">
                            <p>Date : <span className="font-medium text-neutral-900">{new Date(document.date).toLocaleDateString('fr-FR')}</span></p>
                            {/* Due date and expiry date display removed */}
                            {document.reference && <p>Réf. client : <span className="font-medium text-neutral-900">{document.reference}</span></p>}
                        </div>
                    </div>
                </header>

                {/* Client Info */}
                <section className="mt-8 flex justify-end">
                    <div className="w-1/2 bg-neutral-50 p-4 rounded-lg border border-neutral-100">
                        <p className="text-xs uppercase font-bold text-neutral-500 mb-2">Adressé à :</p>
                        <div className="font-medium text-base text-neutral-900">
                            {client.company && <p className="font-bold">{client.company}</p>}
                            <p>{client.name}</p>
                        </div>
                        <div className="mt-2 text-sm text-neutral-600">
                            {client.address && <div className="mb-2">{renderAddress(client.address)}</div>}
                            {client.ice && <p>ICE: {client.ice}</p>}
                            <p>{client.email}</p>
                            <p>{client.phone}</p>
                        </div>
                    </div>
                </section>

                 {document.subject && (
                     <section className="mt-6 mb-4">
                        <p className="text-sm"><span className="font-bold text-neutral-700">Objet :</span> {document.subject}</p>
                    </section>
                )}

                {/* Line Items Table */}
                <section className="mt-6">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr style={{ backgroundColor: primaryColor, color: 'white' }}>
                                <th className="p-3 font-semibold uppercase text-xs rounded-tl-lg rounded-bl-lg">Désignation</th>
                                <th className="p-3 text-center font-semibold uppercase text-xs w-16">Qté</th>
                                {!isDeliveryNote && (
                                    <>
                                        <th className="p-3 text-right font-semibold uppercase text-xs w-28">P.U. HT</th>
                                        <th className="p-3 text-center font-semibold uppercase text-xs w-16">TVA</th>
                                        <th className="p-3 text-right font-semibold uppercase text-xs w-28 rounded-tr-lg rounded-br-lg">Total HT</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200">
                            {document.lineItems.map(item => (
                                <tr key={item.id} className="text-neutral-700">
                                    <td className="p-3">
                                        <p className="font-semibold text-neutral-900">{item.name}</p>
                                        {item.description && <p className="text-xs text-neutral-500 mt-0.5">{item.description}</p>}
                                    </td>
                                    <td className="p-3 text-center align-top font-bold">{item.quantity}</td>
                                    {!isDeliveryNote && (
                                        <>
                                            <td className="p-3 text-right align-top">{item.unitPrice.toLocaleString('fr-MA', { minimumFractionDigits: 2 })}</td>
                                            <td className="p-3 text-center align-top text-xs text-neutral-500">{item.vat}%</td>
                                            <td className="p-3 text-right align-top font-medium text-neutral-900">{(item.quantity * item.unitPrice).toLocaleString('fr-MA', { minimumFractionDigits: 2 })}</td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                {/* Totals - Hidden for Delivery Notes */}
                {!isDeliveryNote ? (
                    <section className="flex justify-end mt-8">
                        <div className="w-full max-w-xs space-y-3">
                            <div className="flex justify-between text-neutral-600">
                                <span>Total HT</span>
                                <span className="font-medium">{(document as Invoice).subTotal.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}</span>
                            </div>
                            <div className="flex justify-between text-neutral-600">
                                <span>Total TVA</span>
                                <span className="font-medium">{(document as Invoice).vatAmount.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}</span>
                            </div>
                            <div className="h-px bg-neutral-200 my-2"></div>
                            <div className="flex justify-between text-lg font-bold bg-neutral-50 p-2 rounded" style={{ color: '#000000' }}>
                                <span>Net à Payer</span>
                                <span>{((document as any).amount || (document as any).totalAmount).toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}</span>
                            </div>
                        </div>
                    </section>
                ) : (
                    <section className="mt-12 pt-8 border-t border-neutral-200 flex justify-between px-10">
                        <div className="text-center w-40">
                            <p className="font-bold text-neutral-400 mb-8 border-b pb-2">Signature Expéditeur</p>
                        </div>
                        <div className="text-center w-40">
                            <p className="font-bold text-neutral-400 mb-8 border-b pb-2">Signature Client</p>
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
