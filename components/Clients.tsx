
import React, { useState } from 'react';
import Header from './Header';
import AddClientModal from './AddClientModal';
import ConfirmationModal from './ConfirmationModal';
import { Plus, Pencil, Trash2, Users, Search, Building2, User } from 'lucide-react';
import { Client } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface ClientsProps {
    clients: Client[];
    onAddClient: (client: Omit<Client, 'id' | 'clientCode'>) => void;
    onUpdateClient: (client: Client) => void;
    onDeleteClient: (clientId: string) => void;
    onDeleteClients: (clientIds: string[]) => void;
}

const Clients: React.FC<ClientsProps> = ({ clients, onAddClient, onUpdateClient, onDeleteClient, onDeleteClients }) => {
    const { t, isRTL, language } = useLanguage();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [clientIdToDelete, setClientIdToDelete] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
    const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);

    const filteredClients = clients.filter(client => {
        const term = searchTerm.toLowerCase();
        return (
            (client.name?.toLowerCase() || '').includes(term) ||
            (client.company?.toLowerCase() || '').includes(term) ||
            (client.email?.toLowerCase() || '').includes(term) ||
            (client.phone?.toLowerCase() || '').includes(term) ||
            (client.clientCode?.toLowerCase() || '').includes(term) ||
            (client.ice?.toLowerCase() || '').includes(term)
        );
    });

    const handleAddClick = () => {
        setClientToEdit(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (client: Client) => {
        setClientToEdit(client);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (clientId: string) => {
        setClientIdToDelete(clientId);
        setIsConfirmOpen(true);
    };

    const confirmDeletion = () => {
        if (clientIdToDelete) {
            onDeleteClient(clientIdToDelete);
        }
        setIsConfirmOpen(false);
        setClientIdToDelete(null);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedClientIds(filteredClients.map(c => c.id));
        } else {
            setSelectedClientIds([]);
        }
    };

    const handleSelectClient = (clientId: string) => {
        setSelectedClientIds(prev =>
            prev.includes(clientId)
                ? prev.filter(id => id !== clientId)
                : [...prev, clientId]
        );
    };

    const handleBulkDelete = () => {
        if (selectedClientIds.length > 0) {
            setIsBulkConfirmOpen(true);
        }
    };

    const confirmBulkDeletion = () => {
        onDeleteClients(selectedClientIds);
        setSelectedClientIds([]);
        setIsBulkConfirmOpen(false);
    };

    const handleSaveClient = (clientData: Omit<Client, 'id' | 'clientCode'>, id?: string) => {
        if (id) {
            const existingClient = clients.find(c => c.id === id);
            if (existingClient) {
                onUpdateClient({ ...existingClient, ...clientData });
            }
        } else {
            onAddClient(clientData);
        }
        setIsModalOpen(false);
    };

    return (
        <div>
            <Header title={t('clients')}>
                <button
                    type="button"
                    onClick={handleAddClick}
                    className="inline-flex items-center gap-x-2 rounded-lg bg-emerald-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.97]"
                >
                    <Plus className="-ml-0.5 h-5 w-5 rtl:ml-0.5 rtl:-mr-0.5" />
                    <span className="hidden sm:inline">{t('addClient')}</span>
                    <span className="sm:hidden">{t('add')}</span>
                </button>
            </Header>

            <AddClientModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveClient}
                clientToEdit={clientToEdit}
            />

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmDeletion}
            />

            <ConfirmationModal
                isOpen={isBulkConfirmOpen}
                onClose={() => setIsBulkConfirmOpen(false)}
                onConfirm={confirmBulkDeletion}
                title={t('confirmBulkDelete')}
                message={t('confirmBulkDeleteMessage', { count: selectedClientIds.length })}
            />

            <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-neutral-200">
                 <div className="p-4 border-b border-neutral-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative flex-1">
                                <div className={`pointer-events-none absolute inset-y-0 flex items-center ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'}`}>
                                   <Search className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                                </div>
                                <input
                                    type="search"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={t('search')}
                                    className={`block w-full rounded-lg border-neutral-300 py-2 text-neutral-900 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm ${isRTL ? 'pr-10' : 'pl-10'}`}
                                />
                            </div>
                            <div className="md:hidden flex items-center gap-2 bg-neutral-50 px-3 py-2 rounded-lg border border-neutral-200">
                                <input
                                    type="checkbox"
                                    checked={selectedClientIds.length === filteredClients.length && filteredClients.length > 0}
                                    onChange={handleSelectAll}
                                    className="h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-600"
                                />
                                <span className="text-xs font-medium text-neutral-500">{t('selectAll')}</span>
                            </div>
                        </div>
                        {selectedClientIds.length > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="inline-flex items-center gap-x-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 shadow-sm hover:bg-red-100 ring-1 ring-inset ring-red-200 transition-all duration-200"
                            >
                                <Trash2 className="h-4 w-4" />
                                <span>{t('deleteSelected')} ({selectedClientIds.length})</span>
                            </button>
                        )}
                    </div>
                 </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                        <thead className="bg-neutral-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 hidden md:table-cell">
                                    <input
                                        type="checkbox"
                                        checked={selectedClientIds.length === filteredClients.length && filteredClients.length > 0}
                                        onChange={handleSelectAll}
                                        className="h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-600"
                                    />
                                </th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('code')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('client')} / {t('company')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('contact')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('coordinates')}</th>
                                <th scope="col" className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('type')}</th>
                                <th scope="col" className="relative px-6 py-3 text-right"><span className="sr-only">{t('actions')}</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 bg-white">
                            {filteredClients.length > 0 ? (
                                filteredClients.map((client) => {
                                    const isCompany = client.type === 'Entreprise' || (!client.type && client.company);
                                    
                                    return (
                                    <tr key={client.id} className={`hover:bg-emerald-50/60 transition-colors duration-200 ${selectedClientIds.includes(client.id) ? 'bg-emerald-50/40' : ''}`}>
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedClientIds.includes(client.id)}
                                                onChange={() => handleSelectClient(client.id)}
                                                className="h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-600"
                                            />
                                        </td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm md:text-base text-neutral-500 font-mono ${isRTL ? 'text-right' : 'text-left'}`}>{client.clientCode}</td>
                                        <td className={`px-6 py-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${isCompany ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                    {isCompany ? <Building2 size={16} /> : <User size={16} />}
                                                </div>
                                                <div className={`${isRTL ? 'mr-3' : 'ml-3'}`}>
                                                    <div className="text-sm md:text-base font-medium text-neutral-900">
                                                        {isCompany ? client.company : client.name}
                                                    </div>
                                                    {isCompany && client.ice && (
                                                        <div className="text-xs text-neutral-500">{t('ice')}: {client.ice}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm md:text-base text-neutral-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {isCompany ? client.name : '-'}
                                        </td>
                                        <td className={`px-6 py-4 text-sm md:text-base text-neutral-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div>{client.email}</div>
                                            <div>{client.phone}</div>
                                        </td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm md:text-base ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isCompany ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                {isCompany ? t('enterprise') : t('individual')}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                            <div className={`flex items-center justify-end space-x-2 ${isRTL ? 'space-x-reverse' : ''}`}>
                                                <button 
                                                    onClick={() => handleEditClick(client)} 
                                                    className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors"
                                                    title={t('edit')}
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteClick(client.id)} 
                                                    className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                                                    title={t('delete')}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )})
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-20 px-6">
                                        <div className="flex flex-col items-center justify-center">
                                            <Users className="h-16 w-16 text-slate-200 mb-4" strokeWidth={1.5} />
                                            <h3 className="text-lg font-bold text-slate-800">
                                                {searchTerm ? t('noFinancialData') : t('noClients')}
                                            </h3>
                                            {!searchTerm && (
                                                <p className="text-sm text-slate-500 mt-1">
                                                    {language === 'es' ? 'Comience añadiendo su premier cliente.' : 'Commencez par ajouter votre premier client.'}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-neutral-200">
                    {filteredClients.length > 0 ? (
                        filteredClients.map((client) => {
                            const isCompany = client.type === 'Entreprise' || (!client.type && client.company);
                            return (
                                <div key={client.id} className={`p-4 hover:bg-emerald-50/60 transition-colors duration-200 ${selectedClientIds.includes(client.id) ? 'bg-emerald-50/40' : ''}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedClientIds.includes(client.id)}
                                                    onChange={() => handleSelectClient(client.id)}
                                                    className="h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-600"
                                                />
                                                <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${isCompany ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                    {isCompany ? <Building2 size={20} /> : <User size={20} />}
                                                </div>
                                            </div>
                                            <div className={`${isRTL ? 'mr-3' : 'ml-3'} min-w-0`}>
                                                <div className="text-sm font-bold text-neutral-900 truncate">
                                                    {isCompany ? client.company : client.name}
                                                </div>
                                                <div className="text-xs text-neutral-500 font-mono">{client.clientCode}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => handleEditClick(client)} 
                                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteClick(client.id)} 
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-neutral-500">{t('type')}</span>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${isCompany ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                {isCompany ? t('enterprise') : t('individual')}
                                            </span>
                                        </div>
                                        {client.email && (
                                            <div className="flex justify-between text-xs">
                                                <span className="text-neutral-500">{t('email')}</span>
                                                <span className="text-neutral-900 truncate max-w-[180px]">{client.email}</span>
                                            </div>
                                        )}
                                        {client.phone && (
                                            <div className="flex justify-between text-xs">
                                                <span className="text-neutral-500">{t('phone')}</span>
                                                <span className="text-neutral-900">{client.phone}</span>
                                            </div>
                                        )}
                                        {isCompany && client.name && (
                                            <div className="flex justify-between text-xs">
                                                <span className="text-neutral-500">{t('contact')}</span>
                                                <span className="text-neutral-900">{client.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-12 px-4">
                            <Users className="h-12 w-12 text-slate-200 mx-auto mb-3" strokeWidth={1.5} />
                            <h3 className="text-base font-bold text-slate-800">
                                {searchTerm ? t('noFinancialData') : t('noClients')}
                            </h3>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Clients;
