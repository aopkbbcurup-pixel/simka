import React from 'react';
import {
    Card,
    CardContent,
    CardActions,
    Box,
    Typography,
    Chip,
    IconButton,
    Tooltip,
    Stack,
    Divider,
} from '@mui/material';
import {
    Edit,
    Delete,
    Visibility,
    Business,
    CalendarToday,
    AttachMoney,
    Person,
    LocalHospital,
    Home,
    DirectionsCar,
    CreditCard,
    Favorite,
} from '@mui/icons-material';

interface InsuranceCardProps {
    insurance: {
        id: string;
        policy_number: string;
        insurance_company: string;
        policy_type: string;
        coverage_amount: number;
        premium_amount: number;
        policy_start_date: string;
        policy_end_date: string;
        beneficiary_name?: string;
        agent_name?: string;
    };
    onView?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    canEdit?: boolean;
    canDelete?: boolean;
}

const getPolicyTypeIcon = (type: string) => {
    switch (type) {
        case 'life':
            return <Favorite sx={{ fontSize: 20 }} />;
        case 'health':
            return <LocalHospital sx={{ fontSize: 20 }} />;
        case 'property':
            return <Home sx={{ fontSize: 20 }} />;
        case 'vehicle':
            return <DirectionsCar sx={{ fontSize: 20 }} />;
        case 'credit':
            return <CreditCard sx={{ fontSize: 20 }} />;
        default:
            return <Business sx={{ fontSize: 20 }} />;
    }
};

const getPolicyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
        life: 'Asuransi Jiwa',
        health: 'Asuransi Kesehatan',
        property: 'Asuransi Properti',
        vehicle: 'Asuransi Kendaraan',
        credit: 'Asuransi Kredit',
        other: 'Lainnya',
    };
    return labels[type] || type;
};

const getStatusChip = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
        return <Chip label="Expired" color="error" size="small" />;
    } else if (daysLeft <= 30) {
        return <Chip label="Akan Berakhir" color="warning" size="small" />;
    } else {
        return <Chip label="Aktif" color="success" size="small" />;
    }
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

const getDaysLeft = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return 'Sudah berakhir';
    if (daysLeft === 0) return 'Berakhir hari ini';
    if (daysLeft === 1) return '1 hari lagi';
    return `${daysLeft} hari lagi`;
};

const InsuranceCard: React.FC<InsuranceCardProps> = ({
    insurance,
    onView,
    onEdit,
    onDelete,
    canEdit = false,
    canDelete = false,
}) => {
    return (
        <Card
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease',
                '&:hover': {
                    boxShadow: '0 8px 16px -4px rgba(0,0,0,0.15)',
                    transform: 'translateY(-2px)',
                },
            }}
        >
            <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                            sx={{
                                bgcolor: 'primary.light',
                                color: 'primary.main',
                                borderRadius: 1,
                                p: 0.5,
                                display: 'flex',
                            }}
                        >
                            {getPolicyTypeIcon(insurance.policy_type)}
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                            {insurance.policy_number}
                        </Typography>
                    </Box>
                    {getStatusChip(insurance.policy_end_date)}
                </Box>

                {/* Company */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <Business sx={{ fontSize: 18, color: 'text.secondary', mr: 0.5 }} />
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {insurance.insurance_company}
                    </Typography>
                </Box>

                {/* Policy Type */}
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                    {getPolicyTypeLabel(insurance.policy_type)}
                </Typography>

                <Divider sx={{ my: 1.5 }} />

                {/* Coverage */}
                <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                        Nilai Pertanggungan
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>
                        {formatCurrency(insurance.coverage_amount)}
                    </Typography>
                </Box>

                {/* Premium */}
                <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                        Premi
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(insurance.premium_amount)}
                    </Typography>
                </Box>

                {/* End Date */}
                <Box sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <CalendarToday sx={{ fontSize: 14, color: 'text.secondary', mr: 0.5 }} />
                        <Typography variant="caption" color="text.secondary">
                            Berakhir: {formatDate(insurance.policy_end_date)}
                        </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'warning.main' }}>
                        {getDaysLeft(insurance.policy_end_date)}
                    </Typography>
                </Box>

                {/* Agent */}
                {insurance.agent_name && (
                    <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Person sx={{ fontSize: 14, color: 'text.secondary', mr: 0.5 }} />
                            <Typography variant="caption" color="text.secondary">
                                Agen: {insurance.agent_name}
                            </Typography>
                        </Box>
                    </Box>
                )}
            </CardContent>

            {/* Actions */}
            <CardActions sx={{ justifyContent: 'flex-end', pt: 0, pb: 1.5, px: 2 }}>
                {onView && (
                    <Tooltip title="Lihat Detail">
                        <IconButton size="small" color="primary" onClick={onView}>
                            <Visibility fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
                {canEdit && onEdit && (
                    <Tooltip title="Edit">
                        <IconButton size="small" color="primary" onClick={onEdit}>
                            <Edit fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
                {canDelete && onDelete && (
                    <Tooltip title="Hapus">
                        <IconButton size="small" color="error" onClick={onDelete}>
                            <Delete fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
            </CardActions>
        </Card>
    );
};

export default React.memo(InsuranceCard);
