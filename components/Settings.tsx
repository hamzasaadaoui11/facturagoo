
import React, { useRef, useState } from 'react';
import Header from './Header';
import { dbService } from '../db';
import { Download, Upload, AlertTriangle } from 'lucide-react';

const Settings: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleExport = async () => {
        setIsLoading(true);
        setFeedback(null);
        try {
            const data = await dbService.getAllData();
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `zenith-pro-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setFeedback({ type: 'success', message: 'Exportation réussie !' });
        } catch (error) {
            console.error('Failed to export data:', error);
            setFeedback({ type: 'error', message: 'Échec de l\'exportation des données.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') {
                    throw new Error("Le fichier est invalide.");
                }
                const data = JSON.parse(text);

                const confirmed = window.confirm(
                    "Êtes-vous sûr de vouloir importer ces données ?\n\nATTENTION : Toutes les données actuelles seront remplacées par le contenu de ce fichier. Cette action est irréversible."
                );

                if (confirmed) {
                    setIsLoading(true);
                    setFeedback(null);
                    await dbService.clearAllData();
                    for (const storeName in data) {
                        if (data.hasOwnProperty(storeName)) {
                            await dbService.bulkAdd(storeName, data[storeName]);
                        }
                    }
                    setFeedback({ type: 'success', message: 'Importation réussie ! Veuillez rafraîchir la page pour voir les changements.' });
                    setTimeout(() => window.location.reload(), 1500);
                }

            } catch (error) {
                console.error('Failed to import data:', error);
                setFeedback({ type: 'error', message: `Échec de l'importation. Assurez-vous que le fichier est un JSON valide. Erreur: ${error}` });
            } finally {
                setIsLoading(false);
            }
        };
        reader.readAsText(file);
        // Reset file input to allow re-uploading the same file
        event.target.value = '';
    };

    return (
        <div>
            <Header title="Gestion des données" />
            
            {feedback && (
                 <div className={`p-4 mb-4 text-sm rounded-lg ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`} role="alert">
                    <span className="font-medium">{feedback.message}</span>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-sm ring-1 ring-neutral-200 p-6">
                <h3 className="text-lg font-semibold text-neutral-900">Sauvegarde et Restauration</h3>
                <p className="mt-1 text-sm text-neutral-500">
                    Sauvegardez vos données localement ou restaurez-les à partir d'un fichier de sauvegarde.
                </p>

                <div className="mt-6 flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={handleExport}
                        disabled={isLoading}
                        className="inline-flex items-center justify-center gap-x-2 rounded-lg bg-neutral-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-neutral-700 disabled:bg-neutral-400 transition-all duration-200 ease-in-out"
                    >
                        <Download className="-ml-1 h-5 w-5" />
                        {isLoading ? 'Exportation...' : 'Exporter les données'}
                    </button>

                    <button
                        onClick={handleImportClick}
                        disabled={isLoading}
                        className="inline-flex items-center justify-center gap-x-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 disabled:opacity-50 transition-all duration-200 ease-in-out"
                    >
                        <Upload className="-ml-1 h-5 w-5" />
                        {isLoading ? 'Importation...' : 'Importer les données'}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="application/json"
                    />
                </div>

                 <div className="mt-8 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                                <span className="font-bold">Important :</span> L'importation de données effacera toutes les informations actuellement enregistrées dans l'application. Pensez à exporter vos données actuelles avant d'en importer de nouvelles.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;