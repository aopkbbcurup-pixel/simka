import api from '../utils/api';

export interface AuditLog {
    id: string;
    user_id: string | null;
    action: string;
    entity_type: string | null;
    entity_id: string | null;
    details: any;
    ip_address: string | null;
    user_agent: string | null;
    status: string;
    created_at: string;
    User?: {
        username: string;
        full_name: string;
        role: string;
    };
}

export interface AuditLogParams {
    page?: number;
    limit?: number;
    action?: string;
    user_id?: string;
    start_date?: string;
    end_date?: string;
}

export interface AuditLogResponse {
    success: boolean;
    data: {
        logs: AuditLog[];
        pagination: {
            current_page: number;
            total_pages: number;
            total_records: number;
            per_page: number;
        };
    };
}

const getLogs = async (params: AuditLogParams): Promise<AuditLogResponse> => {
    const response = await api.get('/audit', { params });
    return response.data;
};

const auditService = {
    getLogs,
};

export default auditService;
