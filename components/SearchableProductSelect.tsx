
import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Package, AlertTriangle, XCircle } from 'lucide-react';
import { Product } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface SearchableProductSelectProps {
    products: Product[];
    onSelect: (productId: string) => void;
    placeholder?: string;
    selectedProductId?: string;
}

const SearchableProductSelect: React.FC<SearchableProductSelectProps> = ({ 
    products, 
    onSelect, 
    placeholder,
    selectedProductId 
}) => {
    const { t, isRTL, language } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    const [hoveredImage, setHoveredImage] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const selectedProduct = products.find(p => p.id === selectedProductId);

    useEffect(() => {
        if (selectedProduct) {
            setSearchTerm(selectedProduct.name);
        } else {
            setSearchTerm('');
        }
    }, [selectedProductId, selectedProduct]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // Reset search term to selected product name if no selection was made
                if (selectedProduct) {
                    setSearchTerm(selectedProduct.name);
                } else {
                    setSearchTerm('');
                }
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [selectedProduct]);

    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.productCode && product.productCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleSelect = (product: Product) => {
        onSelect(product.id);
        setSearchTerm(product.name);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative">
                <input
                    type="text"
                    className="block w-full rounded-lg border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-xs h-11 bg-white pr-10"
                    placeholder={placeholder || (language === 'fr' ? 'Rechercher par nom ou référence...' : 'Search by name or reference...')}
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && isOpen && filteredProducts.length > 0) {
                            e.preventDefault();
                            handleSelect(filteredProducts[0]);
                        }
                    }}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-[110] mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                    {filteredProducts.length > 0 ? (
                        <div className="py-1">
                            {filteredProducts.map((product) => (
                                <button
                                    key={product.id}
                                    type="button"
                                    className={`w-full text-left px-4 py-2.5 text-xs flex flex-col hover:bg-emerald-50 transition-colors ${selectedProductId === product.id ? 'bg-emerald-50 border-l-2 border-emerald-500' : ''}`}
                                    onClick={() => handleSelect(product)}
                                >
                                    <div className="flex items-start gap-2">
                                        <div 
                                            className="relative h-8 w-8 flex-shrink-0"
                                            onMouseEnter={(e) => {
                                                if (product.imageUrl) {
                                                    setHoveredImage(product.imageUrl);
                                                    setMousePos({ x: e.clientX, y: e.clientY });
                                                }
                                            }}
                                            onMouseMove={(e) => {
                                                if (product.imageUrl) {
                                                    setMousePos({ x: e.clientX, y: e.clientY });
                                                }
                                            }}
                                            onMouseLeave={() => setHoveredImage(null)}
                                        >
                                            {product.imageUrl ? (
                                                <img 
                                                    src={product.imageUrl} 
                                                    alt={product.name} 
                                                    className="h-full w-full object-cover rounded border border-slate-100 cursor-zoom-in" 
                                                />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded border border-slate-100">
                                                    <Package className="h-4 w-4 text-slate-300" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 truncate">{product.name}</span>
                                                    {product.productType === 'Produit' && (
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            {(product.stockQuantity || 0) <= 0 ? (
                                                                <span className="flex items-center gap-1 text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                                                                    <XCircle size={10} /> {language === 'fr' ? 'Rupture' : 'Out'}
                                                                </span>
                                                            ) : (product.stockQuantity || 0) <= (product.minStockAlert || 5) ? (
                                                                <span className="flex items-center gap-1 text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                                                                    <AlertTriangle size={10} /> {(product.stockQuantity || 0)} {language === 'fr' ? 'restants' : 'left'}
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">
                                                                    <Package size={10} /> {(product.stockQuantity || 0)} {language === 'fr' ? 'en stock' : 'in stock'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    {product.category && (
                                                        <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 rounded-full font-bold uppercase tracking-wider">
                                                            {product.category}
                                                        </span>
                                                    )}
                                                    {product.productCode && (
                                                        <span className="text-[9px] text-slate-400 font-mono">{product.productCode}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="px-4 py-3 text-xs text-slate-400 italic">
                            {t('noResults')}
                        </div>
                    )}
                </div>
            )}

            {hoveredImage && (
                <div 
                    className="fixed z-[9999] pointer-events-none shadow-2xl p-1 bg-white rounded-2xl border border-slate-200 animate-in fade-in zoom-in duration-200"
                    style={{ 
                        left: `${mousePos.x + 20}px`, 
                        top: `${Math.min(mousePos.y - 100, window.innerHeight - 320)}px`,
                        width: '300px',
                        height: '300px'
                    }}
                >
                    <img 
                        src={hoveredImage} 
                        alt="Preview" 
                        className="w-full h-full object-cover rounded-xl"
                    />
                </div>
            )}
        </div>
    );
};

export default SearchableProductSelect;
