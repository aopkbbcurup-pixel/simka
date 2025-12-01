import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';

export interface Report {
    id: number;
    report_type: string;
    status: string;
    file_url?: string;
    generated_by: number;
    created_at: string;
    updated_at: string;
}

export const REPORTS_QUERY_KEY = 'reports';

// Fetch all reports
export const useReports = () => {
    return useQuery({
        queryKey: [REPORTS_QUERY_KEY],
        queryFn: async () => {
            const response = await api.get('/reports');
            return response.data.data as Report[];
        },
        staleTime: 3 * 60 * 1000, // 3 minutes
    });
};

// Fetch single report by ID
export const useReport = (id: number | string) => {
    return useQuery({
        queryKey: [REPORTS_QUERY_KEY, id],
        queryFn: async () => {
            const response = await api.get(`/reports/${id}`);
            return response.data.data as Report;
        },
        enabled: !!id,
        staleTime: 3 * 60 * 1000,
    });
};
