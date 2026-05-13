
import { Client, Product, Supplier, Quote, Invoice, CompanySettings, Payment, StockMovement, DeliveryNote, PurchaseOrder, CreditNote, Expense, Employee, Attendance, SalaryPayment } from './types';
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
    'purchase_orders': 'purchase_orders',
    'expenses': 'expenses',
    'employees': 'employees',
    'attendances': 'attendances',
    'salary_payments': 'salary_payments'
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
let cachedCompanyId: string | null = null;
let pendingCompanyPromise: Promise<{ userId: string | null, companyId: string | null }> | null = null;

export const resetDBCache = () => {
    cachedUserId = null;
    cachedCompanyId = null;
    pendingCompanyPromise = null;
};

export const getCurrentUserAndCompany = async () => {
    return retry(async () => {
        try {
            let { data: { session } } = await supabase.auth.getSession();
            
            // If session is missing or expired, try to refresh it
            if (!session) {
                const { data: refreshData } = await supabase.auth.refreshSession();
                session = refreshData.session;
            }

            const currentUserId = session?.user?.id || null;

            // Clear cache if user changed
            if (currentUserId !== cachedUserId) {
                cachedUserId = currentUserId;
                cachedCompanyId = null;
                pendingCompanyPromise = null;
            }

            if (!currentUserId) return { userId: null, companyId: null };
            if (cachedCompanyId) return { userId: currentUserId, companyId: cachedCompanyId };

            if (pendingCompanyPromise) return pendingCompanyPromise;

            pendingCompanyPromise = (async () => {
                // Fallback: The user is the owner, userId is the companyId
                cachedCompanyId = currentUserId;
                return { userId: currentUserId, companyId: currentUserId };
            })();

            return pendingCompanyPromise;
        } catch (e: any) {
            console.error("Error in getCurrentUserAndCompany:", e);
            if (e?.message?.includes('Failed to fetch') || e?.name === 'TypeError') {
                throw e; // Let retry handle it
            }
            return { userId: null, companyId: null };
        }
    });
};

// Listen for auth changes to update the cache
supabase.auth.onAuthStateChange((_event, session) => {
    cachedUserId = session?.user?.id || null;
    cachedCompanyId = null; // Reset company cache to force re-fetch
});

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number = 120000): Promise<T> => {
    const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("La requête a expiré. La base de données est peut-être en train de démarrer (peut prendre jusqu'à 2 minutes).")), timeoutMs)
    );
    return Promise.race([promise, timeoutPromise]);
};

async function retry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (err: any) {
            lastError = err;
            const isNetworkError = err?.message?.includes('Failed to fetch') || err?.name === 'TypeError';
            const isTimeout = err?.message?.includes('expiré');
            
            if (isNetworkError || isTimeout) {
                console.warn(`Retry ${i + 1}/${maxRetries} after error:`, err.message);
                await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, i))); 
                continue;
            }
            throw err;
        }
    }
    throw lastError;
}

const handleAuthError = async (error: any) => {
    if (error?.message?.includes('JWT') || error?.message?.includes('expired') || error?.code === 'PGRST301') {
        console.warn("JWT expired detected, attempting refresh...");
        const { data, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
            console.error("Session refresh failed, signing out:", refreshError);
            await supabase.auth.signOut();
            window.location.href = '/#/login';
            return false;
        }
        return true;
    }
    return false;
};

const getAll = async <T>(storeName: string): Promise<T[]> => {
    const tableName = TABLE_MAP[storeName];
    if (!tableName) throw new Error(`Table ${storeName} not mapped`);

    return retry(async () => {
        try {
            const { companyId } = await getCurrentUserAndCompany();
            if (!companyId) return [];

            let allData: any[] = [];
            let hasMore = true;
            let page = 0;
            const pageSize = 1000;

            while (hasMore) {
                const fetchPromise = supabase
                    .from(tableName)
                    .select('*')
                    .order('id')
                    .range(page * pageSize, (page + 1) * pageSize - 1);
                
                // Only apply company_id filter if we have a companyId
                const filteredFetch = companyId ? fetchPromise.eq('company_id', companyId) : fetchPromise;

                // Wrap in Promise.resolve to ensure compatibility with withTimeout and Promise.race
                const result: any = await withTimeout(Promise.resolve(filteredFetch));
                const { data, error } = result;

                if (error) {
                    console.error(`Supabase Error for ${storeName}:`, error);
                    
                    if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
                        throw error; // Let retry catch it
                    }

                    // Check if it's a schema error (table or column missing)
                    if (error.code === 'PGRST116' || error.code === '42P01' || error.code === 'PGRST205' || (error.message && error.message.includes('column') && error.message.includes('does not exist'))) {
                        console.warn(`Table or column missing for ${storeName}, returning empty array:`, error.message);
                        return [];
                    }

                    const recovered = await handleAuthError(error);
                    if (recovered) {
                        // Retry once for this chunk
                        const retryFetch = supabase
                            .from(tableName)
                            .select('*')
                            .order('id')
                            .range(page * pageSize, (page + 1) * pageSize - 1);
                        const retryResult: any = await withTimeout(Promise.resolve(companyId ? retryFetch.eq('company_id', companyId) : retryFetch));
                        if (retryResult.error) throw retryResult.error;
                        
                        if (retryResult.data && retryResult.data.length > 0) {
                            allData = [...allData, ...retryResult.data];
                        }
                        
                        if (!retryResult.data || retryResult.data.length < pageSize) {
                            hasMore = false;
                        } else {
                            page++;
                        }
                        continue;
                    }
                    throw error;
                }
                
                if (data && data.length > 0) {
                    allData = [...allData, ...data];
                }

                if (!data || data.length < pageSize) {
                    hasMore = false;
                } else {
                    page++;
                }
            }

            // Restore metadata fields from first line item if missing
            if (['quotes', 'invoices', 'purchase_orders', 'credit_notes', 'delivery_notes'].includes(tableName)) {
                return allData.map(item => {
                const lineItems = item.lineItems || item.line_items;
                const firstItem = lineItems?.[0];
                if (firstItem) {
                    return {
                        ...item,
                        subject: firstItem.subject || item.subject,
                        paymentMethod: firstItem.paymentMethod || item.paymentMethod,
                        checkNumber: firstItem.checkNumber || item.checkNumber,
                        bankName: firstItem.bankName || item.bankName,
                        notes: firstItem.notes || item.notes,
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

        return allData as T[];
        } catch (e: any) {
            if (e?.message?.includes('Failed to fetch') || e?.name === 'TypeError') {
                throw e; // Let retry handle it
            }
            if (await handleAuthError(e)) {
                return getAll(storeName);
            }
            throw e;
        }
    });
};

const add = async <T>(storeName: string, item: T): Promise<T> => {
    const tableName = TABLE_MAP[storeName];
    if (!tableName) throw new Error(`Table ${storeName} not mapped`);

    try {
        const { userId, companyId } = await getCurrentUserAndCompany();
        if (!userId || !companyId) throw new Error("User not authenticated");

        const { paymentMethod, notes, subject, purchaseOrderNumber, dueDate, expiryDate, expectedDate, calculationMode, showDimensions, userId: _, ...itemToSave } = item as any;
        
        // Re-add fields if they are in the database schema for specific tables
        if (tableName === 'purchase_orders') {
            if (dueDate) itemToSave.dueDate = dueDate;
        }

        // Strip fields that might be missing in Supabase schema to avoid errors
        // These are stored in lineItems[0] by the UI components
        if (['quotes', 'invoices'].includes(tableName)) {
            delete itemToSave.totalAmount;
        }
        const itemWithUser = { ...itemToSave, user_id: userId, company_id: companyId };

        const insertPromise = supabase
            .from(tableName)
            .insert(itemWithUser)
            .select()
            .single();

        const result: any = await withTimeout(insertPromise as any);
        const { data, error } = result;

        if (error) {
            if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01' || (error.message && error.message.includes('column') && error.message.includes('not found'))) {
                console.error("Missing DB columns/table. Run SQL in /supabase_schema_update.sql");
                throw new Error("Erreur de base de données. Veuillez exécuter le script SQL dans supabase_schema_update.sql pour créer ou mettre à jour les tables.");
            }
            const recovered = await handleAuthError(error);
            if (recovered) {
                const retryResult: any = await withTimeout(supabase.from(tableName).insert(itemWithUser).select().single() as any);
                if (retryResult.data) return retryResult.data;
            }
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
                checkNumber: firstItem.checkNumber || savedItem.checkNumber,
                bankName: firstItem.bankName || savedItem.bankName,
                notes: firstItem.notes || savedItem.notes,
                purchaseOrderNumber: firstItem.purchaseOrderNumber || savedItem.purchaseOrderNumber,
                dueDate: firstItem.dueDate || savedItem.dueDate,
                expiryDate: firstItem.expiryDate || savedItem.expiryDate,
                expectedDate: firstItem.expectedDate || savedItem.expectedDate,
                calculationMode: firstItem.calculationMode || savedItem.calculationMode,
                showDimensions: firstItem.showDimensions !== undefined ? firstItem.showDimensions : savedItem.showDimensions
            } as T;
        }

        return savedItem as T;
    } catch (e) {
        if (await handleAuthError(e)) {
            return add(storeName, item);
        }
        throw e;
    }
};

const update = async <T extends { id: string }>(storeName: string, item: T): Promise<T> => {
    const tableName = TABLE_MAP[storeName];
    if (!tableName) throw new Error(`Table ${storeName} not mapped`);

    try {
        const { companyId } = await getCurrentUserAndCompany();
        if (!companyId) throw new Error("User not authenticated");

        // Destructure to remove fields that might not be in the Supabase schema
        // and to remove 'id' from the update payload itself
        const { id, paymentMethod, notes, subject, purchaseOrderNumber, dueDate, expiryDate, expectedDate, calculationMode, showDimensions, user_id, userId: _, created_at, ...itemToSave } = item as any;
        
        // Re-add fields if they are in the database schema for specific tables
        if (tableName === 'purchase_orders') {
            if (dueDate) itemToSave.dueDate = dueDate;
        }

        if (['quotes', 'invoices'].includes(tableName)) {
            delete itemToSave.totalAmount;
        }

        const updatePromise = supabase
            .from(tableName)
            .update(itemToSave)
            .eq('id', id)
            .eq('company_id', companyId)
            .select()
            .single();

        const result: any = await withTimeout(updatePromise as any);
        const { data, error } = result;

        if (error) {
            if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01' || (error.message && error.message.includes('column') && error.message.includes('not found'))) {
                console.error("Missing DB columns/table. Run SQL in /supabase_schema_update.sql");
                throw new Error("Erreur de base de données. Veuillez exécuter le script SQL dans supabase_schema_update.sql pour créer ou mettre à jour les tables.");
            }
            const recovered = await handleAuthError(error);
            if (recovered) {
                const retryResult: any = await withTimeout(supabase.from(tableName).update(itemToSave).eq('id', id).eq('company_id', companyId).select().single() as any);
                if (retryResult.data) return retryResult.data;
            }
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
                checkNumber: firstItem.checkNumber || savedItem.checkNumber,
                bankName: firstItem.bankName || savedItem.bankName,
                notes: firstItem.notes || savedItem.notes,
                purchaseOrderNumber: firstItem.purchaseOrderNumber || savedItem.purchaseOrderNumber,
                dueDate: firstItem.dueDate || savedItem.dueDate,
                expiryDate: firstItem.expiryDate || savedItem.expiryDate,
                expectedDate: firstItem.expectedDate || savedItem.expectedDate,
                calculationMode: firstItem.calculationMode || savedItem.calculationMode,
                showDimensions: firstItem.showDimensions !== undefined ? firstItem.showDimensions : savedItem.showDimensions
            } as T;
        }

        return savedItem as T;
    } catch (e) {
        if (await handleAuthError(e)) {
            return update(storeName, item);
        }
        throw e;
    }
};

const remove = async (storeName: string, id: string | string[], columnName: string = 'id'): Promise<void> => {
    const tableName = TABLE_MAP[storeName];
    if (!tableName) throw new Error(`Table ${storeName} not mapped`);

    try {
        const { companyId } = await getCurrentUserAndCompany();
        if (!companyId) throw new Error("User not authenticated");

        if (Array.isArray(id)) {
            if (id.length === 0) return;
            // Chunk IDs to avoid URL length limits (approx 20 per chunk is very safe)
            const chunkSize = 20;
            for (let i = 0; i < id.length; i += chunkSize) {
                const chunk = id.slice(i, i + chunkSize);
                const { error } = await supabase
                    .from(tableName)
                    .delete()
                    .in(columnName, chunk)
                    .eq('company_id', companyId);
                
                if (error) {
                    console.error(`Error deleting chunk from ${storeName} by ${columnName}:`, error);
                    throw error;
                }
            }
            return;
        } else {
            const { error } = await supabase
                .from(tableName)
                .delete()
                .eq(columnName, id)
                .eq('company_id', companyId);
            
            if (error) throw error;
        }
    } catch (e) {
        if (await handleAuthError(e)) {
            return remove(storeName, id, columnName);
        }
        throw e;
    }
};

const clearAllData = async (): Promise<void> => {
    const tables = Object.values(TABLE_MAP);
    for (const table of tables) {
        if (table === 'settings') continue; 
        await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
    }
};

const bulkAdd = async <T>(storeName: string, items: T[]): Promise<T[]> => {
    const tableName = TABLE_MAP[storeName];
    if (!tableName || items.length === 0) return [];

    try {
        const { userId, companyId } = await getCurrentUserAndCompany();
        if (!userId || !companyId) throw new Error("User not authenticated");

        const itemsWithUser = items.map(item => ({ ...item, user_id: userId, company_id: companyId }));
        const allSavedItems: T[] = [];

        // Chunking for bulk insert (safe chunk size for Supabase is around 200-500 depending on row size)
        const chunkSize = 200;
        for (let i = 0; i < itemsWithUser.length; i += chunkSize) {
            const chunk = itemsWithUser.slice(i, i + chunkSize);
            const { data, error } = await supabase
                .from(tableName)
                .insert(chunk)
                .select();

            if (error) {
                console.error(`Error bulk adding chunk to ${storeName}:`, error);
                
                if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01' || (error.message && error.message.includes('column') && error.message.includes('not found'))) {
                    throw new Error("Erreur de base de données. Veuillez exécuter le script SQL dans /supabase_schema_update.sql pour créer ou mettre à jour les tables.");
                }
                
                const recovered = await handleAuthError(error);
                if (recovered) {
                    const { data: retryData, error: retryError } = await supabase.from(tableName).insert(chunk).select();
                    if (retryError) throw retryError;
                    if (retryData) allSavedItems.push(...(retryData as T[]));
                    continue;
                }
                throw error;
            }
            
            if (data) allSavedItems.push(...(data as T[]));
        }
        
        return allSavedItems;
    } catch (e) {
        if (await handleAuthError(e)) {
            return bulkAdd(storeName, items);
        }
        throw e;
    }
};

export const dbService = {
    clients: {
        getAll: () => getAll<Client>('clients'),
        add: (item: Client) => add<Client>('clients', item),
        update: (item: Client) => update<Client>('clients', item),
        delete: (id: string | string[]) => remove('clients', id),
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
        delete: (id: string | string[]) => remove('products', id),
    },
    suppliers: {
        getAll: () => getAll<Supplier>('suppliers'),
        add: (item: Supplier) => add<Supplier>('suppliers', item),
        update: (item: Supplier) => update<Supplier>('suppliers', item),
        delete: (id: string | string[]) => remove('suppliers', id),
    },
    quotes: {
        getAll: () => getAll<Quote>('quotes'),
        add: (item: Quote) => add<Quote>('quotes', item),
        update: (item: Quote) => update<Quote>('quotes', item),
        delete: (id: string | string[]) => remove('quotes', id),
    },
    purchaseOrders: {
        getAll: () => getAll<PurchaseOrder>('purchase_orders'),
        add: (item: PurchaseOrder) => add<PurchaseOrder>('purchase_orders', item),
        update: (item: PurchaseOrder) => update<PurchaseOrder>('purchase_orders', item),
        delete: (id: string | string[]) => remove('purchase_orders', id),
    },
    invoices: {
        getAll: () => getAll<Invoice>('invoices'),
        add: (item: Invoice) => add<Invoice>('invoices', item),
        update: (item: Invoice) => update<Invoice>('invoices', item),
        delete: (id: string | string[]) => remove('invoices', id),
    },
    creditNotes: {
        getAll: () => getAll<CreditNote>('credit_notes'),
        add: (item: CreditNote) => add<CreditNote>('credit_notes', item),
        update: (item: CreditNote) => update<CreditNote>('credit_notes', item),
        delete: (id: string | string[]) => remove('credit_notes', id),
    },
    payments: {
        getAll: () => getAll<Payment>('payments'),
        add: (item: Payment) => add<Payment>('payments', item),
        delete: (id: string | string[]) => remove('payments', id),
    },
    stockMovements: {
        getAll: () => getAll<StockMovement>('stock_movements'),
        add: (item: StockMovement) => add<StockMovement>('stock_movements', item),
        delete: (id: string | string[]) => remove('stock_movements', id),
        deleteByProduct: (productId: string | string[]) => remove('stock_movements', productId, 'productId'),
    },
    deliveryNotes: {
        getAll: () => getAll<DeliveryNote>('delivery_notes'),
        add: (item: DeliveryNote) => add<DeliveryNote>('delivery_notes', item),
        update: (item: DeliveryNote) => update<DeliveryNote>('delivery_notes', item),
        delete: (id: string | string[]) => remove('delivery_notes', id),
    },
    expenses: {
        getAll: () => getAll<Expense>('expenses'),
        add: (item: Expense) => add<Expense>('expenses', item),
        update: (item: Expense) => update<Expense>('expenses', item),
        delete: (id: string | string[]) => remove('expenses', id),
    },
    employees: {
        getAll: () => getAll<Employee>('employees'),
        add: (item: Employee) => add<Employee>('employees', item),
        update: (item: Employee) => update<Employee>('employees', item),
        delete: (id: string | string[]) => remove('employees', id),
    },
    attendances: {
        getAll: () => getAll<Attendance>('attendances'),
        add: (item: Attendance) => add<Attendance>('attendances', item),
        update: (item: Attendance) => update<Attendance>('attendances', item),
        delete: (id: string | string[]) => remove('attendances', id),
    },
    salaryPayments: {
        getAll: () => getAll<SalaryPayment>('salary_payments'),
        add: (item: SalaryPayment) => add<SalaryPayment>('salary_payments', item),
        update: (item: SalaryPayment) => update<SalaryPayment>('salary_payments', item),
        delete: (id: string | string[]) => remove('salary_payments', id),
    },
    settings: {
        get: async (): Promise<CompanySettings | null> => {
            try {
                const { companyId } = await getCurrentUserAndCompany();
                if (!companyId) return null;

                const { data, error } = await supabase
                    .from('settings')
                    .select('*')
                    .eq('company_id', companyId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle(); 
                
                if (error) {
                    if (await handleAuthError(error)) {
                        return dbService.settings.get();
                    }
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
        } catch (e) {
            if (await handleAuthError(e)) {
                return dbService.settings.get();
            }
            throw e;
        }
    },
        update: async (settings: CompanySettings): Promise<CompanySettings> => {
            const { userId, companyId } = await getCurrentUserAndCompany();
            if (!userId || !companyId) throw new Error("Utilisateur non connecté");
            
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
                .eq('company_id', companyId)
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
                const payload = { ...cleanData, user_id: userId, company_id: companyId };
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
