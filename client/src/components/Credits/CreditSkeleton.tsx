import React from 'react';
import { Card, CardContent, CardActions, Box, Skeleton, Stack } from '@mui/material';

const CreditSkeleton: React.FC = () => {
    return (
        <Card
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box sx={{ flexGrow: 1 }}>
                        <Skeleton variant="text" width="60%" height={32} sx={{ mb: 0.5 }} />
                        <Skeleton variant="text" width="40%" height={20} />
                    </Box>
                    <Stack direction="column" spacing={0.5} alignItems="flex-end">
                        <Skeleton variant="rounded" width={80} height={24} />
                    </Stack>
                </Box>

                {/* Financial Info */}
                <Box sx={{ mb: 1.5 }}>
                    <Skeleton variant="text" width="100%" height={20} sx={{ mb: 0.5 }} />
                    <Skeleton variant="text" width="100%" height={20} />
                </Box>

                {/* Progress Bar */}
                <Box sx={{ mb: 1.5 }}>
                    <Skeleton variant="text" width="30%" height={16} sx={{ mb: 0.5 }} />
                    <Skeleton variant="rounded" width="100%" height={8} sx={{ borderRadius: 4 }} />
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
                    {[...Array(6)].map((_, index) => (
                        <Skeleton key={index} variant="text" width="80%" height={20} />
                    ))}
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

export default CreditSkeleton;
