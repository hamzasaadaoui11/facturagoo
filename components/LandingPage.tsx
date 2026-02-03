
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Files, CheckCircle, Shield, Zap, LayoutDashboard, ArrowRight, 
    BarChart3, Users, Globe, ChevronRight, Star, TrendingUp, Menu, X, Quote
} from 'lucide-react';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Gestion du scroll pour l'effet du header
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            setMobileMenuOpen(false);
        }
    };

    const testimonials = [
        {
            name: "Karim Benjelloun",
            role: "Fondateur, K-Tech Solutions",
            content: "Depuis que j'utilise Facturago, la facturation n'est plus une corvée. C'est rapide, professionnel et conforme aux normes marocaines. Mes clients apprécient la clarté des devis.",
            initials: "KB",
            color: "bg-blue-100 text-blue-600"
        },
        {
            name: "Meryem El Idrissi",
            role: "Gérante, Atlas Déco & Design",
            content: "La gestion de stock était un véritable cauchemar pour ma boutique. Avec Facturago, je sais exactement ce qui entre et ce qui sort en temps réel. Une visibilité totale sur mon activité.",
            initials: "ME",
            color: "bg-purple-100 text-purple-600"
        },
        {
            name: "Youssef Alami",
            role: "Consultant Financier",
            content: "J'ai testé plusieurs logiciels locaux et internationaux, mais Facturago est de loin le plus intuitif. L'interface est épurée et le support est très réactif. Je recommande vivement.",
            initials: "YA",
            color: "bg-emerald-100 text-emerald-600"
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-emerald-200 selection:text-emerald-900 overflow-x-hidden">
            
            {/* --- HEADER --- */}
            <header 
                className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
                    scrolled 
                    ? 'bg-white/80 backdrop-blur-lg shadow-sm py-3' 
                    : 'bg-transparent py-5'
                }`}
            >
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                            <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
                                <Files size={22} className="transform -rotate-12" />
                            </div>
                            <span className="text-2xl font-bold text-slate-900 tracking-tight">
                                Facturago
                            </span>
                        </div>

                        {/* Desktop Nav */}
                        <nav className="hidden md:flex items-center gap-8">
                            <button onClick={() => scrollToSection('features')} className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors">Fonctionnalités</button>
                            <button onClick={() => scrollToSection('benefits')} className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors">Avantages</button>
                            <button onClick={() => scrollToSection('testimonials')} className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors">Témoignages</button>
                        </nav>

                        {/* CTA Buttons */}
                        <div className="hidden md:flex items-center gap-4">
                            <button 
                                onClick={() => navigate('/login')} 
                                className="text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors"
                            >
                                Se connecter
                            </button>
                            <button 
                                onClick={() => navigate('/login')} 
                                className="group relative inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                            >
                                Commencer
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        {/* Mobile Menu Button */}
                        <button 
                            className="md:hidden p-2 text-slate-600"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden absolute top-full left-0 w-full bg-white border-t border-slate-100 shadow-xl p-4 flex flex-col gap-4 animate-in slide-in-from-top-5">
                        <button onClick={() => scrollToSection('features')} className="text-left px-4 py-2 hover:bg-slate-50 rounded-lg font-medium">Fonctionnalités</button>
                        <button onClick={() => scrollToSection('benefits')} className="text-left px-4 py-2 hover:bg-slate-50 rounded-lg font-medium">Avantages</button>
                        <button onClick={() => scrollToSection('testimonials')} className="text-left px-4 py-2 hover:bg-slate-50 rounded-lg font-medium">Témoignages</button>
                        <hr />
                        <button onClick={() => navigate('/login')} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold">Accéder à l'espace</button>
                    </div>
                )}
            </header>

            {/* --- HERO SECTION --- */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                {/* Background Blobs */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-0 pointer-events-none">
                    <div className="absolute top-20 left-10 w-[500px] h-[500px] bg-emerald-400/20 rounded-full blur-[100px] animate-pulse"></div>
                    <div className="absolute top-40 right-10 w-[400px] h-[400px] bg-blue-400/20 rounded-full blur-[100px] animate-pulse delay-1000"></div>
                </div>

                <div className="container max-w-7xl mx-auto px-6 relative z-10">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-6 animate-fade-in-up">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                            Nouveau : Gestion de stock v2.0
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-6 animate-fade-in-up delay-100">
                            La gestion d'entreprise <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                                enfin simplifiée.
                            </span>
                        </h1>
                        <p className="text-lg text-slate-600 mb-8 leading-relaxed animate-fade-in-up delay-200">
                            Facturation, devis, clients et stocks réunis dans une seule interface intuitive.
                            Gagnez du temps et concentrez-vous sur ce qui compte vraiment : votre croissance.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-300">
                            <button 
                                onClick={() => navigate('/login')}
                                className="w-full sm:w-auto px-8 py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                            >
                                Essayer gratuitement <ArrowRight size={20} />
                            </button>
                            <button className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-lg hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 flex items-center justify-center gap-2">
                                <Zap size={20} className="text-yellow-500" /> Voir la démo
                            </button>
                        </div>
                    </div>

                    {/* Abstract Dashboard Preview (CSS Only) */}
                    <div className="relative max-w-5xl mx-auto animate-fade-in-up delay-500">
                        <div className="relative rounded-2xl bg-slate-900 p-2 shadow-2xl shadow-slate-400/50 ring-1 ring-white/10">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-1.5 bg-slate-800 rounded-b-xl z-20"></div>
                            <div className="relative bg-slate-50 rounded-xl overflow-hidden aspect-[16/9] flex">
                                {/* Fake Sidebar */}
                                <div className="w-16 lg:w-64 bg-white border-r border-slate-200 hidden sm:flex flex-col p-4 gap-4">
                                    <div className="h-8 w-8 bg-emerald-500 rounded-lg mb-4"></div>
                                    <div className="h-2 w-20 bg-slate-200 rounded"></div>
                                    <div className="h-2 w-32 bg-slate-100 rounded"></div>
                                    <div className="h-2 w-24 bg-slate-100 rounded"></div>
                                    <div className="h-2 w-28 bg-slate-100 rounded"></div>
                                    <div className="mt-auto h-10 w-full bg-emerald-50 rounded-lg"></div>
                                </div>
                                {/* Fake Content */}
                                <div className="flex-1 p-6 bg-slate-50/50">
                                    <div className="flex justify-between items-center mb-8">
                                        <div className="h-8 w-48 bg-slate-200 rounded-lg"></div>
                                        <div className="h-8 w-8 rounded-full bg-slate-200"></div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-6 mb-8">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                                <div className="h-8 w-8 rounded-full bg-emerald-100 mb-2"></div>
                                                <div className="h-4 w-12 bg-slate-100 rounded mb-1"></div>
                                                <div className="h-6 w-20 bg-slate-200 rounded"></div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 h-48 w-full p-4 flex items-end gap-2">
                                        {[40, 70, 45, 90, 60, 75, 50, 80, 95, 60].map((h, i) => (
                                            <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-emerald-500/20 rounded-t-sm hover:bg-emerald-500 transition-colors cursor-pointer"></div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Decorative floating elements */}
                        <div className="absolute -right-12 top-20 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 animate-float hidden lg:block">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-full text-green-600"><CheckCircle size={20}/></div>
                                <div>
                                    <p className="text-xs text-slate-500 font-semibold">Facture payée</p>
                                    <p className="text-sm font-bold text-slate-900">+ 4,250.00 MAD</p>
                                </div>
                            </div>
                        </div>
                        <div className="absolute -left-8 bottom-20 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 animate-float-delayed hidden lg:block">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-full text-blue-600"><Users size={20}/></div>
                                <div>
                                    <p className="text-xs text-slate-500 font-semibold">Nouveau client</p>
                                    <p className="text-sm font-bold text-slate-900">Tech Solutions SARL</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FEATURES (BENTO GRID) --- */}
            <section id="features" className="py-24 bg-white relative">
                <div className="container max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Tout ce dont vous avez besoin.</h2>
                        <p className="text-slate-600">Une suite complète d'outils pour piloter votre activité sans friction.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
                        {/* Card 1: Billing (Large) */}
                        <div className="md:col-span-2 bg-slate-50 rounded-3xl p-8 border border-slate-100 relative overflow-hidden group hover:border-emerald-200 transition-colors">
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-emerald-600 mb-4">
                                    <Files size={24} />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">Facturation Intelligente</h3>
                                <p className="text-slate-500 max-w-sm">Créez des devis et factures professionnels en quelques clics. Automatisez les calculs de TVA et les conversions.</p>
                            </div>
                            <div className="absolute right-0 bottom-0 w-1/2 h-4/5 bg-white rounded-tl-3xl shadow-xl border border-slate-100 p-4 transition-transform group-hover:translate-x-2 group-hover:translate-y-2">
                                <div className="space-y-3 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <div className="h-2 w-1/2 bg-slate-200 rounded"></div>
                                    <div className="h-2 w-3/4 bg-slate-200 rounded"></div>
                                    <div className="h-8 w-full bg-emerald-50 rounded mt-4"></div>
                                </div>
                            </div>
                        </div>

                        {/* Card 2: Stock */}
                        <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden group">
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-emerald-400 mb-4">
                                    <LayoutDashboard size={24} />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Gestion de Stock</h3>
                                <p className="text-slate-400 text-sm">Suivi en temps réel des entrées et sorties. Alertes de stock faible.</p>
                            </div>
                            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-emerald-500/30 rounded-full blur-3xl group-hover:bg-emerald-500/50 transition-colors"></div>
                        </div>

                        {/* Card 3: CRM */}
                        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm group hover:shadow-md transition-all">
                            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                                <Users size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Annuaire Clients</h3>
                            <p className="text-slate-500 text-sm">Centralisez toutes vos coordonnées clients et fournisseurs. Historique complet.</p>
                        </div>

                        {/* Card 4: Reports (Large) */}
                        <div className="md:col-span-2 bg-gradient-to-br from-emerald-50 to-white rounded-3xl p-8 border border-slate-100 flex flex-col md:flex-row items-center gap-8 group">
                            <div className="flex-1">
                                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-purple-600 mb-4">
                                    <TrendingUp size={24} />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">Rapports & Statistiques</h3>
                                <p className="text-slate-500">Visualisez votre chiffre d'affaires, vos bénéfices et vos meilleures ventes en un coup d'œil.</p>
                            </div>
                            <div className="flex-1 w-full h-full flex items-center justify-center">
                                <BarChart3 size={120} className="text-emerald-100 group-hover:text-emerald-200 transition-colors drop-shadow-xl" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- STATS / TRUST --- */}
            <section className="py-20 bg-slate-900 text-white">
                <div className="container max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-slate-800">
                        <div>
                            <div className="text-4xl font-bold text-emerald-400 mb-2">10k+</div>
                            <div className="text-slate-400 text-sm">Factures générées</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-blue-400 mb-2">500+</div>
                            <div className="text-slate-400 text-sm">Entreprises actives</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-purple-400 mb-2">99.9%</div>
                            <div className="text-slate-400 text-sm">Temps de disponibilité</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-yellow-400 mb-2">24/7</div>
                            <div className="text-slate-400 text-sm">Support client</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- BENEFITS --- */}
            <section id="benefits" className="py-24 bg-white">
                <div className="container max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-200 to-blue-200 rounded-full blur-[100px] opacity-30"></div>
                            <div className="relative bg-white border border-slate-100 shadow-2xl rounded-2xl p-8 space-y-6">
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                                    <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600"><CheckCircle size={20} /></div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">Données sécurisées</h4>
                                        <p className="text-xs text-slate-500">Chiffrement de bout en bout.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600"><Globe size={20} /></div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">Accessible partout</h4>
                                        <p className="text-xs text-slate-500">Cloud natif, fonctionne sur mobile.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                                    <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600"><Shield size={20} /></div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">Sauvegardes auto</h4>
                                        <p className="text-xs text-slate-500">Vos données ne sont jamais perdues.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-6">Pourquoi choisir Facturago ?</h2>
                            <p className="text-lg text-slate-600 mb-8">
                                Contrairement aux tableurs complexes ou aux logiciels obsolètes, Facturago est conçu pour l'entrepreneur moderne. 
                                Interface épurée, rapidité d'exécution et conformité aux normes comptables.
                            </p>
                            <ul className="space-y-4">
                                {['Installation instantanée', 'Mises à jour gratuites', 'Export PDF personnalisé', 'Multi-utilisateurs'].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-slate-700">
                                        <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                            <CheckCircle size={14} />
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- TESTIMONIALS --- */}
            <section id="testimonials" className="py-24 bg-slate-50 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]"></div>
                
                <div className="container max-w-7xl mx-auto px-6 relative z-10">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Ils nous font confiance</h2>
                        <p className="text-slate-600">Rejoignez des centaines d'entrepreneurs marocains qui ont modernisé leur gestion.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {testimonials.map((t, index) => (
                            <div key={index} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-emerald-100 transition-all duration-300">
                                <div className="flex items-center gap-1 mb-6">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star key={star} size={16} className="text-yellow-400 fill-yellow-400" />
                                    ))}
                                </div>
                                <Quote size={32} className="text-emerald-100 mb-4" />
                                <p className="text-slate-600 mb-8 leading-relaxed italic">
                                    "{t.content}"
                                </p>
                                <div className="flex items-center gap-4">
                                    <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg ${t.color}`}>
                                        {t.initials}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">{t.name}</h4>
                                        <p className="text-xs text-slate-500">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- CTA SECTION --- */}
            <section className="py-20 relative overflow-hidden">
                <div className="absolute inset-0 bg-emerald-900"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent"></div>
                
                <div className="container max-w-4xl mx-auto px-6 relative z-10 text-center text-white">
                    <h2 className="text-4xl font-bold mb-6">Prêt à passer à la vitesse supérieure ?</h2>
                    <p className="text-emerald-100 text-lg mb-10 max-w-2xl mx-auto">
                        Rejoignez les entrepreneurs qui ont choisi Facturago pour structurer leur activité. 
                        Commencez dès maintenant.
                    </p>
                    <button 
                        onClick={() => navigate('/login')}
                        className="px-8 py-4 bg-white text-emerald-900 rounded-full font-bold text-lg shadow-2xl hover:bg-emerald-50 hover:scale-105 transition-all duration-300"
                    >
                        Accéder à mon espace
                    </button>
                </div>
            </section>

            {/* --- FOOTER --- */}
            <footer className="bg-white border-t border-slate-100 pt-16 pb-8">
                <div className="container max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
                        <div className="col-span-2 lg:col-span-2">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                                    <Files size={18} />
                                </div>
                                <span className="text-xl font-bold text-slate-900">Facturago</span>
                            </div>
                            <p className="text-slate-500 text-sm max-w-xs mb-6">
                                La plateforme tout-en-un pour gérer votre entreprise avec simplicité et élégance.
                            </p>
                            <div className="flex gap-4">
                                {/* Social placeholders */}
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-8 w-8 bg-slate-100 rounded-full hover:bg-emerald-100 hover:text-emerald-600 transition-colors flex items-center justify-center cursor-pointer">
                                        <Globe size={16}/>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div>
                            <h4 className="font-bold text-slate-900 mb-4">Produit</h4>
                            <ul className="space-y-2 text-sm text-slate-500">
                                <li className="hover:text-emerald-600 cursor-pointer">Fonctionnalités</li>
                                <li className="hover:text-emerald-600 cursor-pointer">Tarifs</li>
                                <li className="hover:text-emerald-600 cursor-pointer">Mises à jour</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-slate-900 mb-4">Entreprise</h4>
                            <ul className="space-y-2 text-sm text-slate-500">
                                <li className="hover:text-emerald-600 cursor-pointer">À propos</li>
                                <li className="hover:text-emerald-600 cursor-pointer">Carrières</li>
                                <li className="hover:text-emerald-600 cursor-pointer">Contact</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-slate-900 mb-4">Légal</h4>
                            <ul className="space-y-2 text-sm text-slate-500">
                                <li className="hover:text-emerald-600 cursor-pointer">Confidentialité</li>
                                <li className="hover:text-emerald-600 cursor-pointer">CGU</li>
                                <li className="hover:text-emerald-600 cursor-pointer">Mentions légales</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-slate-400 text-sm">
                            &copy; {new Date().getFullYear()} Facturago. Tous droits réservés.
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                            Systèmes opérationnels
                        </div>
                    </div>
                </div>
            </footer>

            {/* Custom Animations Styles */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes float-delayed {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-float { animation: float 6s ease-in-out infinite; }
                .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite 2s; }
                .animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; opacity: 0; transform: translateY(20px); }
                @keyframes fadeInUp {
                    to { opacity: 1; transform: translateY(0); }
                }
                .delay-100 { animation-delay: 100ms; }
                .delay-200 { animation-delay: 200ms; }
                .delay-300 { animation-delay: 300ms; }
                .delay-500 { animation-delay: 500ms; }
            `}</style>
        </div>
    );
};

export default LandingPage;
