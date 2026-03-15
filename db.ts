
import { Client, Product, Supplier, Quote, Invoice, CompanySettings, Payment, StockMovement, DeliveryNote, PurchaseOrder, CreditNote } from './types';
import { supabase } from './supabaseClient';

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

const LOCAL_STORAGE_KEYS = {
    SHOW_AMOUNT_IN_WORDS: 'facturago_show_amount_in_words',
    DOCUMENT_INFO_POSITION: 'facturago_document_info_position',
    SHOW_EXPIRY_DATE: 'facturago_show_expiry_date',
    LOGO_WIDTH: 'facturago_logo_width'
};

export const initDB = async (): Promise<any> => {
    return Promise.resolve(true);
};

let cachedUserId: string | null = null;

const getCurrentUserId = async () => {
    if (cachedUserId) return cachedUserId;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        cachedUserId = session?.user?.id || null;
        return cachedUserId;
    } catch (err) {
        console.error("Error getting user ID in db.ts:", err);
        return null;
    }
};

// Listen for auth changes to update the cache
supabase.auth.onAuthStateChange((_event, session) => {
    cachedUserId = session?.user?.id || null;
});

const getAll = async <T>(storeName: string): Promise<T[]> => {
    const tableName = TABLE_MAP[storeName];
    if (!tableName) throw new Error(`Table ${storeName} not mapped`);

    const { data, error } = await supabase
        .from(tableName)
        .select('*');

    if (error) {
        console.error(`Error fetching ${storeName}:`, error);
        throw error;
    }

    // Restore metadata fields from first line item if missing
    if (['quotes', 'invoices', 'purchase_orders', 'credit_notes', 'delivery_notes'].includes(tableName)) {
        return (data as any[]).map(item => {
            const lineItems = item.lineItems || item.line_items;
            const firstItem = lineItems?.[0];
            if (firstItem) {
                return {
                    ...item,
                    subject: firstItem.subject || item.subject,
                    paymentMethod: firstItem.paymentMethod || item.paymentMethod,
                    purchaseOrderNumber: firstItem.purchaseOrderNumber || item.purchaseOrderNumber,
                    dueDate: firstItem.dueDate || item.dueDate,
                    expiryDate: firstItem.expiryDate || item.expiryDate,
                    expectedDate: firstItem.expectedDate || item.expectedDate,
                    calculationMode: firstItem.calculationMode || item.calculationMode,
                    showDimensions: firstItem.showDimensions !== undefined ? firstItem.showDimensions : item.showDimensions
                };
            }
            return item;
        }) as T[];
    }

    return data as T[];
};

const add = async <T>(storeName: string, item: T): Promise<T> => {
    const tableName = TABLE_MAP[storeName];
    if (!tableName) throw new Error(`Table ${storeName} not mapped`);

    const userId = await getCurrentUserId();
    if (!userId) throw new Error("User not authenticated");

    const { paymentMethod, subject, purchaseOrderNumber, dueDate, expiryDate, expectedDate, calculationMode, showDimensions, ...itemToSave } = item as any;
    
    // Strip fields that might be missing in Supabase schema to avoid errors
    // These are stored in lineItems[0] by the UI components
    const itemWithUser = { ...itemToSave, user_id: userId };

    const { data, error } = await supabase
        .from(tableName)
        .insert(itemWithUser)
        .select()
        .single();

    if (error) {
        console.error(`Error adding to ${storeName}:`, error);
        throw error;
    }

    const savedItem = data as any;
    const lineItems = savedItem.lineItems || savedItem.line_items;
    const firstItem = lineItems?.[0];
    if (firstItem) {
        return {
            ...savedItem,
            subject: firstItem.subject || savedItem.subject,
            paymentMethod: firstItem.paymentMethod || savedItem.paymentMethod,
            purchaseOrderNumber: firstItem.purchaseOrderNumber || savedItem.purchaseOrderNumber,
            dueDate: firstItem.dueDate || savedItem.dueDate,
            expiryDate: firstItem.expiryDate || savedItem.expiryDate,
            expectedDate: firstItem.expectedDate || savedItem.expectedDate,
            calculationMode: firstItem.calculationMode || savedItem.calculationMode,
            showDimensions: firstItem.showDimensions !== undefined ? firstItem.showDimensions : savedItem.showDimensions
        } as T;
    }

    return savedItem as T;
};

const update = async <T extends { id: string }>(storeName: string, item: T): Promise<T> => {
    const tableName = TABLE_MAP[storeName];
    if (!tableName) throw new Error(`Table ${storeName} not mapped`);

    const userId = await getCurrentUserId();
    if (!userId) throw new Error("User not authenticated");

    // Destructure to remove fields that might not be in the Supabase schema
    // and to remove 'id' from the update payload itself
    const { id, paymentMethod, subject, purchaseOrderNumber, dueDate, expiryDate, expectedDate, calculationMode, showDimensions, user_id, created_at, ...itemToSave } = item as any;

    const { data, error } = await supabase
        .from(tableName)
        .update(itemToSave)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) {
        console.error(`Error updating ${storeName}:`, error);
        throw error;
    }

    const savedItem = data as any;
    const lineItems = savedItem.lineItems || savedItem.line_items;
    const firstItem = lineItems?.[0];
    if (firstItem) {
        return {
            ...savedItem,
            subject: firstItem.subject || savedItem.subject,
            paymentMethod: firstItem.paymentMethod || savedItem.paymentMethod,
            purchaseOrderNumber: firstItem.purchaseOrderNumber || savedItem.purchaseOrderNumber,
            dueDate: firstItem.dueDate || savedItem.dueDate,
            expiryDate: firstItem.expiryDate || savedItem.expiryDate,
            expectedDate: firstItem.expectedDate || savedItem.expectedDate,
            calculationMode: firstItem.calculationMode || savedItem.calculationMode,
            showDimensions: firstItem.showDimensions !== undefined ? firstItem.showDimensions : savedItem.showDimensions
        } as T;
    }

    return savedItem as T;
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

const clearAllData = async (): Promise<void> => {
    const tables = Object.values(TABLE_MAP);
    for (const table of tables) {
        if (table === 'settings') continue; 
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

export const dbService = {
    clients: {
        getAll: () => getAll<Client>('clients'),
        add: (item: Client) => add<Client>('clients', item),
        update: (item: Client) => update<Client>('clients', item),
        delete: (id: string) => remove('clients', id),
    },
    products: {
        getAll: () => getAll<Product>('products'),
        getById: async (id: string) => {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data as Product;
        },
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

            const settings = data as CompanySettings | null;
            if (settings) {
                try {
                    const localShowAmount = localStorage.getItem(LOCAL_STORAGE_KEYS.SHOW_AMOUNT_IN_WORDS);
                    if (localShowAmount !== null) {
                        settings.showAmountInWords = localShowAmount === 'true';
                    } else if (settings.showAmountInWords === undefined) {
                        settings.showAmountInWords = true;
                    }

                    const localInfoPos = localStorage.getItem(LOCAL_STORAGE_KEYS.DOCUMENT_INFO_POSITION);
                    if (localInfoPos !== null) {
                        settings.documentInfoPosition = localInfoPos as 'right' | 'left';
                    } else if (settings.documentInfoPosition === undefined) {
                        settings.documentInfoPosition = 'right';
                    }

                    const localShowExpiry = localStorage.getItem(LOCAL_STORAGE_KEYS.SHOW_EXPIRY_DATE);
                    if (localShowExpiry !== null) {
                        settings.showExpiryDate = localShowExpiry === 'true';
                    } else if (settings.showExpiryDate === undefined) {
                        settings.showExpiryDate = true;
                    }

                    const localLogoWidth = localStorage.getItem(LOCAL_STORAGE_KEYS.LOGO_WIDTH);
                    if (localLogoWidth !== null) {
                        settings.logoWidth = parseInt(localLogoWidth, 10);
                    } else if (settings.logoWidth === undefined) {
                        settings.logoWidth = 200;
                    }
                } catch (e) {
                    console.error("Error accessing localStorage in db.ts:", e);
                    // Fallback to defaults if localStorage fails
                    settings.showAmountInWords = settings.showAmountInWords ?? true;
                    settings.documentInfoPosition = settings.documentInfoPosition ?? 'right';
                    settings.showExpiryDate = settings.showExpiryDate ?? true;
                }
            }

            return settings;
        },
        update: async (settings: CompanySettings): Promise<CompanySettings> => {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error("Utilisateur non connecté");
            
            // Save to localStorage with safety
            try {
                if (settings.showAmountInWords !== undefined) {
                    localStorage.setItem(LOCAL_STORAGE_KEYS.SHOW_AMOUNT_IN_WORDS, String(settings.showAmountInWords));
                }

                if (settings.documentInfoPosition !== undefined) {
                    localStorage.setItem(LOCAL_STORAGE_KEYS.DOCUMENT_INFO_POSITION, settings.documentInfoPosition);
                }

                if (settings.showExpiryDate !== undefined) {
                    localStorage.setItem(LOCAL_STORAGE_KEYS.SHOW_EXPIRY_DATE, String(settings.showExpiryDate));
                }

                if (settings.logoWidth !== undefined) {
                    localStorage.setItem(LOCAL_STORAGE_KEYS.LOGO_WIDTH, String(settings.logoWidth));
                }
            } catch (e) {
                console.error("Error saving to localStorage in db.ts:", e);
            }
            
            const { data: existingRow, error: fetchError } = await supabase
                .from('settings')
                .select('id')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (fetchError) throw fetchError;

            const { id, ...settingsData } = settings;
            
            const cleanData = { ...settingsData };
            delete (cleanData as any).created_at;
            delete (cleanData as any).showAmountInWords; // Remove to avoid Supabase schema error
            delete (cleanData as any).documentInfoPosition; // Remove to avoid Supabase schema error
            delete (cleanData as any).showExpiryDate; // Remove to avoid Supabase schema error
            delete (cleanData as any).logoWidth; // Remove to avoid Supabase schema error

            let resultData, resultError;

            if (existingRow && existingRow.id) {
                const response = await supabase
                    .from('settings')
                    .update(cleanData) 
                    .eq('id', existingRow.id)
                    .select()
                    .single();
                resultData = response.data;
                resultError = response.error;
            } else {
                const payload = { ...cleanData, user_id: userId };
                const response = await supabase
                    .from('settings')
                    .insert(payload)
                    .select()
                    .single();
                resultData = response.data;
                resultError = response.error;
            }

            if (resultError) {
                console.error("Supabase Save Error:", resultError);
                throw new Error(resultError.message || "Erreur lors de la sauvegarde sur Supabase.");
            }

            const finalResult = { 
                ...(resultData as CompanySettings),
                showAmountInWords: settings.showAmountInWords,
                documentInfoPosition: settings.documentInfoPosition,
                showExpiryDate: settings.showExpiryDate,
                logoWidth: settings.logoWidth
            };
            return finalResult;
        }
    },
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
