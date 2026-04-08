const isStorageFlagEnabled = (storageKey: string) => {
    try {
        return window.localStorage.getItem(storageKey) === 'true';
    } catch {
        return false;
    }
};

const setStorageFlag = (storageKey: string) => {
    try {
        window.localStorage.setItem(storageKey, 'true');
    } catch {
        // Ignore storage failures
    }
};

export const isMissingSupabaseFieldError = (error: unknown, fieldName: string) => {
    if (!error || typeof error !== 'object') {
        return false;
    }

    const code = 'code' in error ? String(error.code) : '';
    const message = 'message' in error ? String(error.message) : '';

    return code === '42703' && message.includes(fieldName);
};

export const isMissingSupabaseTableError = (error: unknown, tableName: string) => {
    if (!error || typeof error !== 'object') {
        return false;
    }

    const code = 'code' in error ? String(error.code) : '';
    const message = 'message' in error ? String(error.message) : '';

    return code === 'PGRST205' || code === '42P01' || message.includes(tableName);
};

export const createSupabaseStorageGuard = (storageKey: string) => ({
    isUnavailable: () => isStorageFlagEnabled(storageKey),
    markUnavailable: () => setStorageFlag(storageKey),
});