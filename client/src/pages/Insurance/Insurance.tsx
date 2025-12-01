import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Autocomplete,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  Visibility,
  Business,
  Policy,
  DateRange,
} from '@mui/icons-material';
import { useQueryClient } from '@tanstack/react-query';
import { useInsurances, INSURANCES_QUERY_KEY, type Insurance } from '../../hooks/queries/useInsurances';
import InsuranceCardComponent from '../../components/Insurance/InsuranceCard';
import InsuranceSkeleton from '../../components/Insurance/InsuranceSkeleton';
import InsurancesFilter from '../../components/Insurance/InsurancesFilter';
import api from '../../utils/api';

// Insurance interface imported from useInsurances.ts

interface DebtorOption {
  id: string;
  full_name: string;
  debtor_code: string;
}

const InsurancePage: React.FC = () => {
  const queryClient = useQueryClient();

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [policyTypeFilter, setPolicyTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedInsurance, setSelectedInsurance] = useState<Insurance | null>(null);

  // React Query hook
  const { data, isLoading, error } = useInsurances({
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    policy_type: policyTypeFilter,
    status: statusFilter,
  });

  const insurances = data?.insurances || [];
  const totalPages = data?.pagination?.total_pages || 1;
  const totalRecords = data?.pagination?.total_records || 0;

  // Debtor Search State
  const [debtorOptions, setDebtorOptions] = useState<DebtorOption[]>([]);
  const [debtorLoading, setDebtorLoading] = useState(false);
  const [debtorSearchTerm, setDebtorSearchTerm] = useState('');
  const debtorSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState({
    policy_number: '',
    insurance_company: '',
    policy_type: 'life',
    coverage_amount: '',
    premium_amount: '',
    policy_start_date: '',
    policy_end_date: '',
    beneficiary_name: '',
    beneficiary_relation: '',
    agent_name: '',
    agent_contact: '',
    notes: '',
  });

  const policyTypes = [
    { value: 'life', label: 'Asuransi Jiwa' },
    { value: 'health', label: 'Asuransi Kesehatan' },
    { value: 'property', label: 'Asuransi Properti' },
    { value: 'vehicle', label: 'Asuransi Kendaraan' },
    { value: 'credit', label: 'Asuransi Kredit' },
    { value: 'other', label: 'Lainnya' },
  ];

  // fetchInsurances removed - handled by React Query

  const fetchDebtorOptions = async (query: string) => {
    try {
      setDebtorLoading(true);
      const response = await api.get('/debtors', {
        params: { search: query, limit: 10 }
      });
      if (response.data.success) {
        setDebtorOptions(response.data.data.debtors.map((d: any) => ({
          id: d.id,
          full_name: d.full_name,
          debtor_code: d.debtor_code
        })));
      }
    } catch (error) {
      console.error('Error fetching debtors:', error);
    } finally {
      setDebtorLoading(false);
    }
  };

  const handleDebtorSearch = (event: React.SyntheticEvent, value: string, reason: string) => {
    setDebtorSearchTerm(value);
    if (reason === 'input') {
      if (debtorSearchTimeoutRef.current) {
        clearTimeout(debtorSearchTimeoutRef.current);
      }
      debtorSearchTimeoutRef.current = setTimeout(() => {
        if (value.length >= 2) {
          fetchDebtorOptions(value);
        } else {
          setDebtorOptions([]);
        }
      }, 300);
    }
  };

  useEffect(() => {
    return () => {
      if (debtorSearchTimeoutRef.current) {
        clearTimeout(debtorSearchTimeoutRef.current);
      }
    };
  }, []);

  // Filtering handled by backend via React Query params
  const filteredInsurances = insurances;

  const handleOpenDialog = (insurance?: Insurance) => {
    if (insurance) {
      setSelectedInsurance(insurance);
      setFormData({
        policy_number: insurance.policy_number,
        insurance_company: insurance.insurance_company,
        policy_type: insurance.policy_type,
        coverage_amount: insurance.coverage_amount.toString(),
        premium_amount: insurance.premium_amount.toString(),
        policy_start_date: insurance.policy_start_date.split('T')[0],
        policy_end_date: insurance.policy_end_date.split('T')[0],
        beneficiary_name: insurance.beneficiary_name || '',
        beneficiary_relation: '',
        agent_name: insurance.agent_name || '',
        agent_contact: insurance.agent_contact || '',
        notes: insurance.notes || '',
      });
      setDebtorSearchTerm(insurance.beneficiary_name || '');
    } else {
      setSelectedInsurance(null);
      setFormData({
        policy_number: '',
        insurance_company: '',
        policy_type: 'life',
        coverage_amount: '',
        premium_amount: '',
        policy_start_date: '',
        policy_end_date: '',
        beneficiary_name: '',
        beneficiary_relation: '',
        agent_name: '',
        agent_contact: '',
        notes: '',
      });
      setDebtorSearchTerm('');
    }
    setDebtorOptions([]);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedInsurance(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    try {
      if (selectedInsurance) {
        await api.put(`/insurances/${selectedInsurance.id}`, formData);
      } else {
        await api.post('/insurances', formData);
      }

      queryClient.invalidateQueries({ queryKey: [INSURANCES_QUERY_KEY] });
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving insurance:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data asuransi ini?')) {
      try {
        await api.delete(`/insurances/${id}`);
        queryClient.invalidateQueries({ queryKey: [INSURANCES_QUERY_KEY] });
      } catch (error) {
        console.error('Error deleting insurance:', error);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  const getPolicyTypeLabel = (type: string) => {
    const policyType = policyTypes.find(pt => pt.value === type);
    return policyType ? policyType.label : type;
  };

  const getStatusChip = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const daysUntilExpiry = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return <Chip label="Expired" color="error" size="small" />;
    } else if (daysUntilExpiry <= 30) {
      return <Chip label="Akan Berakhir" color="warning" size="small" />;
    } else {
      return <Chip label="Aktif" color="success" size="small" />;
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Manajemen Asuransi
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Tambah Asuransi
        </Button>
      </Box>

      {/* Filter Component */}
      <InsurancesFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        policyTypeFilter={policyTypeFilter}
        onPolicyTypeChange={setPolicyTypeFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        onClearFilters={() => {
          setSearchTerm('');
          setPolicyTypeFilter('');
          setStatusFilter('');
        }}
      />

      {/* Card Grid for Screen */}
      {isLoading ? (
        <Grid container spacing={2}>
          {[...Array(12)].map((_, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              <InsuranceSkeleton />
            </Grid>
          ))}
        </Grid>
      ) : error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          Gagal memuat data asuransi. Silakan refresh halaman.
        </Alert>
      ) : insurances.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          Tidak ada data asuransi yang ditemukan.
        </Alert>
      ) : (
        <>
          {/* Card Grid */}
          <Grid container spacing={2} sx={{ '@media print': { display: 'none' } }}>
            {insurances.map((insurance) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={insurance.id}>
                <InsuranceCardComponent
                  insurance={insurance}
                  onView={() => handleOpenDialog(insurance)}
                  onEdit={() => handleOpenDialog(insurance)}
                  onDelete={() => handleDelete(insurance.id)}
                  canEdit={true}
                  canDelete={true}
                />
              </Grid>
            ))}
          </Grid>

          {/* Table for Print */}
          <TableContainer component={Paper} sx={{ display: 'none', '@media print': { display: 'block' } }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>No. Polis</TableCell>
                  <TableCell>Perusahaan Asuransi</TableCell>
                  <TableCell>Jenis Polis</TableCell>
                  <TableCell>Nilai Pertanggungan</TableCell>
                  <TableCell>Premi</TableCell>
                  <TableCell>Tanggal Berakhir</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Aksi</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {insurances.map((insurance) => (
                  <TableRow key={insurance.id}>
                    <TableCell>{insurance.policy_number}</TableCell>
                    <TableCell>{insurance.insurance_company}</TableCell>
                    <TableCell>{getPolicyTypeLabel(insurance.policy_type)}</TableCell>
                    <TableCell>{formatCurrency(insurance.coverage_amount)}</TableCell>
                    <TableCell>{formatCurrency(insurance.premium_amount)}</TableCell>
                    <TableCell>{formatDate(insurance.policy_end_date)}</TableCell>
                    <TableCell>{getStatusChip(insurance.policy_end_date)}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenDialog(insurance)}
                        title="Edit"
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(insurance.id)}
                        title="Hapus"
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Insurance Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedInsurance ? 'Edit Asuransi' : 'Tambah Asuransi Baru'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="policy_number"
                label="No. Polis"
                value={formData.policy_number}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="insurance_company"
                label="Perusahaan Asuransi"
                value={formData.insurance_company}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Jenis Polis</InputLabel>
                <Select
                  name="policy_type"
                  value={formData.policy_type}
                  onChange={(e) => setFormData({ ...formData, policy_type: e.target.value })}
                  label="Jenis Polis"
                >
                  {policyTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="coverage_amount"
                label="Nilai Pertanggungan"
                type="number"
                value={formData.coverage_amount}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="premium_amount"
                label="Premi"
                type="number"
                value={formData.premium_amount}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="policy_start_date"
                label="Tanggal Mulai"
                type="date"
                value={formData.policy_start_date}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="policy_end_date"
                label="Tanggal Berakhir"
                type="date"
                value={formData.policy_end_date}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                freeSolo
                options={debtorOptions}
                getOptionLabel={(option) => typeof option === 'string' ? option : `${option.full_name} (${option.debtor_code})`}
                inputValue={debtorSearchTerm}
                onInputChange={handleDebtorSearch}
                onChange={(event, newValue) => {
                  if (typeof newValue === 'string') {
                    setFormData({ ...formData, beneficiary_name: newValue });
                  } else if (newValue) {
                    setFormData({ ...formData, beneficiary_name: newValue.full_name });
                  } else {
                    setFormData({ ...formData, beneficiary_name: '' });
                  }
                }}
                loading={debtorLoading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Nama Penerima Manfaat"
                    placeholder="Ketik nama debitur atau nama lainnya"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <React.Fragment>
                          {debtorLoading ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </React.Fragment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="beneficiary_relation"
                label="Hubungan dengan Tertanggung"
                value={formData.beneficiary_relation}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="agent_name"
                label="Nama Agen"
                value={formData.agent_name}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="agent_contact"
                label="Kontak Agen"
                value={formData.agent_contact}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="notes"
                label="Catatan"
                multiline
                rows={3}
                value={formData.notes}
                onChange={handleInputChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Batal</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedInsurance ? 'Update' : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InsurancePage;
