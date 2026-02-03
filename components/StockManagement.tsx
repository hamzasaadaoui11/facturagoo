
import React, { useState } from 'react';
import Header from './Header';
import { Archive, Plus, ArrowUpRight, ArrowDownLeft, AlertTriangle, Pencil, X } from 'lucide-react';
import { Product, StockMovement } from '../types';

interface StockManagementProps {
    products: Product[];
    movements: StockMovement[];
    onAddMovement: (movement: Omit<StockMovement, 'id'>) => void;
}

const StockManagement: React.FC<StockManagementProps> = ({ products, movements, onAddMovement }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
    
    // Manual Movement State
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [quantity, setQuantity] = useState<number>(1);
    const [type, setType] = useState<StockMovement['type']>('Ajustement');

    // Correction State
    const [productToCorrect, setProductToCorrect] = useState<Product | null>(null);
    const [realQuantity, setRealQuantity] = useState<number>(0);

    // Filter only physical products
    const physicalProducts = products.filter(p => p.productType === 'Produit');

    const handleAddMovement = (e: React.FormEvent) => {
        e.preventDefault();
        const product = products.find(p => p.id === selectedProduct);
        if (!product) return;

        onAddMovement({
            productId: product.id,
            productName: product.name,
            date: new Date().toISOString().split('T')[0],
            quantity: type === 'Vente' || type === 'Ajustement' ? -Math.abs(quantity) : Math.abs(quantity),
            type: type,
            reference: 'Manuel'
        });
        setIsModalOpen(false);
        setQuantity(1);
    };

    const openCorrectionModal = (product: Product) => {
        setProductToCorrect(product);
        setRealQuantity(product.stockQuantity || 0);
        setIsCorrectionModalOpen(true);
    };

    const handleCorrectionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!productToCorrect) return;

        const currentStock = productToCorrect.stockQuantity || 0;
        const diff = realQuantity - currentStock;

        if (diff !== 0) {
            onAddMovement({
                productId: productToCorrect.id,
                productName: productToCorrect.name,
                date: new Date().toISOString().split('T')[0],
                quantity: diff,
                type: 'Ajustement', // Or 'Correction' if added to types
                reference: 'Correction Inventaire'
            });
        }
        setIsCorrectionModalOpen(false);
        setProductToCorrect(null);
    };

    return (
        <div>
            <Header title="Gestion du Stock" />

            {/* Stock Levels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 bg-white rounded-lg shadow-sm ring-1 ring-neutral-200 overflow-hidden">
                    <div className="p-4 border-b border-neutral-200 bg-neutral-50">
                        <h3 className="text-lg font-semibold text-neutral-900">Niveaux de Stock Actuels</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-neutral-200">
                            <thead className="bg-white">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Produit</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">SKU</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-neutral-500 uppercase">Quantité</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-neutral-500 uppercase">État</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-neutral-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200 bg-white">
                                {physicalProducts.map(product => (
                                    <tr key={product.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-medium text-neutral-900">{product.name}</td>
                                        <td className="px-6 py-4 text-sm text-neutral-500">{product.productCode}</td>
                                        <td className="px-6 py-4 text-sm text-center font-bold text-lg">{product.stockQuantity || 0}</td>
                                        <td className="px-6 py-4 text-sm text-center">
                                            {(product.stockQuantity || 0) <= (product.minStockAlert || 5) ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    <AlertTriangle className="w-3 h-3 mr-1"/> Faible
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    OK
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-center">
                                            <button 
                                                onClick={() => openCorrectionModal(product)}
                                                className="text-neutral-400 hover:text-emerald-600 transition-colors p-1 rounded-full hover:bg-emerald-50"
                                                title="Corriger la quantité"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {physicalProducts.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">Aucun produit physique enregistré.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Movements */}
                <div className="bg-white rounded-lg shadow-sm ring-1 ring-neutral-200 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-neutral-200 bg-neutral-50">
                        <h3 className="text-lg font-semibold text-neutral-900">Derniers Mouvements</h3>
                    </div>
                    <div className="overflow-y-auto flex-1 p-4 space-y-4 max-h-[500px]">
                        {movements.length > 0 ? (
                            movements.slice().reverse().slice(0, 10).map(movement => (
                                <div key={movement.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${movement.quantity > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {movement.quantity > 0 ? <ArrowUpRight size={16}/> : <ArrowDownLeft size={16}/>}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-neutral-900">{movement.productName}</p>
                                            <p className="text-xs text-neutral-500">{movement.type} - {new Date(movement.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <span className={`text-sm font-bold ${movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-neutral-500 py-8">Aucun mouvement récent.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Manual Movement Modal - Hidden because button removed, but kept if needed later or removed completely if desired. Keeping component logic for safety but trigger is gone. */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Ajouter un mouvement</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleAddMovement} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Produit</label>
                                <select 
                                    value={selectedProduct} 
                                    onChange={e => setSelectedProduct(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                                    required
                                >
                                    <option value="">Sélectionner...</option>
                                    {physicalProducts.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} (Stock: {p.stockQuantity})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Type</label>
                                <select 
                                    value={type} 
                                    onChange={e => setType(e.target.value as any)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                                >
                                    <option value="Achat">Achat (Entrée)</option>
                                    <option value="Vente">Vente (Sortie)</option>
                                    <option value="Ajustement">Ajustement / Perte</option>
                                    <option value="Initial">Stock Initial</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Quantité (Valeur absolue)</label>
                                <input 
                                    type="number" 
                                    value={quantity} 
                                    min="1"
                                    onChange={e => setQuantity(parseFloat(e.target.value))}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Annuler</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700">Enregistrer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Quick Correction Modal */}
            {isCorrectionModalOpen && productToCorrect && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Correction de Stock</h3>
                            <button onClick={() => setIsCorrectionModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">
                            Produit : <span className="font-semibold text-gray-800">{productToCorrect.name}</span><br/>
                            Stock actuel : {productToCorrect.stockQuantity}
                        </p>
                        <form onSubmit={handleCorrectionSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nouvelle quantité réelle</label>
                                <input 
                                    type="number" 
                                    value={realQuantity} 
                                    onChange={e => setRealQuantity(parseFloat(e.target.value))}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-lg font-semibold"
                                    required
                                />
                                <p className="text-xs text-blue-600 mt-1">
                                    Le système calculera automatiquement la différence ({realQuantity - (productToCorrect.stockQuantity || 0) > 0 ? '+' : ''}{realQuantity - (productToCorrect.stockQuantity || 0)}).
                                </p>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setIsCorrectionModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Annuler</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700">Valider Correction</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockManagement;
