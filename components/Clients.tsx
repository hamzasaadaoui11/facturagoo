
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
}

const Clients: React.FC<ClientsProps> = ({ clients, onAddClient, onUpdateClient, onDeleteClient }) => {
    const { t, isRTL, language } = useLanguage();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [clientIdToDelete, setClientIdToDelete] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

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
                    {t('addClient')}
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

            <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-neutral-200">
                 <div className="p-4 border-b border-neutral-200">
                    <div className="relative">
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
                 </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                        <thead className="bg-neutral-50">
                            <tr>
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
                                    <tr key={client.id} className="hover:bg-emerald-50/60 transition-colors duration-200">
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
                                    <td colSpan={6} className="text-center py-16 px-6 text-sm text-neutral-500">
                                        <div className="flex flex-col items-center">
                                            <Users className="h-10 w-10 text-neutral-400 mb-2" />
                                            <h3 className="font-semibold text-neutral-800">
                                                {searchTerm ? t('noFinancialData') : t('noClients')}
                                            </h3>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Clients;
