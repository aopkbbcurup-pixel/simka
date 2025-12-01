import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { CREDITS_QUERY_KEY } from './useCredits';

export interface Collateral {
    id: number;
    credit_id: number;
    collateral_type: string;
    collateral_description: string;
    estimated_value: number;
    location?: string;
    certificate_number?: string;
    owner_name?: string;
    binding_status: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export const COLLATERALS_QUERY_KEY = 'collaterals';

// Fetch all collaterals
export const useCollaterals = () => {
    return useQuery({
        queryKey: [COLLATERALS_QUERY_KEY],
        queryFn: async () => {
            const response = await api.get('/collaterals');
            return response.data.data as Collateral[];
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

// Fetch single collateral by ID
export const useCollateral = (id: number | string) => {
    return useQuery({
        queryKey: [COLLATERALS_QUERY_KEY, id],
        queryFn: async () => {
            const response = await api.get(`/collaterals/${id}`);
            return response.data.data as Collateral;
        },
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });
};

// Fetch collaterals by credit ID
export const useCollateralsByCredit = (creditId: number | string) => {
    return useQuery({
        queryKey: [COLLATERALS_QUERY_KEY, 'credit', creditId],
        queryFn: async () => {
            const response = await api.get(`/collaterals?credit_id=${creditId}`);
            return response.data.data as Collateral[];
        },
        enabled: !!creditId,
        staleTime: 5 * 60 * 1000,
    });
};

// Create collateral mutation
export const useCreateCollateral = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (collateralData: Partial<Collateral>) => {
            const response = await api.post('/collaterals', collateralData);
            return response.data.data;
        },
        onSuccess: (data) => {
            // Invalidate collaterals list and credit-specific collaterals
            queryClient.invalidateQueries({ queryKey: [COLLATERALS_QUERY_KEY] });
            if (data.credit_id) {
                queryClient.invalidateQueries({ queryKey: [COLLATERALS_QUERY_KEY, 'credit', data.credit_id] });
                // Also invalidate credits in case collateral count changed
                queryClient.invalidateQueries({ queryKey: [CREDITS_QUERY_KEY] });
            }
        },
    });
};

// Update collateral mutation
export const useUpdateCollateral = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<Collateral> }) => {
            const response = await api.put(`/collaterals/${id}`, data);
            return response.data.data;
        },
        onSuccess: (data, variables) => {
            // Invalidate both the list and the specific collateral
            queryClient.invalidateQueries({ queryKey: [COLLATERALS_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: [COLLATERALS_QUERY_KEY, variables.id] });
            if (data.credit_id) {
                queryClient.invalidateQueries({ queryKey: [COLLATERALS_QUERY_KEY, 'credit', data.credit_id] });
            }
        },
    });
};

// Delete collateral mutation
export const useDeleteCollateral = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const response = await api.delete(`/collaterals/${id}`);
            return response.data;
        },
        onSuccess: () => {
            // Invalidate collaterals list to refetch
            queryClient.invalidateQueries({ queryKey: [COLLATERALS_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: [CREDITS_QUERY_KEY] });
        },
    });
};
