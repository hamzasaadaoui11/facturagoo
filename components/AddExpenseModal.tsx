
import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
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
        { id: 'Achats', label: language === 'fr' ? 'Achats' : 'Purchases' },
        { id: 'Water', label: t('expWater') },
        { id: 'Electricity', label: t('expElectricity') },
        { id: 'Internet', label: t('expInternet') },
        { id: 'Rent', label: t('expRent') },
        { id: 'Other', label: t('expOther') }
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
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    onClick={onClose}
                />
                
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
                    dir={isRTL ? 'rtl' : 'ltr'}
                >
                    {/* Header */}
                    <div className="px-6 py-4 bg-emerald-600 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">
                            {editingExpense ? t('editExpense') : t('addExpense')}
                        </h2>
                        <button onClick={onClose} className="p-1 text-emerald-100 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('category')}</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {categories.map((cat) => (
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
                                            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                                                formData.category === cat.id 
                                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm ring-1 ring-emerald-500' 
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                            }`}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('description')}</label>
                                <input 
                                    required
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm outline-none"
                                    placeholder={t('descriptionPlaceholder')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('amount')} </label>
                                <input 
                                    required
                                    type="number"
                                    step="0.01"
                                    value={formData.amount || ''}
                                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-bold outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('date')}</label>
                                <input 
                                    required
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm outline-none"
                                />
                            </div>

                        </div>

                        {/* Footer / Actions */}
                        <div className="pt-2 flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Save className="w-5 h-5" />
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
