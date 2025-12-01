import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';

export interface Insurance {
    id: string;
    policy_number: string;
    insurance_company: string;
    policy_type: string;
    coverage_amount: number;
    premium_amount: number;
    policy_start_date: string;
    policy_end_date: string;
    beneficiary_name?: string;
    beneficiary_relation?: string;
    agent_name?: string;
    agent_contact?: string;
    notes?: string;
    is_active: boolean;
    created_at: string;
}

export interface InsurancesParams {
    page?: number;
    limit?: number;
    search?: string;
    policy_type?: string;
    status?: string;
}

export interface InsurancesResponse {
    insurances: Insurance[];
    pagination: {
        current_page: number;
        total_pages: number;
        total_records: number;
        page_size: number;
    };
}

export const INSURANCES_QUERY_KEY = 'insurances';

// Fetch all insurances with pagination and filters
export const useInsurances = (params?: InsurancesParams) => {
    return useQuery({
        queryKey: [INSURANCES_QUERY_KEY, params],
        queryFn: async () => {
            const response = await api.get('/insurances', { params });
            return response.data.data as InsurancesResponse;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

// Fetch single insurance by ID
export const useInsurance = (id: string) => {
    return useQuery({
        queryKey: [INSURANCES_QUERY_KEY, id],
        queryFn: async () => {
            const response = await api.get(`/insurances/${id}`);
            return response.data.data.insurance as Insurance;
        },
        enabled: !!id,
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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [INSURANCES_QUERY_KEY] });
        },
    });
};

// Update insurance mutation
export const useUpdateInsurance = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Insurance> }) => {
            const response = await api.put(`/insurances/${id}`, data);
            return response.data.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: [INSURANCES_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: [INSURANCES_QUERY_KEY, variables.id] });
        },
    });
};

// Delete insurance mutation
export const useDeleteInsurance = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await api.delete(`/insurances/${id}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [INSURANCES_QUERY_KEY] });
        },
    });
};
