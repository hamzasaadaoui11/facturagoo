
import React, { useState, useMemo } from 'react';
import { 
    Plus, 
    Search, 
    Trash2, 
    Edit, 
    Wallet, 
    Calendar,
    ChevronLeft,
    ChevronRight,
    Receipt
} from 'lucide-react';
import { Expense } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import AddExpenseModal from './AddExpenseModal';
import Header from './Header';
import ConfirmationModal from './ConfirmationModal';

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
    const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    
    // Date filtering state
    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());

    const categories = [
        { id: 'Water', label: t('expWater'), color: 'bg-blue-100 text-blue-700' },
        { id: 'Electricity', label: t('expElectricity'), color: 'bg-yellow-100 text-yellow-700' },
        { id: 'Internet', label: t('expInternet'), color: 'bg-indigo-100 text-indigo-700' },
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
            
            const searchStr = `${expense.description} ${expense.category}`.toLowerCase();
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
        <div>
            <Header title={t('expenses')}>
                 <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center gap-x-2 rounded-lg bg-emerald-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.97]"
                >
                    <Plus className="-ml-0.5 h-5 w-5 rtl:ml-0.5 rtl:-mr-0.5" />
                    <span className="hidden sm:inline">{t('addExpense')}</span>
                    <span className="sm:hidden">{t('add')}</span>
                </button>
            </Header>

            <div className="space-y-6">
                
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

                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center col-span-1 md:col-span-2">
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
                <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-neutral-200">
                    <div className="p-4 border-b border-neutral-200">
                         <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 flex items-center pl-3 rtl:right-0 rtl:pr-3">
                               <Search className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                            </div>
                            <input
                               type="search"
                               placeholder={t('search')}
                               value={searchTerm}
                               onChange={(e) => setSearchTerm(e.target.value)}
                               className={`block w-full rounded-lg border-neutral-300 py-2 text-neutral-900 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm ${isRTL ? 'pr-10' : 'pl-10'}`}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-neutral-200">
                            <thead className="bg-neutral-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 rtl:text-right">{t('date')}</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 rtl:text-right">{t('category')}</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 rtl:text-right">{t('description')}</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 text-right">{t('amount')}</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 text-right">{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200 bg-white">
                                <AnimatePresence mode="popLayout">
                                    {filteredExpenses.length > 0 ? (
                                        filteredExpenses.map((expense) => (
                                            <motion.tr 
                                                key={expense.id}
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="hover:bg-neutral-50 transition-colors group"
                                            >
                                                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-neutral-900">
                                                    {new Date(expense.date).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR', { day: '2-digit', month: 'short' })}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                                                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getCategoryColor(expense.category)}`}>
                                                        {getCategoryLabel(expense.category)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-neutral-500">
                                                    {expense.description}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-neutral-900 text-right">
                                                    {expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} DH
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => setEditingExpense(expense)}
                                                            className="text-emerald-600 hover:text-emerald-900 transition-colors"
                                                            title={t('edit')}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => {
                                                                setExpenseToDelete(expense.id);
                                                                setIsConfirmOpen(true);
                                                            }}
                                                            className="text-red-600 hover:text-red-900 transition-colors"
                                                            title={t('delete')}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-sm font-medium text-neutral-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                                                        <Receipt className="w-8 h-8 text-neutral-400" />
                                                    </div>
                                                    <p className="text-neutral-900 font-semibold">{t('noExpensesFound')}</p>
                                                    <p className="mt-1">{t('firstExpensePrompt')}</p>
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

            <ConfirmationModal
                isOpen={isConfirmOpen}
                title={t('confirmDelete')}
                message="Êtes-vous sûr de vouloir supprimer cette dépense ? Cette action est irréversible."
                onConfirm={() => {
                    if (expenseToDelete) {
                        onDeleteExpense(expenseToDelete);
                    }
                    setIsConfirmOpen(false);
                    setExpenseToDelete(null);
                }}
                onClose={() => {
                    setIsConfirmOpen(false);
                    setExpenseToDelete(null);
                }}
            />
        </div>
    );
};

export default Expenses;
