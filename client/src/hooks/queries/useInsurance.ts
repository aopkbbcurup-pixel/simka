import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { CREDITS_QUERY_KEY } from './useCredits';

export interface Insurance {
    id: number;
    credit_id: number;
    insurance_type: string;
    insurance_company: string;
    policy_number: string;
    coverage_amount: number;
    premium_amount: number;
    start_date: string;
    end_date: string;
    insurance_status: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export const INSURANCE_QUERY_KEY = 'insurance';

// Fetch all insurance
export const useInsurances = () => {
    return useQuery({
        queryKey: [INSURANCE_QUERY_KEY],
        queryFn: async () => {
            const response = await api.get('/insurances');
            return response.data.data as Insurance[];
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

// Fetch single insurance by ID
export const useInsurance = (id: number | string) => {
    return useQuery({
        queryKey: [INSURANCE_QUERY_KEY, id],
        queryFn: async () => {
            const response = await api.get(`/insurances/${id}`);
            return response.data.data as Insurance;
        },
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });
};

// Fetch insurance by credit ID
export const useInsurancesByCredit = (creditId: number | string) => {
    return useQuery({
        queryKey: [INSURANCE_QUERY_KEY, 'credit', creditId],
        queryFn: async () => {
            const response = await api.get(`/insurances?credit_id=${creditId}`);
            return response.data.data as Insurance[];
        },
        enabled: !!creditId,
        staleTime: 5 * 60 * 1000,
    });
};

// Create insurance mutation
export const useCreateInsurance = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (insuranceData: Partial<Insurance>) => {
            const response = await api.post('/insurances', insuranceData);
            return response.data.data;
        },
        onSuccess: (data) => {
            // Invalidate insurance list and credit-specific insurance
            queryClient.invalidateQueries({ queryKey: [INSURANCE_QUERY_KEY] });
            if (data.credit_id) {
                queryClient.invalidateQueries({ queryKey: [INSURANCE_QUERY_KEY, 'credit', data.credit_id] });
                // Also invalidate credits in case insurance status changed
                queryClient.invalidateQueries({ queryKey: [CREDITS_QUERY_KEY] });
            }
        },
    });
};

// Update insurance mutation
export const useUpdateInsurance = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<Insurance> }) => {
            const response = await api.put(`/insurances/${id}`, data);
            return response.data.data;
        },
        onSuccess: (data, variables) => {
            // Invalidate both the list and the specific insurance
            queryClient.invalidateQueries({ queryKey: [INSURANCE_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: [INSURANCE_QUERY_KEY, variables.id] });
            if (data.credit_id) {
                queryClient.invalidateQueries({ queryKey: [INSURANCE_QUERY_KEY, 'credit', data.credit_id] });
            }
        },
    });
};

// Delete insurance mutation
export const useDeleteInsurance = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const response = await api.delete(`/insurances/${id}`);
            return response.data;
        },
        onSuccess: () => {
            // Invalidate insurance list to refetch
            queryClient.invalidateQueries({ queryKey: [INSURANCE_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: [CREDITS_QUERY_KEY] });
        },
    });
};
