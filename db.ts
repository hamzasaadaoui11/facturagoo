
import { Client, Product, Supplier, Quote, Invoice, CompanySettings, Payment, StockMovement, DeliveryNote, PurchaseOrder, CreditNote } from './types';
import { supabase } from './supabaseClient';

// Correspondance entre les noms utilisés dans le service et les noms de tables Supabase
const TABLE_MAP: Record<string, string> = {
    'clients': 'clients',
    'products': 'products',
    'suppliers': 'suppliers',
    'quotes': 'quotes',
    'invoices': 'invoices',
    'credit_notes': 'credit_notes',
    'settings': 'settings',
    'payments': 'payments',
    'stock_movements': 'stock_movements',
    'delivery_notes': 'delivery_notes',
    'purchase_orders': 'purchase_orders'
};

// Initialisation fictive pour garder la compatibilité avec App.tsx qui attend initDB
export const initDB = async (): Promise<any> => {
    // Avec Supabase, la connexion est gérée par le client, pas besoin d'ouvrir une DB locale
    return Promise.resolve(true);
};

// --- Helper to get current User ID ---
const getCurrentUserId = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id;
};

// --- Generic CRUD Operations via Supabase ---

const getAll = async <T>(storeName: string): Promise<T[]> => {
    const tableName = TABLE_MAP[storeName];
    if (!tableName) throw new Error(`Table ${storeName} not mapped`);

    // RLS in Supabase will automatically filter rows based on the logged-in user
    const { data, error } = await supabase
        .from(tableName)
        .select('*');

    if (error) {
        console.error(`Error fetching ${storeName}:`, error);
        throw error;
    }
    return data as T[];
};

const add = async <T>(storeName: string, item: T): Promise<T> => {
    const tableName = TABLE_MAP[storeName];
    if (!tableName) throw new Error(`Table ${storeName} not mapped`);

    const userId = await getCurrentUserId();
    if (!userId) throw new Error("User not authenticated");

    // Inject user_id into the item
    const itemWithUser = { ...item, user_id: userId };

    const { data, error } = await supabase
        .from(tableName)
        .insert(itemWithUser)
        .select()
        .single();

    if (error) {
        console.error(`Error adding to ${storeName}:`, error);
        throw error;
    }
    return data as T;
};

const update = async <T extends { id: string }>(storeName: string, item: T): Promise<T> => {
    const tableName = TABLE_MAP[storeName];
    if (!tableName) throw new Error(`Table ${storeName} not mapped`);

    const { data, error } = await supabase
        .from(tableName)
        .update(item)
        .eq('id', item.id)
        .select()
        .single();

    if (error) {
        console.error(`Error updating ${storeName}:`, error);
        throw error;
    }
    return data as T;
};

const remove = async (storeName: string, id: string): Promise<void> => {
    const tableName = TABLE_MAP[storeName];
    if (!tableName) throw new Error(`Table ${storeName} not mapped`);

    const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

    if (error) {
        console.error(`Error deleting from ${storeName}:`, error);
        throw error;
    }
};

// --- Operations spéciales ---

const clearAllData = async (): Promise<void> => {
    // Attention : Suppression massive sur toutes les tables
    const tables = Object.values(TABLE_MAP);
    for (const table of tables) {
        if (table === 'settings') continue; 
        // Supabase ne permet pas TRUNCATE via l'API client par défaut, on delete tout
        // RLS will ensure we only delete OUR data
        await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
    }
};

const bulkAdd = async (storeName: string, items: any[]): Promise<void> => {
    const tableName = TABLE_MAP[storeName];
    if (!tableName || items.length === 0) return;

    const userId = await getCurrentUserId();
    if (!userId) throw new Error("User not authenticated");

    const itemsWithUser = items.map(item => ({ ...item, user_id: userId }));

    const { error } = await supabase
        .from(tableName)
        .insert(itemsWithUser);

    if (error) {
        console.error(`Error bulk adding to ${storeName}:`, error);
        throw error;
    }
};

// --- Exported Service Object ---

export const dbService = {
    clients: {
        getAll: () => getAll<Client>('clients'),
        add: (item: Client) => add<Client>('clients', item),
        update: (item: Client) => update<Client>('clients', item),
        delete: (id: string) => remove('clients', id),
    },
    products: {
        getAll: () => getAll<Product>('products'),
        add: (item: Product) => add<Product>('products', item),
        update: (item: Product) => update<Product>('products', item),
        delete: (id: string) => remove('products', id),
    },
    suppliers: {
        getAll: () => getAll<Supplier>('suppliers'),
        add: (item: Supplier) => add<Supplier>('suppliers', item),
        update: (item: Supplier) => update<Supplier>('suppliers', item),
        delete: (id: string) => remove('suppliers', id),
    },
    quotes: {
        getAll: () => getAll<Quote>('quotes'),
        add: (item: Quote) => add<Quote>('quotes', item),
        update: (item: Quote) => update<Quote>('quotes', item),
        delete: (id: string) => remove('quotes', id),
    },
    purchaseOrders: {
        getAll: () => getAll<PurchaseOrder>('purchase_orders'),
        add: (item: PurchaseOrder) => add<PurchaseOrder>('purchase_orders', item),
        update: (item: PurchaseOrder) => update<PurchaseOrder>('purchase_orders', item),
        delete: (id: string) => remove('purchase_orders', id),
    },
    invoices: {
        getAll: () => getAll<Invoice>('invoices'),
        add: (item: Invoice) => add<Invoice>('invoices', item),
        update: (item: Invoice) => update<Invoice>('invoices', item),
        delete: (id: string) => remove('invoices', id),
    },
    creditNotes: {
        getAll: () => getAll<CreditNote>('credit_notes'),
        add: (item: CreditNote) => add<CreditNote>('credit_notes', item),
        update: (item: CreditNote) => update<CreditNote>('credit_notes', item),
        delete: (id: string) => remove('credit_notes', id),
    },
    payments: {
        getAll: () => getAll<Payment>('payments'),
        add: (item: Payment) => add<Payment>('payments', item),
        delete: (id: string) => remove('payments', id),
    },
    stockMovements: {
        getAll: () => getAll<StockMovement>('stock_movements'),
        add: (item: StockMovement) => add<StockMovement>('stock_movements', item),
    },
    deliveryNotes: {
        getAll: () => getAll<DeliveryNote>('delivery_notes'),
        add: (item: DeliveryNote) => add<DeliveryNote>('delivery_notes', item),
        update: (item: DeliveryNote) => update<DeliveryNote>('delivery_notes', item),
        delete: (id: string) => remove('delivery_notes', id),
    },
    settings: {
        get: async (): Promise<CompanySettings | null> => {
            const userId = await getCurrentUserId();
            if (!userId) return null;

            // RLS will ensure we only get the settings row for this user
            // Nous utilisons order('created_at') pour prendre le plus récent si doublons
            const { data, error } = await supabase
                .from('settings')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle(); 
            
            if (error) {
                console.error("Error fetching settings:", error);
                return null;
            }
            return data as CompanySettings | null;
        },
        update: async (settings: CompanySettings): Promise<CompanySettings> => {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error("Utilisateur non connecté");
            
            // 1. Chercher si une ligne existe déjà pour cet utilisateur
            const { data: existingRow, error: fetchError } = await supabase
                .from('settings')
                .select('id')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (fetchError) {
                console.error("Error checking settings existence:", fetchError);
                throw fetchError;
            }

            // Préparer les données
            // On retire l'ID pour ne pas l'envoyer dans le body update (il est dans l'URL/query)
            const { id, ...settingsData } = settings;

            let resultData, resultError;

            if (existingRow && existingRow.id) {
                // MISE A JOUR : On ne touche pas à user_id, on update juste les champs de données
                // IMPORTANT: Ne pas inclure user_id ici évite les conflits RLS si la policy est stricte
                console.log("Updating existing settings row:", existingRow.id);
                const response = await supabase
                    .from('settings')
                    .update(settingsData) 
                    .eq('id', existingRow.id)
                    .select()
                    .single();
                resultData = response.data;
                resultError = response.error;
            } else {
                // INSERTION : On doit absolument inclure user_id
                console.log("Creating new settings row");
                const payload = { ...settingsData, user_id: userId };
                const response = await supabase
                    .from('settings')
                    .insert(payload)
                    .select()
                    .single();
                resultData = response.data;
                resultError = response.error;
            }

            if (resultError) {
                console.error("Error saving settings to Supabase:", resultError);
                throw resultError;
            }
            return resultData as CompanySettings;
        }
    },
    // Used for Export in Settings.tsx
    getAllData: async (): Promise<Record<string, any[]>> => {
        const data: Record<string, any[]> = {};
        const tables = Object.keys(TABLE_MAP);
        
        for (const storeName of tables) {
            if (storeName === 'settings') continue;
            data[storeName] = await getAll(storeName);
        }
        return data;
    },
    clearAllData,
    bulkAdd
};
