import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';

export interface DashboardStats {
    alerts: {
        insurance_expiring: {
            next_30_days: number;
            next_60_days: number;
            next_90_days: number;
            items: Array<any>;
        };
        tax_due: {
            next_30_days: number;
            next_60_days: number;
            next_90_days: number;
            items: Array<any>;
        };
        credits_maturing: {
            next_30_days: number;
            next_60_days: number;
            next_90_days: number;
            items: Array<any>;
        };
        incomplete_documents: {
            count: number;
            items: Array<any>;
        };
        pending_policies: {
            count: number;
            items: Array<any>;
        };
        pending_documents: {
            count: number;
            items: Array<any>;
        };
    };
    statistics: {
        total_debtors: number;
        total_credits: number;
        total_collaterals: number;
        incomplete_documents?: number;
        credits_by_status: Array<{
            status: string;
            count: number;
        }>;
        collaterals_by_type: Array<{
            type: string;
            count: number;
        }>;
        outstanding_by_status: Array<{
            status: string;
            total_outstanding: number;
        }>;
    };
}

export const DASHBOARD_QUERY_KEY = 'dashboard';

// Fetch dashboard statistics
export const useDashboard = () => {
    return useQuery({
        queryKey: [DASHBOARD_QUERY_KEY],
        queryFn: async () => {
            const response = await api.get('/dashboard/stats');
            return response.data.data as DashboardStats;
        },
        staleTime: 2 * 60 * 1000, // 2 minutes - shorter cache for fresher stats
        refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
    });
};

// Fetch dashboard chart data
export const useDashboardCharts = () => {
    return useQuery({
        queryKey: [DASHBOARD_QUERY_KEY, 'charts'],
        queryFn: async () => {
            const response = await api.get('/dashboard/charts');
            return response.data.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};
