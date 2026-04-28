
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import Header from './Header';
import ConfirmationModal from './ConfirmationModal';
import { Plus, Pencil, Trash2, ArrowLeft, Package, AlertTriangle, Search, Upload, ChevronLeft, ChevronRight, X, Layers } from 'lucide-react';
import { Product, CompanySettings, ProductVariant } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { formatCurrency, parseDecimalInput, formatDecimalForInput } from '../services/currencyService';
import ImportProductsModal from './ImportProductsModal';
    // --- Helper Functions and Components ---

const Toggle = ({ enabled, setEnabled, htLabel, ttcLabel }: { enabled: boolean, setEnabled: (enabled: boolean) => void, htLabel: string, ttcLabel: string }) => (
    <div className="flex items-center space-x-2 rtl:space-x-reverse">
        <span className={`text-sm font-medium ${!enabled ? 'text-neutral-900' : 'text-neutral-500'}`}>{htLabel}</span>
        <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${enabled ? 'bg-emerald-600' : 'bg-neutral-200'}`}
            role="switch"
            aria-checked={enabled}
        >
            <span
                aria-hidden="true"
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'}`}
            />
        </button>
        <span className={`text-sm font-medium ${enabled ? 'text-neutral-900' : 'text-neutral-500'}`}>{ttcLabel}</span>
    </div>
);

const round = (value: number) => Math.round(value * 100) / 100;

// --- Product Form Component ---

interface ProductFormProps {
    products: Product[];
    onAddProduct: (product: Omit<Product, 'id'>) => void;
    onUpdateProduct: (product: Product) => void;
}

const ProductForm = ({ products, onAddProduct, onUpdateProduct }: ProductFormProps) => {
    const { t, language, isRTL } = useLanguage();
    const { productId } = useParams();
    const navigate = useNavigate();
    const isEditMode = Boolean(productId);
    
    const existingProduct = useMemo(() => 
        productId ? products.find((p: Product) => p.id === productId) : null,
        [products, productId]
    );

    const [name, setName] = useState('');
    const [productCode, setProductCode] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [productType, setProductType] = useState<'Produit' | 'Service'>('Produit');
    const [unitOfMeasure, setUnitOfMeasure] = useState('Aucune');
    const [vat, setVat] = useState(20);

    // Variants state
    const [hasVariants, setHasVariants] = useState(false);
    const [variants, setVariants] = useState<ProductVariant[]>([]);

    const [minStockAlertStr, setMinStockAlertStr] = useState('5');

    // Extract categories for datalist
    const categoriesList = useMemo(() => {
        const cats = products
            .map(p => p.category)
            .filter((c): c is string => Boolean(c));
        return Array.from(new Set(cats)).sort();
    }, [products]);

    // Using string states for all numeric inputs to preserve decimal separators and trailing zeros during typing
    const [salePriceHTStr, setSalePriceHTStr] = useState('0');
    const [salePriceTTCStr, setSalePriceTTCStr] = useState('0');
    const [purchasePriceHTStr, setPurchasePriceHTStr] = useState('0');
    const [purchasePriceTTCStr, setPurchasePriceTTCStr] = useState('0');
    const [stockQuantityStr, setStockQuantityStr] = useState('0');

    const [salePriceIsTTC, setSalePriceIsTTC] = useState(false);
    const [purchasePriceIsTTC, setPurchasePriceIsTTC] = useState(false);

    useEffect(() => {
        if (isEditMode && existingProduct) {
            setName(existingProduct.name);
            setProductCode(existingProduct.productCode);
            setDescription(existingProduct.description || '');
            setCategory(existingProduct.category || '');
            setProductType(existingProduct.productType || 'Produit');
            setUnitOfMeasure(existingProduct.unitOfMeasure || 'Aucune');
            setHasVariants(!!existingProduct.hasVariants);
            setVariants(existingProduct.variants || []);
            setVat(existingProduct.vat);
            
            const sPriceHT = existingProduct.salePrice;
            const pPriceHT = existingProduct.purchasePrice;
            const vatRate = 1 + (existingProduct.vat / 100);

            setSalePriceHTStr(formatDecimalForInput(sPriceHT, language));
            setSalePriceTTCStr(formatDecimalForInput(round(sPriceHT * vatRate), language));
            setPurchasePriceHTStr(formatDecimalForInput(pPriceHT, language));
            setPurchasePriceTTCStr(formatDecimalForInput(round(pPriceHT * vatRate), language));
            setStockQuantityStr(formatDecimalForInput(existingProduct.stockQuantity || 0, language));
            setMinStockAlertStr(formatDecimalForInput(existingProduct.minStockAlert === undefined ? 5 : existingProduct.minStockAlert, language));
        } else if (!isEditMode) {
             setVat(language === 'es' ? 21 : 20);
             setMinStockAlertStr('5');
        }
    }, [isEditMode, existingProduct, language]);

    // Update total stock when variants change
    useEffect(() => {
        if (hasVariants && variants.length > 0) {
            const total = variants.reduce((sum, v) => sum + v.stockQuantity, 0);
            setStockQuantityStr(formatDecimalForInput(total, language));
        }
    }, [variants, hasVariants, language]);

    // Update TTC strings when VAT changes
    useEffect(() => {
        const vatRate = 1 + (vat / 100);
        const sHT = parseDecimalInput(salePriceHTStr);
        const pHT = parseDecimalInput(purchasePriceHTStr);
        
        setSalePriceTTCStr(formatDecimalForInput(round(sHT * vatRate), language));
        setPurchasePriceTTCStr(formatDecimalForInput(round(pHT * vatRate), language));
    }, [vat, language]);
    
    const handlePriceInputChange = (value: string, type: 'sale' | 'purchase', from: 'ht' | 'ttc') => {
        const vatRate = 1 + (vat / 100);
        const numericValue = parseDecimalInput(value);

        if (type === 'sale') {
            if (from === 'ht') {
                setSalePriceHTStr(value);
                setSalePriceTTCStr(formatDecimalForInput(round(numericValue * vatRate), language));
            } else {
                setSalePriceTTCStr(value);
                setSalePriceHTStr(formatDecimalForInput(round(numericValue / vatRate), language));
            }
        } else {
            if (from === 'ht') {
                setPurchasePriceHTStr(value);
                setPurchasePriceTTCStr(formatDecimalForInput(round(numericValue * vatRate), language));
            } else {
                setPurchasePriceTTCStr(value);
                setPurchasePriceHTStr(formatDecimalForInput(round(numericValue / vatRate), language));
            }
        }
    };
    
    const addVariant = () => {
        const newVariant: ProductVariant = {
            id: `${Date.now()}`,
            name: `${name} - `,
            attributeValue: '',
            stockQuantity: 0
        };
        setVariants([...variants, newVariant]);
    };

    const removeVariant = (id: string) => {
        setVariants(variants.filter(v => v.id !== id));
    };

    const updateVariant = (id: string, updates: Partial<ProductVariant>) => {
        setVariants(variants.map(v => v.id === id ? { ...v, ...updates } : v));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const productData = {
            name, productCode, description, category, productType, unitOfMeasure, vat,
            salePrice: parseDecimalInput(salePriceHTStr),
            purchasePrice: parseDecimalInput(purchasePriceHTStr),
            stockQuantity: parseDecimalInput(stockQuantityStr),
            minStockAlert: parseDecimalInput(minStockAlertStr) || 0,
            hasVariants,
            variants: hasVariants ? variants : []
        };
        if (isEditMode && existingProduct) {
            onUpdateProduct({ ...existingProduct, ...productData });
        } else {
            onAddProduct(productData);
        }
        navigate('/products');
    };
    
    return (
        <div className="pb-20 md:pb-0">
            <Header title={isEditMode ? t('editProduct') : t('newProduct')} />
            
            <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
                 <div className="bg-white p-4 md:p-6 shadow-sm ring-1 ring-neutral-200 rounded-xl md:rounded-lg">
                    <h3 className="text-lg font-semibold text-neutral-900 border-b border-neutral-200 pb-4 mb-6">{t('generalInfo')}</h3>
                    <div className="grid grid-cols-1 gap-5 md:gap-6 sm:grid-cols-2">
                        <div>
                            <label htmlFor="productName" className="block text-sm font-medium text-neutral-700">{t('name')} *</label>
                            <textarea 
                                id="productName" 
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                placeholder={t('productPlaceholder')} 
                                className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm resize-y" 
                                rows={1}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="productCode" className="block text-sm font-medium text-neutral-700">{t('reference')}</label>
                            <input type="text" id="productCode" value={productCode} onChange={e => setProductCode(e.target.value)} placeholder={t('refPlaceholder')} className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm"/>
                        </div>
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-neutral-700">Catégorie (Optionnel)</label>
                            <input 
                                type="text" 
                                id="category" 
                                value={category} 
                                onChange={e => setCategory(e.target.value)} 
                                list="categories-list"
                                placeholder="Sélectionnez ou tapez..." 
                                className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm"
                            />
                            <datalist id="categories-list">
                                {categoriesList.map(cat => (
                                    <option key={cat} value={cat} />
                                ))}
                            </datalist>
                        </div>
                        <div className="sm:col-span-2">
                            <label htmlFor="description" className="block text-sm font-medium text-neutral-700">{t('description')}</label>
                            <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder={t('description')} className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="productType" className="block text-sm font-medium text-neutral-700">{t('type')}</label>
                            <select id="productType" value={productType} onChange={e => setProductType(e.target.value as any)} className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm">
                                <option value="Produit">{t('pProduct')}</option>
                                <option value="Service">{t('pService')}</option>
                            </select>
                        </div>
                         <div>
                            <label htmlFor="unitOfMeasure" className="block text-sm font-medium text-neutral-700">{t('unitOfMeasure')}</label>
                            <select id="unitOfMeasure" value={unitOfMeasure} onChange={e => setUnitOfMeasure(e.target.value)} className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm">
                                <option value="Aucune">{t('uNone')}</option>
                                <option value="Unité">{t('uUnit')}</option>
                                <option value="kg">{t('uKg')}</option>
                                <option value="L">{t('uL')}</option>
                                <option value="m">{t('uM')}</option>
                                <option value="Tonne">{t('uTon')}</option>
                                <option value="m3">{t('uM3')}</option>
                            </select>
                        </div>
                        {productType === 'Produit' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="stockQuantity" className="block text-sm font-medium text-neutral-700">{t('stock')}</label>
                                    <input 
                                        type="text" 
                                        id="stockQuantity" 
                                        value={stockQuantityStr} 
                                        onChange={e => setStockQuantityStr(e.target.value)} 
                                        disabled={hasVariants}
                                        className={`mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm ${hasVariants ? 'bg-slate-50 text-slate-400 italic cursor-not-allowed' : ''}`} 
                                    />
                                    <p className="mt-1 text-xs text-neutral-500">{t('stockUpdateNote')}</p>
                                </div>
                                <div>
                                    <label htmlFor="minStockAlertStr" className="block text-sm font-medium text-neutral-700">Alerte Stock Minimal</label>
                                    <input 
                                        type="number" 
                                        id="minStockAlertStr"
                                        value={minStockAlertStr} 
                                        onChange={e => setMinStockAlertStr(e.target.value)} 
                                        className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm" 
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-neutral-900 font-bold">
                                <Plus size={20} className="text-emerald-500" />
                                <span>Gestion des variantes</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={hasVariants}
                                    onChange={(e) => setHasVariants(e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                        </div>

                        {hasVariants && (
                            <div className="space-y-4 bg-slate-50 p-4 md:p-6 rounded-xl border border-slate-200 shadow-inner">
                                <div className="grid grid-cols-12 gap-4 px-2 hidden md:grid">
                                    <div className="col-span-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Valeur / Attribut (ex: XL, Rouge..)</div>
                                    <div className="col-span-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Quantité Stock</div>
                                    <div className="col-span-1"></div>
                                </div>
                                
                                {variants.map((variant) => (
                                    <div key={variant.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-white p-3 md:p-0 md:bg-transparent rounded-lg border border-slate-200 md:border-none shadow-sm md:shadow-none">
                                        <div className="md:col-span-8">
                                            <label className="block md:hidden text-[11px] font-bold text-slate-400 uppercase mb-1">Attribut</label>
                                            <input 
                                                type="text"
                                                value={variant.attributeValue}
                                                onChange={(e) => updateVariant(variant.id, { attributeValue: e.target.value })}
                                                placeholder="Ex: XL"
                                                className="w-full px-4 py-2 text-sm rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 transition-all outline-none"
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block md:hidden text-[11px] font-bold text-slate-400 uppercase mb-1">Stock</label>
                                            <input 
                                                type="number"
                                                value={variant.stockQuantity}
                                                onChange={(e) => updateVariant(variant.id, { stockQuantity: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-4 py-2 text-sm rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 text-center transition-all outline-none"
                                            />
                                        </div>
                                        <div className="md:col-span-1 flex justify-end">
                                            <button 
                                                type="button" 
                                                onClick={() => removeVariant(variant.id)}
                                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <button 
                                    type="button" 
                                    onClick={addVariant}
                                    className="w-full mt-2 py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50 transition-all font-bold text-sm flex items-center justify-center gap-2"
                                >
                                    <Plus size={18} /> Ajouter une ligne variante
                                </button>
                            </div>
                        )}
                    </div>
                 </div>

                 <div className="bg-white p-4 md:p-6 shadow-sm ring-1 ring-neutral-200 rounded-xl md:rounded-lg">
                    <h3 className="text-lg font-semibold text-neutral-900 border-b border-neutral-200 pb-4 mb-6">{t('pricing')}</h3>
                    <div className="space-y-6">
                        {/* Sale Price */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-md font-medium text-neutral-800">{t('salePrice')}</h4>
                                <Toggle enabled={salePriceIsTTC} setEnabled={setSalePriceIsTTC} htLabel="HT" ttcLabel="TTC" />
                            </div>
                            <div className="max-w-md">
                                {salePriceIsTTC ? (
                                    <div>
                                        <label htmlFor="salePriceTTC" className="block text-sm font-medium text-neutral-700">{t('salePrice')} TTC</label>
                                        <input type="text" id="salePriceTTC" value={salePriceTTCStr} onChange={e => handlePriceInputChange(e.target.value, 'sale', 'ttc')} className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm" />
                                    </div>
                                ) : (
                                    <div>
                                        <label htmlFor="salePriceHT" className="block text-sm font-medium text-neutral-700">{t('salePrice')} HT</label>
                                        <input type="text" id="salePriceHT" value={salePriceHTStr} onChange={e => handlePriceInputChange(e.target.value, 'sale', 'ht')} className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Purchase Price */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-md font-medium text-neutral-800">{t('purchasePrice')}</h4>
                                <Toggle enabled={purchasePriceIsTTC} setEnabled={setPurchasePriceIsTTC} htLabel="HT" ttcLabel="TTC" />
                            </div>
                            <div className="max-w-md">
                                {purchasePriceIsTTC ? (
                                    <div>
                                        <label htmlFor="purchasePriceTTC" className="block text-sm font-medium text-neutral-700">{t('purchasePrice')} TTC</label>
                                        <input type="text" id="purchasePriceTTC" value={purchasePriceTTCStr} onChange={e => handlePriceInputChange(e.target.value, 'purchase', 'ttc')} className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm" />
                                    </div>
                                ) : (
                                    <div>
                                        <label htmlFor="purchasePriceHT" className="block text-sm font-medium text-neutral-700">{t('purchasePrice')} HT</label>
                                        <input type="text" id="purchasePriceHT" value={purchasePriceHTStr} onChange={e => handlePriceInputChange(e.target.value, 'purchase', 'ht')} className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm" />
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* VAT */}
                        <div>
                            <label htmlFor="vat" className="block text-sm font-medium text-neutral-700">{t('vat')} (%)</label>
                            <select id="vat" value={vat} onChange={e => setVat(parseInt(e.target.value))} className="mt-1 block w-full max-w-xs rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm">
                                <option value="21">21%</option>
                                <option value="20">20%</option>
                                <option value="14">14%</option>
                                <option value="10">10%</option>
                                <option value="7">7%</option>
                                <option value="4">4%</option>
                                <option value="0">0%</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 pt-4">
                    <button type="button" onClick={() => navigate('/products')} className="w-full sm:w-auto inline-flex justify-center items-center gap-x-2 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.97]">
                        <ArrowLeft size={20} className="rtl:rotate-180" />
                        {t('backToList')}
                    </button>
                    <button type="submit" className="w-full sm:w-auto inline-flex justify-center items-center rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.97]">
                        {t('saveProduct')}
                    </button>
                </div>
            </form>

        </div>
    );
};


// --- Product List Component ---

interface ProductListProps {
    products: Product[];
    onAddProduct: (product: Omit<Product, 'id'>) => void;
    onDeleteProduct: (productId: string) => void;
    onDeleteProducts: (productIds: string[]) => void;
    companySettings?: CompanySettings | null;
}

const ProductList = ({ products, onAddProduct, onDeleteProduct, onDeleteProducts, companySettings }: ProductListProps) => {
    const { t, language, isRTL } = useLanguage();
    const navigate = useNavigate();
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [productIdToDelete, setProductIdToDelete] = useState<string | null>(null);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Categories logic
    const categories = useMemo(() => {
        const cats = products
            .map(p => p.category)
            .filter((c): c is string => Boolean(c));
        return Array.from(new Set(cats)).sort();
    }, [products]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const filteredProducts = products.filter(product => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = (
            product.name.toLowerCase().includes(term) ||
            product.productCode.toLowerCase().includes(term) ||
            (product.category && product.category.toLowerCase().includes(term))
        );
        
        const matchesCategory = selectedCategory === null || product.category === selectedCategory;
        
        return matchesSearch && matchesCategory;
    });

    // Reset to first page when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            
            if (currentPage > 3) {
                pages.push('...');
            }
            
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            
            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) pages.push(i);
            }
            
            if (currentPage < totalPages - 2) {
                pages.push('...');
            }
            
            if (!pages.includes(totalPages)) pages.push(totalPages);
        }
        return pages;
    };

    const handleDeleteClick = (productId: string) => {
        setProductIdToDelete(productId);
        setIsConfirmOpen(true);
    };

    const confirmDeletion = () => {
        if (productIdToDelete) {
            onDeleteProduct(productIdToDelete);
        }
        setIsConfirmOpen(false);
        setProductIdToDelete(null);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedProductIds(filteredProducts.map(p => p.id));
        } else {
            setSelectedProductIds([]);
        }
    };

    const handleSelectProduct = (productId: string) => {
        setSelectedProductIds(prev => 
            prev.includes(productId) 
                ? prev.filter(id => id !== productId) 
                : [...prev, productId]
        );
    };

    const handleBulkDelete = () => {
        setIsBulkConfirmOpen(true);
    };

    const confirmBulkDeletion = () => {
        onDeleteProducts(selectedProductIds);
        setSelectedProductIds([]);
        setIsBulkConfirmOpen(false);
    };

    return (
        <div className="pb-20 md:pb-0">
            <Header title={t('products')}>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setIsImportOpen(true)}
                        className="inline-flex items-center gap-x-2 rounded-lg bg-white px-3 py-2 md:px-3.5 md:py-2.5 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 transition-all duration-200 ease-in-out"
                    >
                        <Upload className="h-5 w-5" />
                        <span className="hidden sm:inline">{t('import')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/products/new')}
                        className="inline-flex items-center gap-x-2 rounded-lg bg-emerald-600 px-3 py-2 md:px-3.5 md:py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-all duration-200 ease-in-out"
                    >
                        <Plus className="h-5 w-5" />
                        <span className="hidden sm:inline">{t('newProduct')}</span>
                        <span className="sm:hidden">{t('add')}</span>
                    </button>
                </div>
            </Header>

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmDeletion}
            />

            <ConfirmationModal
                isOpen={isBulkConfirmOpen}
                onClose={() => setIsBulkConfirmOpen(false)}
                onConfirm={confirmBulkDeletion}
            />

            {isImportOpen && (
                <ImportProductsModal 
                    isOpen={isImportOpen}
                    onClose={() => setIsImportOpen(false)}
                    existingCategories={categories}
                    onImport={(importedProducts) => {
                        importedProducts.forEach(product => onAddProduct(product));
                    }}
                />
            )}

            <div className="space-y-4">
                {/* Category Tabs */}
                {categories.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${
                                selectedCategory === null 
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100' 
                                : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                            }`}
                        >
                            {language === 'fr' ? 'Tout' : 'All'}
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${
                                    selectedCategory === cat 
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}

                {/* Search and Bulk Actions */}
                <div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-neutral-200 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex w-full md:max-w-md gap-2">
                        <div className="relative flex-1">
                            <div className={`pointer-events-none absolute inset-y-0 flex items-center ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'}`}>
                               <Search className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                            </div>
                            <input
                                type="search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={t('search')}
                                className={`block w-full rounded-lg border-neutral-300 py-2 text-neutral-900 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base sm:text-sm ${isRTL ? 'pr-10' : 'pl-10'}`}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                        <div className="md:hidden flex items-center gap-2 bg-neutral-50 px-3 py-2 rounded-lg border border-neutral-200">
                            <input
                                type="checkbox"
                                checked={selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0}
                                onChange={handleSelectAll}
                                className="h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-600"
                            />
                            <span className="text-xs font-medium text-neutral-500">{t('selectAll')}</span>
                        </div>
                        <div className="hidden md:flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="select-all"
                                className="h-5 w-5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
                                onChange={handleSelectAll}
                            />
                            <label htmlFor="select-all" className="text-sm font-medium text-neutral-600 cursor-pointer select-none">
                                {t('selectAll')}
                            </label>
                        </div>

                        {selectedProductIds.length > 0 && (
                            <button
                                type="button"
                                onClick={handleBulkDelete}
                                className="inline-flex items-center gap-x-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition-all duration-200 animate-in fade-in slide-in-from-right-2"
                            >
                                <Trash2 className="h-4 w-4" />
                                {language === 'es' ? `Eliminar (${selectedProductIds.length})` : `Supprimer (${selectedProductIds.length})`}
                            </button>
                        )}
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-neutral-200">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-neutral-200">
                            <thead className="bg-neutral-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left w-10">
                                        {/* Checkbox handled in search bar for better UX */}
                                    </th>
                                    <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('reference')}</th>
                                    <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('name')}</th>
                                    <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>Catégorie</th>
                                    <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('stock')}</th>
                                    <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-left' : 'text-right'}`}>{t('totalHT')}</th>
                                    <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('vat')}</th>
                                    <th scope="col" className="relative px-6 py-3 text-right"><span className="sr-only">{t('actions')}</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200 bg-white">
                                {paginatedProducts.length > 0 ? (
                                    paginatedProducts.map((product: Product) => (
                                        <React.Fragment key={product.id}>
                                            <tr className={`hover:bg-emerald-50/60 transition-colors duration-200 ${selectedProductIds.includes(product.id) ? 'bg-emerald-50' : ''}`}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                        checked={selectedProductIds.includes(product.id)}
                                                        onChange={() => handleSelectProduct(product.id)}
                                                    />
                                                </td>
                                                <td className={`whitespace-nowrap px-6 py-4 text-sm text-neutral-500 font-mono ${isRTL ? 'text-right' : 'text-left'}`}>{product.productCode}</td>
                                                <td className={`px-6 py-4 text-sm font-medium text-neutral-900 whitespace-pre-line ${isRTL ? 'text-right' : 'text-left'}`}>
                                                    <div className="flex flex-col">
                                                        <span>{product.name}</span>
                                                        {product.hasVariants && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold uppercase mt-1 bg-emerald-50 px-1.5 py-0.5 rounded w-fit">
                                                                <Layers size={10} /> {product.variants?.length || 0} {language === 'fr' ? 'variantes' : 'variants'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className={`whitespace-nowrap px-6 py-4 text-sm text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                                                    {product.category ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                                                            {product.category}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className={`whitespace-nowrap px-6 py-4 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                                                    {product.productType === 'Service' ? (
                                                        <span className="text-neutral-400 italic">{t('pService')}</span>
                                                    ) : (
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(product.stockQuantity || 0) <= (product.minStockAlert || 5) ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                            {(product.stockQuantity || 0) <= (product.minStockAlert || 5) && <AlertTriangle className="w-3 h-3 mr-1"/>}
                                                            {formatDecimalForInput(product.stockQuantity || 0, language)} {product.unitOfMeasure !== 'Aucune' ? product.unitOfMeasure : ''}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className={`whitespace-nowrap px-6 py-4 text-sm text-neutral-500 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(product.salePrice, companySettings)}</td>
                                                <td className={`whitespace-nowrap px-6 py-4 text-sm text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{product.vat}%</td>
                                                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                                    <div className={`flex items-center justify-end space-x-2 ${isRTL ? 'space-x-reverse' : ''}`}>
                                                        <button 
                                                            onClick={() => navigate(`/products/edit/${product.id}`)} 
                                                            className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors"
                                                            title={t('edit')}
                                                        >
                                                            <Pencil size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteClick(product.id)} 
                                                            className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                                                            title={t('delete')}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* Expandable variants if any */}
                                            {product.hasVariants && product.variants && product.variants.length > 0 && (
                                                <tr className="bg-slate-50/30">
                                                    <td colSpan={8} className="px-14 py-2">
                                                        <div className="flex flex-wrap gap-2 py-1">
                                                            {product.variants.map((variant) => (
                                                                <div key={variant.id} className="flex items-center gap-2 bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-[11px] shadow-sm">
                                                                    <span className="font-bold text-slate-700">{variant.attributeValue}</span>
                                                                    <span className="text-slate-400">|</span>
                                                                    <span className={`font-mono ${variant.stockQuantity <= 0 ? 'text-red-500 font-bold' : 'text-slate-600'}`}>
                                                                        {variant.stockQuantity}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))
                                 ) : (
                                    <tr>
                                         <td colSpan={7} className="text-center py-20 px-6">
                                            <div className="flex flex-col items-center justify-center">
                                                <Package className="h-16 w-16 text-slate-200 mb-4" strokeWidth={1.5} />
                                                <h3 className="text-lg font-bold text-slate-800">
                                                    {searchTerm ? t('noFinancialData') : t('noProducts')}
                                                </h3>
                                                {!searchTerm && (
                                                    <p className="text-sm text-slate-500 mt-1">
                                                        {t('firstProductPrompt')}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {paginatedProducts.length > 0 ? (
                        paginatedProducts.map((product: Product) => (
                            <div 
                                key={product.id} 
                                className={`bg-white p-4 rounded-xl shadow-sm ring-1 ring-neutral-200 relative transition-all active:scale-[0.99] ${selectedProductIds.includes(product.id) ? 'ring-emerald-500 bg-emerald-50/30' : ''}`}
                                onClick={() => handleSelectProduct(product.id)}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                className="h-5 w-5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                checked={selectedProductIds.includes(product.id)}
                                                onChange={() => handleSelectProduct(product.id)}
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-base font-bold text-neutral-900 whitespace-pre-line">{product.name}</h4>
                                            {product.hasVariants && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {product.variants?.map(v => (
                                                        <span key={v.id} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium">
                                                            {v.attributeValue}: {v.stockQuantity}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            <p className="text-xs text-neutral-500 font-mono mt-0.5">{product.productCode}</p>
                                            
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {product.productType === 'Service' ? (
                                                    <span className="text-xs text-neutral-400 italic">{t('pService')}</span>
                                                ) : (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${(product.stockQuantity || 0) <= (product.minStockAlert || 5) ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                        {t('stock')}: {formatDecimalForInput(product.stockQuantity || 0, language)}
                                                    </span>
                                                )}
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
                                                    {formatCurrency(product.salePrice, companySettings)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                                        <button 
                                            onClick={() => navigate(`/products/edit/${product.id}`)} 
                                            className="p-2 text-emerald-600 bg-emerald-50 rounded-lg active:bg-emerald-100 transition-colors"
                                        >
                                            <Pencil size={20} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteClick(product.id)} 
                                            className="p-2 text-red-600 bg-red-50 rounded-lg active:bg-red-100 transition-colors"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white rounded-xl p-12 text-center shadow-sm ring-1 ring-neutral-200">
                            <Package className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm text-slate-500">{t('noProducts')}</p>
                        </div>
                    )}
                </div>

                {/* Pagination UI */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-neutral-200">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
                            >
                                {isRTL ? 'التالي' : 'Précédent'}
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
                            >
                                {isRTL ? 'السابق' : 'Suivant'}
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-neutral-700">
                                    Affichage de <span className="font-bold">{startIndex + 1}</span> à <span className="font-bold">{Math.min(startIndex + itemsPerPage, filteredProducts.length)}</span> sur <span className="font-bold">{filteredProducts.length}</span> produits
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-neutral-300 bg-white text-sm font-medium text-neutral-500 hover:bg-neutral-50 disabled:opacity-50"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    {getPageNumbers().map((page, i) => (
                                        <React.Fragment key={i}>
                                            {page === '...' ? (
                                                <span className="relative inline-flex items-center px-4 py-2 border border-neutral-300 bg-white text-sm font-medium text-neutral-400">
                                                    ...
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => setCurrentPage(page as number)}
                                                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${currentPage === page ? 'z-10 bg-emerald-50 border-emerald-500 text-emerald-600 font-bold' : 'bg-white border-neutral-300 text-neutral-500 hover:bg-neutral-50'}`}
                                                >
                                                    {page}
                                                </button>
                                            )}
                                        </React.Fragment>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-neutral-300 bg-white text-sm font-medium text-neutral-500 hover:bg-neutral-50 disabled:opacity-50"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


// --- Main Router Component ---

interface ProductsProps {
    products: Product[];
    onAddProduct: (product: Omit<Product, 'id'>) => void;
    onUpdateProduct: (product: Product) => void;
    onDeleteProduct: (productId: string) => void;
    onDeleteProducts: (productIds: string[]) => void;
    companySettings?: CompanySettings | null;
}

const Products: React.FC<ProductsProps> = (props) => {
    const location = useLocation();
    const isListView = location.pathname === '/products';

    if (isListView) {
        return <ProductList {...props} />;
    } else {
        return <ProductForm {...props} />;
    }
};

export default Products;
