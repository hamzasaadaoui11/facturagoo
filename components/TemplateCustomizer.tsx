
import React, { useState, useEffect } from 'react';
import Header from './Header';
import { CompanySettings, DocumentColumn } from '../types';
import { 
    Save, Upload, Building, Palette, FileText, CheckCircle, X, 
    ArrowUp, ArrowDown, Eye, EyeOff, LayoutTemplate, Briefcase, 
    CreditCard, MapPin, Globe, Mail, Phone, Hash, ShieldCheck, Loader2, AlertCircle
} from 'lucide-react';

interface TemplateCustomizerProps {
    settings: CompanySettings | null;
    onSave: (settings: CompanySettings) => Promise<void>; // Changed to Promise
}

const DEFAULT_COLUMNS: DocumentColumn[] = [
    { id: 'name', label: 'Désignation', visible: true, order: 1 },
    { id: 'quantity', label: 'Qté', visible: true, order: 2 },
    { id: 'unitPrice', label: 'P.U. HT', visible: true, order: 3 },
    { id: 'vat', label: 'TVA', visible: true, order: 4 },
    { id: 'total', label: 'Total HT', visible: true, order: 5 },
];

type TabId = 'general' | 'legal' | 'branding' | 'documents';

const TemplateCustomizer: React.FC<TemplateCustomizerProps> = ({ settings, onSave }) => {
    const [localSettings, setLocalSettings] = useState<Partial<CompanySettings>>({});
    const [columns, setColumns] = useState<DocumentColumn[]>(DEFAULT_COLUMNS);
    const [showToast, setShowToast] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<TabId>('general');

    useEffect(() => {
        setLocalSettings(settings || { primaryColor: '#10b981' }); 
        if (settings?.documentColumns && settings.documentColumns.length > 0) {
            setColumns(settings.documentColumns.sort((a, b) => a.order - b.order));
        }
    }, [settings]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setLocalSettings(prev => ({ ...prev, [name]: value }));
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

    // --- Column Management Functions ---

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
        
        // Swap
        [newColumns[index], newColumns[targetIndex]] = [newColumns[targetIndex], newColumns[index]];
        
        // Reassign order numbers
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
            // Show alert directly if save fails
            alert(`Erreur de sauvegarde: ${error.message || "Vérifiez votre connexion"}`);
        } finally {
            setIsSaving(false);
        }
    };

    const tabs = [
        { id: 'general', label: 'Général', icon: Building, desc: 'Coordonnées & Contact' },
        { id: 'legal', label: 'Juridique', icon: ShieldCheck, desc: 'Identifiants fiscaux' },
        { id: 'branding', label: 'Marque', icon: Palette, desc: 'Logo & Couleurs' },
        { id: 'documents', label: 'Documents', icon: FileText, desc: 'Structure PDF' },
    ];

    return (
        <div className="w-full max-w-7xl mx-auto">
            {/* Notification Toast */}
            <div className={`fixed bottom-6 right-6 z-50 transform transition-all duration-500 ease-out ${showToast ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
                <div className="bg-emerald-600 text-white px-5 py-4 rounded-xl shadow-2xl flex items-center gap-4 min-w-[320px] border border-emerald-500/50 backdrop-blur-sm">
                    <div className="p-2 bg-white/20 rounded-full shrink-0">
                        <CheckCircle size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-base">Modifications enregistrées</h4>
                        <p className="text-sm text-emerald-50 mt-0.5">Vos paramètres ont été mis à jour.</p>
                    </div>
                    <button onClick={() => setShowToast(false)} className="text-emerald-200 hover:text-white transition-colors p-1 rounded-md hover:bg-emerald-700">
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <Header title="Paramètres de l'entreprise" />
                <button 
                    onClick={handleManualSave} 
                    disabled={isSaving}
                    className="inline-flex items-center justify-center gap-x-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:shadow-emerald-300 transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {isSaving ? 'Sauvegarde...' : 'Sauvegarder tout'}
                </button>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Navigation */}
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
                                        <div className="font-semibold">{tab.label}</div>
                                        <div className={`text-xs mt-0.5 ${isActive ? 'text-emerald-600/80' : 'text-neutral-400'}`}>{tab.desc}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 min-w-0">
                    
                    {/* SECTION 1: GENERAL */}
                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-neutral-100 p-8">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-100">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Building size={20}/></div>
                                    <h3 className="text-xl font-bold text-neutral-900">Informations Générales</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                    <div className="md:col-span-2">
                                         <InputField icon={Briefcase} label="Nom de la société / Raison sociale" name="companyName" value={localSettings.companyName || ''} onChange={handleInputChange} placeholder="Ex: Facturago SARL" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <TextAreaField icon={MapPin} label="Adresse du siège" name="address" value={localSettings.address || ''} onChange={handleInputChange} rows={3} placeholder="Adresse complète..." />
                                    </div>
                                    <InputField icon={Phone} label="Téléphone" name="phone" value={localSettings.phone || ''} onChange={handleInputChange} placeholder="+212 6..." />
                                    <InputField icon={Mail} label="Email de contact" name="email" type="email" value={localSettings.email || ''} onChange={handleInputChange} placeholder="contact@entreprise.com" />
                                    <InputField icon={Globe} label="Site Web" name="website" value={localSettings.website || ''} onChange={handleInputChange} className="md:col-span-2" placeholder="www.votre-site.com" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION 2: LEGAL */}
                    {activeTab === 'legal' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-neutral-100 p-8">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-100">
                                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><ShieldCheck size={20}/></div>
                                    <h3 className="text-xl font-bold text-neutral-900">Identifiants Légaux</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <InputField icon={Hash} label="I.C.E" name="ice" value={localSettings.ice || ''} onChange={handleInputChange} placeholder="000000000" />
                                    <InputField icon={Hash} label="R.C" name="rc" value={localSettings.rc || ''} onChange={handleInputChange} placeholder="Registre de Commerce" />
                                    <InputField icon={Hash} label="I.F" name="fiscalId" value={localSettings.fiscalId || ''} onChange={handleInputChange} placeholder="Identifiant Fiscal" />
                                    <InputField icon={Hash} label="T.P / Patente" name="patente" value={localSettings.patente || ''} onChange={handleInputChange} placeholder="Taxe Professionnelle" />
                                    <InputField icon={Hash} label="CNSS" name="cnss" value={localSettings.cnss || ''} onChange={handleInputChange} placeholder="Numéro d'affiliation" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION 3: BRANDING */}
                    {activeTab === 'branding' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-neutral-100 p-8">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-100">
                                    <div className="p-2 bg-pink-50 text-pink-600 rounded-lg"><Palette size={20}/></div>
                                    <h3 className="text-xl font-bold text-neutral-900">Identité Visuelle</h3>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    {/* Logo Upload */}
                                    <div>
                                        <label className="block text-sm font-semibold text-neutral-700 mb-3">Logo de l'entreprise</label>
                                        <div className="group relative w-full h-48 border-2 border-dashed border-neutral-300 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/30 transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden">
                                            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept="image/png, image/jpeg, image/svg+xml" onChange={handleLogoChange} />
                                            
                                            {localSettings.logo ? (
                                                <div className="relative w-full h-full p-4 flex items-center justify-center">
                                                    <img src={localSettings.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-white font-medium flex items-center gap-2"><Upload size={18}/> Changer</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center p-6">
                                                    <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-3 text-neutral-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                                                        <Upload size={24} />
                                                    </div>
                                                    <p className="text-sm font-medium text-neutral-700">Cliquez pour importer</p>
                                                    <p className="text-xs text-neutral-400 mt-1">PNG, JPG (Max 500x500px)</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Colors */}
                                    <div>
                                        <label htmlFor="primaryColor" className="block text-sm font-semibold text-neutral-700 mb-3">Couleur principale</label>
                                        <div className="flex items-center gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                                            <div className="relative overflow-hidden w-16 h-16 rounded-xl shadow-sm ring-2 ring-white ring-offset-2 ring-offset-neutral-100">
                                                <input type="color" id="primaryColor" name="primaryColor" value={localSettings.primaryColor || '#10b981'} onChange={handleInputChange} className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer p-0 border-0" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center bg-white border border-neutral-200 rounded-lg px-3 py-2 w-full max-w-[140px]">
                                                    <span className="text-neutral-400 mr-2">#</span>
                                                    <input type="text" value={(localSettings.primaryColor || '#10b981').replace('#', '')} onChange={handleInputChange} name="primaryColor" className="w-full text-sm font-mono uppercase focus:outline-none text-neutral-700" />
                                                </div>
                                                <p className="mt-2 text-xs text-neutral-500 leading-relaxed">
                                                    Utilisée pour les titres, bordures et accents dans vos factures.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION 4: DOCUMENTS */}
                    {activeTab === 'documents' && (
                        <div className="space-y-6 animate-fadeIn">
                            {/* Column Configuration */}
                            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-neutral-100 p-8">
                                <div className="flex items-center gap-3 mb-2 pb-4 border-b border-neutral-100">
                                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><LayoutTemplate size={20}/></div>
                                    <div>
                                        <h3 className="text-xl font-bold text-neutral-900">Tableaux PDF</h3>
                                        <p className="text-sm text-neutral-500 font-normal">Personnalisez les colonnes de vos factures et devis.</p>
                                    </div>
                                </div>

                                <div className="mt-6 flex flex-col gap-3">
                                    {columns.map((col, index) => (
                                        <div key={col.id} className={`flex items-center gap-4 p-3 rounded-xl border transition-all duration-200 ${col.visible ? 'bg-white border-neutral-200 shadow-sm' : 'bg-neutral-50 border-transparent opacity-70'}`}>
                                            <div className="flex flex-col gap-1 text-neutral-400">
                                                <button 
                                                    onClick={() => moveColumn(index, 'up')} 
                                                    disabled={index === 0}
                                                    className="hover:text-neutral-700 disabled:opacity-20"
                                                >
                                                    <ArrowUp size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => moveColumn(index, 'down')} 
                                                    disabled={index === columns.length - 1}
                                                    className="hover:text-neutral-700 disabled:opacity-20"
                                                >
                                                    <ArrowDown size={16} />
                                                </button>
                                            </div>

                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                                <div>
                                                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1 block">Titre Colonne</label>
                                                    <input 
                                                        type="text" 
                                                        value={col.label} 
                                                        onChange={(e) => updateColumnLabel(col.id, e.target.value)}
                                                        className={`block w-full bg-transparent border-b-2 border-transparent focus:border-emerald-500 focus:outline-none px-0 py-1 font-medium text-neutral-900 ${!col.visible && 'text-neutral-500'}`}
                                                        disabled={!col.visible}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-end gap-3">
                                                    <span className={`text-sm ${col.visible ? 'text-emerald-600 font-medium' : 'text-neutral-400'}`}>
                                                        {col.visible ? 'Affichée' : 'Masquée'}
                                                    </span>
                                                    <button 
                                                        onClick={() => toggleColumnVisibility(col.id)}
                                                        className={`w-12 h-7 rounded-full flex items-center transition-colors duration-300 px-1 ${col.visible ? 'bg-emerald-500 justify-end' : 'bg-neutral-300 justify-start'}`}
                                                    >
                                                        <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Footer & Conditions */}
                            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-neutral-100 p-8">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-100">
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><FileText size={20}/></div>
                                    <h3 className="text-xl font-bold text-neutral-900">Pied de page & Conditions</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                    <InputField 
                                        icon={CreditCard}
                                        label="Conditions de paiement par défaut" 
                                        name="defaultPaymentTerms" 
                                        value={localSettings.defaultPaymentTerms || ''} 
                                        onChange={handleInputChange}
                                        placeholder="Ex: Paiement à 30 jours, Comptant..." 
                                    />
                                    
                                    <div>
                                        <TextAreaField 
                                            label="Pied de page par défaut" 
                                            name="footerNotes" 
                                            value={localSettings.footerNotes || ''} 
                                            onChange={handleInputChange} 
                                            rows={3} 
                                            placeholder="Remerciements, coordonnées bancaires..." 
                                        />
                                        <p className="mt-2 text-xs text-neutral-500 flex items-center gap-1">
                                            <LayoutTemplate size={12}/> Ce texte apparaîtra en bas de tous vos documents.
                                        </p>
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

// --- Helper Form Components ---

const InputField = ({ label, icon: Icon, className, ...props }: { label: string, icon?: any, className?: string, [key: string]: any }) => (
    <div className={className}>
        <label htmlFor={props.name} className="block text-sm font-semibold text-neutral-700 mb-2">{label}</label>
        <div className="relative group">
            {Icon && (
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icon className="h-5 w-5 text-neutral-400 group-focus-within:text-emerald-500 transition-colors" />
                </div>
            )}
            <input 
                id={props.name} 
                {...props} 
                className={`block w-full rounded-xl border-neutral-200 bg-neutral-50/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm py-2.5 transition-all ${Icon ? 'pl-10' : 'pl-3'}`} 
            />
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
            <textarea 
                id={props.name} 
                {...props} 
                className={`block w-full rounded-xl border-neutral-200 bg-neutral-50/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm py-2.5 transition-all ${Icon ? 'pl-10' : 'pl-3'}`} 
            />
        </div>
    </div>
);

export default TemplateCustomizer;
