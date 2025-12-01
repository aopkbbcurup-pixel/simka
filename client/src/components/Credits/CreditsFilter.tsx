import React from 'react';
import { Box, TextField, InputAdornment, FormControl, InputLabel, Select, MenuItem, Chip, Stack } from '@mui/material';
import { Search, FilterList, Clear } from '@mui/icons-material';

interface CreditsFilterProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    statusFilter: string;
    onStatusFilterChange: (value: string) => void;
    creditTypeFilter: string;
    onCreditTypeFilterChange: (value: string) => void;
    creditTypes: string[];
    totalRecords: number;
}

const CreditsFilter: React.FC<CreditsFilterProps> = ({
    searchTerm,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    creditTypeFilter,
    onCreditTypeFilterChange,
    creditTypes,
    totalRecords,
}) => {
    const hasActiveFilters = searchTerm || statusFilter || creditTypeFilter;

    const handleClearFilters = () => {
        onSearchChange('');
        onStatusFilterChange('');
        onCreditTypeFilterChange('');
    };

    return (
        <Box sx={{ mb: 3 }}>
            {/* Search and Filters */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
                <TextField
                    fullWidth
                    placeholder="Cari nomor kontrak, debitur, atau tipe kredit..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ flexGrow: 1 }}
                />

                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                        value={statusFilter}
                        label="Status"
                        onChange={(e) => onStatusFilterChange(e.target.value)}
                    >
                        <MenuItem value="">Semua Status</MenuItem>
                        <MenuItem value="Lancar">Lancar</MenuItem>
                        <MenuItem value="Dalam Perhatian Khusus">DPK</MenuItem>
                        <MenuItem value="Kurang Lancar">Kurang Lancar</MenuItem>
                        <MenuItem value="Diragukan">Diragukan</MenuItem>
                        <MenuItem value="Macet">Macet</MenuItem>
                        <MenuItem value="Lunas">Lunas</MenuItem>
                    </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Tipe Kredit</InputLabel>
                    <Select
                        value={creditTypeFilter}
                        label="Tipe Kredit"
                        onChange={(e) => onCreditTypeFilterChange(e.target.value)}
                    >
                        <MenuItem value="">Semua Tipe</MenuItem>
                        {creditTypes.map((type) => (
                            <MenuItem key={type} value={type}>
                                {type}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Stack>

            {/* Filter Chips */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <FilterList fontSize="small" color="action" />
                    <Box component="span" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                        {totalRecords} kredit
                    </Box>
                </Box>

                {hasActiveFilters && (
                    <>
                        {searchTerm && (
                            <Chip
                                label={`Pencarian: "${searchTerm}"`}
                                size="small"
                                onDelete={() => onSearchChange('')}
                                variant="outlined"
                            />
                        )}
                        {statusFilter && (
                            <Chip
                                label={`Status: ${statusFilter}`}
                                size="small"
                                onDelete={() => onStatusFilterChange('')}
                                variant="outlined"
                            />
                        )}
                        {creditTypeFilter && (
                            <Chip
                                label={`Tipe: ${creditTypeFilter}`}
                                size="small"
                                onDelete={() => onCreditTypeFilterChange('')}
                                variant="outlined"
                            />
                        )}
                        <Chip
                            label="Hapus Semua Filter"
                            size="small"
                            onClick={handleClearFilters}
                            onDelete={handleClearFilters}
                            deleteIcon={<Clear />}
                            color="primary"
                            variant="outlined"
                        />
                    </>
                )}
            </Box>
        </Box>
    );
};

export default CreditsFilter;
