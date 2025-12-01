import React, { createContext, useContext, useState, useCallback } from 'react';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresIn: number; // milliseconds
}

interface CacheContextType {
    get: <T>(key: string) => T | null;
    set: <T>(key: string, data: T, expiresIn?: number) => void;
    invalidate: (key: string) => void;
    clear: () => void;
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

export const CacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cache, setCache] = useState<Map<string, CacheEntry<any>>>(new Map());

    const get = useCallback(<T,>(key: string): T | null => {
        const entry = cache.get(key);
        if (!entry) return null;

        const now = Date.now();
        if (now - entry.timestamp > entry.expiresIn) {
            // Cache expired
            setCache(prev => {
                const newCache = new Map(prev);
                newCache.delete(key);
                return newCache;
            });
            return null;
        }

        return entry.data as T;
    }, [cache]);

    const set = useCallback(<T,>(key: string, data: T, expiresIn: number = DEFAULT_CACHE_TIME) => {
        setCache(prev => {
            const newCache = new Map(prev);
            newCache.set(key, {
                data,
                timestamp: Date.now(),
                expiresIn
            });
            return newCache;
        });
    }, []);

    const invalidate = useCallback((key: string) => {
        setCache(prev => {
            const newCache = new Map(prev);
            newCache.delete(key);
            return newCache;
        });
    }, []);

    const clear = useCallback(() => {
        setCache(new Map());
    }, []);

    return (
        <CacheContext.Provider value={{ get, set, invalidate, clear }}>
            {children}
        </CacheContext.Provider>
    );
};

export const useCache = () => {
    const context = useContext(CacheContext);
    if (!context) {
        throw new Error('useCache must be used within CacheProvider');
    }
    return context;
};
