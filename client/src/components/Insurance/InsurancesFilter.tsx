import React from 'react';
import {
    Box,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Stack,
    Button,
    SelectChangeEvent,
} from '@mui/material';
import { Search, Clear } from '@mui/icons-material';

interface InsurancesFilterProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    policyTypeFilter: string;
    onPolicyTypeChange: (value: string) => void;
    statusFilter: string;
    onStatusChange: (value: string) => void;
    onClearFilters: () => void;
}

const InsurancesFilter: React.FC<InsurancesFilterProps> = ({
    searchTerm,
    onSearchChange,
    policyTypeFilter,
    onPolicyTypeChange,
    statusFilter,
    onStatusChange,
    onClearFilters,
}) => {
    const handlePolicyTypeChange = (e: SelectChangeEvent) => {
        onPolicyTypeChange(e.target.value);
    };

    const handleStatusChange = (e: SelectChangeEvent) => {
        onStatusChange(e.target.value);
    };

    const activeFiltersCount =
        (searchTerm ? 1 : 0) +
        (policyTypeFilter ? 1 : 0) +
        (statusFilter ? 1 : 0);

    const policyTypes = [
        { value: 'life', label: 'Asuransi Jiwa' },
        { value: 'health', label: 'Asuransi Kesehatan' },
        { value: 'property', label: 'Asuransi Properti' },
        { value: 'vehicle', label: 'Asuransi Kendaraan' },
        { value: 'credit', label: 'Asuransi Kredit' },
        { value: 'other', label: 'Lainnya' },
    ];

    const getPolicyTypeLabel = (value: string) => {
        return policyTypes.find((t) => t.value === value)?.label || value;
    };

    const getStatusLabel = (value: string) => {
        const labels: Record<string, string> = {
            active: 'Aktif',
            expiring: 'Akan Berakhir',
            expired: 'Expired',
        };
        return labels[value] || value;
    };

    return (
        <Box sx={{ mb: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                {/* Search */}
                <TextField
                    fullWidth
                    placeholder="Cari berdasarkan nomor polis, perusahaan, atau beneficiary..."
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

                {/* Policy Type Filter */}
                <FormControl sx={{ minWidth: 180 }}>
                    <InputLabel>Jenis Polis</InputLabel>
                    <Select
                        value={policyTypeFilter}
                        label="Jenis Polis"
                        onChange={handlePolicyTypeChange}
                    >
                        <MenuItem value="">Semua</MenuItem>
                        {policyTypes.map((type) => (
                            <MenuItem key={type.value} value={type.value}>
                                {type.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Status Filter */}
                <FormControl sx={{ minWidth: 150 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                        value={statusFilter}
                        label="Status"
                        onChange={handleStatusChange}
                    >
                        <MenuItem value="">Semua</MenuItem>
                        <MenuItem value="active">Aktif</MenuItem>
                        <MenuItem value="expiring">Akan Berakhir</MenuItem>
                        <MenuItem value="expired">Expired</MenuItem>
                    </Select>
                </FormControl>

                {/* Clear Filters */}
                {activeFiltersCount > 0 && (
                    <Button
                        variant="outlined"
                        startIcon={<Clear />}
                        onClick={onClearFilters}
                        sx={{ minWidth: 120 }}
                    >
                        Clear ({activeFiltersCount})
                    </Button>
                )}
            </Stack>

            {/* Active Filters Chips */}
            {activeFiltersCount > 0 && (
                <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
                    {searchTerm && (
                        <Chip
                            label={`Pencarian: "${searchTerm}"`}
                            size="small"
                            onDelete={() => onSearchChange('')}
                            color="primary"
                            variant="outlined"
                        />
                    )}
                    {policyTypeFilter && (
                        <Chip
                            label={`Jenis: ${getPolicyTypeLabel(policyTypeFilter)}`}
                            size="small"
                            onDelete={() => onPolicyTypeChange('')}
                            color="primary"
                            variant="outlined"
                        />
                    )}
                    {statusFilter && (
                        <Chip
                            label={`Status: ${getStatusLabel(statusFilter)}`}
                            size="small"
                            onDelete={() => onStatusChange('')}
                            color="primary"
                            variant="outlined"
                        />
                    )}
                </Stack>
            )}
        </Box>
    );
};

export default InsurancesFilter;
