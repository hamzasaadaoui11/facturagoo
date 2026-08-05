import React, { useState, useEffect } from 'react';
import { 
    X, 
    Save, 
    Receipt, 
    ShoppingBag, 
    Droplets, 
    Zap, 
    Wifi, 
    Building2, 
    Tag,
    Check,
    Calendar,
    DollarSign,
    FileText
} from 'lucide-react';
import { Expense } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

interface AddExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (expense: Omit<Expense, 'id'>) => Promise<void>;
    editingExpense: Expense | null;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ 
    isOpen, 
    onClose, 
    onSave, 
    editingExpense 
}) => {
    const { t, isRTL, language } = useLanguage();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<Omit<Expense, 'id'>>({
        category: 'Other',
        description: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        reference: '',
        notes: ''
    });

    useEffect(() => {
        if (editingExpense) {
            setFormData({
                category: editingExpense.category,
                description: editingExpense.description,
                amount: editingExpense.amount,
                date: editingExpense.date,
                reference: editingExpense.reference || '',
                notes: editingExpense.notes || ''
            });
        } else {
            setFormData({
                category: 'Other',
                description: '',
                amount: 0,
                date: new Date().toISOString().split('T')[0],
                reference: '',
                notes: ''
            });
        }
    }, [editingExpense, isOpen]);

    const categories = [
        { id: 'Achats', label: language === 'fr' ? 'Achats' : language === 'ar' ? 'مشتريات' : 'Purchases', icon: ShoppingBag },
        { id: 'Water', label: t('expWater'), icon: Droplets },
        { id: 'Electricity', label: t('expElectricity'), icon: Zap },
        { id: 'Internet', label: t('expInternet'), icon: Wifi },
        { id: 'Rent', label: t('expRent'), icon: Building2 },
        { id: 'Other', label: t('expOther'), icon: Tag }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.description || formData.amount <= 0) return;
        
        setIsSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error("Failed to save expense:", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                    onClick={onClose}
                />
                
                <motion.div 
                    initial={{ opacity: 0, scale: 0.96, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 15 }}
                    className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
                    dir={isRTL ? 'rtl' : 'ltr'}
                >
                    {/* Header */}
                    <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                <Receipt className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white tracking-tight">
                                    {editingExpense ? t('editExpense') : t('addExpense')}
                                </h2>
                                <p className="text-xs text-slate-400">
                                    Saisissez les informations de la dépense
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        
                        {/* Category Grid */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                {t('category')}
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {categories.map((cat) => {
                                    const Icon = cat.icon;
                                    const isSelected = formData.category === cat.id;

                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => {
                                                const currentCatLabel = categories.find(c => c.id === formData.category)?.label;
                                                const shouldUpdateDescription = !formData.description || formData.description === currentCatLabel;
                                                setFormData({ 
                                                    ...formData, 
                                                    category: cat.id,
                                                    description: shouldUpdateDescription ? cat.label : formData.description
                                                });
                                            }}
                                            className={`p-3 text-xs font-bold rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 relative ${
                                                isSelected 
                                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm ring-1 ring-emerald-500' 
                                                    : 'bg-white border-slate-200/80 text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'
                                            }`}
                                        >
                                            {isSelected && (
                                                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-600 text-white rounded-full flex items-center justify-center">
                                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                                </span>
                                            )}
                                            <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                                            <span className="truncate w-full text-center">{cat.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                {t('description')} *
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 rtl:right-0 rtl:pr-3.5 rtl:left-auto">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <input 
                                    required
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className={`w-full bg-slate-50/80 border border-slate-200/80 rounded-xl py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none ${isRTL ? 'pr-10' : 'pl-10'}`}
                                    placeholder={t('descriptionPlaceholder')}
                                />
                            </div>
                        </div>

                        {/* Amount & Date row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                    {t('amount')} *
                                </label>
                                <div className="relative">
                                    <input 
                                        required
                                        type="number"
                                        step="0.01"
                                        value={formData.amount || ''}
                                        onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                                        placeholder="0.00"
                                    />
                                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-extrabold text-slate-400 pointer-events-none">
                                        MAD
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                    {t('date')} *
                                </label>
                                <div className="relative">
                                    <input 
                                        required
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer / Actions */}
                        <div className="pt-3 flex items-center gap-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-all"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-600/20 disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                <span>{t('save')}</span>
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AddExpenseModal;
