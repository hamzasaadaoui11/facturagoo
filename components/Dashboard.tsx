
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Invoice, InvoiceStatus, Client, Product, CompanySettings } from '../types';
import { Users, Package, FileText, AlertCircle, AlertTriangle, DollarSign, Gift, Archive, CheckCircle, ArrowRight, UserPlus, List, ChevronRight, TrendingUp, ShoppingBag, CalendarDays, Clock, Filter } from 'lucide-react';

interface DashboardProps {
    invoices: Invoice[];
    clients: Client[];
    products: Product[];
    companySettings?: CompanySettings | null;
}

const StatCard: React.FC<{
    item: { name: string; stat: string | number; icon: React.ElementType; color: string; desc: string };
}> = ({ item }) => (
    <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-md group">
        <div className="flex justify-between items-start">
            <div className={`p-3 rounded-xl ${item.color} bg-opacity-10 group-hover:bg-opacity-20 transition-all`}>
                <item.icon className={`h-6 w-6 ${item.color.replace('bg-', 'text-')}`} />
            </div>
            {/* Optional trend badge could go here */}
        </div>
        <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">{item.name}</p>
            <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-1 truncate">{item.stat}</p>
            <p className="text-sm text-slate-400 mt-1">{item.desc}</p>
        </div>
    </div>
);

const ShortcutCard = ({ icon: Icon, label, desc, onClick, colorClass }: { icon: React.ElementType, label: string, desc: string, onClick: () => void, colorClass: string }) => {
    return (
        <button onClick={onClick} className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-slate-100 flex items-center gap-4 text-left hover:ring-emerald-500/50 hover:shadow-md transition-all group w-full">
            <div className={`flex items-center justify-center h-12 w-12 rounded-xl ${colorClass} bg-opacity-10 group-hover:scale-110 transition-transform flex-shrink-0`}>
                <Icon className={`h-6 w-6 ${colorClass.replace('bg-', 'text-')}`} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 truncate text-base">{label}</p>
                <p className="text-sm text-slate-500 truncate">{desc}</p>
            </div>
            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">
                <ChevronRight size={20} />
            </div>
        </button>
    );
};

type ChartPeriod = 'day' | 'week' | 'month' | 'year' | 'custom';

const Dashboard: React.FC<DashboardProps> = ({ invoices, clients, products, companySettings }) => {
    const navigate = useNavigate();
    const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('year');
    const [customStartDate, setCustomStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);
    
    // Date du jour formatée
    const todayDate = new Date().toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    const { totalRevenue, unpaidInvoicesCount, unpaidAmount } = useMemo(() => {
        const today = new Date();
        let totalRevenue = 0;
        let unpaidInvoicesCount = 0;
        let unpaidAmount = 0;

        invoices.forEach(inv => {
            if (inv.status === InvoiceStatus.Paid) {
                totalRevenue += inv.amount;
            }
            if (inv.status === InvoiceStatus.Pending || (inv.status !== InvoiceStatus.Paid && new Date(inv.dueDate) < today)) {
                unpaidInvoicesCount++;
                unpaidAmount += (inv.amount - (inv.amountPaid || 0));
            }
        });
        return { totalRevenue, unpaidInvoicesCount, unpaidAmount };
    }, [invoices]);

    const stats = [
        { 
            name: 'Revenu Total', 
            stat: totalRevenue.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }), 
            icon: DollarSign, 
            color: 'bg-emerald-500 text-emerald-600',
            desc: 'Sur toutes les factures payées'
        },
        { 
            name: 'Factures Impayées', 
            stat: unpaidInvoicesCount, 
            icon: AlertCircle, 
            color: 'bg-amber-500 text-amber-600',
            desc: `Montant restant : ${unpaidAmount.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 })}`
        },
        { 
            name: 'Clients Actifs', 
            stat: clients.length, 
            icon: Users, 
            color: 'bg-blue-500 text-blue-600',
            desc: 'Base de données clients'
        },
        { 
            name: 'Catalogue', 
            stat: products.length, 
            icon: Package, 
            color: 'bg-purple-500 text-purple-600',
            desc: 'Produits et services'
        },
    ];

    const chartData = useMemo(() => {
        const today = new Date();
        let data: { name: string; fullDate?: string; Revenu: number }[] = [];

        const getPaidInvoices = (start: Date, end: Date) => {
            return invoices.filter(inv => {
                if (inv.status !== InvoiceStatus.Paid) return false;
                const d = new Date(inv.paymentDate || inv.date);
                return d >= start && d <= end;
            });
        };

        if (chartPeriod === 'day') {
            const startOfDay = new Date(today.setHours(0,0,0,0));
            const endOfDay = new Date(today.setHours(23,59,59,999));
            const relevantInvoices = getPaidInvoices(startOfDay, endOfDay);

            for (let i = 0; i <= 24; i += 4) {
                const label = `${i}h`;
                const amount = relevantInvoices.reduce((acc, inv) => {
                    const h = new Date(inv.paymentDate || inv.date).getHours();
                    return (h >= i && h < i + 4) ? acc + inv.amount : acc;
                }, 0);
                data.push({ name: label, Revenu: amount });
            }

        } else if (chartPeriod === 'week') {
            const curr = new Date();
            const first = curr.getDate() - curr.getDay() + 1; 
            const last = first + 6;
            
            const startOfWeek = new Date(curr.setDate(first));
            startOfWeek.setHours(0,0,0,0);
            const endOfWeek = new Date(curr.setDate(last));
            endOfWeek.setHours(23,59,59,999);

            const relevantInvoices = getPaidInvoices(startOfWeek, endOfWeek);
            const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

            data = days.map((day, index) => {
                const amount = relevantInvoices.reduce((acc, inv) => {
                    let d = new Date(inv.paymentDate || inv.date).getDay();
                    let mappedIndex = d === 0 ? 6 : d - 1;
                    return mappedIndex === index ? acc + inv.amount : acc;
                }, 0);
                return { name: day, Revenu: amount };
            });

        } else if (chartPeriod === 'month') {
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            const relevantInvoices = getPaidInvoices(startOfMonth, endOfMonth);
            const daysInMonth = endOfMonth.getDate();

            for (let i = 1; i <= daysInMonth; i++) {
                const amount = relevantInvoices.reduce((acc, inv) => {
                    const d = new Date(inv.paymentDate || inv.date).getDate();
                    return d === i ? acc + inv.amount : acc;
                }, 0);
                data.push({ name: `${i}`, Revenu: amount });
            }

        } else if (chartPeriod === 'year') {
            const startOfYear = new Date(today.getFullYear(), 0, 1);
            const endOfYear = new Date(today.getFullYear(), 11, 31);
            const relevantInvoices = getPaidInvoices(startOfYear, endOfYear);
            
            const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
            data = months.map((month, index) => {
                const amount = relevantInvoices.reduce((acc, inv) => {
                    const m = new Date(inv.paymentDate || inv.date).getMonth();
                    return m === index ? acc + inv.amount : acc;
                }, 0);
                return { name: month, Revenu: amount };
            });
        } else if (chartPeriod === 'custom') {
            const start = new Date(customStartDate);
            start.setHours(0,0,0,0);
            const end = new Date(customEndDate);
            end.setHours(23,59,59,999);
            
            const relevantInvoices = getPaidInvoices(start, end);
            
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                const isoDate = d.toISOString().split('T')[0];
                
                const amount = relevantInvoices.reduce((acc, inv) => {
                    const invDate = new Date(inv.paymentDate || inv.date).toISOString().split('T')[0];
                    return invDate === isoDate ? acc + inv.amount : acc;
                }, 0);
                
                data.push({ name: dateStr, fullDate: isoDate, Revenu: amount });
            }
        }

        return data;
    }, [invoices, chartPeriod, customStartDate, customEndDate]);

    const lowStockProducts = useMemo(() => {
        return products
            .filter(p => p.productType === 'Produit' && (p.stockQuantity || 0) <= (p.minStockAlert || 5))
            .sort((a, b) => (a.stockQuantity || 0) - (b.stockQuantity || 0))
            .slice(0, 3);
    }, [products]);

    const topProducts = useMemo(() => {
        const salesMap: Record<string, number> = {};
        invoices.forEach(inv => {
            if (inv.status !== InvoiceStatus.Draft) {
                inv.lineItems.forEach(item => {
                    if (item.productId) {
                        salesMap[item.productId] = (salesMap[item.productId] || 0) + item.quantity;
                    }
                });
            }
        });
        
        return Object.entries(salesMap)
            .map(([id, qty]) => {
                const product = products.find(p => p.id === id);
                return product ? { name: product.name, qty } : null;
            })
            .filter(Boolean)
            .sort((a, b) => (b?.qty || 0) - (a?.qty || 0))
            .slice(0, 3);
    }, [invoices, products]);

    const recentInvoices = useMemo(() => [...invoices].slice(0, 5), [invoices]);
    const recentClients = useMemo(() => [...clients].slice(0, 5), [clients]);

    const welcomeName = companySettings?.companyName || 'Entrepreneur';

    return (
        <div className="space-y-6 md:space-y-8 animate-fadeIn pb-8">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-emerald-900 to-emerald-700 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-emerald-400 opacity-10 rounded-full blur-2xl"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold">Bienvenue, {welcomeName} !</h1>
                        <p className="text-emerald-100 mt-2 text-base md:text-lg">Voici un aperçu de vos activités.</p>
                    </div>
                    
                    {/* Widget Date */}
                    <div className="w-full md:w-auto bg-white/10 backdrop-blur-md rounded-2xl p-2 pr-5 border border-white/10 shadow-lg flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-xl text-white shadow-inner">
                            <CalendarDays className="h-6 w-6" />
                        </div>
                        <div className="text-white">
                            <p className="text-xs text-emerald-200 font-bold uppercase tracking-wider mb-0.5">Aujourd'hui</p>
                            <p className="text-base md:text-lg font-bold capitalize leading-none">{todayDate}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {stats.map(item => <StatCard key={item.name} item={item} />)}
            </div>
            
            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                
                {/* Chart Section */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-6 md:p-8 flex flex-col">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                        <h3 className="text-lg font-bold text-slate-900">Évolution du CA</h3>
                        
                        {/* Période Selector */}
                        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg w-full sm:w-auto justify-center">
                            {(['day', 'week', 'month', 'year'] as ChartPeriod[]).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setChartPeriod(p)}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex-1 sm:flex-none text-center ${
                                        chartPeriod === p 
                                        ? 'bg-white text-emerald-600 shadow-sm' 
                                        : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                                    }`}
                                >
                                    {p === 'day' ? 'Jour' : p === 'week' ? 'Sem' : p === 'month' ? 'Mois' : 'An'}
                                </button>
                            ))}
                            <button
                                onClick={() => setChartPeriod('custom')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                                    chartPeriod === 'custom' 
                                    ? 'bg-white text-emerald-600 shadow-sm' 
                                    : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                                }`}
                            >
                                <Filter size={10} />
                            </button>
                        </div>
                    </div>

                    {/* Date Pickers */}
                    {chartPeriod === 'custom' && (
                        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 mb-4 animate-fadeIn">
                            <input 
                                type="date" 
                                value={customStartDate} 
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="w-full sm:w-auto text-xs border-slate-200 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                            />
                            <span className="hidden sm:inline text-slate-400">-</span>
                            <input 
                                type="date" 
                                value={customEndDate} 
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="w-full sm:w-auto text-xs border-slate-200 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>
                    )}

                    <div className="flex-grow min-h-[300px] w-full">
                        {chartData.every(d => d.Revenu === 0) ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <div className="p-4 bg-slate-50 rounded-full mb-3">
                                    <Archive className="h-8 w-8" />
                                </div>
                                <p>Aucune donnée financière</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} dy={10} interval="preserveStartEnd" />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                                        formatter={(value: number) => [`${value.toLocaleString('fr-FR')} MAD`, 'Revenu']} 
                                    />
                                    <Area type="monotone" dataKey="Revenu" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Right Column: Actions, Stock Alerts, Top Products */}
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-slate-900 px-1">Actions Rapides</h3>
                    <div className="grid grid-cols-1 gap-4">
                        <ShortcutCard 
                            icon={FileText} 
                            label="Nouveau Devis" 
                            desc="Créer une proposition" 
                            colorClass="bg-blue-500" 
                            onClick={() => navigate('/sales/quotes/new')} 
                        />
                        <ShortcutCard 
                            icon={UserPlus} 
                            label="Ajouter Client" 
                            desc="Enregistrer un contact" 
                            colorClass="bg-purple-500" 
                            onClick={() => navigate('/clients')} 
                        />
                        <ShortcutCard 
                            icon={Package} 
                            label="Nouveau Produit" 
                            desc="Mettre à jour le stock" 
                            colorClass="bg-amber-500" 
                            onClick={() => navigate('/products/new')} 
                        />
                    </div>

                    {/* Alertes Stock */}
                    <div className="bg-red-50 rounded-2xl p-5 border border-red-100 shadow-sm mt-6">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-red-800 flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5"/> Alertes Stock
                            </h4>
                            <button onClick={() => navigate('/stock')} className="text-xs font-semibold text-red-600 hover:underline">Gérer</button>
                        </div>
                        <div className="space-y-2">
                            {lowStockProducts.length > 0 ? (
                                lowStockProducts.map(p => (
                                    <div key={p.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-red-100">
                                        <span className="text-sm font-medium text-slate-700 truncate max-w-[120px]">{p.name}</span>
                                        <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-md">
                                            Reste: {p.stockQuantity}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-sm text-green-700 flex items-center gap-2">
                                    <CheckCircle size={16}/> Tous les stocks sont bons
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Meilleurs Produits */}
                    <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 shadow-sm">
                        <h4 className="font-bold text-amber-900 flex items-center gap-2 mb-3">
                            <TrendingUp className="h-5 w-5 text-amber-600"/> Top Ventes
                        </h4>
                        <div className="space-y-2">
                            {topProducts.length > 0 ? (
                                topProducts.map((p, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-amber-100">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-amber-500 w-4">{idx + 1}.</span>
                                            <span className="text-sm font-medium text-slate-700 truncate max-w-[110px]">{p?.name}</span>
                                        </div>
                                        <span className="text-xs font-semibold text-slate-500">
                                            {p?.qty} vendus
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-amber-700 italic">Pas encore de données de vente.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                 <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 overflow-hidden">
                    <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-bold text-slate-900">Dernières Factures</h3>
                        <button onClick={() => navigate('/sales/invoices')} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
                            Voir tout <ArrowRight className="h-4 w-4"/>
                        </button>
                    </div>
                    {recentInvoices.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                           {recentInvoices.map(invoice => (
                             <div key={invoice.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3 md:gap-4">
                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                        <FileText size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-800 text-sm truncate max-w-[120px] md:max-w-xs">{invoice.clientName}</p>
                                        <p className="text-xs text-slate-500 font-mono">{invoice.documentId || invoice.id}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-bold text-slate-900 text-sm">{invoice.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}</p>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                        invoice.status === InvoiceStatus.Paid ? 'bg-green-100 text-green-700' : 
                                        invoice.status === InvoiceStatus.Pending ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {invoice.status}
                                    </span>
                                </div>
                             </div>
                           ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 py-12">
                            <FileText className="h-12 w-12 mb-3 opacity-20" />
                            <p>Aucune facture récente</p>
                        </div>
                    )}
                 </div>

                 <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 overflow-hidden">
                    <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-bold text-slate-900">Nouveaux Clients</h3>
                        <button onClick={() => navigate('/clients')} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
                            Voir tout <ArrowRight className="h-4 w-4"/>
                        </button>
                    </div>
                     {recentClients.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                           {recentClients.map(client => (
                             <div key={client.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3 md:gap-4">
                                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                                        <Users size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-800 text-sm truncate max-w-[120px] md:max-w-xs">{client.name}</p>
                                        {client.company && <p className="text-xs text-slate-500 truncate">{client.company}</p>}
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-xs text-slate-400 truncate max-w-[100px]">{client.email || 'Pas d\'email'}</p>
                                </div>
                             </div>
                           ))}
                        </div>
                    ) : (
                         <div className="flex flex-col items-center justify-center text-slate-400 py-12">
                            <Users className="h-12 w-12 mb-3 opacity-20" />
                            <p>Aucun client enregistré</p>
                        </div>
                    )}
                 </div>
            </div>

        </div>
    );
};

export default Dashboard;
