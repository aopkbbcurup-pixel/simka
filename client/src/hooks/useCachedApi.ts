import { useState, useEffect, useCallback } from 'react';
import { useCache } from '../contexts/CacheContext';
import api from '../utils/api';

interface UseCachedApiOptions {
    cacheKey: string;
    cacheTime?: number; // milliseconds
    enabled?: boolean;
}

export function useCachedApi<T>(
    apiCall: () => Promise<any>,
    options: UseCachedApiOptions
) {
    const { cacheKey, cacheTime = 5 * 60 * 1000, enabled = true } = options;
    const cache = useCache();

    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = useCallback(async (force = false) => {
        if (!enabled) return;

        // Check cache first
        if (!force) {
            const cachedData = cache.get<T>(cacheKey);
            if (cachedData) {
                setData(cachedData);
                setLoading(false);
                return;
            }
        }

        setLoading(true);
        setError(null);

        try {
            const response = await apiCall();
            const responseData = response.data?.data || response.data;

            setData(responseData);
            cache.set(cacheKey, responseData, cacheTime);
        } catch (err: any) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [apiCall, cacheKey, cacheTime, enabled, cache]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const refetch = useCallback(() => {
        return fetchData(true);
    }, [fetchData]);

    const invalidate = useCallback(() => {
        cache.invalidate(cacheKey);
    }, [cache, cacheKey]);

    return {
        data,
        loading,
        error,
        refetch,
        invalidate
    };
}
