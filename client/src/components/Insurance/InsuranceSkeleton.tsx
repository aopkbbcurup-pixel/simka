import React from 'react';
import {
    Card,
    CardContent,
    CardActions,
    Box,
    Skeleton,
    Divider,
} from '@mui/material';

const InsuranceSkeleton: React.FC = () => {
    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Skeleton variant="rectangular" width={32} height={32} sx={{ borderRadius: 1 }} />
                        <Skeleton variant="text" width={100} height={24} />
                    </Box>
                    <Skeleton variant="rounded" width={70} height={24} />
                </Box>

                {/* Company */}
                <Skeleton variant="text" width="80%" height={24} sx={{ mb: 0.5 }} />
                <Skeleton variant="text" width="50%" height={20} sx={{ mb: 1.5 }} />

                <Divider sx={{ my: 1.5 }} />

                {/* Coverage */}
                <Skeleton variant="text" width="60%" height={16} />
                <Skeleton variant="text" width="70%" height={32} sx={{ mb: 1 }} />

                {/* Premium */}
                <Skeleton variant="text" width="40%" height={16} />
                <Skeleton variant="text" width="50%" height={20} sx={{ mb: 1.5 }} />

                {/* End Date */}
                <Skeleton variant="text" width="70%" height={16} sx={{ mb: 0.5 }} />
                <Skeleton variant="text" width="50%" height={16} />
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

export default InsuranceSkeleton;
