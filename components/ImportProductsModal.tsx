
import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useLanguage } from '../contexts/LanguageContext';
import { Product } from '../types';

interface ImportProductsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (products: Omit<Product, 'id'>[]) => void;
}

const ImportProductsModal: React.FC<ImportProductsModalProps> = ({ isOpen, onClose, onImport }) => {
    const { t, language } = useLanguage();
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.csv')) {
                setFile(selectedFile);
                setError(null);
            } else {
                setError(language === 'fr' ? 'Veuillez sélectionner un fichier Excel ou CSV.' : 'Please select an Excel or CSV file.');
                setFile(null);
            }
        }
    };

    const handleImport = async () => {
        if (!file) return;

        setLoading(true);
        setError(null);

        try {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    if (jsonData.length === 0) {
                        throw new Error(language === 'fr' ? 'Le fichier est vide.' : 'The file is empty.');
                    }

                    const productsToImport: Omit<Product, 'id'>[] = jsonData.map((row: any) => {
                        // Mapping logic - trying to be flexible with column names
                        const name = row.Nom || row.Name || row.name || row.nom || '';
                        const productCode = row.Référence || row.Reference || row.ref || row.reference || '';
                        const purchasePrice = parseFloat(row["Prix d'achat"] || row.PurchasePrice || row.purchase_price || row.achat || '0');
                        const salePrice = parseFloat(row["Prix de vente"] || row.SalePrice || row.sale_price || row.vente || '0');
                        const stockQuantity = parseFloat(row.Quantité || row.Quantity || row.qty || row.quantite || '0');
                        const vat = parseFloat(row.TVA || row.VAT || row.tva || '20');
                        const description = row.Description || row.description || '';
                        const productType = (row.Type || row.type || 'Produit') as 'Produit' | 'Service';
                        const unitOfMeasure = row.Unité || row.Unit || row.unite || 'Aucune';

                        return {
                            name,
                            productCode,
                            purchasePrice: isNaN(purchasePrice) ? 0 : purchasePrice,
                            salePrice: isNaN(salePrice) ? 0 : salePrice,
                            stockQuantity: isNaN(stockQuantity) ? 0 : stockQuantity,
                            vat: isNaN(vat) ? 20 : vat,
                            description,
                            productType,
                            unitOfMeasure,
                            minStockAlert: 5
                        };
                    }).filter(p => p.name); // Only import products with a name

                    if (productsToImport.length === 0) {
                        throw new Error(language === 'fr' ? 'Aucun produit valide trouvé.' : 'No valid products found.');
                    }

                    onImport(productsToImport);
                    setSuccess(language === 'fr' ? `${productsToImport.length} produits importés avec succès.` : `${productsToImport.length} products imported successfully.`);
                    setTimeout(() => {
                        onClose();
                        setFile(null);
                        setSuccess(null);
                    }, 2000);
                } catch (err: any) {
                    setError(err.message || (language === 'fr' ? "Erreur lors de la lecture du fichier." : "Error reading file."));
                } finally {
                    setLoading(false);
                }
            };
            reader.readAsArrayBuffer(file);
        } catch (err) {
            setError(language === 'fr' ? "Erreur lors de l'importation." : "Error during import.");
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                            <Upload size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">
                            {language === 'fr' ? 'Importer des produits' : 'Import Products'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {!success && (
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
                                <FileText className="text-blue-500 shrink-0" size={20} />
                                <div className="text-sm text-blue-700">
                                    <p className="font-bold mb-1">
                                        {language === 'fr' ? 'Format attendu :' : 'Expected format:'}
                                    </p>
                                    <p className="mb-2">
                                        {language === 'fr' 
                                            ? 'Fichier Excel avec colonnes : Nom, Référence, Prix d\'achat, Prix de vente, Quantité, TVA.' 
                                            : 'Excel file with columns: Name, Reference, Purchase Price, Sale Price, Quantity, VAT.'}
                                    </p>
                                    <button 
                                        onClick={() => {
                                            const ws = XLSX.utils.json_to_sheet([
                                                {
                                                    "Nom": "Produit Exemple",
                                                    "Référence": "REF001",
                                                    "Prix d'achat": 100,
                                                    "Prix de vente": 150,
                                                    "Quantité": 10,
                                                    "TVA": 20,
                                                    "Description": "Description du produit",
                                                    "Type": "Produit",
                                                    "Unité": "Unité"
                                                }
                                            ]);
                                            const wb = XLSX.utils.book_new();
                                            XLSX.utils.book_append_sheet(wb, ws, "Template");
                                            XLSX.writeFile(wb, "template_import_produits.xlsx");
                                        }}
                                        className="text-blue-600 hover:text-blue-800 font-bold underline flex items-center gap-1"
                                    >
                                        <FileText size={14} />
                                        {language === 'fr' ? 'Télécharger le modèle Excel' : 'Download Excel Template'}
                                    </button>
                                </div>
                            </div>

                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                                    file ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'
                                }`}
                            >
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden" 
                                    accept=".xlsx,.xls,.csv"
                                />
                                <div className={`p-3 rounded-full ${file ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <Upload size={32} />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-slate-700">
                                        {file ? file.name : (language === 'fr' ? 'Cliquez pour choisir un fichier' : 'Click to choose a file')}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        XLSX, XLS, CSV (Max 5MB)
                                    </p>
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-sm text-red-600">
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}
                        </div>
                    )}

                    {success && (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center animate-bounce">
                                <CheckCircle2 size={40} />
                            </div>
                            <p className="text-lg font-bold text-slate-800 text-center">
                                {success}
                            </p>
                        </div>
                    )}
                </div>

                {!success && (
                    <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                        <button 
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-white transition-all"
                        >
                            {t('cancel')}
                        </button>
                        <button 
                            disabled={!file || loading}
                            onClick={handleImport}
                            className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                            {language === 'fr' ? 'Importer' : 'Import'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImportProductsModal;
