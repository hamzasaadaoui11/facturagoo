
import React, { useState, useMemo } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
    Calendar, TrendingUp, TrendingDown, DollarSign, 
    CreditCard, ShoppingBag, ArrowUpRight, ArrowDownRight, Filter, PieChart as PieIcon, Activity,
    ArrowRightLeft, UserCheck, Truck, BarChart2, User, Target, Info
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
    
    const [rangeType, setRangeType] = useState<DateRangeType>('month');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    
    const [selectedClientId, setSelectedClientId] = useState<string>('');

    const getDatesFromRange = (type: DateRangeType, customStart?: string, customEnd?: string) => {
        const end = new Date();
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        switch (type) {
            case 'today': break;
            case 'week':
                const day = start.getDay();
                const diff = start.getDate() - day + (day === 0 ? -6 : 1); 
                start.setDate(diff);
                break;
            case 'month': start.setDate(1); break;
            case 'year': start.setMonth(0, 1); break;
            case 'custom':
                if (customStart) start.setTime(new Date(customStart).getTime());
                if (customEnd) end.setTime(new Date(customEnd).getTime());
                end.setHours(23, 59, 59, 999);
                break;
        }
        return { start, end };
    };

    const currencyLocale = language === 'ar' ? 'ar-MA' : (language === 'es' ? 'es-ES' : 'fr-FR');
    const formatMoney = (amount: number) => amount.toLocaleString(currencyLocale, { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 });

    const { currentMetrics, previousMetrics, evolutionData, productPerformance, financeBreakdown, clientsList } = useMemo(() => {
        const { start, end } = getDatesFromRange(rangeType, startDate, endDate);
        const duration = end.getTime() - start.getTime();
        const prevEnd = new Date(start.getTime() - 1);
        const prevStart = new Date(prevEnd.getTime() - duration);

        const isInRange = (dateStr: string, s: Date, e: Date) => {
            const d = new Date(dateStr);
            return d >= s && d <= e;
        };

        const clientsMap = new Map<string, string>();
        invoices.forEach(inv => clientsMap.set(inv.clientId, inv.clientName));
        const clientsList = Array.from(clientsMap.entries()).map(([id, name]) => ({ id, name }));

        const calculateFinancials = (s: Date, e: Date) => {
            // Cash-based revenue: Sum of payments actually received
            const periodPayments = payments.filter(p => isInRange(p.date, s, e));
            const revenue = periodPayments.reduce((sum, p) => sum + p.amount, 0);
            
            const periodCreditNotes = creditNotes.filter(cn => (cn.status === CreditNoteStatus.Validated || cn.status === CreditNoteStatus.Refunded) && isInRange(cn.date, s, e));
            const totalCreditNotes = periodCreditNotes.reduce((sum, cn) => sum + cn.amount, 0);
            
            const periodExpenses = purchaseOrders.filter(po => (po.status === PurchaseOrderStatus.Received || po.status === PurchaseOrderStatus.Sent) && isInRange(po.date, s, e));
            const expenses = periodExpenses.reduce((sum, po) => sum + po.totalAmount, 0);
            
            return { revenue: revenue - totalCreditNotes, expenses, profit: (revenue - totalCreditNotes) - expenses };
        };

        const current = calculateFinancials(start, end);
        const previous = calculateFinancials(prevStart, prevEnd);

        // Client revenue breakdown based on real payments
        const clientRevenueMap = new Map<string, number>();
        payments.filter(p => isInRange(p.date, start, end)).forEach(p => {
            clientRevenueMap.set(p.clientName, (clientRevenueMap.get(p.clientName) || 0) + p.amount);
        });

        const supplierChargeMap = new Map<string, number>();
        purchaseOrders.filter(po => (po.status === PurchaseOrderStatus.Received || po.status === PurchaseOrderStatus.Sent) && isInRange(po.date, start, end)).forEach(po => {
            supplierChargeMap.set(po.supplierName, (supplierChargeMap.get(po.supplierName) || 0) + po.totalAmount);
        });

        const financeBreakdown = {
            topClients: Array.from(clientRevenueMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5),
            topSuppliers: Array.from(supplierChargeMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
        };

        const chartDataMap = new Map<string, { date: string, revenue: number, expense: number, profit: number }>();
        payments.filter(p => isInRange(p.date, start, end)).forEach(p => {
            if (!chartDataMap.has(p.date)) chartDataMap.set(p.date, { date: p.date, revenue: 0, expense: 0, profit: 0 });
            chartDataMap.get(p.date)!.revenue += p.amount;
        });

        // Global product performance weighted by payment ratio
        const productStats = new Map<string, { id: string, name: string, qty: number, revenue: number, cost: number }>();
        invoices.filter(inv => inv.status !== InvoiceStatus.Draft && isInRange(inv.date, start, end)).forEach(inv => {
            // Ratio of what was actually paid on this invoice
            const paymentRatio = inv.amount > 0 ? (inv.amountPaid / inv.amount) : 0;

            inv.lineItems.forEach(item => {
                if (item.productId) {
                    if (!productStats.has(item.productId)) productStats.set(item.productId, { id: item.productId, name: item.name, qty: 0, revenue: 0, cost: 0 });
                    const stat = productStats.get(item.productId)!;
                    stat.qty += item.quantity;
                    
                    // Actual revenue is the line total multiplied by how much the client actually paid for the overall invoice
                    const lineTotal = item.quantity * item.unitPrice;
                    stat.revenue += (lineTotal * paymentRatio);

                    const productDef = products.find(p => p.id === item.productId);
                    stat.cost += (item.quantity * (productDef?.purchasePrice || 0));
                }
            });
        });

        const productPerformance = Array.from(productStats.values()).map(p => ({ ...p, profit: p.revenue - p.cost, margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0 })).sort((a, b) => b.revenue - a.revenue);

        return { currentMetrics: current, previousMetrics: previous, evolutionData: Array.from(chartDataMap.values()).sort((a, b) => a.date.localeCompare(b.date)), productPerformance, financeBreakdown, clientsList };
    }, [invoices, payments, purchaseOrders, products, creditNotes, rangeType, startDate, endDate]);

    // Client Profitability Calculation - Now fully Cash-Based
    const clientProfitability = useMemo(() => {
        if (!selectedClientId) return null;

        const clientInvoices = invoices.filter(inv => inv.clientId === selectedClientId && inv.status !== InvoiceStatus.Draft);
        const clientPayments = payments.filter(p => p.clientId === selectedClientId);
        
        // Total cash actually in hand
        const totalEncaisse = clientPayments.reduce((sum, p) => sum + p.amount, 0);
        
        let totalCoutAchat = 0;
        const productsBought = new Map<string, { name: string, qty: number, cost: number, revenue: number }>();

        clientInvoices.forEach(inv => {
            // Ratio of payment for this specific invoice
            const paymentRatio = inv.amount > 0 ? (inv.amountPaid / inv.amount) : 0;

            inv.lineItems.forEach(item => {
                if (item.productId) {
                    const productDef = products.find(p => p.id === item.productId);
                    const purchasePrice = productDef?.purchasePrice || 0;
                    
                    const lineCost = item.quantity * purchasePrice;
                    const lineBilledRevenue = item.quantity * item.unitPrice;
                    
                    // Real revenue for this product = (Billed * Ratio of payment on invoice)
                    const lineRealRevenue = lineBilledRevenue * paymentRatio;
                    
                    totalCoutAchat += lineCost;

                    if (!productsBought.has(item.productId)) {
                        productsBought.set(item.productId, { name: item.name, qty: 0, cost: 0, revenue: 0 });
                    }
                    const pData = productsBought.get(item.productId)!;
                    pData.qty += item.quantity;
                    pData.cost += lineCost;
                    pData.revenue += lineRealRevenue; // This now reflects ONLY what was paid
                }
            });
        });

        return {
            clientName: clientsList.find(c => c.id === selectedClientId)?.name || '',
            totalEncaisse,
            totalCoutAchat,
            profitNette: totalEncaisse - totalCoutAchat,
            marginPercent: totalEncaisse > 0 ? ((totalEncaisse - totalCoutAchat) / totalEncaisse) * 100 : 0,
            products: Array.from(productsBought.values()).sort((a, b) => b.revenue - a.revenue)
        };
    }, [selectedClientId, invoices, payments, products, clientsList]);

    const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10" dir={isRTL ? 'rtl' : 'ltr'}>
            
            {/* Header Section */}
            <div className="relative bg-slate-900 rounded-3xl p-8 overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -ml-10 -mb-10"></div>
                
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Activity className="text-emerald-400" /> {t('financialAnalysis')}
                        </h2>
                        <p className="text-slate-400 mt-2">Suivi réel basé sur les encaissements (Cash-Flow)</p>
                    </div>

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
                            <button onClick={() => setRangeType('custom')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${rangeType === 'custom' || startDate ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
                                {t('customRange')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl"><DollarSign size={24} /></div>
                        {(() => {
                            const growth = calculateGrowth(currentMetrics.revenue, previousMetrics.revenue);
                            return <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${growth >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{growth >= 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}{Math.abs(growth).toFixed(1)}%</span>;
                        })()}
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Recettes Encaissées</p>
                    <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{formatMoney(currentMetrics.revenue)}</h3>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-red-100 text-red-600 rounded-2xl"><ShoppingBag size={24} /></div>
                        {(() => {
                            const growth = calculateGrowth(currentMetrics.expenses, previousMetrics.expenses);
                            return <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${growth <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{growth > 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}{Math.abs(growth).toFixed(1)}%</span>;
                        })()}
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Coûts d'Achats (Sorties Stock)</p>
                    <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{formatMoney(currentMetrics.expenses)}</h3>
                </div>

                <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-3xl p-6 shadow-lg text-white">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl"><TrendingUp size={24} /></div>
                        <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">Bénéfice Réel: {currentMetrics.revenue > 0 ? ((currentMetrics.profit / currentMetrics.revenue) * 100).toFixed(1) : 0}%</span>
                    </div>
                    <p className="text-indigo-100 text-sm font-medium">Résultat Net (Encaissé - Coût)</p>
                    <h3 className="text-3xl font-extrabold mt-1">{formatMoney(currentMetrics.profit)}</h3>
                </div>
            </div>

            {/* SECTION: CLIENT PROFITABILITY ANALYSIS */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><Target size={20} /></div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Rentabilité par Client</h3>
                            <p className="text-xs text-slate-500">Calcul basé uniquement sur les paiements reçus (Proratisé par produit)</p>
                        </div>
                    </div>
                    <div className="w-full md:w-64">
                        <select 
                            value={selectedClientId} 
                            onChange={(e) => setSelectedClientId(e.target.value)}
                            className="block w-full rounded-xl border-slate-200 bg-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-11"
                        >
                            <option value="">-- Sélectionner un client --</option>
                            {clientsList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>

                {clientProfitability ? (
                    <div className="p-8 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Encaissé</p>
                                <p className="text-2xl font-black text-emerald-900">{formatMoney(clientProfitability.totalEncaisse)}</p>
                                <p className="text-[10px] text-emerald-500 mt-1">Argent réel reçu du client</p>
                            </div>
                            <div className="p-5 bg-red-50 rounded-2xl border border-red-100">
                                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Coût Réel Livré</p>
                                <p className="text-2xl font-black text-red-900">{formatMoney(clientProfitability.totalCoutAchat)}</p>
                                <p className="text-[10px] text-red-500 mt-1">Valeur d'achat des produits livrés</p>
                            </div>
                            <div className={`p-5 rounded-2xl border ${clientProfitability.profitNette >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-rose-50 border-rose-100'}`}>
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${clientProfitability.profitNette >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>Marge Nette (Cash)</p>
                                <p className={`text-2xl font-black ${clientProfitability.profitNette >= 0 ? 'text-indigo-900' : 'text-rose-900'}`}>{formatMoney(clientProfitability.profitNette)}</p>
                                <p className={`text-[10px] mt-1 ${clientProfitability.profitNette >= 0 ? 'text-indigo-500' : 'text-rose-500'}`}>Taux de marge : {clientProfitability.marginPercent.toFixed(1)}%</p>
                            </div>
                        </div>

                        <div className="border border-slate-100 rounded-2xl overflow-hidden">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Produit</th>
                                        <th className="px-6 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantité Livrée</th>
                                        <th className="px-6 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Encaissé (Revenu Réel)</th>
                                        <th className="px-6 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Coût (Charge)</th>
                                        <th className="px-6 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Marge Réelle</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-50">
                                    {clientProfitability.products.map((p, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 text-sm font-bold text-slate-900">{p.name}</td>
                                            <td className="px-6 py-4 text-sm text-center text-slate-600 font-medium">{p.qty}</td>
                                            <td className="px-6 py-4 text-sm text-right text-emerald-600 font-bold">{formatMoney(p.revenue)}</td>
                                            <td className="px-6 py-4 text-sm text-right text-red-500">{formatMoney(p.cost)}</td>
                                            <td className={`px-6 py-4 text-sm text-right font-black ${p.revenue - p.cost >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatMoney(p.revenue - p.cost)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="px-8 py-16 text-center text-slate-400">
                        <User className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium">Sélectionnez un client pour voir son analyse de rentabilité réelle (Cash-Based).</p>
                        <div className="flex items-center justify-center gap-2 mt-4 text-[10px] bg-blue-50 text-blue-600 w-fit mx-auto px-3 py-1 rounded-full">
                            <Info size={12}/> Si une facture est payée à 50%, seul 50% du prix des produits est compté ici.
                        </div>
                    </div>
                )}
            </div>

            {/* Global Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900 mb-8">Évolution des Recettes (Encaissées)</h3>
                    <div className="h-80 w-full">
                        {evolutionData.length > 0 ? (
                             <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={evolutionData}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" tick={{fontSize: 10}} axisLine={false} tickLine={false} tickFormatter={(val) => new Date(val).toLocaleDateString(currencyLocale, { day: '2-digit', month: '2-digit' })} />
                                    <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                                    <Tooltip formatter={(value: number) => formatMoney(value)} />
                                    <Area type="monotone" dataKey="revenue" name="Encaissé" stroke="#10b981" strokeWidth={3} fill="url(#colorRev)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : <div className="h-full flex items-center justify-center text-slate-300 italic">{t('noDataPeriod')}</div>}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900 mb-8">Performance Encaissée par Produit (Top 5)</h3>
                    <div className="h-80 w-full">
                         {productPerformance.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={productPerformance.slice(0, 5)} layout="vertical">
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                                    <Tooltip formatter={(value: number) => formatMoney(value)} />
                                    <Bar dataKey="revenue" name="Revenu Encaissé" radius={[0, 4, 4, 0]}>
                                        {productPerformance.slice(0, 5).map((_, index) => <Cell key={index} fill={['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'][index % 5]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                         ) : <div className="h-full flex items-center justify-center text-slate-300 italic">{t('noSalesPeriod')}</div>}
                    </div>
                </div>
            </div>

            {/* Global Detailed Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-900">Détail Rentabilité Réelle par Produit</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">{t('pProduct')}</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Ventes (Qté)</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Encaissé Réel</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Coût Achat</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Marge (Cash)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {productPerformance.length > 0 ? (
                                productPerformance.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-8 py-4 text-sm font-medium text-slate-900">{p.name}</td>
                                        <td className="px-6 py-4 text-sm text-center text-slate-600">{p.qty}</td>
                                        <td className="px-6 py-4 text-sm text-right text-emerald-600 font-bold">{formatMoney(p.revenue)}</td>
                                        <td className="px-6 py-4 text-sm text-right text-slate-500">{formatMoney(p.cost)}</td>
                                        <td className={`px-6 py-4 text-sm font-bold text-right ${p.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatMoney(p.profit)}</td>
                                    </tr>
                                ))
                            ) : <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">{t('noDataSelectedPeriod')}</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Statistics;
