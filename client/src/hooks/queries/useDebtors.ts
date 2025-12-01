import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';

export interface Debtor {
    id: string;
    debtor_code: string;
    full_name: string;
    ktp_number: string;
    birth_date: string;
    birth_place: string;
    gender: string;
    marital_status: string;
    address: string;
    city: string;
    province: string;
    postal_code: string;
    phone: string;
    mobile: string;
    email: string;
    occupation: string;
    company_name: string;
    monthly_income: string;
    spouse_name: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    notes: string;
    created_at: string;
}

export interface DebtorsParams {
    page?: number;
    limit?: number;
    search?: string;
}

export interface DebtorsResponse {
    debtors: Debtor[];
    pagination: {
        current_page: number;
        total_pages: number;
        total_records: number;
        page_size: number;
    };
}

export const DEBTORS_QUERY_KEY = 'debtors';

// Fetch all debtors with pagination
export const useDebtors = (params?: DebtorsParams) => {
    return useQuery({
        queryKey: [DEBTORS_QUERY_KEY, params],
        queryFn: async () => {
            const response = await api.get('/debtors', { params });
            return response.data.data as DebtorsResponse;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

// Fetch single debtor by ID
export const useDebtor = (id: number | string) => {
    return useQuery({
        queryKey: [DEBTORS_QUERY_KEY, id],
        queryFn: async () => {
            const response = await api.get(`/debtors/${id}`);
            return response.data.data.debtor as Debtor;
        },
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });
};

// Create debtor mutation
export const useCreateDebtor = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (debtorData: Partial<Debtor>) => {
            const response = await api.post('/debtors', debtorData);
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [DEBTORS_QUERY_KEY] });
        },
    });
};

// Update debtor mutation
export const useUpdateDebtor = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Debtor> }) => {
            const response = await api.put(`/debtors/${id}`, data);
            return response.data.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: [DEBTORS_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: [DEBTORS_QUERY_KEY, variables.id] });
        },
    });
};

// Delete debtor mutation
export const useDeleteDebtor = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await api.delete(`/debtors/${id}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [DEBTORS_QUERY_KEY] });
        },
    });
};
