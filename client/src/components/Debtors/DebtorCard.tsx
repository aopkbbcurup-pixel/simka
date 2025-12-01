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
    Avatar,
    Stack,
} from '@mui/material';
import {
    Visibility,
    Edit,
    Delete,
    Phone,
    Email,
    Person,
    Wc,
    Favorite,
} from '@mui/icons-material';

interface DebtorCardProps {
    debtor: {
        id: string;
        debtor_code: string;
        full_name: string;
        ktp_number: string;
        gender: string;
        marital_status: string;
        phone?: string;
        mobile?: string;
        email?: string;
        occupation?: string;
    };
    onView: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    canEdit?: boolean;
    canDelete?: boolean;
}

const getGenderLabel = (gender: string) => {
    return gender === 'L' ? 'Laki-laki' : 'Perempuan';
};

const getMaritalStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
        single: 'Lajang',
        married: 'Menikah',
        divorced: 'Cerai',
        widowed: 'Duda/Janda',
    };
    return labels[status] || status;
};

const getAvatarColor = (name: string) => {
    const colors = [
        '#f44336', '#e91e63', '#9c27b0', '#673ab7',
        '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
        '#009688', '#4caf50', '#8bc34a', '#cddc39',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
};

const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

const DebtorCard: React.FC<DebtorCardProps> = ({
    debtor,
    onView,
    onEdit,
    onDelete,
    canEdit = false,
    canDelete = false,
}) => {
    const avatarColor = getAvatarColor(debtor.full_name);
    const initials = getInitials(debtor.full_name);
    const displayPhone = debtor.mobile || debtor.phone;

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
                {/* Header with Avatar */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Avatar
                        sx={{
                            bgcolor: avatarColor,
                            width: 48,
                            height: 48,
                            fontSize: '1.2rem',
                            fontWeight: 700,
                            mr: 1.5,
                        }}
                    >
                        {initials}
                    </Avatar>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 700,
                                color: 'primary.main',
                                fontSize: '1.1rem',
                                mb: 0.5,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {debtor.full_name}
                        </Typography>
                        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                            <Chip
                                icon={<Wc sx={{ fontSize: 14 }} />}
                                label={getGenderLabel(debtor.gender)}
                                size="small"
                                color={debtor.gender === 'L' ? 'primary' : 'secondary'}
                                variant="outlined"
                                sx={{ height: 22, fontSize: '0.75rem' }}
                            />
                            <Chip
                                icon={<Favorite sx={{ fontSize: 14 }} />}
                                label={getMaritalStatusLabel(debtor.marital_status)}
                                size="small"
                                color="default"
                                variant="outlined"
                                sx={{ height: 22, fontSize: '0.75rem' }}
                            />
                        </Stack>
                    </Box>
                </Box>

                {/* Details */}
                <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                        Kode Debitur
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                        {debtor.debtor_code}
                    </Typography>

                    <Typography variant="caption" color="text.secondary" display="block">
                        No. KTP
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {debtor.ktp_number || '-'}
                    </Typography>
                </Box>

                {/* Contact Info */}
                <Box
                    sx={{
                        pt: 1.5,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    {displayPhone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <Phone sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                {displayPhone}
                            </Typography>
                        </Box>
                    )}
                    {debtor.email && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Email sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                    fontSize: '0.75rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {debtor.email}
                            </Typography>
                        </Box>
                    )}
                    {debtor.occupation && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <Person sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                    fontSize: '0.75rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {debtor.occupation}
                            </Typography>
                        </Box>
                    )}
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

export default React.memo(DebtorCard);
