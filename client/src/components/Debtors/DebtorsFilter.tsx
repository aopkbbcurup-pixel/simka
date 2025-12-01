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
import { Search, FilterList, Clear } from '@mui/icons-material';

interface DebtorsFilterProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    genderFilter: string;
    onGenderChange: (value: string) => void;
    maritalStatusFilter: string;
    onMaritalStatusChange: (value: string) => void;
    onClearFilters: () => void;
}

const DebtorsFilter: React.FC<DebtorsFilterProps> = ({
    searchTerm,
    onSearchChange,
    genderFilter,
    onGenderChange,
    maritalStatusFilter,
    onMaritalStatusChange,
    onClearFilters,
}) => {
    const handleGenderChange = (e: SelectChangeEvent) => {
        onGenderChange(e.target.value);
    };

    const handleMaritalChange = (e: SelectChangeEvent) => {
        onMaritalStatusChange(e.target.value);
    };

    const activeFiltersCount =
        (searchTerm ? 1 : 0) +
        (genderFilter ? 1 : 0) +
        (maritalStatusFilter ? 1 : 0);

    return (
        <Box sx={{ mb: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                {/* Search */}
                <TextField
                    fullWidth
                    placeholder="Cari berdasarkan nama, kode, atau KTP..."
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

                {/* Gender Filter */}
                <FormControl sx={{ minWidth: 150 }}>
                    <InputLabel>Jenis Kelamin</InputLabel>
                    <Select
                        value={genderFilter}
                        label="Jenis Kelamin"
                        onChange={handleGenderChange}
                    >
                        <MenuItem value="">Semua</MenuItem>
                        <MenuItem value="L">Laki-laki</MenuItem>
                        <MenuItem value="P">Perempuan</MenuItem>
                    </Select>
                </FormControl>

                {/* Marital Status Filter */}
                <FormControl sx={{ minWidth: 150 }}>
                    <InputLabel>Status Perkawinan</InputLabel>
                    <Select
                        value={maritalStatusFilter}
                        label="Status Perkawinan"
                        onChange={handleMaritalChange}
                    >
                        <MenuItem value="">Semua</MenuItem>
                        <MenuItem value="single">Lajang</MenuItem>
                        <MenuItem value="married">Menikah</MenuItem>
                        <MenuItem value="divorced">Cerai</MenuItem>
                        <MenuItem value="widowed">Duda/Janda</MenuItem>
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
                    {genderFilter && (
                        <Chip
                            label={`Gender: ${genderFilter === 'L' ? 'Laki-laki' : 'Perempuan'}`}
                            size="small"
                            onDelete={() => onGenderChange('')}
                            color="primary"
                            variant="outlined"
                        />
                    )}
                    {maritalStatusFilter && (
                        <Chip
                            label={`Status: ${maritalStatusFilter === 'single'
                                    ? 'Lajang'
                                    : maritalStatusFilter === 'married'
                                        ? 'Menikah'
                                        : maritalStatusFilter === 'divorced'
                                            ? 'Cerai'
                                            : 'Duda/Janda'
                                }`}
                            size="small"
                            onDelete={() => onMaritalStatusChange('')}
                            color="primary"
                            variant="outlined"
                        />
                    )}
                </Stack>
            )}
        </Box>
    );
};

export default DebtorsFilter;
