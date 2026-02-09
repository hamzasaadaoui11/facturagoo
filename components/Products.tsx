
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import Header from './Header';
import ConfirmationModal from './ConfirmationModal';
import { Plus, Pencil, Trash2, ArrowLeft, Package, AlertTriangle } from 'lucide-react';
import { Product } from '../types';

// --- Helper Functions and Components ---

const Toggle = ({ enabled, setEnabled }: { enabled: boolean, setEnabled: (enabled: boolean) => void }) => (
    <div className="flex items-center space-x-2">
        <span className={`text-sm font-medium ${!enabled ? 'text-neutral-900' : 'text-neutral-500'}`}>HT</span>
        <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${enabled ? 'bg-emerald-600' : 'bg-neutral-200'}`}
            role="switch"
            aria-checked={enabled}
        >
            <span
                aria-hidden="true"
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
            />
        </button>
        <span className={`text-sm font-medium ${enabled ? 'text-neutral-900' : 'text-neutral-500'}`}>TTC</span>
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
    const [productType, setProductType] = useState<'Produit' | 'Service'>('Produit');
    const [unitOfMeasure, setUnitOfMeasure] = useState('Aucune');
    const [vat, setVat] = useState(20);

    const [salePriceHT, setSalePriceHT] = useState(0);
    const [purchasePriceHT, setPurchasePriceHT] = useState(0);

    const [salePriceIsTTC, setSalePriceIsTTC] = useState(false);
    const [purchasePriceIsTTC, setPurchasePriceIsTTC] = useState(false);
    
    // Hidden fields for stock (managed in Stock page) but kept here to persist
    const [stockQuantity, setStockQuantity] = useState(0);

    useEffect(() => {
        if (isEditMode && existingProduct) {
            setName(existingProduct.name);
            setProductCode(existingProduct.productCode);
            setDescription(existingProduct.description || '');
            setProductType(existingProduct.productType || 'Produit');
            setUnitOfMeasure(existingProduct.unitOfMeasure || 'Aucune');
            setVat(existingProduct.vat);
            setSalePriceHT(existingProduct.salePrice);
            setPurchasePriceHT(existingProduct.purchasePrice);
            setStockQuantity(existingProduct.stockQuantity || 0);
        }
    }, [isEditMode, existingProduct]);
    
    const handlePriceChange = (value: string, type: 'sale' | 'purchase', from: 'ht' | 'ttc') => {
        const numericValue = parseFloat(value) || 0;
        const vatRate = 1 + (vat / 100);

        if (type === 'sale') {
            const newHT = from === 'ht' ? numericValue : numericValue / vatRate;
            setSalePriceHT(round(newHT));
        } else {
            const newHT = from === 'ht' ? numericValue : numericValue / vatRate;
            setPurchasePriceHT(round(newHT));
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const productData = {
            name, productCode, description, productType, unitOfMeasure, vat,
            salePrice: salePriceHT,
            purchasePrice: purchasePriceHT,
            stockQuantity, // Persist existing stock or new stock from input
            minStockAlert: 5 // Default
        };
        if (isEditMode && existingProduct) {
            onUpdateProduct({ ...existingProduct, ...productData });
        } else {
            onAddProduct(productData);
        }
        navigate('/products');
    };
    
    return (
        <div>
            <Header title={isEditMode ? 'Modifier le produit' : 'Nouveau produit'} />
            
            <form onSubmit={handleSubmit} className="space-y-8">
                 <div className="bg-white p-6 shadow-sm ring-1 ring-neutral-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-neutral-900 border-b border-neutral-200 pb-4 mb-6">Informations Générales</h3>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                            <label htmlFor="productName" className="block text-sm font-medium text-neutral-700">Nom du produit *</label>
                            <input type="text" id="productName" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: T-shirt en coton" className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" required/>
                        </div>
                        <div>
                            <label htmlFor="productCode" className="block text-sm font-medium text-neutral-700">Référence (Réf)</label>
                            <input type="text" id="productCode" value={productCode} onChange={e => setProductCode(e.target.value)} placeholder="Laisser vide pour génération auto" className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"/>
                        </div>
                        <div className="sm:col-span-2">
                            <label htmlFor="description" className="block text-sm font-medium text-neutral-700">Description</label>
                            <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Entrez la description du produit" className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="productType" className="block text-sm font-medium text-neutral-700">Type</label>
                            <select id="productType" value={productType} onChange={e => setProductType(e.target.value as any)} className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm">
                                <option>Produit</option>
                                <option>Service</option>
                            </select>
                        </div>
                         <div>
                            <label htmlFor="unitOfMeasure" className="block text-sm font-medium text-neutral-700">Unité de mesure</label>
                            <select id="unitOfMeasure" value={unitOfMeasure} onChange={e => setUnitOfMeasure(e.target.value)} className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm">
                                <option>Aucune</option>
                                <option>Unité</option>
                                <option>kg</option>
                                <option>L</option>
                                <option>m</option>
                            </select>
                        </div>
                        {productType === 'Produit' && (
                            <div>
                                <label htmlFor="stockQuantity" className="block text-sm font-medium text-neutral-700">Stock Actuel</label>
                                <input 
                                    type="number" 
                                    id="stockQuantity" 
                                    value={stockQuantity} 
                                    onChange={e => setStockQuantity(parseFloat(e.target.value) || 0)} 
                                    className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" 
                                />
                                <p className="mt-1 text-xs text-neutral-500">Modifier ce montant mettra à jour le stock.</p>
                            </div>
                        )}
                    </div>
                 </div>

                 <div className="bg-white p-6 shadow-sm ring-1 ring-neutral-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-neutral-900 border-b border-neutral-200 pb-4 mb-6">Tarification</h3>
                    <div className="space-y-6">
                        {/* Sale Price */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                            <h4 className="text-md font-medium text-neutral-800">Prix de vente</h4>
                            <Toggle enabled={salePriceIsTTC} setEnabled={setSalePriceIsTTC} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="salePriceHT" className="block text-sm font-medium text-neutral-700">Prix de vente HT</label>
                                    <input type="number" step="0.01" id="salePriceHT" value={salePriceHT} onChange={e => handlePriceChange(e.target.value, 'sale', 'ht')} className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                                </div>
                                <div>
                                    <label htmlFor="salePriceTTC" className="block text-sm font-medium text-neutral-700">Prix de vente TTC</label>
                                    <input type="number" step="0.01" id="salePriceTTC" value={round(salePriceHT * (1 + vat / 100))} onChange={e => handlePriceChange(e.target.value, 'sale', 'ttc')} className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm bg-neutral-50" />
                                </div>
                            </div>
                        </div>

                        {/* Purchase Price */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                            <h4 className="text-md font-medium text-neutral-800">Prix d'achat</h4>
                            <Toggle enabled={purchasePriceIsTTC} setEnabled={setPurchasePriceIsTTC} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="purchasePriceHT" className="block text-sm font-medium text-neutral-700">Prix d'achat HT</label>
                                    <input type="number" step="0.01" id="purchasePriceHT" value={purchasePriceHT} onChange={e => handlePriceChange(e.target.value, 'purchase', 'ht')} className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                                </div>
                                <div>
                                    <label htmlFor="purchasePriceTTC" className="block text-sm font-medium text-neutral-700">Prix d'achat TTC</label>
                                    <input type="number" step="0.01" id="purchasePriceTTC" value={round(purchasePriceHT * (1 + vat / 100))} onChange={e => handlePriceChange(e.target.value, 'purchase', 'ttc')} className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm bg-neutral-50" />
                                </div>
                            </div>
                        </div>
                        
                        {/* VAT */}
                        <div>
                            <label htmlFor="vat" className="block text-sm font-medium text-neutral-700">TVA (%)</label>
                            <select id="vat" value={vat} onChange={e => setVat(parseInt(e.target.value))} className="mt-1 block w-full max-w-xs rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm">
                                <option value="20">20%</option>
                                <option value="14">14%</option>
                                <option value="10">10%</option>
                                <option value="7">7%</option>
                                <option value="0">0%</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center pt-4">
                    <button type="button" onClick={() => navigate('/products')} className="inline-flex items-center gap-x-2 rounded-lg bg-white px-3.5 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.97]">
                        <ArrowLeft className="-ml-0.5 h-5 w-5" />
                        Retour à la liste
                    </button>
                    <button type="submit" className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.97]">
                        Enregistrer le produit
                    </button>
                </div>
            </form>
        </div>
    );
};


// --- Product List Component ---

interface ProductListProps {
    products: Product[];
    onDeleteProduct: (productId: string) => void;
}

const ProductList = ({ products, onDeleteProduct }: ProductListProps) => {
    const navigate = useNavigate();
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [productIdToDelete, setProductIdToDelete] = useState<string | null>(null);

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

    return (
        <div>
            <Header title="Produits et Services">
                <button
                    type="button"
                    onClick={() => navigate('/products/new')}
                    className="inline-flex items-center gap-x-2 rounded-lg bg-emerald-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.97]"
                >
                    <Plus className="-ml-0.5 h-5 w-5" />
                    Ajouter un produit
                </button>
            </Header>

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmDeletion}
                title="Supprimer le produit"
                message="Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible."
            />

            <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-neutral-200">
                <div className="p-4 border-b border-neutral-200">
                    <input
                        type="search"
                        placeholder="Rechercher par référence ou nom..."
                        className="block w-full rounded-lg border-neutral-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                        <thead className="bg-neutral-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Réf</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Nom</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Stock</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Prix de vente HT</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">TVA</th>
                                <th scope="col" className="relative px-6 py-3 text-right"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 bg-white">
                            {products.length > 0 ? (
                                products.map((product: Product) => (
                                    <tr key={product.id} className="hover:bg-emerald-50/60 transition-colors duration-200">
                                        <td className="whitespace-nowrap px-6 py-4 text-sm md:text-base text-neutral-500 font-mono">{product.productCode}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm md:text-base font-medium text-neutral-900">{product.name}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm md:text-base">
                                            {product.productType === 'Service' ? (
                                                <span className="text-neutral-400 italic">Service</span>
                                            ) : (
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(product.stockQuantity || 0) <= (product.minStockAlert || 5) ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                    {(product.stockQuantity || 0) <= (product.minStockAlert || 5) && <AlertTriangle className="w-3 h-3 mr-1"/>}
                                                    {product.stockQuantity || 0} {product.unitOfMeasure !== 'Aucune' ? product.unitOfMeasure : ''}
                                                </span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm md:text-base text-neutral-500">{product.salePrice.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm md:text-base text-neutral-500">{product.vat}%</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button 
                                                    onClick={() => navigate(`/products/edit/${product.id}`)} 
                                                    className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors"
                                                    title="Modifier"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteClick(product.id)} 
                                                    className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                             ) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-16 px-6 text-sm text-neutral-500">
                                        <div className="flex flex-col items-center">
                                            <Package className="h-10 w-10 text-neutral-400 mb-2" />
                                            <h3 className="font-semibold text-neutral-800">Aucun produit trouvé</h3>
                                            <p>Commencez par ajouter votre premier produit ou service.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
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
