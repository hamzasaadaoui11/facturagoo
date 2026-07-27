
import React, { useState, useEffect } from 'react';
import Header from './Header';
import { CompanySettings, DocumentColumn, NumberingConfig, DocumentLabels } from '../types';
import { CURRENCIES } from '../services/currencyService';
import { 
    Save, Upload, Building, Palette, FileText, CheckCircle, X, 
    ArrowUp, ArrowDown, LayoutTemplate, Briefcase, 
    CreditCard, MapPin, Globe, Mail, Phone, Hash, ShieldCheck, Loader2, Type, Settings2, FileBarChart, Truck, ShoppingBag, FileMinus, PencilLine, Eye, Trash2, Grid
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface TemplateCustomizerProps {
    settings: CompanySettings | null;
    onSave: (settings: CompanySettings) => Promise<void>; 
}

const DEFAULT_COLUMNS: DocumentColumn[] = [
    { id: 'reference', label: 'Réf', visible: false, order: 0 },
    { id: 'name', label: 'Désignation', visible: true, order: 1 },
    { id: 'quantity', label: 'Qté', visible: true, order: 2 },
    { id: 'unit', label: 'Unité', visible: false, order: 3 },
    { id: 'unitPrice', label: 'P.U. HT', visible: true, order: 4 },
    { id: 'vat', label: 'TVA', visible: true, order: 5 },
    { id: 'total', label: 'Total HT', visible: true, order: 6 },
];

const DEFAULT_LABELS: DocumentLabels = {
    totalHt: 'Total HT',
    totalTax: 'Total TVA',
    totalNet: 'Net à Payer',
    amountInWordsPrefix: 'Arrêté le présent document à la somme de :',
    signatureSender: 'Signature Expéditeur',
    signatureRecipient: 'Signature & Cachet'
};

const createDefaultConfig = (prefix: string): NumberingConfig => ({
    prefix,
    yearFormat: 'YYYY',
    startNumber: 1,
    padding: 5,
    separator: '/'
});

type TabId = 'general' | 'legal' | 'branding' | 'documents';
type DocConfigType = 'invoice' | 'quote' | 'deliveryNote' | 'purchaseOrder' | 'creditNote';

const TemplateCustomizer: React.FC<TemplateCustomizerProps> = ({ settings, onSave }) => {
    const { t, isRTL, language } = useLanguage();
    const [localSettings, setLocalSettings] = useState<Partial<CompanySettings>>({ 
        showAmountInWords: true,
        showSignatureRecipient: false,
        priceDisplayMode: 'HT'
    });
    const [columns, setColumns] = useState<DocumentColumn[]>(DEFAULT_COLUMNS);
    const [showToast, setShowToast] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<TabId>('general');
    const [activeDocType, setActiveDocType] = useState<DocConfigType>('invoice');

    useEffect(() => {
        const mergedSettings = settings ? { ...settings } : { 
            id: 'default',
            primaryColor: '#10b981', 
            showAmountInWords: true, 
            priceDisplayMode: 'HT' as const 
        } as CompanySettings;
        
        // Ensure all configs exist
        if (!mergedSettings.invoiceNumbering) mergedSettings.invoiceNumbering = createDefaultConfig('FAC');
        if (!mergedSettings.quoteNumbering) mergedSettings.quoteNumbering = createDefaultConfig('DEV');
        if (!mergedSettings.deliveryNoteNumbering) mergedSettings.deliveryNoteNumbering = createDefaultConfig('BL');
        if (!mergedSettings.purchaseOrderNumbering) mergedSettings.purchaseOrderNumbering = createDefaultConfig('BC');
        if (!mergedSettings.creditNoteNumbering) mergedSettings.creditNoteNumbering = createDefaultConfig('AVO');
        
        if (!mergedSettings.documentLabels) {
            mergedSettings.documentLabels = DEFAULT_LABELS;
        } else if (mergedSettings.documentLabels.signatureRecipient === 'Signature & Cachet Client') {
            mergedSettings.documentLabels.signatureRecipient = 'Signature & Cachet';
        }
        if (mergedSettings.showSignatureRecipient === undefined) mergedSettings.showSignatureRecipient = false;
        if (!mergedSettings.priceDisplayMode) mergedSettings.priceDisplayMode = 'HT';
        if (!mergedSettings.documentInfoPosition) mergedSettings.documentInfoPosition = 'right';
        if (mergedSettings.showExpiryDate === undefined) mergedSettings.showExpiryDate = true;
        if (!mergedSettings.logoWidth) mergedSettings.logoWidth = 200;
        if (!mergedSettings.stampWidth) mergedSettings.stampWidth = 220;
        if (!mergedSettings.headerTextColor) mergedSettings.headerTextColor = '#ffffff';
        if (!mergedSettings.tableHeaderBgColor) mergedSettings.tableHeaderBgColor = mergedSettings.primaryColor || '#10b981';
        if (mergedSettings.showTableBorders === undefined) mergedSettings.showTableBorders = true;
        if (!mergedSettings.clientPosition) mergedSettings.clientPosition = 'right';
        if (mergedSettings.defaultTva === undefined) mergedSettings.defaultTva = 20;

        setLocalSettings(mergedSettings); 
        
        if (settings?.documentColumns && settings.documentColumns.length > 0) {
            const mergedColumns = DEFAULT_COLUMNS.map(defCol => {
                const savedCol = settings.documentColumns?.find(c => c.id === defCol.id);
                return savedCol || defCol;
            });
            setColumns(mergedColumns.sort((a, b) => a.order - b.order));
        } else {
            setColumns(DEFAULT_COLUMNS);
        }
    }, [settings]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setLocalSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleLabelChange = (field: keyof DocumentLabels, value: string) => {
        setLocalSettings(prev => ({
            ...prev,
            documentLabels: {
                ...(prev.documentLabels || DEFAULT_LABELS),
                [field]: value
            }
        }));
    };

    const handleNumberingChange = (type: DocConfigType, field: keyof NumberingConfig, value: string | number) => {
        const configKey = `${type}Numbering` as keyof CompanySettings;
        setLocalSettings(prev => ({
            ...prev,
            [configKey]: {
                ...(prev[configKey] as NumberingConfig),
                [field]: value
            }
        }));
    };

    const handleToggleAmountInWords = () => {
        setLocalSettings(prev => ({ ...prev, showAmountInWords: !prev.showAmountInWords }));
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newLogo = reader.result as string;
                setLocalSettings(prev => ({ ...prev, logo: newLogo }));
            };
            reader.readAsDataURL(file);
        } else {
            alert("Veuillez sélectionner un fichier image valide.");
        }
    };

    const handleStampChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newStamp = reader.result as string;
                setLocalSettings(prev => ({ ...prev, stamp: newStamp }));
            };
            reader.readAsDataURL(file);
        } else {
            alert("Veuillez sélectionner un fichier image valide.");
        }
    };

    const handleRemoveLogo = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setLocalSettings(prev => ({ ...prev, logo: null as any }));
    };

    const handleRemoveStamp = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setLocalSettings(prev => ({ ...prev, stamp: null as any }));
    };

    const toggleColumnVisibility = (id: string) => {
        const newColumns = columns.map(col => 
            col.id === id ? { ...col, visible: !col.visible } : col
        );
        setColumns(newColumns);
    };

    const updateColumnLabel = (id: string, label: string) => {
        setColumns(prev => prev.map(col => 
            col.id === id ? { ...col, label } : col
        ));
    };

    const moveColumn = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === columns.length - 1) return;

        const newColumns = [...columns];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newColumns[index], newColumns[targetIndex]] = [newColumns[targetIndex], newColumns[index]];
        newColumns.forEach((col, idx) => col.order = idx + 1);
        setColumns(newColumns);
    };
    
    const handleManualSave = async () => {
        setIsSaving(true);
        try {
            await onSave({ 
                ...localSettings as CompanySettings,
                documentColumns: columns
            });
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } catch (error: any) {
            console.error("Save failed", error);
            alert(`Erreur de sauvegarde: ${error.message || "Vérifiez votre connexion"}`);
        } finally {
            setIsSaving(false);
        }
    };

    const getPreviewNumber = (type: DocConfigType) => {
        const configKey = `${type}Numbering` as keyof CompanySettings;
        const cfg = localSettings[configKey] as NumberingConfig;
        if (!cfg) return '';
        const year = cfg.yearFormat === 'YYYY' ? '2026' : (cfg.yearFormat === 'YY' ? '26' : '');
        const sep = cfg.separator;
        const num = String(cfg.startNumber).padStart(cfg.padding, '0');
        return year ? `${cfg.prefix}${sep}${year}${sep}${num}` : `${cfg.prefix}${sep}${num}`;
    };

    const tabs = [
        { id: 'general', label: t('settings'), icon: Building, desc: language === 'es' ? 'Datos y Contacto' : 'Coordonnées & Contact' },
        { id: 'legal', label: language === 'es' ? 'NIF / Fiscal' : t('ice'), icon: ShieldCheck, desc: language === 'es' ? 'Identificadores' : 'Identifiants fiscaux' },
        { id: 'branding', label: language === 'es' ? 'Imagen' : 'Marque', icon: Palette, desc: language === 'es' ? 'Logo y Colores' : 'Logo & Couleurs' },
        { id: 'documents', label: language === 'es' ? 'Documentos' : 'Documents', icon: FileText, desc: language === 'es' ? 'Estructura PDF' : 'Structure PDF' },
    ];

    const docTypes: {id: DocConfigType, label: string, icon: any}[] = [
        { id: 'invoice', label: t('invoices'), icon: FileText },
        { id: 'quote', label: t('quotes'), icon: FileBarChart },
        { id: 'deliveryNote', label: language === 'es' ? 'Albarán' : 'B. Livraison', icon: Truck },
        { id: 'purchaseOrder', label: language === 'es' ? 'Pedido' : 'B. Commande', icon: ShoppingBag },
        { id: 'creditNote', label: t('creditNotes'), icon: FileMinus },
    ];

    const currentDocConfigKey = `${activeDocType}Numbering` as keyof CompanySettings;
    const currentDocConfig = localSettings[currentDocConfigKey] as NumberingConfig;
    const currentLabels = localSettings.documentLabels || DEFAULT_LABELS;

    return (
        <div className="w-full max-w-7xl mx-auto">
            <div className={`fixed bottom-6 right-6 z-50 transform transition-all duration-500 ease-out ${showToast ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
                <div className="bg-emerald-600 text-white px-5 py-4 rounded-xl shadow-2xl flex items-center gap-4 min-w-[320px] border border-emerald-500/50 backdrop-blur-sm">
                    <div className="p-2 bg-white/20 rounded-full shrink-0">
                        <CheckCircle size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-base"><span>{language === 'es' ? 'Cambios guardados' : 'Modifications enregistrées'}</span></h4>
                        <p className="text-sm text-emerald-50 mt-0.5"><span>{language === 'es' ? 'Sus ajustes han sido actualizados.' : 'Vos paramètres ont été mis à jour.'}</span></p>
                    </div>
                    <button onClick={() => setShowToast(false)} className="text-emerald-200 hover:text-white transition-colors p-1 rounded-md hover:bg-emerald-700">
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <Header title={t('settings')} />
                <button 
                    onClick={handleManualSave} 
                    disabled={isSaving}
                    className="inline-flex items-center justify-center gap-x-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:shadow-emerald-300 transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSaving ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            <span>{language === 'es' ? 'Guardando...' : 'Sauvegarde...'}</span>
                        </>
                    ) : (
                        <>
                            <Save size={18} />
                            <span>{language === 'es' ? 'Guardar todo' : 'Sauvegarder tout'}</span>
                        </>
                    )}
                </button>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-8">
                <div className="w-full lg:w-72 flex-shrink-0">
                    <nav className="bg-white rounded-2xl shadow-sm ring-1 ring-neutral-100 p-3 flex flex-col gap-1 sticky top-6">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as TabId)}
                                    className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 text-left group ${
                                        isActive 
                                        ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 shadow-sm' 
                                        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                                    }`}
                                >
                                    <div className={`p-2.5 rounded-lg transition-colors ${isActive ? 'bg-emerald-200/50 text-emerald-700' : 'bg-neutral-100 text-neutral-500 group-hover:bg-white group-hover:shadow-sm'}`}>
                                        <Icon size={20} />
                                    </div>
                                    <div>
                                        <div className="font-semibold"><span>{tab.label}</span></div>
                                        <div className={`text-xs mt-0.5 ${isActive ? 'text-emerald-600/80' : 'text-neutral-400'}`}><span>{tab.desc}</span></div>
                                    </div>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex-1 min-w-0">
                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-neutral-100 p-8">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-100">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Building size={20}/></div>
                                    <h3 className="text-xl font-bold text-neutral-900">{language === 'es' ? 'Datos Generales' : 'Informations Générales'}</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                    <div className="md:col-span-2">
                                         <InputField icon={Briefcase} label={t('company')} name="companyName" value={localSettings.companyName || ''} onChange={handleInputChange} placeholder="Ex: Facturago SARL" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <TextAreaField icon={MapPin} label={t('address')} name="address" value={localSettings.address || ''} onChange={handleInputChange} rows={3} placeholder="Adresse complète..." />
                                    </div>
                                    <InputField icon={Phone} label={t('phone')} name="phone" value={localSettings.phone || ''} onChange={handleInputChange} placeholder="+212 6..." />
                                    <InputField icon={Mail} label={t('email')} name="email" type="email" value={localSettings.email || ''} onChange={handleInputChange} placeholder="contact@entreprise.com" />
                                    <InputField icon={Globe} label="Site Web" name="website" value={localSettings.website || ''} onChange={handleInputChange} className="md:col-span-2" placeholder="www.votre-site.com" />
                                    <div className="md:col-span-2">
                                        <label htmlFor="defaultCurrencyCode" className="block text-sm font-semibold text-neutral-700 mb-2">{language === 'es' ? 'Moneda por defecto' : 'Devise par défaut'}</label>
                                        <div className="relative group">
                                            <select
                                                id="defaultCurrencyCode"
                                                name="defaultCurrencyCode"
                                                value={localSettings.defaultCurrencyCode || 'MAD'}
                                                onChange={handleInputChange}
                                                className="block w-full rounded-xl border-neutral-200 bg-neutral-50/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm py-2.5 pl-3 pr-10 transition-all"
                                            >
                                                {CURRENCIES.map(c => (
                                                    <option key={c.code} value={c.code}>{c.code} - {c.pluralNameFr}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="bg-neutral-50/50 p-5 rounded-xl border border-neutral-100 shadow-sm transition-all hover:shadow-md hover:border-emerald-200">
                                        <label htmlFor="defaultTva" className="block text-sm font-semibold text-neutral-700 mb-2">
                                            {language === 'es' ? 'TVA por defecto (%)' : 'TVA par défaut (%)'}
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type="number"
                                                id="defaultTva"
                                                name="defaultTva"
                                                value={localSettings.defaultTva ?? 20}
                                                onChange={(e) => setLocalSettings(prev => ({ ...prev, defaultTva: parseInt(e.target.value) || 0 }))}
                                                className="block w-full rounded-xl border-neutral-200 bg-neutral-50/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm py-2.5 pl-3 pr-10 transition-all"
                                                min="0"
                                                max="100"
                                                step="1"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'legal' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-neutral-100 p-8">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-100">
                                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><ShieldCheck size={20}/></div>
                                    <h3 className="text-xl font-bold text-neutral-900">{language === 'es' ? 'Identificadores Legales' : 'Identifiants Légaux'}</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <InputField icon={Hash} label={language === 'es' ? 'N.I.F' : 'I.C.E'} name="ice" value={localSettings.ice || ''} onChange={handleInputChange} placeholder="000000000" />
                                    <InputField icon={Hash} label="R.C" name="rc" value={localSettings.rc || ''} onChange={handleInputChange} placeholder="Registre de Commerce" />
                                    <InputField icon={Hash} label="I.F" name="fiscalId" value={localSettings.fiscalId || ''} onChange={handleInputChange} placeholder="Identifiant Fiscal" />
                                    <InputField icon={Hash} label="T.P / Patente" name="patente" value={localSettings.patente || ''} onChange={handleInputChange} placeholder="Taxe Professionnelle" />
                                    <InputField icon={Hash} label="CNSS" name="cnss" value={localSettings.cnss || ''} onChange={handleInputChange} placeholder="Numéro d'affiliation" />
                                    <InputField icon={Hash} label="Capital Social" name="capital" value={localSettings.capital || ''} onChange={handleInputChange} placeholder="100 000 MAD" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'branding' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-neutral-100 p-8">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-100">
                                    <div className="p-2 bg-pink-50 text-pink-600 rounded-lg"><Palette size={20}/></div>
                                    <h3 className="text-xl font-bold text-neutral-900">{language === 'es' ? 'Identidad Visual' : 'Identité Visuelle'}</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div>
                                        <label className="block text-sm font-semibold text-neutral-700 mb-3">{language === 'es' ? 'Logo de la empresa' : "Logo de l'entreprise"}</label>
                                        <div className="group relative w-full border-2 border-dashed border-neutral-300 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/30 transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden min-h-[12rem] py-4">
                                            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept="image/png, image/jpeg, image/svg+xml" onChange={handleLogoChange} />
                                            {localSettings.logo ? (
                                                <div className="relative w-full p-4 flex items-center justify-center overflow-hidden min-h-[12rem] py-4">
                                                    <img 
                                                        src={localSettings.logo} 
                                                        alt="Logo" 
                                                        className="object-contain transition-all duration-150" 
                                                        style={{ width: `${localSettings.logoWidth || 200}px`, maxWidth: '100%' }}
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-white font-medium flex items-center gap-2"><Upload size={18}/> {language === 'es' ? 'Cambiar' : 'Changer'}</span>
                                                    </div>
                                                    <button 
                                                        type="button"
                                                        onClick={handleRemoveLogo}
                                                        className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-red-50 hover:text-red-600 text-neutral-700 rounded-full z-20 shadow-md transition-all border border-neutral-200 duration-150 hover:scale-105 active:scale-95 animate-fadeIn"
                                                        title={language === 'es' ? 'Eliminar logo' : "Supprimer le logo"}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-center p-6">
                                                    <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-3 text-neutral-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                                                        <Upload size={24} />
                                                    </div>
                                                    <p className="text-sm font-medium text-neutral-700">{language === 'es' ? 'Subir logo' : 'Cliquez pour importer'}</p>
                                                    <p className="text-xs text-neutral-400 mt-1">PNG, JPG (Max 500x500px)</p>
                                                </div>
                                            )}
                                        </div>
                                        {localSettings.logo && (
                                            <div className="mt-4 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                                                        {language === 'es' ? 'Tamaño del logo' : 'Taille du logo'}
                                                    </label>
                                                    <span className="text-xs font-mono font-bold text-emerald-600 bg-white px-2 py-1 rounded border border-neutral-200">
                                                        {localSettings.logoWidth || 200}px
                                                    </span>
                                                </div>
                                                <input 
                                                    type="range" 
                                                    min="50" 
                                                    max="500" 
                                                    step="10"
                                                    value={localSettings.logoWidth || 200} 
                                                    onChange={(e) => setLocalSettings(prev => ({ ...prev, logoWidth: parseInt(e.target.value) }))}
                                                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                                />
                                                <div className="flex justify-between mt-1 mb-4">
                                                    <span className="text-[10px] text-neutral-400">Min</span>
                                                    <span className="text-[10px] text-neutral-400">Max</span>
                                                </div>

                                                {/* Filigrane (Watermark) settings */}
                                                <div className="pt-4 border-t border-neutral-100 flex flex-col gap-3">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <span className="text-xs font-bold text-neutral-700">
                                                                {language === 'es' ? 'Activar logotipo de fondo' : 'Activer le logo en arrière-plan'}
                                                            </span>
                                                            <p className="text-[10px] text-neutral-400">
                                                                {language === 'es' ? 'Centrado con opacidad en documentos' : 'Centré et estompé au milieu des documents'}
                                                            </p>
                                                        </div>
                                                        <button 
                                                            type="button"
                                                            onClick={() => setLocalSettings(prev => ({ ...prev, showLogoWatermark: !(prev.showLogoWatermark ?? true) }))}
                                                            className={`w-12 h-7 rounded-full flex items-center transition-colors duration-300 px-1 ${(localSettings.showLogoWatermark ?? true) ? 'bg-emerald-500 justify-end' : 'bg-neutral-300 justify-start'}`}
                                                        >
                                                            <div className="w-5 h-5 rounded-full bg-white shadow-md animate-scaleIn" />
                                                        </button>
                                                    </div>

                                                    {(localSettings.showLogoWatermark ?? true) && (
                                                        <div className="mt-1 animate-fadeIn">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                                                                    {language === 'es' ? 'Opacidad del logotipo' : 'Opacité du logo'}
                                                                </span>
                                                                <span className="text-xs font-mono font-bold text-emerald-600 bg-white px-2 py-0.5 rounded border border-neutral-200">
                                                                    {Math.round((localSettings.logoWatermarkOpacity ?? 0.07) * 100)}%
                                                                </span>
                                                            </div>
                                                            <input 
                                                                type="range" 
                                                                min="0.01" 
                                                                max="0.25" 
                                                                step="0.01"
                                                                value={localSettings.logoWatermarkOpacity ?? 0.07} 
                                                                onChange={(e) => setLocalSettings(prev => ({ ...prev, logoWatermarkOpacity: parseFloat(e.target.value) }))}
                                                                className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                                            />
                                                            <div className="flex justify-between mt-1">
                                                                <span className="text-[9px] text-neutral-400">1% ({language === 'es' ? 'Sutil' : 'Subtil'})</span>
                                                                <span className="text-[9px] text-neutral-400">25% ({language === 'es' ? 'Visible' : 'Visible'})</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-neutral-700 mb-3">Cachet de l'entreprise</label>
                                        <div className="group relative w-full border-2 border-dashed border-neutral-300 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/30 transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden min-h-[12rem] py-4">
                                            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept="image/png, image/jpeg, image/svg+xml" onChange={handleStampChange} />
                                            {localSettings.stamp ? (
                                                <div className="relative w-full p-4 flex items-center justify-center overflow-hidden min-h-[12rem] py-4">
                                                    <img 
                                                        src={localSettings.stamp} 
                                                        alt="Cachet" 
                                                        className="object-contain transition-all duration-150" 
                                                        style={{ width: `${localSettings.stampWidth || 220}px`, maxWidth: '100%' }}
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-white font-medium flex items-center gap-2"><Upload size={18}/> {language === 'es' ? 'Cambiar' : 'Changer'}</span>
                                                    </div>
                                                    <button 
                                                        type="button"
                                                        onClick={handleRemoveStamp}
                                                        className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-red-50 hover:text-red-600 text-neutral-700 rounded-full z-20 shadow-md transition-all border border-neutral-200 duration-150 hover:scale-105 active:scale-95 animate-fadeIn"
                                                        title={language === 'es' ? 'Eliminar sello' : "Supprimer le cachet"}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-center p-6">
                                                    <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-3 text-neutral-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                                                        <Upload size={24} />
                                                    </div>
                                                    <p className="text-sm font-medium text-neutral-700">Cliquez pour importer</p>
                                                    <p className="text-xs text-neutral-400 mt-1">PNG, JPG (Transparent)</p>
                                                </div>
                                            )}
                                        </div>
                                        {localSettings.stamp && (
                                            <div className="mt-4 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                                                        {language === 'es' ? 'Tamaño del sello' : 'Taille du cachet'}
                                                    </label>
                                                    <span className="text-xs font-mono font-bold text-emerald-600 bg-white px-2 py-1 rounded border border-neutral-200">
                                                        {localSettings.stampWidth || 220}px
                                                    </span>
                                                </div>
                                                <input 
                                                    type="range" 
                                                    min="50" 
                                                    max="500" 
                                                    step="10"
                                                    value={localSettings.stampWidth || 220} 
                                                    onChange={(e) => setLocalSettings(prev => ({ ...prev, stampWidth: parseInt(e.target.value) }))}
                                                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                                />
                                                <div className="flex justify-between mt-1 mb-4">
                                                    <span className="text-[10px] text-neutral-400">Min</span>
                                                    <span className="text-[10px] text-neutral-400">Max</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label htmlFor="primaryColor" className="block text-sm font-semibold text-neutral-700 mb-3">{language === 'es' ? 'Color principal' : 'Couleur principale'}</label>
                                        <div className="flex items-center gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                                            <div className="relative overflow-hidden w-16 h-16 rounded-xl shadow-sm ring-2 ring-white ring-offset-2 ring-offset-neutral-100">
                                                <input type="color" id="primaryColor" name="primaryColor" value={localSettings.primaryColor || '#10b981'} onChange={handleInputChange} className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer p-0 border-0" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center bg-white border border-neutral-200 rounded-lg px-3 py-2 w-full max-w-[140px]">
                                                    <span className="text-neutral-400 mr-2">#</span>
                                                    <input 
                                                        type="text" 
                                                        value={(localSettings.primaryColor || '#10b981').replace('#', '')} 
                                                        onChange={(e) => {
                                                            let val = e.target.value.trim();
                                                            // Keep only valid hex characters
                                                            val = val.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
                                                            setLocalSettings(prev => ({ ...prev, primaryColor: `#${val}` }));
                                                        }} 
                                                        name="primaryColor" 
                                                        className="w-full text-sm font-mono uppercase focus:outline-none text-neutral-700" 
                                                        placeholder="10B981"
                                                    />
                                                </div>
                                                <p className="mt-2 text-xs text-neutral-500 leading-relaxed">
                                                    {language === 'es' ? 'Usado para títulos y bordes en los PDFs.' : 'Utilisée pour les titres, bordures et accents dans vos factures.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="headerTextColor" className="block text-sm font-semibold text-neutral-700 mb-3">{language === 'es' ? 'Color del texto del encabezado' : "Couleur du texte de l'en-tête (tableau)"}</label>
                                        <div className="flex items-center gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                                            <div className="relative overflow-hidden w-16 h-16 rounded-xl shadow-sm ring-2 ring-white ring-offset-2 ring-offset-neutral-100">
                                                <input type="color" id="headerTextColor" name="headerTextColor" value={localSettings.headerTextColor || '#ffffff'} onChange={handleInputChange} className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer p-0 border-0" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center bg-white border border-neutral-200 rounded-lg px-3 py-2 w-full max-w-[140px]">
                                                    <span className="text-neutral-400 mr-2">#</span>
                                                    <input 
                                                        type="text" 
                                                        value={(localSettings.headerTextColor || '#ffffff').replace('#', '')} 
                                                        onChange={(e) => {
                                                            let val = e.target.value.trim();
                                                            // Keep only valid hex characters
                                                            val = val.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
                                                            setLocalSettings(prev => ({ ...prev, headerTextColor: `#${val}` }));
                                                        }} 
                                                        name="headerTextColor" 
                                                        className="w-full text-sm font-mono uppercase focus:outline-none text-neutral-700" 
                                                        placeholder="FFFFFF"
                                                    />
                                                </div>
                                                <p className="mt-2 text-xs text-neutral-500 leading-relaxed">
                                                    {language === 'es' ? 'Usado para el color de los textos en la cabecera de las tablas.' : "Utilisée pour la couleur du texte dans l'en-tête du tableau (ex: désignation, Qté, etc.)."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="tableHeaderBgColor" className="block text-sm font-semibold text-neutral-700 mb-3">{language === 'es' ? 'Color de la barra del encabezado' : "Couleur de la barre de l'en-tête (tableau)"}</label>
                                        <div className="flex items-center gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                                            <div className="relative overflow-hidden w-16 h-16 rounded-xl shadow-sm ring-2 ring-white ring-offset-2 ring-offset-neutral-100">
                                                <input type="color" id="tableHeaderBgColor" name="tableHeaderBgColor" value={localSettings.tableHeaderBgColor || '#10b981'} onChange={handleInputChange} className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer p-0 border-0" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center bg-white border border-neutral-200 rounded-lg px-3 py-2 w-full max-w-[140px]">
                                                    <span className="text-neutral-400 mr-2">#</span>
                                                    <input 
                                                        type="text" 
                                                        value={(localSettings.tableHeaderBgColor || '#10b981').replace('#', '')} 
                                                        onChange={(e) => {
                                                            let val = e.target.value.trim();
                                                            // Keep only valid hex characters
                                                            val = val.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
                                                            setLocalSettings(prev => ({ ...prev, tableHeaderBgColor: `#${val}` }));
                                                        }} 
                                                        name="tableHeaderBgColor" 
                                                        className="w-full text-sm font-mono uppercase focus:outline-none text-neutral-700" 
                                                        placeholder="10B981"
                                                    />
                                                </div>
                                                <p className="mt-2 text-xs text-neutral-500 leading-relaxed">
                                                    {language === 'es' ? 'Color de fondo personalizado para la barra de la cabecera de la tabla.' : "Couleur de fond personnalisée pour la barre de l'en-tête du tableau."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <div className="space-y-6 animate-fadeIn">
                             {/* Pricing Mode Section */}
                             <div className="bg-white rounded-2xl shadow-sm ring-1 ring-neutral-100 p-4 md:p-8">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-100">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Eye size={20}/></div>
                                    <div>
                                        <h3 className="text-xl font-bold text-neutral-900">{t('priceDisplayMode')}</h3>
                                        <p className="text-sm text-neutral-500 font-normal">{language === 'es' ? 'Elija cómo mostrar los precios en sus documentos.' : 'Choisissez comment afficher les prix unitaires et totaux dans vos documents.'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button 
                                        onClick={() => setLocalSettings(prev => ({ ...prev, priceDisplayMode: 'HT' }))}
                                        className={`flex flex-col p-4 rounded-xl border-2 transition-all text-left ${localSettings.priceDisplayMode === 'HT' ? 'border-emerald-500 bg-emerald-50' : 'border-neutral-100 hover:border-neutral-200 bg-white'}`}
                                    >
                                        <div className="font-bold text-neutral-900">{language === 'es' ? 'Modo Base (Base imp.)' : 'Mode Classique (HT)'}</div>
                                        <div className="text-xs text-neutral-500 mt-1">{language === 'es' ? 'Muestra precios sin IVA. Recomendado para B2B.' : 'Affiche P.U. HT et Total HT dans le tableau. Recommandé pour le B2B.'}</div>
                                    </button>
                                    <button 
                                        onClick={() => setLocalSettings(prev => ({ ...prev, priceDisplayMode: 'TTC' }))}
                                        className={`flex flex-col p-4 rounded-xl border-2 transition-all text-left ${localSettings.priceDisplayMode === 'TTC' ? 'border-emerald-500 bg-emerald-50' : 'border-neutral-100 hover:border-neutral-200 bg-white'}`}
                                    >
                                        <div className="font-bold text-neutral-900">{language === 'es' ? 'Modo con IVA (Total)' : 'Mode Simplifié (TTC)'}</div>
                                        <div className="text-xs text-neutral-500 mt-1">{language === 'es' ? 'Muestra precios con IVA incluido. Recomendado para particulares.' : 'Affiche directement les montants TTC par article. Recommandé pour les particuliers.'}</div>
                                    </button>
                                </div>
                            </div>

                             {/* Numbering Section */}
                             <div className="bg-white rounded-2xl shadow-sm ring-1 ring-neutral-100 p-5 md:p-8">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-100">
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Settings2 size={20}/></div>
                                    <div>
                                        <h3 className="text-lg md:text-xl font-bold text-neutral-900">{language === 'es' ? 'Numeración de documentos' : 'Configuration de numérotation'}</h3>
                                        <p className="text-sm text-neutral-500">{language === 'es' ? 'Personalice el formato de sus números.' : 'Personnalisez le format de vos numéros par document.'}</p>
                                    </div>
                                </div>
                                
                                <div className="mb-8">
                                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3 ml-1">
                                        {language === 'es' ? 'Tipo de documento' : 'Type de document'}
                                    </label>
                                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                                        {docTypes.map((type, index) => (
                                            <button
                                                key={type.id}
                                                onClick={() => setActiveDocType(type.id)}
                                                className={`
                                                    relative flex items-center justify-center gap-2 px-2 py-3 rounded-xl border-2 transition-all duration-200 w-full sm:w-auto sm:justify-start
                                                    ${index === 4 ? 'col-span-2 sm:col-span-auto' : ''}
                                                    ${activeDocType === type.id 
                                                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 shadow-sm' 
                                                        : 'border-transparent bg-neutral-50 text-neutral-600 hover:bg-neutral-100 hover:border-neutral-200'}
                                                `}
                                            >
                                                <type.icon size={18} className={`shrink-0 ${activeDocType === type.id ? 'text-emerald-600' : 'text-neutral-400'}`} />
                                                <span className="font-semibold text-xs sm:text-sm truncate">{type.label}</span>
                                                {activeDocType === type.id && (
                                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {currentDocConfig && (
                                    <div className="space-y-6 animate-fadeIn">
                                        {/* Format Group */}
                                        <div className="bg-neutral-50/50 rounded-xl p-4 md:p-5 border border-neutral-100">
                                            <h4 className="text-sm font-bold text-neutral-900 mb-4 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                {language === 'es' ? 'Formato' : 'Format'}
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-neutral-500 mb-1.5 uppercase tracking-wide">{language === 'es' ? 'Prefijo' : 'Préfixe'}</label>
                                                    <div className="relative">
                                                        <input 
                                                            type="text" 
                                                            value={currentDocConfig.prefix} 
                                                            onChange={(e) => handleNumberingChange(activeDocType, 'prefix', e.target.value)}
                                                            className="block w-full rounded-lg border-neutral-200 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 py-2.5 px-3 text-sm font-medium transition-shadow"
                                                            placeholder="EX: FAC"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-neutral-500 mb-1.5 uppercase tracking-wide">{language === 'es' ? 'Separador' : 'Séparateur'}</label>
                                                    <input 
                                                        type="text" 
                                                        value={currentDocConfig.separator} 
                                                        onChange={(e) => handleNumberingChange(activeDocType, 'separator', e.target.value)}
                                                        className="block w-full rounded-lg border-neutral-200 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 py-2.5 px-3 text-sm font-medium text-center transition-shadow"
                                                        placeholder="/"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-neutral-500 mb-1.5 uppercase tracking-wide">{language === 'es' ? 'Formato Año' : 'Format Année'}</label>
                                                    <select 
                                                        value={currentDocConfig.yearFormat} 
                                                        onChange={(e) => handleNumberingChange(activeDocType, 'yearFormat', e.target.value as any)}
                                                        className="block w-full rounded-lg border-neutral-200 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 py-2.5 px-3 text-sm font-medium transition-shadow"
                                                    >
                                                        <option value="YYYY">{language === 'es' ? '2026 (YYYY)' : '2026 (YYYY)'}</option>
                                                        <option value="YY">{language === 'es' ? '26 (YY)' : '26 (YY)'}</option>
                                                        <option value="NONE">{language === 'es' ? 'Ninguno' : 'Aucun'}</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Sequence Group */}
                                        <div className="bg-neutral-50/50 rounded-xl p-4 md:p-5 border border-neutral-100">
                                            <h4 className="text-sm font-bold text-neutral-900 mb-4 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                {language === 'es' ? 'Secuencia' : 'Séquence'}
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-neutral-500 mb-1.5 uppercase tracking-wide">{language === 'es' ? 'Empezar en' : 'Départ à'}</label>
                                                    <input 
                                                        type="number" 
                                                        value={currentDocConfig.startNumber} 
                                                        onChange={(e) => handleNumberingChange(activeDocType, 'startNumber', parseInt(e.target.value) || 1)}
                                                        className="block w-full rounded-lg border-neutral-200 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 py-2.5 px-3 text-sm font-medium transition-shadow"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-neutral-500 mb-1.5 uppercase tracking-wide">{language === 'es' ? 'Relleno (Ceros)' : 'Remplissage (Zéros)'}</label>
                                                    <div className="flex items-center gap-3">
                                                        <input 
                                                            type="range" 
                                                            min="1" 
                                                            max="10" 
                                                            value={currentDocConfig.padding} 
                                                            onChange={(e) => handleNumberingChange(activeDocType, 'padding', parseInt(e.target.value) || 5)}
                                                            className="flex-1 h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                                        />
                                                        <span className="w-12 text-center py-1 bg-white border border-neutral-200 rounded-md text-sm font-bold text-neutral-700">
                                                            {currentDocConfig.padding}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-6 md:mt-8">
                                    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900 to-emerald-800 rounded-2xl shadow-lg p-6 text-white">
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <FileText size={120} />
                                        </div>
                                        <div className="relative z-10">
                                            <p className="text-emerald-200 text-xs font-bold uppercase tracking-widest mb-2">
                                                {language === 'es' ? 'Vista previa' : 'Aperçu'} • {docTypes.find(d => d.id === activeDocType)?.label}
                                            </p>
                                            <div className="flex items-end gap-3">
                                                <p className="text-3xl md:text-4xl font-mono font-bold tracking-tight text-white break-all">
                                                    {getPreviewNumber(activeDocType)}
                                                </p>
                                            </div>
                                            <div className="mt-4 flex items-center gap-2 text-emerald-300 text-xs bg-white/10 w-fit px-3 py-1.5 rounded-full backdrop-blur-sm">
                                                <CheckCircle size={12} />
                                                {language === 'es' ? 'Formato válido' : 'Format valide'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Custom Labels Section */}
                            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-neutral-100 p-4 md:p-8">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-100">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><PencilLine size={20}/></div>
                                    <div>
                                        <h3 className="text-xl font-bold text-neutral-900">{t('customLabels')}</h3>
                                        <p className="text-sm text-neutral-500 font-normal">{language === 'es' ? 'Modifique los textos de sus PDFs.' : 'Modifiez les textes affichés dans vos tableaux et signatures PDF.'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <InputField 
                                        label={t('labelTotalHt')} 
                                        value={currentLabels.totalHt || ''} 
                                        onChange={(e: any) => handleLabelChange('totalHt', e.target.value)} 
                                        placeholder="Ex: Total HT" 
                                    />
                                    <InputField 
                                        label={t('labelTotalTax')} 
                                        value={currentLabels.totalTax || ''} 
                                        onChange={(e: any) => handleLabelChange('totalTax', e.target.value)} 
                                        placeholder="Ex: Total TVA" 
                                    />
                                    <InputField 
                                        label={t('labelTotalNet')} 
                                        value={currentLabels.totalNet || ''} 
                                        onChange={(e: any) => handleLabelChange('totalNet', e.target.value)} 
                                        placeholder="Ex: Net à Payer" 
                                    />
                                    <InputField 
                                        label={t('labelSignatureRecipient')} 
                                        value={currentLabels.signatureRecipient || ''} 
                                        onChange={(e: any) => handleLabelChange('signatureRecipient', e.target.value)} 
                                        placeholder="Ex: Signature Destinataire" 
                                    />
                                    <InputField 
                                        label={t('labelAmountWordsPrefix')} 
                                        value={currentLabels.amountInWordsPrefix || ''} 
                                        onChange={(e: any) => handleLabelChange('amountInWordsPrefix', e.target.value)} 
                                        placeholder="Ex: Arrêté le présent document à la somme de :" 
                                    />
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-neutral-100 p-4 md:p-8">
                                <div className="flex items-center gap-3 mb-2 pb-4 border-b border-neutral-100">
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><LayoutTemplate size={20}/></div>
                                    <div>
                                        <h3 className="text-xl font-bold text-neutral-900">{language === 'es' ? 'Opciones de visualización' : 'Affichage & Options'}</h3>
                                        <p className="text-sm text-neutral-500 font-normal">{language === 'es' ? 'Controle la information en sus PDFs.' : 'Contrôlez les informations affichées sur vos PDF.'}</p>
                                    </div>
                                </div>
                                <div className="mt-6 flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg shadow-sm text-slate-600">
                                            <Type size={20}/>
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900">{language === 'es' ? 'Importe en letras' : 'Montant en toutes lettres'}</div>
                                            <div className="text-xs text-slate-500">{language === 'es' ? 'Muestra el total escrito en letras al final.' : 'Affiche la somme totale écrite à la main en bas du document'}</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleToggleAmountInWords}
                                        className={`w-12 h-7 rounded-full flex items-center transition-colors duration-300 px-1 ${localSettings.showAmountInWords ? 'bg-emerald-500 justify-end' : 'bg-neutral-300 justify-start'}`}
                                    >
                                        <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                                    </button>
                                </div>
                                <div className="mt-4 flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg shadow-sm text-slate-600">
                                            <PencilLine size={20}/>
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900">{t('labelSignatureRecipient')}</div>
                                            <div className="text-xs text-slate-500">{language === 'es' ? 'Muestra la sección de firma para el cliente.' : 'Affiche la section signature pour le client.'}</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setLocalSettings(prev => ({ ...prev, showSignatureRecipient: !prev.showSignatureRecipient }))}
                                        className={`w-12 h-7 rounded-full flex items-center transition-colors duration-300 px-1 ${localSettings.showSignatureRecipient ? 'bg-emerald-500 justify-end' : 'bg-neutral-300 justify-start'}`}
                                    >
                                        <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                                    </button>
                                </div>

                                <div className="mt-4 flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg shadow-sm text-slate-600">
                                            <Grid size={20}/>
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900">{language === 'es' ? 'Líneas de la tabla' : 'Lignes verticales du tableau'}</div>
                                            <div className="text-xs text-slate-500">{language === 'es' ? 'Activar o desactivar las líneas verticales grises en las tablas.' : 'Activer ou désactiver les lignes verticales grises dans le tableau.'}</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setLocalSettings(prev => ({ ...prev, showTableBorders: prev.showTableBorders === undefined ? false : !prev.showTableBorders }))}
                                        className={`w-12 h-7 rounded-full flex items-center transition-colors duration-300 px-1 ${localSettings.showTableBorders !== false ? 'bg-emerald-500 justify-end' : 'bg-neutral-300 justify-start'}`}
                                    >
                                        <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                                    </button>
                                </div>

                                <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-white rounded-lg shadow-sm text-slate-600">
                                            <Building size={20}/>
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900">{language === 'es' ? 'Posición del recuadro del cliente' : "Position de l'encadré du client"}</div>
                                            <div className="text-xs text-slate-500">{language === 'es' ? 'Elija si desea colocar el recuadro del cliente a la izquierda o a la derecha.' : "Choisissez d'aligner l'encadré d'adresse du client à gauche ou à droite."}</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <button 
                                            onClick={() => setLocalSettings(prev => ({ ...prev, clientPosition: 'right' }))}
                                            className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${(!localSettings.clientPosition || localSettings.clientPosition === 'right') ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'}`}
                                        >
                                            <div className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center">
                                                {(!localSettings.clientPosition || localSettings.clientPosition === 'right') && <div className="w-2 h-2 rounded-full bg-current" />}
                                            </div>
                                            <span className="font-semibold text-sm">{language === 'es' ? 'A la derecha' : 'À droite (Défaut)'}</span>
                                        </button>
                                        <button 
                                            onClick={() => setLocalSettings(prev => ({ ...prev, clientPosition: 'left' }))}
                                            className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${localSettings.clientPosition === 'left' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'}`}
                                        >
                                            <div className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center">
                                                {localSettings.clientPosition === 'left' && <div className="w-2 h-2 rounded-full bg-current" />}
                                            </div>
                                            <span className="font-semibold text-sm">{language === 'es' ? 'A la izquierda' : 'À gauche'}</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-white rounded-lg shadow-sm text-slate-600">
                                            <LayoutTemplate size={20}/>
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900">{language === 'es' ? 'Posición de la información' : 'Position des informations du document'}</div>
                                            <div className="text-xs text-slate-500">{language === 'es' ? 'Elija dónde mostrar el número y la date.' : 'Choisissez où afficher le numéro, la date et le titre du document.'}</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <button 
                                            onClick={() => setLocalSettings(prev => ({ ...prev, documentInfoPosition: 'right' }))}
                                            className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${(!localSettings.documentInfoPosition || localSettings.documentInfoPosition === 'right') ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'}`}
                                        >
                                            <div className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center">
                                                {(!localSettings.documentInfoPosition || localSettings.documentInfoPosition === 'right') && <div className="w-2 h-2 rounded-full bg-current" />}
                                            </div>
                                            <span className="font-semibold text-sm">{language === 'es' ? 'A la derecha' : 'À droite (Défaut)'}</span>
                                        </button>
                                        <button 
                                            onClick={() => setLocalSettings(prev => ({ ...prev, documentInfoPosition: 'left' }))}
                                            className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${localSettings.documentInfoPosition === 'left' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'}`}
                                        >
                                            <div className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center">
                                                {localSettings.documentInfoPosition === 'left' && <div className="w-2 h-2 rounded-full bg-current" />}
                                            </div>
                                            <span className="font-semibold text-sm">{language === 'es' ? 'Bajo el logo' : 'Sous le logo (À gauche)'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-neutral-100 p-4 md:p-8">
                                <div className="flex items-center gap-3 mb-2 pb-4 border-b border-neutral-100">
                                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><LayoutTemplate size={20}/></div>
                                    <div>
                                        <h3 className="text-xl font-bold text-neutral-900">{language === 'es' ? 'Tablas PDF' : 'Tableaux PDF'}</h3>
                                        <p className="text-sm text-neutral-500 font-normal">{language === 'es' ? 'Personalice las columnas de sus documentos.' : 'Personnalisez les colonnes de vos factures et devis.'}</p>
                                    </div>
                                </div>
                                <div className="mt-6 flex flex-col gap-3">
                                    {columns.map((col, index) => (
                                        <div key={col.id} className={`flex items-center gap-4 p-3 rounded-xl border transition-all duration-200 ${col.visible ? 'bg-white border-neutral-200 shadow-sm' : 'bg-neutral-50 border-transparent opacity-70'}`}>
                                            <div className="flex flex-col gap-1 text-neutral-400">
                                                <button onClick={() => moveColumn(index, 'up')} disabled={index === 0} className="hover:text-neutral-700 disabled:opacity-20"><ArrowUp size={16} /></button>
                                                <button onClick={() => moveColumn(index, 'down')} disabled={index === columns.length - 1} className="hover:text-neutral-700 disabled:opacity-20"><ArrowDown size={16} /></button>
                                            </div>
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                                <div>
                                                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1 block">{language === 'es' ? 'Título' : 'Titre Colonne'}</label>
                                                    <input type="text" value={col.label} onChange={(e) => updateColumnLabel(col.id, e.target.value)} className={`block w-full bg-transparent border-b-2 border-transparent focus:border-emerald-500 focus:outline-none px-0 py-1 font-medium text-neutral-900 ${!col.visible && 'text-neutral-500'}`} disabled={!col.visible} />
                                                </div>
                                                <div className="flex items-center justify-end gap-3">
                                                    <span className={`text-sm ${col.visible ? 'text-emerald-600 font-medium' : 'text-neutral-400'}`}>{col.visible ? (language === 'es' ? 'Visible' : 'Affichée') : (language === 'es' ? 'Oculta' : 'Masquée')}</span>
                                                    <button onClick={() => toggleColumnVisibility(col.id)} className={`w-12 h-7 rounded-full flex items-center transition-colors duration-300 px-1 ${col.visible ? 'bg-emerald-500 justify-end' : 'bg-neutral-300 justify-start'}`}><div className="w-5 h-5 rounded-full bg-white shadow-md" /></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-neutral-100 p-4 md:p-8">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-100">
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><FileText size={20}/></div>
                                    <h3 className="text-xl font-bold text-neutral-900">{language === 'es' ? 'Pie de página y Condiciones' : 'Pied de page & Conditions'}</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                    <InputField icon={CreditCard} label={language === 'es' ? 'Condiciones de pago por defecto' : "Conditions de paiement par défaut"} name="defaultPaymentTerms" value={localSettings.defaultPaymentTerms || ''} onChange={handleInputChange} placeholder="Ex: Paiement à 30 jours, Au comptant..." />
                                    <div>
                                        <TextAreaField label={language === 'es' ? 'Notas al pie por defecto' : "Pied de page par défaut"} name="footerNotes" value={localSettings.footerNotes || ''} onChange={handleInputChange} rows={3} placeholder="Merci de votre confiance..." />
                                        <p className="mt-2 text-xs text-neutral-500 flex items-center gap-1"><LayoutTemplate size={12}/> {language === 'es' ? 'Este texto aparecerá en todos sus documentos.' : 'Ce texte apparaîtra en bas de tous vos documents.'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const InputField = ({ label, icon: Icon, className, ...props }: { label: string, icon?: any, className?: string, [key: string]: any }) => (
    <div className={className}>
        <label htmlFor={props.name} className="block text-sm font-semibold text-neutral-700 mb-2">{label}</label>
        <div className="relative group">
            {Icon && (
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icon className="h-5 w-5 text-neutral-400 group-focus-within:text-emerald-500 transition-colors" />
                </div>
            )}
            <input id={props.name} {...props} className={`block w-full rounded-xl border-neutral-200 bg-neutral-50/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm py-2.5 transition-all ${Icon ? 'pl-10' : 'pl-3'}`} />
        </div>
    </div>
);

const TextAreaField = ({ label, icon: Icon, className, ...props }: { label: string, icon?: any, className?: string, [key: string]: any }) => (
    <div className={className}>
        <label htmlFor={props.name} className="block text-sm font-semibold text-neutral-700 mb-2">{label}</label>
        <div className="relative group">
             {Icon && (
                <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                    <Icon className="h-5 w-5 text-neutral-400 group-focus-within:text-emerald-500 transition-colors" />
                </div>
            )}
            <textarea id={props.name} {...props} className={`block w-full rounded-xl border-neutral-200 bg-neutral-50/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm py-2.5 transition-all ${Icon ? 'pl-10' : 'pl-3'}`} />
        </div>
    </div>
);

export default TemplateCustomizer;
