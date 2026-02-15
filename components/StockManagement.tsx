
import React, { useState, useMemo } from 'react';
import Header from './Header';
import { Archive, Plus, ArrowUpRight, ArrowDownLeft, AlertTriangle, Pencil, X, Search, History, Calendar, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product, StockMovement } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface StockManagementProps {
    products: Product[];
    movements: StockMovement[];
    onAddMovement: (movement: Omit<StockMovement, 'id'>) => void;
}

const StockManagement: React.FC<StockManagementProps> = ({ products, movements, onAddMovement }) => {
    const { t, isRTL, language } = useLanguage();
    const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
    
    // Main List Search
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination for Global History
    const [movementsPage, setMovementsPage] = useState(1);
    const MOVEMENTS_PER_PAGE = 6;

    // Correction State
    const [productToCorrect, setProductToCorrect] = useState<Product | null>(null);
    const [realQuantity, setRealQuantity] = useState<number>(0);

    // History Modal State
    const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [filterRef, setFilterRef] = useState('');

    // Filter only physical products
    const physicalProducts = products.filter(p => p.productType === 'Produit');

    // Filtered list for display
    const filteredProducts = physicalProducts.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.productCode.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sorted and Paginated Movements
    const sortedMovements = useMemo(() => {
        return movements.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [movements]);

    const totalMovementPages = Math.ceil(sortedMovements.length / MOVEMENTS_PER_PAGE);
    const paginatedMovements = sortedMovements.slice(
        (movementsPage - 1) * MOVEMENTS_PER_PAGE, 
        movementsPage * MOVEMENTS_PER_PAGE
    );

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
                type: 'Ajustement', 
                reference: language === 'es' ? 'Corrección de inventario' : 'Correction Inventaire'
            });
        }
        setIsCorrectionModalOpen(false);
        setProductToCorrect(null);
        setMovementsPage(1);
    };

    // Filter History Logic
    const getProductHistory = () => {
        if (!historyProduct) return [];
        
        return movements
            .filter(m => m.productId === historyProduct.id)
            .filter(m => {
                const dateMatch = (!filterStartDate || m.date >= filterStartDate) && (!filterEndDate || m.date <= filterEndDate);
                const typeMatch = filterType === 'all' || m.type === filterType;
                const refMatch = !filterRef || (m.reference || '').toLowerCase().includes(filterRef.toLowerCase());
                return dateMatch && typeMatch && refMatch;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    const openHistoryModal = (product: Product) => {
        setHistoryProduct(product);
        setFilterStartDate('');
        setFilterEndDate('');
        setFilterType('all');
        setFilterRef('');
    };

    const getTranslatedType = (type: string) => {
        switch(type) {
            case 'Initial': return t('mInitial');
            case 'Vente': return t('mVente');
            case 'Achat': return t('mAchat');
            case 'Ajustement': return t('mAjustement');
            case 'Retour': return t('mRetour');
            default: return type;
        }
    };

    return (
        <div dir={isRTL ? 'rtl' : 'ltr'}>
            <Header title={t('stock')} />

            {/* Stock Levels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 bg-white rounded-lg shadow-sm ring-1 ring-neutral-200 overflow-hidden flex flex-col h-full">
                    <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <h3 className="text-lg font-semibold text-neutral-900">{t('stockLevels')}</h3>
                        <div className="relative w-full sm:w-64">
                            <div className={`pointer-events-none absolute inset-y-0 flex items-center ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'}`}>
                                <Search className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                            </div>
                            <input
                                type="search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={t('search')}
                                className={`block w-full rounded-md border-neutral-300 py-1.5 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500 ${isRTL ? 'pr-10' : 'pl-10'}`}
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="min-w-full divide-y divide-neutral-200">
                            <thead className="bg-white sticky top-0 z-10">
                                <tr>
                                    <th className={`px-6 py-3 text-xs font-semibold text-neutral-500 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t('pProduct')}</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-neutral-500 uppercase">{t('quantity')}</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-neutral-500 uppercase">{t('status')}</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-neutral-500 uppercase">{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200 bg-white">
                                {filteredProducts.map(product => (
                                    <tr key={product.id} className="hover:bg-gray-50">
                                        <td className={`px-6 py-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div className="text-sm font-medium text-neutral-900">{product.name}</div>
                                            <div className="text-xs text-neutral-500 font-mono">{product.productCode}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-center font-bold text-lg">{product.stockQuantity || 0}</td>
                                        <td className="px-6 py-4 text-sm text-center">
                                            {(product.stockQuantity || 0) <= (product.minStockAlert || 5) ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    <AlertTriangle className="w-3 h-3 mr-1"/> {t('lowStock')}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    {t('stockOk')}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-center">
                                            <div className="flex justify-center gap-2">
                                                <button 
                                                    onClick={() => openHistoryModal(product)}
                                                    className="text-blue-500 hover:text-blue-700 transition-colors p-1.5 rounded-md hover:bg-blue-50"
                                                    title={t('history')}
                                                >
                                                    <History size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => openCorrectionModal(product)}
                                                    className="text-neutral-400 hover:text-emerald-600 transition-colors p-1.5 rounded-md hover:bg-emerald-50"
                                                    title={t('edit')}
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredProducts.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-neutral-500">{t('noFinancialData')}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Movements Widget (Paginated) */}
                <div className="bg-white rounded-lg shadow-sm ring-1 ring-neutral-200 overflow-hidden flex flex-col h-full lg:max-h-[600px]">
                    <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-neutral-900">{t('lastMovements')}</h3>
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => setMovementsPage(p => Math.max(1, p - 1))}
                                disabled={movementsPage === 1}
                                className="p-1 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronLeft size={18} className={isRTL ? 'rotate-180' : ''}/>
                            </button>
                            <span className="text-xs font-medium text-gray-500 w-12 text-center">
                                {totalMovementPages === 0 ? 0 : movementsPage} / {totalMovementPages}
                            </span>
                            <button 
                                onClick={() => setMovementsPage(p => Math.min(totalMovementPages, p + 1))}
                                disabled={movementsPage === totalMovementPages || totalMovementPages === 0}
                                className="p-1 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronRight size={18} className={isRTL ? 'rotate-180' : ''}/>
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 p-4 space-y-3 overflow-hidden">
                        {paginatedMovements.length > 0 ? (
                            paginatedMovements.map(movement => (
                                <div key={movement.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-100 hover:border-emerald-200 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full flex-shrink-0 ${movement.quantity > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {movement.quantity > 0 ? <ArrowUpRight size={16}/> : <ArrowDownLeft size={16}/>}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-neutral-900 truncate max-w-[120px] sm:max-w-[150px]">{movement.productName}</p>
                                            <p className="text-xs text-neutral-500">{new Date(movement.date).toLocaleDateString(language === 'es' ? 'es-ES' : 'fr-FR')} • {getTranslatedType(movement.type)}</p>
                                        </div>
                                    </div>
                                    <span className={`text-sm font-bold whitespace-nowrap ml-2 ${movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-neutral-500 py-12 flex flex-col items-center">
                                <Archive className="h-10 w-10 text-gray-300 mb-2" />
                                <p>{t('noMovements')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Correction Modal */}
            {isCorrectionModalOpen && productToCorrect && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">{t('stockCorrection')}</h3>
                            <button onClick={() => setIsCorrectionModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">
                            {t('pProduct')} : <span className="font-semibold text-gray-800">{productToCorrect.name}</span><br/>
                            {t('stock')} : {productToCorrect.stockQuantity}
                        </p>
                        <form onSubmit={handleCorrectionSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('realQuantity')}</label>
                                <input 
                                    type="number" 
                                    value={realQuantity} 
                                    onChange={e => setRealQuantity(parseFloat(e.target.value))}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-lg font-semibold"
                                    required
                                />
                                <p className="text-xs text-blue-600 mt-1">
                                    {language === 'es' ? 'Se calculará automáticamente la diferencia' : 'Le système calculera automatiquement la différence'} ({realQuantity - (productToCorrect.stockQuantity || 0) > 0 ? '+' : ''}{realQuantity - (productToCorrect.stockQuantity || 0)}).
                                </p>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setIsCorrectionModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">{t('cancel')}</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700">{t('validateCorrection')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {historyProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex justify-between items-start p-6 border-b border-gray-100">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Archive className="text-emerald-600" /> {t('historyOf')} : {historyProduct.name}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">SKU: {historyProduct.productCode} • {t('stock')} : <span className="font-bold text-gray-900">{historyProduct.stockQuantity}</span></p>
                            </div>
                            <button onClick={() => setHistoryProduct(null)} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Filters */}
                        <div className="p-4 bg-gray-50 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">{t('dateFrom')}</label>
                                <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="w-full text-sm border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">{t('dateTo')}</label>
                                <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="w-full text-sm border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">{t('type')}</label>
                                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full text-sm border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500">
                                    <option value="all">{language === 'es' ? 'Todos' : 'Tous'}</option>
                                    <option value="Vente">{t('mVente')}</option>
                                    <option value="Achat">{t('mAchat')}</option>
                                    <option value="Ajustement">{t('mAjustement')}</option>
                                    <option value="Initial">{t('mInitial')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">{t('reference')}</label>
                                <input type="text" value={filterRef} onChange={(e) => setFilterRef(e.target.value)} placeholder="Ex: FAC-001" className="w-full text-sm border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500" />
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-auto flex-1 p-0">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{t('date')}</th>
                                        <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{t('type')}</th>
                                        <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{t('reference')}</th>
                                        <th className={`px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider`}>{t('lastMovements')}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {getProductHistory().length > 0 ? (
                                        getProductHistory().map(move => (
                                            <tr key={move.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {new Date(move.date).toLocaleDateString(language === 'es' ? 'es-ES' : 'fr-FR')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                        move.type === 'Vente' ? 'bg-orange-100 text-orange-800' :
                                                        move.type === 'Achat' ? 'bg-blue-100 text-blue-800' :
                                                        move.type === 'Initial' ? 'bg-gray-100 text-gray-800' :
                                                        'bg-purple-100 text-purple-800'
                                                    }`}>
                                                        {getTranslatedType(move.type)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {move.reference || '-'}
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${move.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {move.quantity > 0 ? '+' : ''}{move.quantity}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                                {t('noFinancialData')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockManagement;
