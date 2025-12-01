import React from 'react';
import {
    Card,
    CardContent,
    CardActions,
    Box,
    Skeleton,
    Stack,
} from '@mui/material';

const DebtorSkeleton: React.FC = () => {
    return (
        <Card
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                {/* Avatar and Header */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Skeleton variant="circular" width={48} height={48} sx={{ mr: 1.5 }} />
                    <Box sx={{ flexGrow: 1 }}>
                        <Skeleton variant="text" width="70%" height={28} sx={{ mb: 0.5 }} />
                        <Stack direction="row" spacing={0.5}>
                            <Skeleton variant="rounded" width={80} height={22} />
                            <Skeleton variant="rounded" width={70} height={22} />
                        </Stack>
                    </Box>
                </Box>

                {/* Details */}
                <Box sx={{ mb: 1.5 }}>
                    <Skeleton variant="text" width="40%" height={16} />
                    <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1 }} />
                    <Skeleton variant="text" width="30%" height={16} />
                    <Skeleton variant="text" width="80%" height={20} />
                </Box>

                {/* Contact Info */}
                <Box sx={{ pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Skeleton variant="text" width="70%" height={16} sx={{ mb: 0.5 }} />
                    <Skeleton variant="text" width="60%" height={16} sx={{ mb: 0.5 }} />
                    <Skeleton variant="text" width="50%" height={16} />
                </Box>
            </CardContent>

            {/* Actions */}
            <CardActions sx={{ justifyContent: 'flex-end', pt: 0, pb: 1.5, px: 2 }}>
                <Skeleton variant="circular" width={32} height={32} sx={{ mr: 0.5 }} />
                <Skeleton variant="circular" width={32} height={32} sx={{ mr: 0.5 }} />
                <Skeleton variant="circular" width={32} height={32} />
            </CardActions>
        </Card>
    );
};

export default DebtorSkeleton;
