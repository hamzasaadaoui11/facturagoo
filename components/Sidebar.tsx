
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    ShoppingCart,
    Truck,
    Archive,
    Users,
    Building,
    Package,
    Settings,
    ChevronDown,
    Files,
    ShoppingBag,
    BarChart3,
    LogOut,
    UserCircle,
    CreditCard
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const navigation = [
    { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Statistiques', href: '/statistics', icon: BarChart3 },
    { name: 'Suivi Paiements', href: '/sales/payments', icon: CreditCard },
    {
        name: 'Vente',
        icon: ShoppingCart,
        children: [
            { name: 'Devis', href: '/sales/quotes' },
            { name: 'Factures', href: '/sales/invoices' },
            { name: 'Avoirs', href: '/sales/credit-notes' },
            { name: 'Bons de livraison', href: '/sales/delivery' },
        ],
    },
    {
        name: 'Achats',
        icon: ShoppingBag,
        children: [
            { name: 'Bons de commande', href: '/purchases/orders' },
        ],
    },
    { name: 'Stock', href: '/stock', icon: Archive },
    { type: 'divider' },
    { name: 'Clients', href: '/clients', icon: Users },
    { name: 'Fournisseurs', href: '/suppliers', icon: Building },
    { name: 'Produits & Services', href: '/products', icon: Package },
    { type: 'divider' },
    { name: 'Paramètres', href: '/settings', icon: Settings },
];

const Sidebar: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [openMenu, setOpenMenu] = useState<string | null>(() => {
        const current = navigation.find(item => item.children?.some(child => location.pathname.startsWith(child.href)));
        return current?.name || null;
    });

    const toggleMenu = (name: string) => {
        setOpenMenu(openMenu === name ? null : name);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/'); // Will redirect to Landing Page via App.tsx logic
    };

    return (
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-emerald-600 px-6 pb-4">
            <div className="flex h-16 shrink-0 items-center gap-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
                  <Files className="h-5 w-5 text-emerald-600" />
                </div>
                <h1 className="text-xl font-bold text-white">Facturago</h1>
            </div>
            <nav className="flex flex-1 flex-col">
                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                        <ul role="list" className="-mx-2 space-y-1">
                            {navigation.map((item) => {
                                if (item.type === 'divider') {
                                    return <li key={Math.random()}><div className="h-px my-4 bg-emerald-700" /></li>;
                                }

                                const hasChildren = item.children && item.children.length > 0;
                                const isOpen = openMenu === item.name;

                                if (hasChildren) {
                                    return (
                                        <li key={item.name}>
                                            <button
                                                onClick={() => toggleMenu(item.name)}
                                                className="group flex w-full items-center gap-x-3 rounded-lg p-2 text-sm font-medium text-emerald-100 hover:bg-emerald-700 hover:text-white transition-colors duration-200"
                                            >
                                                <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                                <span>{item.name}</span>
                                                <ChevronDown
                                                    className={`ml-auto h-5 w-5 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                                />
                                            </button>
                                            {isOpen && (
                                                <ul className="mt-1 pl-7">
                                                    {item.children.map((child) => {
                                                        const isActive = location.pathname.startsWith(child.href);
                                                        return (
                                                        <li key={child.name}>
                                                            <Link
                                                                to={child.href}
                                                                className={`group flex gap-x-3 rounded-lg p-2 text-sm font-medium transition-colors duration-200 ${
                                                                        isActive
                                                                            ? 'text-white'
                                                                            : 'text-emerald-100 hover:text-white'
                                                                    }`
                                                                }
                                                            >
                                                                <span className="h-6 w-px bg-emerald-500 group-hover:bg-emerald-400"></span>
                                                                {child.name}
                                                            </Link>
                                                        </li>
                                                    )})}
                                                </ul>
                                            )}
                                        </li>
                                    );
                                }

                                const isActive = location.pathname.startsWith(item.href!);

                                return (
                                    <li key={item.name}>
                                        <Link
                                            to={item.href!}
                                            className={`group relative flex gap-x-3 rounded-lg p-2 text-sm font-medium transition-colors duration-200 ${
                                                    isActive
                                                        ? 'bg-emerald-700 text-white'
                                                        : 'text-emerald-100 hover:bg-emerald-700 hover:text-white'
                                                }`
                                            }
                                        >
                                            {isActive && <div className="absolute left-0 top-2 bottom-2 w-1 bg-white rounded-r-full"></div>}
                                            <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                            {item.name}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </li>
                    
                    <li className="mt-auto">
                        <Link
                            to="/profile"
                            className={`group -mx-2 flex gap-x-3 rounded-lg p-2 text-sm font-medium hover:bg-emerald-700 hover:text-white transition-colors duration-200 ${location.pathname === '/profile' ? 'bg-emerald-700 text-white' : 'text-emerald-100'}`}
                        >
                            <UserCircle className="h-6 w-6 shrink-0" aria-hidden="true" />
                            Mon Profil
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="group -mx-2 flex w-full gap-x-3 rounded-lg p-2 text-sm font-medium text-emerald-100 hover:bg-emerald-700 hover:text-white transition-colors duration-200 mt-2"
                        >
                            <LogOut className="h-6 w-6 shrink-0" aria-hidden="true" />
                            Déconnexion
                        </button>
                    </li>
                </ul>
            </nav>
        </div>
    );
};

export default Sidebar;
