
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    ShoppingCart,
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
import { useLanguage } from '../contexts/LanguageContext';
import { Language } from '../i18n/translations';

const Sidebar: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t, language, setLanguage, isRTL } = useLanguage();
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const [langMenuOpen, setLangMenuOpen] = useState(false);
    const langMenuRef = useRef<HTMLDivElement>(null);

    // Close language menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
                setLangMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);
    
    // Define navigation structure inside component to access `t`
    const navigation = [
        { name: t('dashboard'), href: '/dashboard', icon: LayoutDashboard },
        { name: t('statistics'), href: '/statistics', icon: BarChart3 },
        { name: t('paymentTracking'), href: '/sales/payments', icon: CreditCard },
        {
            name: t('sales'),
            icon: ShoppingCart,
            children: [
                { name: t('quotes'), href: '/sales/quotes' },
                { name: t('invoices'), href: '/sales/invoices' },
                { name: t('creditNotes'), href: '/sales/credit-notes' },
                { name: t('deliveryNotes'), href: '/sales/delivery' },
            ],
        },
        {
            name: t('purchases'),
            icon: ShoppingBag,
            children: [
                { name: t('purchaseOrders'), href: '/purchases/orders' },
            ],
        },
        { name: t('stock'), href: '/stock', icon: Archive },
        { type: 'divider' },
        { name: t('clients'), href: '/clients', icon: Users },
        { name: t('suppliers'), href: '/suppliers', icon: Building },
        { name: t('products'), href: '/products', icon: Package },
        { type: 'divider' },
        { name: t('settings'), href: '/settings', icon: Settings },
    ];

    const toggleMenu = (name: string) => {
        setOpenMenu(openMenu === name ? null : name);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/'); 
    };

    const handleLanguageChange = (lang: Language) => {
        setLanguage(lang);
        setLangMenuOpen(false);
    };

    const languages = [
        { code: 'fr', label: 'Français', flag: '🇫🇷' },
        { code: 'ar', label: 'العربية', flag: '🇲🇦' },
        { code: 'en', label: 'English', flag: '🇺🇸' }
    ];

    const currentLang = languages.find(l => l.code === language) || languages[0];

    return (
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-emerald-600 px-6 pb-4 h-full">
            {/* Header with Logo and Language Selector */}
            <div className="flex h-16 shrink-0 items-center justify-between">
                <div className="flex items-center gap-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
                      <Files className="h-5 w-5 text-emerald-600" />
                    </div>
                    <h1 className="text-xl font-bold text-white tracking-tight">Facturago</h1>
                </div>

                {/* Language Selector (Top Right) */}
                <div className="relative" ref={langMenuRef}>
                    <button
                        onClick={() => setLangMenuOpen(!langMenuOpen)}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/50 hover:bg-emerald-500 text-white transition-all shadow-sm ring-1 ring-emerald-400/30"
                        title="Changer la langue / تغيير اللغة"
                    >
                        <span className="text-lg leading-none filter drop-shadow-sm">{currentLang.flag}</span>
                    </button>
                    
                    {langMenuOpen && (
                        <div className={`absolute top-full mt-2 w-40 rounded-xl shadow-xl bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${isRTL ? 'left-0' : 'right-0'}`}>
                            <div className="py-1">
                                {languages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => handleLanguageChange(lang.code as Language)}
                                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-emerald-50 transition-colors ${language === lang.code ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-gray-700'}`}
                                        dir={lang.code === 'ar' ? 'rtl' : 'ltr'}
                                    >
                                        <span className="text-xl leading-none">{lang.flag}</span>
                                        <span className="flex-1">{lang.label}</span>
                                        {language === lang.code && <div className="h-1.5 w-1.5 rounded-full bg-emerald-600"></div>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <nav className="flex flex-1 flex-col">
                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                        <ul role="list" className="-mx-2 space-y-1">
                            {navigation.map((item: any) => {
                                if (item.type === 'divider') {
                                    return <li key={Math.random()}><div className="h-px my-4 bg-emerald-700/50" /></li>;
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
                                                <item.icon className="h-6 w-6 shrink-0 rtl:flip" aria-hidden="true" />
                                                <span>{item.name}</span>
                                                <ChevronDown
                                                    className={`h-5 w-5 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${isRTL ? 'mr-auto' : 'ml-auto'}`}
                                                />
                                            </button>
                                            {isOpen && (
                                                <ul className={`mt-1 ${isRTL ? 'pr-7' : 'pl-7'}`}>
                                                    {item.children.map((child: any) => {
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
                                                                <span className={`h-6 w-px bg-emerald-500 group-hover:bg-emerald-400 ${isActive ? 'bg-white' : ''}`}></span>
                                                                {child.name}
                                                            </Link>
                                                        </li>
                                                    )})}
                                                </ul>
                                            )}
                                        </li>
                                    );
                                }

                                const isActive = item.href ? location.pathname.startsWith(item.href) : false;

                                return (
                                    <li key={item.name}>
                                        <Link
                                            to={item.href!}
                                            className={`group relative flex gap-x-3 rounded-lg p-2 text-sm font-medium transition-colors duration-200 ${
                                                    isActive
                                                        ? 'bg-emerald-700 text-white shadow-md shadow-emerald-900/10'
                                                        : 'text-emerald-100 hover:bg-emerald-700 hover:text-white'
                                                }`
                                            }
                                        >
                                            {isActive && <div className={`absolute ${isRTL ? 'right-0 rounded-l-full' : 'left-0 rounded-r-full'} top-2 bottom-2 w-1 bg-white`}></div>}
                                            <item.icon className="h-6 w-6 shrink-0 rtl:flip" aria-hidden="true" />
                                            {item.name}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </li>
                    
                    <li className="mt-auto space-y-2">
                        <Link
                            to="/profile"
                            className={`group -mx-2 flex gap-x-3 rounded-lg p-2 text-sm font-medium hover:bg-emerald-700 hover:text-white transition-colors duration-200 ${location.pathname === '/profile' ? 'bg-emerald-700 text-white' : 'text-emerald-100'}`}
                        >
                            <UserCircle className="h-6 w-6 shrink-0" aria-hidden="true" />
                            {t('profile')}
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="group -mx-2 flex w-full gap-x-3 rounded-lg p-2 text-sm font-medium text-emerald-100 hover:bg-emerald-700 hover:text-white transition-colors duration-200"
                        >
                            <LogOut className="h-6 w-6 shrink-0 rtl:flip" aria-hidden="true" />
                            {t('logout')}
                        </button>
                    </li>
                </ul>
            </nav>
        </div>
    );
};

export default Sidebar;
