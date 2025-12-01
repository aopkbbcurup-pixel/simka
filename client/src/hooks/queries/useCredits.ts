import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { DEBTORS_QUERY_KEY } from './useDebtors';

export interface Credit {
    id: number;
    debtor_id: number;
    contract_number: string;
    account_number?: string;
    credit_type: string;
    plafond: number;
    outstanding: number;
    interest_rate: number;
    tenor_months: number;
    start_date: string;
    maturity_date: string;
    collectibility: string;
    status: string;
    purpose?: string;
    notes?: string;
    last_payment_date?: string;
    created_at: string;
    updated_at: string;
    Debtor?: {
        id: string;
        full_name: string;
        debtor_code: string;
    };
    Collaterals?: Array<{
        id: string;
        collateral_code: string;
        type: string;
        physical_location?: string | null;
        notes?: string | null;
    }>;
    Insurances?: Array<{
        id: string;
        policy_number: string;
        insurance_company: string;
    }>;
}

export interface CreditsResponse {
    credits: Credit[];
    pagination: {
        current_page: number;
        total_pages: number;
        total_records: number;
        page_size: number;
    };
}

export interface CreditsParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    credit_type?: string;
}

export const CREDITS_QUERY_KEY = 'credits';

// Fetch all credits with pagination and filters
export const useCredits = (params?: CreditsParams) => {
    return useQuery({
        queryKey: [CREDITS_QUERY_KEY, params],
        queryFn: async () => {
            const response = await api.get('/credits', { params });
            return response.data.data as CreditsResponse;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

// Fetch single credit by ID
export const useCredit = (id: number | string) => {
    return useQuery({
        queryKey: [CREDITS_QUERY_KEY, id],
        queryFn: async () => {
            const response = await api.get(`/credits/${id}`);
            return response.data.data as Credit;
        },
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });
};

// Fetch credits by debtor ID
export const useCreditsByDebtor = (debtorId: number | string) => {
    return useQuery({
        queryKey: [CREDITS_QUERY_KEY, 'debtor', debtorId],
        queryFn: async () => {
            const response = await api.get(`/credits?debtor_id=${debtorId}`);
            return response.data.data as Credit[];
        },
        enabled: !!debtorId,
        staleTime: 5 * 60 * 1000,
    });
};

// Create credit mutation
export const useCreateCredit = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (creditData: Partial<Credit>) => {
            const response = await api.post('/credits', creditData);
            return response.data.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: [CREDITS_QUERY_KEY] });
            if (data.debtor_id) {
                queryClient.invalidateQueries({ queryKey: [CREDITS_QUERY_KEY, 'debtor', data.debtor_id] });
                queryClient.invalidateQueries({ queryKey: [DEBTORS_QUERY_KEY] });
            }
        },
    });
};

// Update credit mutation
export const useUpdateCredit = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<Credit> }) => {
            const response = await api.put(`/credits/${id}`, data);
            return response.data.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: [CREDITS_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: [CREDITS_QUERY_KEY, variables.id] });
            if (data.debtor_id) {
                queryClient.invalidateQueries({ queryKey: [CREDITS_QUERY_KEY, 'debtor', data.debtor_id] });
            }
        },
    });
};

// Delete credit mutation
export const useDeleteCredit = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const response = await api.delete(`/credits/${id}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [CREDITS_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: [DEBTORS_QUERY_KEY] });
        },
    });
};
