import React from 'react';
import {
    Card,
    CardContent,
    CardActions,
    Box,
    Typography,
    Chip,
    IconButton,
    LinearProgress,
    Tooltip,
    Stack,
} from '@mui/material';
import {
    Visibility,
    Edit,
    Delete,
    CreditCard as CreditCardIcon,
    Person,
    CalendarMonth,
    TrendingUp,
    Security,
    Shield,
} from '@mui/icons-material';

interface CreditCardProps {
    credit: {
        id: number;
        contract_number: string;
        account_number?: string;
        credit_type: string;
        plafond: number;
        outstanding: number;
        interest_rate: number;
        tenor_months: number;
        start_date: string;
        maturity_date: string;
        status: string;
        collectibility: string;
        Debtor?: {
            id: string;
            full_name: string;
            debtor_code: string;
        };
        Insurances?: Array<{ id: string; policy_number: string }>;
        Collaterals?: Array<{ id: string; collateral_code: string }>;
    };
    onView: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    canEdit?: boolean;
    canDelete?: boolean;
}

const getCollectibilityLabel = (collectibility: string | number) => {
    const code = typeof collectibility === 'string' ? parseInt(collectibility) : collectibility;
    switch (code) {
        case 1:
            return 'Lancar';
        case 2:
            return 'DPK';
        case 3:
            return 'Kurang Lancar';
        case 4:
            return 'Diragukan';
        case 5:
            return 'Macet';
        default:
            return collectibility?.toString() || 'Unknown';
    }
};

const getCollectibilityColor = (collectibility: string | number): 'success' | 'warning' | 'error' | 'default' => {
    const code = typeof collectibility === 'string' ? parseInt(collectibility) : collectibility;
    switch (code) {
        case 1:
            return 'success';
        case 2:
            return 'warning';
        case 3:
        case 4:
        case 5:
            return 'error';
        default:
            return 'default';
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

const CreditCard: React.FC<CreditCardProps> = ({
    credit,
    onView,
    onEdit,
    onDelete,
    canEdit = false,
    canDelete = false,
}) => {
    const progress = ((credit.plafond - credit.outstanding) / credit.plafond) * 100;
    const collectibilityLabel = getCollectibilityLabel(credit.collectibility);
    const collectibilityColor = getCollectibilityColor(credit.collectibility);

    return (
        <Card
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease',
                '&:hover': {
                    boxShadow: '0 8px 16px -4px rgb(0 0 0 / 0.15)',
                    transform: 'translateY(-2px)',
                },
            }}
        >
            <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', mb: 0.5 }}>
                            {credit.contract_number}
                        </Typography>
                        {credit.Debtor && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">
                                    {credit.Debtor.full_name}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                    <Stack direction="column" spacing={0.5} alignItems="flex-end">
                        <Chip
                            label={collectibilityLabel}
                            color={collectibilityColor}
                            size="small"
                            sx={{ fontWeight: 600 }}
                        />
                        {credit.status === 'Lunas' && (
                            <Chip label="Lunas" color="info" size="small" sx={{ fontWeight: 600 }} />
                        )}
                    </Stack>
                </Box>

                {/* Financial Info */}
                <Box sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                            Plafond
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatCurrency(credit.plafond)}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">
                            Outstanding
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, color: credit.outstanding > 0 ? 'warning.main' : 'success.main' }}
                        >
                            {formatCurrency(credit.outstanding)}
                        </Typography>
                    </Box>
                </Box>

                {/* Progress Bar */}
                <Box sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                            Terbayar
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            {progress.toFixed(1)}%
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: 'grey.200',
                            '& .MuiLinearProgress-bar': {
                                borderRadius: 4,
                                background: progress >= 80
                                    ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
                                    : progress >= 50
                                        ? 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)'
                                        : 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)',
                            },
                        }}
                    />
                </Box>

                {/* Details Grid */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 1,
                        pt: 1,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Tooltip title="Tipe Kredit">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CreditCardIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" noWrap>
                                {credit.credit_type}
                            </Typography>
                        </Box>
                    </Tooltip>

                    <Tooltip title="Tenor">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CalendarMonth sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" noWrap>
                                {credit.tenor_months} bulan
                            </Typography>
                        </Box>
                    </Tooltip>

                    <Tooltip title="Bunga">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <TrendingUp sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" noWrap>
                                {credit.interest_rate}%
                            </Typography>
                        </Box>
                    </Tooltip>

                    <Tooltip title="Jatuh Tempo">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CalendarMonth sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" noWrap>
                                {formatDate(credit.maturity_date)}
                            </Typography>
                        </Box>
                    </Tooltip>

                    <Tooltip title="Agunan">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Security sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" noWrap>
                                {credit.Collaterals?.length || 0} agunan
                            </Typography>
                        </Box>
                    </Tooltip>

                    <Tooltip title="Asuransi">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Shield sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" noWrap>
                                {credit.Insurances?.length ? 'Diasuransikan' : 'Belum'}
                            </Typography>
                        </Box>
                    </Tooltip>
                </Box>
            </CardContent>

            {/* Actions */}
            <CardActions sx={{ justifyContent: 'flex-end', pt: 0, pb: 1.5, px: 2 }}>
                <Tooltip title="Lihat Detail">
                    <IconButton size="small" color="primary" onClick={onView}>
                        <Visibility fontSize="small" />
                    </IconButton>
                </Tooltip>
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

export default React.memo(CreditCard);
