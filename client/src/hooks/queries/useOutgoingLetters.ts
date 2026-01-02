import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';

// Attachment interface
export interface Attachment {
    filename: string;
    originalname: string;
    mimetype: string;
    size: number;
    path: string;
}

// Enhanced Outgoing Letter Interface
export interface OutgoingLetter {
    id: string;
    letter_number: string;
    sequence_number: number;
    letter_type: 'eksternal' | 'internal';
    year: number;
    subject: string;
    recipient: string;
    recipient_address?: string;
    letter_date: string;
    content?: string;
    attachments?: Attachment[];
    file_path?: string;
    notes?: string;
    status: 'draft' | 'sent' | 'archived';
    created_by: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    // Enhanced fields
    debtor_id?: string;
    credit_id?: string;
    template_id?: string;
    signature_image?: string;
    signed_by?: string;
    signed_at?: string;
    email_sent?: boolean;
    email_sent_at?: string;
    email_recipient?: string;
    needs_followup?: boolean;
    followup_date?: string;
    // Related data
    creator?: { id: string; full_name: string; email: string; };
    signer?: { id: string; full_name: string; email: string; };
    debtor?: { id: string; full_name: string; debtor_code: string; };
    credit?: { id: string; contract_number: string; credit_type: string; };
    template?: { id: string; name: string; };
}

// Letter Content Template Interface
export interface LetterContentTemplate {
    id: string;
    name: string;
    description?: string;
    letter_type: 'eksternal' | 'internal' | 'both';
    subject_template?: string;
    content_template: string;
    created_by: string;
    is_active: boolean;
    creator?: { id: string; full_name: string; };
}

// Letter Configuration Interface
export interface LetterConfiguration {
    id: string;
    unit_code: string;
    unit_name?: string;
    is_default: boolean;
    updated_by?: string;
    updater?: { id: string; full_name: string; email: string; };
}

// Parameters for fetching letters
export interface OutgoingLettersParams {
    page?: number;
    limit?: number;
    type?: 'eksternal' | 'internal';
    status?: 'draft' | 'sent' | 'archived';
    year?: number;
    search?: string;
    debtor_id?: string;
    needs_followup?: boolean;
}

// Response interfaces
export interface OutgoingLettersResponse {
    letters: OutgoingLetter[];
    pagination: { total: number; page: number; limit: number; totalPages: number; };
}

export interface LetterNumberInfo {
    sequence_number: number;
    year: number;
    letter_number: string;
}

export interface LetterStats {
    year: number;
    totalEksternal: number;
    totalInternal: number;
    totalDraft: number;
    totalSent: number;
    needsFollowup: number;
    total: number;
}

export const OUTGOING_LETTERS_QUERY_KEY = 'outgoing-letters';
export const LETTER_CONFIG_QUERY_KEY = 'letter-configuration';
export const LETTER_TEMPLATES_QUERY_KEY = 'letter-templates';

// ==================== QUERIES ====================

export const useOutgoingLetters = (params?: OutgoingLettersParams) => {
    return useQuery({
        queryKey: [OUTGOING_LETTERS_QUERY_KEY, params],
        queryFn: async () => {
            const response = await api.get('/outgoing-letters', { params });
            return response.data.data as OutgoingLettersResponse;
        },
        staleTime: 5 * 60 * 1000,
    });
};

export const useOutgoingLetter = (id: string) => {
    return useQuery({
        queryKey: [OUTGOING_LETTERS_QUERY_KEY, id],
        queryFn: async () => {
            const response = await api.get(`/outgoing-letters/${id}`);
            return response.data.data.letter as OutgoingLetter;
        },
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });
};

export const useNextLetterNumber = (type: 'eksternal' | 'internal') => {
    return useQuery({
        queryKey: [OUTGOING_LETTERS_QUERY_KEY, 'next-number', type],
        queryFn: async () => {
            const response = await api.get(`/outgoing-letters/next-number/${type}`);
            return response.data.data as LetterNumberInfo;
        },
        enabled: !!type,
        staleTime: 0,
    });
};

export const useLetterConfiguration = () => {
    return useQuery({
        queryKey: [LETTER_CONFIG_QUERY_KEY],
        queryFn: async () => {
            const response = await api.get('/outgoing-letters/configuration');
            return response.data.data.configuration as LetterConfiguration;
        },
        staleTime: 10 * 60 * 1000,
    });
};

export const useLetterStats = (year?: number) => {
    return useQuery({
        queryKey: [OUTGOING_LETTERS_QUERY_KEY, 'stats', year],
        queryFn: async () => {
            const response = await api.get('/outgoing-letters/stats/summary', { params: { year } });
            return response.data.data as LetterStats;
        },
        staleTime: 5 * 60 * 1000,
    });
};

export const useLetterReminders = () => {
    return useQuery({
        queryKey: [OUTGOING_LETTERS_QUERY_KEY, 'reminders'],
        queryFn: async () => {
            const response = await api.get('/outgoing-letters/reminders');
            return response.data.data.letters as OutgoingLetter[];
        },
        staleTime: 5 * 60 * 1000,
    });
};

export const useLetterTemplates = () => {
    return useQuery({
        queryKey: [LETTER_TEMPLATES_QUERY_KEY],
        queryFn: async () => {
            const response = await api.get('/outgoing-letters/templates');
            return response.data.data.templates as LetterContentTemplate[];
        },
        staleTime: 10 * 60 * 1000,
    });
};

// ==================== MUTATIONS ====================

export const useCreateOutgoingLetter = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (letterData: Partial<OutgoingLetter>) => {
            const response = await api.post('/outgoing-letters', letterData);
            return response.data.data.letter;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [OUTGOING_LETTERS_QUERY_KEY] });
        },
    });
};

export const useUpdateOutgoingLetter = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<OutgoingLetter> }) => {
            const response = await api.put(`/outgoing-letters/${id}`, data);
            return response.data.data.letter;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: [OUTGOING_LETTERS_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: [OUTGOING_LETTERS_QUERY_KEY, variables.id] });
        },
    });
};

export const useDeleteOutgoingLetter = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await api.delete(`/outgoing-letters/${id}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [OUTGOING_LETTERS_QUERY_KEY] });
        },
    });
};

export const useUpdateLetterConfiguration = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (configData: Partial<LetterConfiguration>) => {
            const response = await api.put('/outgoing-letters/configuration', configData);
            return response.data.data.configuration;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [LETTER_CONFIG_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: [OUTGOING_LETTERS_QUERY_KEY, 'next-number'] });
        },
    });
};

// Template mutations
export const useCreateLetterTemplate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (templateData: Partial<LetterContentTemplate>) => {
            const response = await api.post('/outgoing-letters/templates', templateData);
            return response.data.data.template;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [LETTER_TEMPLATES_QUERY_KEY] });
        },
    });
};

export const useUpdateLetterTemplate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<LetterContentTemplate> }) => {
            const response = await api.put(`/outgoing-letters/templates/${id}`, data);
            return response.data.data.template;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [LETTER_TEMPLATES_QUERY_KEY] });
        },
    });
};

export const useDeleteLetterTemplate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await api.delete(`/outgoing-letters/templates/${id}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [LETTER_TEMPLATES_QUERY_KEY] });
        },
    });
};

// Special action mutations
export const useSignLetter = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, signature_image }: { id: string; signature_image: string }) => {
            const response = await api.post(`/outgoing-letters/${id}/sign`, { signature_image });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [OUTGOING_LETTERS_QUERY_KEY] });
        },
    });
};

export const useSendLetter = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, email_recipient }: { id: string; email_recipient?: string }) => {
            const response = await api.post(`/outgoing-letters/${id}/send`, { email_recipient });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [OUTGOING_LETTERS_QUERY_KEY] });
        },
    });
};

export const useSetLetterReminder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, followup_date }: { id: string; followup_date: string }) => {
            const response = await api.post(`/outgoing-letters/${id}/reminder`, { followup_date });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [OUTGOING_LETTERS_QUERY_KEY] });
        },
    });
};

export const useUploadAttachments = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, files }: { id: string; files: FileList }) => {
            const formData = new FormData();
            Array.from(files).forEach(file => formData.append('files', file));
            const response = await api.post(`/outgoing-letters/${id}/attachments`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [OUTGOING_LETTERS_QUERY_KEY] });
        },
    });
};

export const useDeleteAttachment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, filename }: { id: string; filename: string }) => {
            const response = await api.delete(`/outgoing-letters/${id}/attachments/${filename}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [OUTGOING_LETTERS_QUERY_KEY] });
        },
    });
};

// Export function (not a hook, just a helper)
export const exportLettersToExcel = async (params: { year?: number; type?: string; status?: string }) => {
    const response = await api.get('/outgoing-letters/export/excel', {
        params,
        responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `surat-keluar-${params.year || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
};
