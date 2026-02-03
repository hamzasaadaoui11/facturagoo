
import React from 'react';
import { CompanySettings, Quote, Invoice, Client } from '../types';

interface DocumentPreviewProps {
    settings: Partial<CompanySettings>;
    document: Quote | Invoice;
    client: Client;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ settings, document, client }) => {
    const primaryColor = settings.primaryColor || '#059669'; // Default to emerald-600
    const isQuote = 'expiryDate' in document;
    const documentType = isQuote ? 'DEVIS' : 'FACTURE';

    const renderAddress = (address: string) => {
        return address.split('\n').map((line, index) => (
            <React.Fragment key={index}>
                {line}
                <br />
            </React.Fragment>
        ));
    };

    return (
        <div className="bg-white p-12 shadow-2xl font-sans text-sm text-neutral-800" style={{ width: '210mm', minHeight: '297mm', margin: 'auto' }}>
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

                        {/* Legal Identifiers Block */}
                        <div className="mt-3 pt-3 border-t border-dashed border-neutral-200 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-500 uppercase tracking-wide">
                            {settings.ice && <span>ICE: <span className="font-semibold text-neutral-700">{settings.ice}</span></span>}
                            {settings.rc && <span>RC: <span className="font-semibold text-neutral-700">{settings.rc}</span></span>}
                            {settings.fiscalId && <span>IF: <span className="font-semibold text-neutral-700">{settings.fiscalId}</span></span>}
                            {settings.patente && <span>TP: <span className="font-semibold text-neutral-700">{settings.patente}</span></span>}
                            {settings.cnss && <span>CNSS: <span className="font-semibold text-neutral-700">{settings.cnss}</span></span>}
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-3xl font-bold uppercase tracking-widest" style={{ color: primaryColor }}>{documentType}</h2>
                    <p className="font-semibold mt-2 text-lg text-neutral-700">#{document.id}</p>
                    <div className="text-xs mt-4 text-neutral-600 space-y-1">
                        <p>Date : <span className="font-medium text-neutral-900">{new Date(document.date).toLocaleDateString('fr-FR')}</span></p>
                        {isQuote ? (
                            <p>Valable jusqu'au : <span className="font-medium text-neutral-900">{new Date(document.expiryDate).toLocaleDateString('fr-FR')}</span></p>
                        ) : (
                            <p>Échéance : <span className="font-medium text-neutral-900">{new Date((document as Invoice).dueDate).toLocaleDateString('fr-FR')}</span></p>
                        )}
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
                            <th className="p-3 text-right font-semibold uppercase text-xs w-28">P.U. HT</th>
                            <th className="p-3 text-center font-semibold uppercase text-xs w-16">TVA</th>
                            <th className="p-3 text-right font-semibold uppercase text-xs w-28 rounded-tr-lg rounded-br-lg">Total HT</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                        {document.lineItems.map(item => (
                            <tr key={item.id} className="text-neutral-700">
                                <td className="p-3">
                                    <p className="font-semibold text-neutral-900">{item.name}</p>
                                    {item.description && <p className="text-xs text-neutral-500 mt-0.5">{item.description}</p>}
                                </td>
                                <td className="p-3 text-center align-top">{item.quantity}</td>
                                <td className="p-3 text-right align-top">{item.unitPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
                                <td className="p-3 text-center align-top text-xs text-neutral-500">{item.vat}%</td>
                                <td className="p-3 text-right align-top font-medium text-neutral-900">{(item.quantity * item.unitPrice).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            {/* Totals */}
            <section className="flex justify-end mt-8">
                <div className="w-full max-w-xs space-y-3">
                    <div className="flex justify-between text-neutral-600">
                        <span>Total HT</span>
                        <span className="font-medium">{document.subTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                        <span>Total TVA</span>
                        <span className="font-medium">{document.vatAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span>
                    </div>
                    <div className="h-px bg-neutral-200 my-2"></div>
                    <div className="flex justify-between text-lg font-bold bg-neutral-50 p-2 rounded" style={{ color: primaryColor }}>
                        <span>Net à Payer</span>
                        <span>{document.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</span>
                    </div>
                </div>
            </section>
            
            {/* Footer */}
            <footer className="mt-auto pt-8 text-center">
                {settings.footerNotes && <p className="text-sm text-neutral-600 mb-4 whitespace-pre-line">{settings.footerNotes}</p>}
                
                <div className="border-t border-neutral-200 pt-4 text-[10px] text-neutral-400 uppercase tracking-wider">
                     <p>{settings.companyName} {settings.ice ? `- ICE: ${settings.ice}` : ''} {settings.rc ? `- RC: ${settings.rc}` : ''}</p>
                </div>
            </footer>
        </div>
    );
};

export default DocumentPreview;
