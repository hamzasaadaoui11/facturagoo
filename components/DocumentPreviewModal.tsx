
import React, { useEffect, useState, useRef } from 'react';
import { X, Download, Printer, MessageSquare, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { generateDocumentHTML, generatePDF, printDocument, generatePDFBlob, DocumentType, DocumentData } from '../services/pdfService';
import { shareDocument } from '../services/shareService';
import { Client, Supplier, CompanySettings } from '../types';

interface DocumentPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: DocumentType;
    doc: DocumentData;
    settings: CompanySettings | null;
    recipient: Client | Supplier | undefined;
}

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({ 
    isOpen, 
    onClose, 
    type, 
    doc, 
    settings, 
    recipient 
}) => {
    const { t, isRTL, language } = useLanguage();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
    const [isVisible, setIsVisible] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);
    const [htmlContent, setHtmlContent] = useState<string>('');
    const [preGeneratedBlob, setPreGeneratedBlob] = useState<Blob | null>(null);
    const [scale, setScale] = useState(1);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateScale = () => {
            const width = window.innerWidth;
            setIsMobile(width < 640);
            
            if (width < 640 && wrapperRef.current) {
                // Calculate scale based on container width
                // 210mm is roughly 794px at 96dpi
                const targetWidth = width - 32; // padding
                const contentWidth = 794; 
                const newScale = targetWidth / contentWidth;
                setScale(Math.max(newScale, 0.2));
            } else {
                setScale(1);
            }
        };

        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setIsVisible(true), 10);
            try {
                const html = generateDocumentHTML(type, doc, settings, recipient);
                setHtmlContent(html);
                
                // Pre-generate blob for faster sharing/downloading
                if (!isGeneratingBackground) {
                    setIsGeneratingBackground(true);
                    setTimeout(async () => {
                        try {
                            const blob = await generatePDFBlob(type, doc, settings, recipient);
                            setPreGeneratedBlob(blob);
                        } catch (err) {
                            console.error("Background PDF generation failed:", err);
                        } finally {
                            setIsGeneratingBackground(false);
                        }
                    }, 500);
                }
            } catch (error) {
                console.error("Error generating preview:", error);
            }
        } else {
            setIsVisible(false);
            setPreGeneratedBlob(null);
            setIsGeneratingBackground(false);
        }
    }, [isOpen, type, doc, settings, recipient]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 200);
    };

    const handleDownload = async () => {
        if (isActionLoading) return;
        setIsActionLoading(true);
        try {
            if (preGeneratedBlob) {
                const url = URL.createObjectURL(preGeneratedBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${type.toLowerCase().replace(/\s+/g, '_')}_${doc.documentId || doc.id}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                await generatePDF(type, doc, settings, recipient);
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handlePrint = async () => {
        if (isActionLoading) return;
        setIsActionLoading(true);
        try {
            await printDocument(type, doc, settings, recipient);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleShare = async () => {
        if (isActionLoading) return;
        setIsActionLoading(true);
        try {
            // We pass the pre-generated blob to the share service if available
            // We'll need to update shareDocument to accept an optional blob
            await shareDocument(type, doc, settings, recipient, isRTL, language, preGeneratedBlob || undefined);
        } finally {
            setIsActionLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-[60] flex items-center justify-center transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`} aria-modal="true">
            <div className="absolute inset-0 bg-neutral-900/80 backdrop-blur-sm" onClick={handleClose}></div>
            
            <div className={`relative w-full max-w-5xl h-[90vh] mx-4 flex flex-col bg-slate-100 rounded-2xl shadow-2xl transition-all duration-300 ease-out transform ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                
                {/* Header */}
                <div className={`flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-white border-b border-slate-200 rounded-t-2xl gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex flex-col truncate ${isRTL ? 'text-right' : ''}`}>
                        <h3 className="text-sm sm:text-lg font-bold text-slate-900 leading-tight truncate">
                            {type} #{doc.documentId || doc.id}
                        </h3>
                        <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wider truncate">
                            {recipient?.name}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-1 sm:gap-2">
                        {/* On desktop we show the main button here, on mobile we keep it simple icons and move the main button to footer */}
                        <button 
                            onClick={handleShare}
                            disabled={isActionLoading}
                            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-bold text-sm shadow-sm active:scale-95 disabled:opacity-50"
                        >
                            {isActionLoading ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
                            <span>{isActionLoading ? (language === 'fr' ? 'Traitement...' : 'Processing...') : t('sendWhatsApp')}</span>
                        </button>
                        
                        <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>

                        <button 
                            onClick={handleDownload}
                            disabled={isActionLoading}
                            className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors active:scale-90 disabled:opacity-50"
                            title={t('download')}
                        >
                            <Download size={20} />
                        </button>

                        <button 
                            onClick={handlePrint}
                            disabled={isActionLoading}
                            className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors active:scale-90 disabled:opacity-50"
                            title={t('print')}
                        >
                            <Printer size={20} />
                        </button>

                        <div className="w-px h-6 bg-slate-200 mx-1"></div>

                        <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors active:scale-90">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Preview Content */}
                <div ref={wrapperRef} className="flex-1 overflow-auto p-2 sm:p-8 bg-slate-200/50 flex flex-col items-center">
                    <div 
                        className="w-full flex justify-center items-start"
                        style={{ height: isMobile ? `calc(297mm * ${scale} + 40px)` : 'auto' }}
                    >
                        <div 
                            ref={previewContainerRef}
                            className="bg-white shadow-2xl origin-top transition-transform duration-300 transform-gpu mb-8"
                            style={{ 
                                width: '210mm', 
                                minHeight: '297mm',
                                transform: `scale(${scale})`,
                                marginTop: isMobile ? '10px' : '20px'
                            }}
                            dangerouslySetInnerHTML={{ __html: htmlContent }}
                        />
                    </div>
                </div>

                {/* Mobile Footer Action */}
                <div className="sm:hidden p-4 bg-white border-t border-slate-200 rounded-b-2xl">
                    <button 
                        onClick={handleShare}
                        disabled={isActionLoading}
                        className="w-full flex items-center justify-center gap-3 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-base shadow-lg shadow-emerald-200 active:scale-95 disabled:opacity-50 transition-all"
                    >
                         {isActionLoading ? <Loader2 size={20} className="animate-spin" /> : <MessageSquare size={20} />}
                         {isActionLoading ? (language === 'fr' ? 'Traitement...' : 'Processing...') : t('sendWhatsApp')}
                    </button>
                </div>
            </div>

            {/* Custom Styles override for preview */}
            <style>{`
                #pdf-container {
                    background: white;
                    padding: 0;
                    margin: 0;
                    width: 210mm;
                }
                .page-container {
                    box-shadow: none !important;
                    margin-bottom: 20px !important;
                    border: 1px solid #e2e8f0 !important;
                    background: white !important;
                }
                
                @media (max-width: 640px) {
                    /* Adjusting container for the scaled content on mobile */
                    .preview-wrapper {
                        height: fit-content;
                    }
                }
            `}</style>
        </div>
    );
};

export default DocumentPreviewModal;
