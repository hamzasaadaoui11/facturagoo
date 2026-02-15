
import React, { useState, useMemo } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
    Calendar, TrendingUp, TrendingDown, DollarSign, 
    CreditCard, ShoppingBag, ArrowUpRight, ArrowDownRight, Filter, PieChart as PieIcon, Activity
} from 'lucide-react';
import { Invoice, Payment, PurchaseOrder, Product, PurchaseOrderStatus, InvoiceStatus, CreditNote, CreditNoteStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface StatisticsProps {
    invoices: Invoice[];
    payments: Payment[];
    purchaseOrders: PurchaseOrder[];
    products: Product[];
    creditNotes?: CreditNote[];
}

type DateRangeType = 'today' | 'week' | 'month' | 'year' | 'custom';

const Statistics: React.FC<StatisticsProps> = ({ invoices, payments, purchaseOrders, products, creditNotes = [] }) => {
    const { t, isRTL, language } = useLanguage();
    
    // State for filtering
    const [rangeType, setRangeType] = useState<DateRangeType>('month');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // --- Helper Functions ---

    const getDatesFromRange = (type: DateRangeType, customStart?: string, customEnd?: string) => {
        const end = new Date();
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        switch (type) {
            case 'today':
                break; // start is today 00:00
            case 'week':
                const day = start.getDay();
                const diff = start.getDate() - day + (day === 0 ? -6 : 1); 
                start.setDate(diff);
                break;
            case 'month':
                start.setDate(1);
                break;
            case 'year':
                start.setMonth(0, 1);
                break;
            case 'custom':
                if (customStart) start.setTime(new Date(customStart).getTime());
                if (customEnd) end.setTime(new Date(customEnd).getTime());
                end.setHours(23, 59, 59, 999);
                break;
        }
        return { start, end };
    };

    const getPreviousDates = (start: Date, end: Date) => {
        const duration = end.getTime() - start.getTime();
        const prevEnd = new Date(start.getTime() - 1);
        const prevStart = new Date(prevEnd.getTime() - duration);
        return { prevStart, prevEnd };
    };

    // --- Core Calculations ---

    const { currentMetrics, previousMetrics, evolutionData, productPerformance } = useMemo(() => {
        const { start, end } = getDatesFromRange(rangeType, startDate, endDate);
        const { prevStart, prevEnd } = getPreviousDates(start, end);

        const isInRange = (dateStr: string, s: Date, e: Date) => {
            const d = new Date(dateStr);
            return d >= s && d <= e;
        };

        // Calculate Financials (Cash Basis)
        const calculateFinancials = (s: Date, e: Date) => {
            const periodPayments = payments.filter(p => isInRange(p.date, s, e));
            const revenue = periodPayments.reduce((sum, p) => sum + p.amount, 0);

            // Deduct Validated Credit Notes
            const periodCreditNotes = creditNotes.filter(cn => 
                (cn.status === CreditNoteStatus.Validated || cn.status === CreditNoteStatus.Refunded) &&
                isInRange(cn.date, s, e)
            );
            const totalCreditNotes = periodCreditNotes.reduce((sum, cn) => sum + cn.amount, 0);

            const periodExpenses = purchaseOrders.filter(po => 
                (po.status === PurchaseOrderStatus.Received || po.status === PurchaseOrderStatus.Sent) && 
                isInRange(po.date, s, e)
            );
            const expenses = periodExpenses.reduce((sum, po) => sum + po.totalAmount, 0);

            // Net Revenue = Payments - Credit Notes
            const netRevenue = revenue - totalCreditNotes;

            return { revenue: netRevenue, expenses, profit: netRevenue - expenses };
        };

        const current = calculateFinancials(start, end);
        const previous = calculateFinancials(prevStart, prevEnd);

        // Evolution Chart Data
        const chartDataMap = new Map<string, { date: string, revenue: number, expense: number, profit: number }>();
        
        // Add Payments
        payments.filter(p => isInRange(p.date, start, end)).forEach(p => {
            const d = p.date;
            if (!chartDataMap.has(d)) chartDataMap.set(d, { date: d, revenue: 0, expense: 0, profit: 0 });
            const entry = chartDataMap.get(d)!;
            entry.revenue += p.amount;
            entry.profit += p.amount;
        });

        // Subtract Credit Notes
        creditNotes.filter(cn => (cn.status === CreditNoteStatus.Validated || cn.status === CreditNoteStatus.Refunded) && isInRange(cn.date, start, end)).forEach(cn => {
            const d = cn.date;
            if (!chartDataMap.has(d)) chartDataMap.set(d, { date: d, revenue: 0, expense: 0, profit: 0 });
            const entry = chartDataMap.get(d)!;
            entry.revenue -= cn.amount;
            entry.profit -= cn.amount;
        });

        // Add Expenses
        purchaseOrders.filter(po => (po.status === PurchaseOrderStatus.Received || po.status === PurchaseOrderStatus.Sent) && isInRange(po.date, start, end)).forEach(po => {
            const d = po.date;
            if (!chartDataMap.has(d)) chartDataMap.set(d, { date: d, revenue: 0, expense: 0, profit: 0 });
            const entry = chartDataMap.get(d)!;
            entry.expense += po.totalAmount;
            entry.profit -= po.totalAmount;
        });

        const evolutionData = Array.from(chartDataMap.values()).sort((a, b) => a.date.localeCompare(b.date));

        // Product Performance
        const productStats = new Map<string, { id: string, name: string, qty: number, revenue: number, cost: number }>();

        invoices.filter(inv => inv.status !== InvoiceStatus.Draft && isInRange(inv.date, start, end)).forEach(inv => {
            inv.lineItems.forEach(item => {
                if (item.productId) {
                    if (!productStats.has(item.productId)) {
                        productStats.set(item.productId, { id: item.productId, name: item.name, qty: 0, revenue: 0, cost: 0 });
                    }
                    const stat = productStats.get(item.productId)!;
                    stat.qty += item.quantity;
                    stat.revenue += (item.quantity * item.unitPrice);
                    
                    const productDef = products.find(p => p.id === item.productId);
                    const unitCost = productDef ? productDef.purchasePrice : 0;
                    stat.cost += (item.quantity * unitCost);
                }
            });
        });

        const productPerformance = Array.from(productStats.values())
            .map(p => ({ ...p, profit: p.revenue - p.cost, margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0 }))
            .sort((a, b) => b.revenue - a.revenue);

        return { currentMetrics: current, previousMetrics: previous, evolutionData, productPerformance };

    }, [invoices, payments, purchaseOrders, products, creditNotes, rangeType, startDate, endDate]);

    // --- Render Helpers ---

    const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    const currencyLocale = language === 'ar' ? 'ar-MA' : (language === 'es' ? 'es-ES' : 'fr-FR');
    const formatMoney = (amount: number) => amount.toLocaleString(currencyLocale, { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10" dir={isRTL ? 'rtl' : 'ltr'}>
            
            {/* Header & Filters Section */}
            <div className="relative bg-slate-900 rounded-3xl p-8 overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -ml-10 -mb-10"></div>
                
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Activity className="text-emerald-400" /> {t('financialAnalysis')}
                        </h2>
                        <p className="text-slate-400 mt-2">{t('analysisDesc')}</p>
                    </div>

                    {/* Modern Floating Filter Bar */}
                    <div className="bg-white/10 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl flex flex-col sm:flex-row gap-2 shadow-lg">
                        <div className="flex bg-slate-800/50 rounded-xl p-1">
                            {(['today', 'week', 'month', 'year'] as DateRangeType[]).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => { setRangeType(type); setStartDate(''); setEndDate(''); }}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                        rangeType === type && !startDate 
                                        ? 'bg-emerald-500 text-white shadow-md' 
                                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    {type === 'today' ? t('today').split(' ')[0] : type === 'week' ? t('periodWeek') : type === 'month' ? t('periodMonth') : t('periodYear')}
                                </button>
                            ))}
                            <button
                                onClick={() => setRangeType('custom')}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                    rangeType === 'custom' || startDate 
                                    ? 'bg-emerald-500 text-white shadow-md' 
                                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {t('customRange')}
                            </button>
                        </div>

                        {(rangeType === 'custom' || startDate) && (
                            <div className="flex items-center gap-2 px-2">
                                <input 
                                    type="date" 
                                    value={startDate} 
                                    onChange={(e) => { setStartDate(e.target.value); setRangeType('custom'); }} 
                                    className="bg-slate-800 border-none text-white text-sm rounded-lg focus:ring-1 focus:ring-emerald-500 py-2"
                                />
                                <span className="text-slate-500">-</span>
                                <input 
                                    type="date" 
                                    value={endDate} 
                                    onChange={(e) => { setEndDate(e.target.value); setRangeType('custom'); }} 
                                    className="bg-slate-800 border-none text-white text-sm rounded-lg focus:ring-1 focus:ring-emerald-500 py-2"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Revenue Card */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                                <DollarSign size={24} />
                            </div>
                            {(() => {
                                const growth = calculateGrowth(currentMetrics.revenue, previousMetrics.revenue);
                                return (
                                    <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${growth >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                        {growth >= 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
                                        {Math.abs(growth).toFixed(1)}%
                                    </span>
                                );
                            })()}
                        </div>
                        <p className="text-slate-500 text-sm font-medium">{t('revenueNet')}</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{formatMoney(currentMetrics.revenue)}</h3>
                    </div>
                </div>

                {/* Expenses Card */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
                                <ShoppingBag size={24} />
                            </div>
                            {(() => {
                                const growth = calculateGrowth(currentMetrics.expenses, previousMetrics.expenses);
                                return (
                                    <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${growth <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                        {growth > 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
                                        {Math.abs(growth).toFixed(1)}%
                                    </span>
                                );
                            })()}
                        </div>
                        <p className="text-slate-500 text-sm font-medium">{t('totalExpenses')}</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{formatMoney(currentMetrics.expenses)}</h3>
                    </div>
                </div>

                {/* Profit Card */}
                <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-3xl p-6 shadow-lg text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400 opacity-20 rounded-full -ml-10 -mb-10 blur-2xl"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                                <TrendingUp size={24} className="text-white" />
                            </div>
                            <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full text-indigo-100">
                                {t('margin')}: {currentMetrics.revenue > 0 ? ((currentMetrics.profit / currentMetrics.revenue) * 100).toFixed(1) : 0}%
                            </span>
                        </div>
                        <p className="text-indigo-100 text-sm font-medium">{t('netProfit')}</p>
                        <h3 className="text-3xl font-extrabold mt-1">{formatMoney(currentMetrics.profit)}</h3>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Evolution Chart */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-lg font-bold text-slate-900">{t('evolutionTime')}</h3>
                        <div className="flex items-center gap-2 text-xs font-medium">
                            <span className="flex items-center gap-1 text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> {t('receipts')}</span>
                            <span className="flex items-center gap-1 text-red-600"><span className="w-2 h-2 rounded-full bg-red-500"></span> {t('expenses')}</span>
                        </div>
                    </div>
                    <div className="flex-1 h-80 w-full min-h-[300px]">
                        {evolutionData.length > 0 ? (
                             <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={evolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis 
                                        dataKey="date" 
                                        tick={{fontSize: 12, fill: '#94a3b8'}} 
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(val) => new Date(val).toLocaleDateString(currencyLocale, { day: '2-digit', month: '2-digit' })} 
                                        dy={10}
                                    />
                                    <YAxis 
                                        tick={{fontSize: 12, fill: '#94a3b8'}} 
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <Tooltip 
                                        formatter={(value: number) => formatMoney(value)}
                                        labelFormatter={(label) => new Date(label).toLocaleDateString(currencyLocale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        contentStyle={{ backgroundColor: 'white', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="revenue" name={t('receipts')} stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                                    <Area type="monotone" dataKey="expense" name={t('expenses')} stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 flex-col bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                <Filter className="h-10 w-10 mb-2 opacity-20" />
                                <p>{t('noDataPeriod')}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Products Chart */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-lg font-bold text-slate-900">{t('top5Products')}</h3>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <PieIcon size={20} />
                        </div>
                    </div>
                    <div className="flex-1 h-80 w-full min-h-[300px]">
                         {productPerformance.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={productPerformance.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }} barCategoryGap={15}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        cursor={{fill: '#f8fafc'}}
                                        formatter={(value: number) => formatMoney(value)}
                                        contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="revenue" name={t('revenueGenerated')} fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={24}>
                                        {productPerformance.slice(0, 5).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'][index % 5]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                         ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 flex-col bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                <ShoppingBag className="h-10 w-10 mb-2 opacity-20" />
                                <p>{t('noSalesPeriod')}</p>
                            </div>
                         )}
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900">{t('productDetail')}</h3>
                    <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700">{t('exportCSV')}</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className={`px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{t('pProduct')}</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">{t('quantity')}</th>
                                <th className={`px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider ${isRTL ? 'text-left' : 'text-right'}`}>{t('totalRevenue')}</th>
                                <th className={`px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider ${isRTL ? 'text-left' : 'text-right'}`}>{t('estCost')}</th>
                                <th className={`px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider ${isRTL ? 'text-left' : 'text-right'}`}>{t('grossMargin')}</th>
                                <th className={`px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider ${isRTL ? 'text-left' : 'text-right'}`}>{t('marginPercent')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {productPerformance.length > 0 ? (
                                productPerformance.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                        <td className={`px-8 py-4 text-sm font-medium text-slate-900 ${isRTL ? 'text-right' : 'text-left'}`}>{p.name}</td>
                                        <td className="px-6 py-4 text-sm text-center text-slate-600 font-medium bg-slate-50/50">{p.qty}</td>
                                        <td className={`px-6 py-4 text-sm text-slate-900 font-bold ${isRTL ? 'text-left' : 'text-right'}`}>{formatMoney(p.revenue)}</td>
                                        <td className={`px-6 py-4 text-sm text-slate-500 ${isRTL ? 'text-left' : 'text-right'}`}>{formatMoney(p.cost)}</td>
                                        <td className={`px-6 py-4 text-sm font-medium ${isRTL ? 'text-left' : 'text-right'} ${p.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {formatMoney(p.profit)}
                                        </td>
                                        <td className={`px-6 py-4 text-sm ${isRTL ? 'text-left' : 'text-right'}`}>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${p.margin > 30 ? 'bg-emerald-100 text-emerald-800' : p.margin > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                                                {p.margin.toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">{t('noDataSelectedPeriod')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Statistics;
