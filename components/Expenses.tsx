
import React, { useState, useMemo } from 'react';
import { 
    Plus, 
    Search, 
    Filter, 
    Download, 
    Trash2, 
    Edit, 
    Wallet, 
    Calendar,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    MoreHorizontal,
    Receipt
} from 'lucide-react';
import { Expense } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import AddExpenseModal from './AddExpenseModal';

interface ExpensesProps {
    expenses: Expense[];
    onAddExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
    onUpdateExpense: (expense: Expense) => Promise<void>;
    onDeleteExpense: (id: string | string[]) => Promise<void>;
}

const Expenses: React.FC<ExpensesProps> = ({ 
    expenses, 
    onAddExpense, 
    onUpdateExpense, 
    onDeleteExpense 
}) => {
    const { t, isRTL, language } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    
    // Date filtering state
    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());

    const categories = [
        { id: 'Water', label: t('expWater'), color: 'bg-blue-100 text-blue-700' },
        { id: 'Electricity', label: t('expElectricity'), color: 'bg-yellow-100 text-yellow-700' },
        { id: 'Internet', label: t('expInternet'), color: 'bg-indigo-100 text-indigo-700' },
        { id: 'Salary', label: t('expSalary'), color: 'bg-emerald-100 text-emerald-700' },
        { id: 'Rent', label: t('expRent'), color: 'bg-purple-100 text-purple-700' },
        { id: 'Other', label: t('expOther'), color: 'bg-gray-100 text-gray-700' }
    ];

    const getCategoryLabel = (catId: string) => {
        const cat = categories.find(c => c.id === catId);
        return cat ? cat.label : catId;
    };

    const getCategoryColor = (catId: string) => {
        const cat = categories.find(c => c.id === catId);
        return cat ? cat.color : 'bg-gray-100 text-gray-700';
    };

    const filteredExpenses = useMemo(() => {
        return expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            const matchesDate = expenseDate.getMonth() === selectedMonth && expenseDate.getFullYear() === selectedYear;
            
            const searchStr = `${expense.description} ${expense.category} ${expense.reference || ''}`.toLowerCase();
            const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
            
            return matchesDate && matchesSearch;
        });
    }, [expenses, selectedMonth, selectedYear, searchTerm]);

    const totalMonthly = useMemo(() => {
        return filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    }, [filteredExpenses]);

    const categorySummary = useMemo(() => {
        const summary: Record<string, number> = {};
        filteredExpenses.forEach(exp => {
            summary[exp.category] = (summary[exp.category] || 0) + exp.amount;
        });
        return summary;
    }, [filteredExpenses]);

    const handlePrevMonth = () => {
        if (selectedMonth === 0) {
            setSelectedMonth(11);
            setSelectedYear(prev => prev - 1);
        } else {
            setSelectedMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (selectedMonth === 11) {
            setSelectedMonth(0);
            setSelectedYear(prev => prev + 1);
        } else {
            setSelectedMonth(prev => prev + 1);
        }
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const currentMonthLabel = `${t(monthNames[selectedMonth].toLowerCase() as any)} ${selectedYear}`;

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{t('expenses')}</h1>
                        <p className="text-slate-500 text-sm mt-1">{t('trackAndManageExpenses')}</p>
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        <span>{t('addExpense')}</span>
                    </button>
                </div>

                {/* Monthly Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4"
                    >
                        <div className="h-12 w-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                            <Wallet className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">{t('totalMonthlyExpenses')}</p>
                            <p className="text-2xl font-bold text-slate-900">
                                {totalMonthly.toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR', { minimumFractionDigits: 2 })} <span className="text-sm font-normal text-slate-500">DH</span>
                            </p>
                        </div>
                    </motion.div>

                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between col-span-1 md:col-span-2">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-slate-400" />
                            <div className="flex items-center gap-2">
                                <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <span className="text-lg font-semibold text-slate-800 min-w-[140px] text-center">
                                    {currentMonthLabel}
                                </span>
                                <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        
                        <div className="hidden sm:flex gap-4">
                             <div className="text-right border-l pl-4 border-slate-100">
                                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">{t('count')}</p>
                                <p className="text-lg font-bold text-slate-700">{filteredExpenses.length}</p>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Desktop View Cards - Category Breakdowns */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {categories.map(cat => (
                        <div key={cat.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mb-2 ${cat.color}`}>
                                {cat.label}
                            </span>
                            <p className="font-bold text-slate-800">
                                {(categorySummary[cat.id] || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Main Table Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input 
                                type="text"
                                placeholder={t('search')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
                            />
                        </div>
                        
                        <div className="flex items-center gap-2">
                             {/* Optional: Add action buttons like export here */}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('date')}</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('category')}</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('description')}</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('reference')}</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">{t('amount')}</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <AnimatePresence mode="popLayout">
                                    {filteredExpenses.length > 0 ? (
                                        filteredExpenses.map((expense) => (
                                            <motion.tr 
                                                key={expense.id}
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="hover:bg-slate-50 transition-colors group"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                    {new Date(expense.date).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR', { day: '2-digit', month: 'short' })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${getCategoryColor(expense.category)}`}>
                                                        {getCategoryLabel(expense.category)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                                                    {expense.description}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                                                    {expense.reference || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 text-right">
                                                    {expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} DH
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => setEditingExpense(expense)}
                                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => onDeleteExpense(expense.id)}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                                                        <Receipt className="w-8 h-8" />
                                                    </div>
                                                    <p className="text-slate-900 font-semibold">{t('noExpensesFound')}</p>
                                                    <p className="text-slate-500 text-sm mt-1">{t('firstExpensePrompt')}</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <AddExpenseModal 
                isOpen={isAddModalOpen || !!editingExpense}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setEditingExpense(null);
                }}
                onSave={async (data) => {
                    if (editingExpense) {
                        await onUpdateExpense({ ...editingExpense, ...data });
                    } else {
                        await onAddExpense(data);
                    }
                    setIsAddModalOpen(false);
                    setEditingExpense(null);
                }}
                editingExpense={editingExpense}
            />
        </div>
    );
};

export default Expenses;
