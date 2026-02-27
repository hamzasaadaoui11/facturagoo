
import { CompanySettings } from '../types';

export interface CurrencyConfig {
    code: string;
    symbol: string;
    position: 'prefix' | 'suffix';
    decimalSeparator: string;
    thousandSeparator: string;
    pluralNameFr: string;
    subUnitNameFr: string;
}

export const CURRENCIES: CurrencyConfig[] = [
    { 
        code: 'MAD', 
        symbol: 'DH', 
        position: 'suffix', 
        decimalSeparator: ',', 
        thousandSeparator: ' ', 
        pluralNameFr: 'dirhams', 
        subUnitNameFr: 'centimes' 
    },
    { 
        code: 'EUR', 
        symbol: '€', 
        position: 'suffix', 
        decimalSeparator: ',', 
        thousandSeparator: ' ', 
        pluralNameFr: 'euros', 
        subUnitNameFr: 'centimes' 
    },
    { 
        code: 'USD', 
        symbol: '$', 
        position: 'prefix', 
        decimalSeparator: '.', 
        thousandSeparator: ',', 
        pluralNameFr: 'dollars', 
        subUnitNameFr: 'cents' 
    },
    { 
        code: 'GBP', 
        symbol: '£', 
        position: 'prefix', 
        decimalSeparator: '.', 
        thousandSeparator: ',', 
        pluralNameFr: 'livres sterling', 
        subUnitNameFr: 'pences' 
    },
];

export const getCurrencyByCode = (code: string = 'MAD'): CurrencyConfig => {
    return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
};

/**
 * Global currency formatter that respects company settings and decimal requirements.
 */
export const formatCurrency = (
    amount: number | undefined | null,
    settings?: CompanySettings | null
): string => {
    if (amount === undefined || amount === null) return '0,00';
    
    const currencyCode = settings?.defaultCurrencyCode || 'MAD';
    const config = getCurrencyByCode(currencyCode);
    
    const parts = amount.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, config.thousandSeparator);
    const customFormatted = parts.join(config.decimalSeparator);

    return config.position === 'prefix' 
        ? `${config.symbol}${customFormatted}` 
        : `${customFormatted} ${config.symbol}`;
};

/**
 * Normalizes input string by replacing comma with dot and parsing to float.
 */
export const parseDecimalInput = (value: string): number => {
    if (!value) return 0;
    const normalized = value.replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
};

/**
 * Formats a decimal number for input display based on language.
 * Return "0" if value is 0 instead of empty string for better UX in forms.
 */
export const formatDecimalForInput = (value: number, language: string): string => {
    if (value === 0) return '0';
    const str = value.toString();
    if (language === 'fr' || language === 'ar') {
        return str.replace('.', ',');
    }
    return str;
};
