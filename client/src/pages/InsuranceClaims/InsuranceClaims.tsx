import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Card,
  CardContent,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  Visibility,
  Assignment,
  Person,
  Business,
  TrendingUp,
  CheckCircle,
  Cancel,
  HourglassEmpty,
} from '@mui/icons-material';
import api from '../../utils/api';

interface InsuranceClaim {
  id: string;
  claim_number: string;
  debtor_id: string;
  insurance_id: string;
  claim_type: string;
  claim_amount: number;
  claim_date: string;
  incident_date: string;
  incident_description: string;
  claim_status: string;
  status_reason?: string;
  settlement_amount?: number;
  settlement_date?: string;
  payment_method?: string;
  follow_up_date?: string;
  notes?: string;
  Debtor?: {
    id: string;
    debtor_code: string;
    full_name: string;
    ktp_number: string;
  };
  Insurance?: {
    id: string;
    policy_number: string;
    insurance_company: string;
    policy_type: string;
  };
}

interface Debtor {
  id: string;
  debtor_code: string;
  full_name: string;
}

interface CreditOption {
  id: string;
  contract_number: string;
  Debtor: Debtor;
}

interface Insurance {
  id: string;
  policy_number: string;
  insurance_company: string;
}

const InsuranceClaims: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<InsuranceClaim | null>(null);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [creditOptions, setCreditOptions] = useState<CreditOption[]>([]);
  const [selectedCreditOption, setSelectedCreditOption] = useState<CreditOption | null>(null);
  const [creditSearchTerm, setCreditSearchTerm] = useState('');
  const [creditLoading, setCreditLoading] = useState(false);
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const creditOptionList = useMemo(() => {
    if (selectedCreditOption && !creditOptions.some((option) => option.id === selectedCreditOption.id)) {
      return [selectedCreditOption, ...creditOptions];
    }
    return creditOptions;
  }, [creditOptions, selectedCreditOption]);
  const creditSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const creditFetchIdRef = useRef(0);
  const [claimsSummary, setClaimsSummary] = useState({
    submitted: 0,
    under_review: 0,
    processing: 0,
    approved: 0,
    rejected: 0,
    paid: 0,
    closed: 0,
  });
  const [formData, setFormData] = useState({
    claim_number: '',
    debtor_id: '',
    insurance_id: '',
    claim_type: 'medical',
    claim_amount: '',
    claim_date: '',
    incident_date: '',
    incident_description: '',
    notes: '',
  });
  const [statusFormData, setStatusFormData] = useState({
    claim_status: '',
    status_reason: '',
    settlement_amount: '',
    settlement_date: '',
    payment_method: 'bank_transfer',
  });

  const claimTypes = [
    { value: 'death', label: 'Kematian' },
    { value: 'disability', label: 'Cacat' },
    { value: 'medical', label: 'Medis' },
    { value: 'accident', label: 'Kecelakaan' },
    { value: 'property_damage', label: 'Kerusakan Properti' },
    { value: 'other', label: 'Lainnya' },
  ];

  const claimStatuses = [
    { value: 'submitted', label: 'Diajukan', color: 'default' },
    { value: 'under_review', label: 'Dalam Review', color: 'info' },
    { value: 'processing', label: 'Diproses', color: 'warning' },
    { value: 'approved', label: 'Disetujui', color: 'success' },
    { value: 'rejected', label: 'Ditolak', color: 'error' },
    { value: 'paid', label: 'Dibayar', color: 'success' },
    { value: 'closed', label: 'Ditutup', color: 'default' },
  ];

  const paymentMethods = [
    { value: 'bank_transfer', label: 'Transfer Bank' },
    { value: 'check', label: 'Cek' },
    { value: 'cash', label: 'Tunai' },
    { value: 'other', label: 'Lainnya' },
  ];

  const fetchClaims = async () => {
    try {
      const response = await api.get('/insurance-claims', {
        params: { status: statusFilter }
      });
      if (response.data.success) {
        setClaims(response.data.data.claims);
      }
    } catch (error) {
      console.error('Error fetching claims:', error);
    }
  };

  const fetchClaimsSummary = async () => {
    try {
      const response = await api.get('/insurance-claims/by-status');
      if (response.data.success) {
        setClaimsSummary(response.data.data.summary);
      }
    } catch (error) {
      console.error('Error fetching claims summary:', error);
    }
  };

  const fetchCreditOptions = useCallback(async (searchTerm = ''): Promise<CreditOption[]> => {
    const requestId = ++creditFetchIdRef.current;
    setCreditLoading(true);
    try {
      const response = await api.get('/credits', {
        params: {
          limit: 20,
          ...(searchTerm ? { search: searchTerm } : {}),
        },
      });
      if (creditFetchIdRef.current === requestId) {
        const options: CreditOption[] = (response.data.data?.credits || [])
          .filter((credit: any) => credit?.Debtor)
          .map((credit: any) => ({
            id: credit.id,
            contract_number: credit.contract_number,
            Debtor: {
              id: credit.Debtor.id,
              debtor_code: credit.Debtor.debtor_code,
              full_name: credit.Debtor.full_name,
            },
          }));
        setCreditOptions(options);
        return options;
      }
      return [];
    } catch (error) {
      if (creditFetchIdRef.current === requestId) {
        console.error('Error fetching credit options:', error);
      }
      return [];
    } finally {
      if (creditFetchIdRef.current === requestId) {
        setCreditLoading(false);
      }
    }
  }, []);

  const scheduleCreditSearch = useCallback(
    (value: string) => {
      if (creditSearchTimeoutRef.current) {
        clearTimeout(creditSearchTimeoutRef.current);
      }
      creditSearchTimeoutRef.current = setTimeout(() => {
        fetchCreditOptions(value);
      }, 300);
    },
    [fetchCreditOptions]
  );

  const fetchInsurances = async () => {
    try {
      const response = await api.get('/insurances');
      if (response.data.success) {
        setInsurances(response.data.data.insurances);
      }
    } catch (error) {
      console.error('Error fetching insurances:', error);
    }
  };

  useEffect(() => {
    fetchClaims();
    fetchClaimsSummary();
    fetchCreditOptions('');
    fetchInsurances();
  }, [statusFilter, fetchCreditOptions]);

  useEffect(() => {
    return () => {
      if (creditSearchTimeoutRef.current) {
        clearTimeout(creditSearchTimeoutRef.current);
      }
    };
  }, []);

  const filteredClaims = claims?.filter(
    (claim) =>
      claim.claim_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.Debtor?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.Insurance?.insurance_company.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleOpenDialog = (claim?: InsuranceClaim) => {
    if (claim) {
      setSelectedClaim(claim);
      setFormData({
        claim_number: claim.claim_number,
        debtor_id: claim.debtor_id,
        insurance_id: claim.insurance_id,
        claim_type: claim.claim_type,
        claim_amount: claim.claim_amount.toString(),
        claim_date: claim.claim_date.split('T')[0],
        incident_date: claim.incident_date.split('T')[0],
        incident_description: claim.incident_description,
        notes: claim.notes || '',
      });
      if (claim.Debtor) {
        const currentDebtor = claim.Debtor;
        const baseLabel = `${currentDebtor.full_name} (${currentDebtor.debtor_code})`;
        setCreditSearchTerm(baseLabel);
        setSelectedCreditOption(null);
        fetchCreditOptions(currentDebtor.debtor_code || currentDebtor.full_name || '').then((options) => {
          const matched = options.find((option) => option.Debtor.id === claim.debtor_id);
          if (matched) {
            setSelectedCreditOption(matched);
            setCreditSearchTerm(`${matched.contract_number} - ${matched.Debtor.full_name}`);
          } else {
            setSelectedCreditOption({
              id: claim.debtor_id,
              contract_number: 'Kredit tidak ditemukan',
              Debtor: currentDebtor,
            });
          }
        });
      } else {
        setSelectedCreditOption(null);
        setCreditSearchTerm('');
      }
    } else {
      setSelectedClaim(null);
      setFormData({
        claim_number: '',
        debtor_id: '',
        insurance_id: '',
        claim_type: 'medical',
        claim_amount: '',
        claim_date: '',
        incident_date: '',
        incident_description: '',
        notes: '',
      });
      setSelectedCreditOption(null);
      setCreditSearchTerm('');
      fetchCreditOptions('');
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedClaim(null);
    setSelectedCreditOption(null);
    setCreditSearchTerm('');
  };

  const handleOpenStatusDialog = (claim: InsuranceClaim) => {
    setSelectedClaim(claim);
    setStatusFormData({
      claim_status: claim.claim_status,
      status_reason: claim.status_reason || '',
      settlement_amount: claim.settlement_amount?.toString() || '',
      settlement_date: claim.settlement_date?.split('T')[0] || '',
      payment_method: claim.payment_method || 'bank_transfer',
    });
    setOpenStatusDialog(true);
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (
      !formData.claim_number ||
      !formData.debtor_id ||
      !formData.insurance_id ||
      !formData.claim_amount ||
      !formData.claim_date ||
      !formData.incident_date ||
      !formData.incident_description
    ) {
      alert('Mohon lengkapi semua field yang bertanda bintang (*) / wajib diisi.');
      return;
    }

    try {
      const payload = {
        ...formData,
        claim_amount: Number(formData.claim_amount),
      };

      if (selectedClaim) {
        await api.put(`/insurance-claims/${selectedClaim.id}`, payload);
      } else {
        await api.post('/insurance-claims', payload);
      }

      fetchClaims();
      fetchClaimsSummary();
      handleCloseDialog();
    } catch (error: any) {
      console.error('Error saving claim:', error);
      const errorMessage = error.response?.data?.message || 'Terjadi kesalahan saat menyimpan klaim';
      const validationErrors = error.response?.data?.errors?.map((e: any) => e.msg).join(', ');
      alert(`${errorMessage}${validationErrors ? `: ${validationErrors}` : ''}`);
    }
  };

  const handleStatusUpdate = async () => {
    try {
      if (selectedClaim) {
        await api.put(`/insurance-claims/${selectedClaim.id}/status`, statusFormData);
        fetchClaims();
        fetchClaimsSummary();
        setOpenStatusDialog(false);
      }
    } catch (error) {
      console.error('Error updating claim status:', error);
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

  const getStatusChip = (status: string) => {
    const statusConfig = claimStatuses.find(s => s.value === status);
    return (
      <Chip
        label={statusConfig?.label || status}
        color={statusConfig?.color as any || 'default'}
        size="small"
      />
    );
  };

  const getClaimTypeLabel = (type: string) => {
    const claimType = claimTypes.find(ct => ct.value === type);
    return claimType ? claimType.label : type;
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Manajemen Klaim Asuransi
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <HourglassEmpty color="info" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h6">{claimsSummary.processing}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sedang Diproses
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircle color="success" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h6">{claimsSummary.approved}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Disetujui
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUp color="success" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h6">{claimsSummary.paid}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Berhasil Dibayar
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Cancel color="error" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h6">{claimsSummary.rejected}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ditolak
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
          <TextField
            placeholder="Cari berdasarkan nomor klaim, nama debitur, atau perusahaan asuransi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="">Semua Status</MenuItem>
              {claimStatuses.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  {status.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Tambah Klaim
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>No. Klaim</TableCell>
              <TableCell>Debitur</TableCell>
              <TableCell>Perusahaan Asuransi</TableCell>
              <TableCell>Jenis Klaim</TableCell>
              <TableCell>Nilai Klaim</TableCell>
              <TableCell>Tanggal Klaim</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredClaims.map((claim) => (
              <TableRow key={claim.id}>
                <TableCell>{claim.claim_number}</TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {claim.Debtor?.full_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {claim.Debtor?.debtor_code}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{claim.Insurance?.insurance_company}</TableCell>
                <TableCell>{getClaimTypeLabel(claim.claim_type)}</TableCell>
                <TableCell>{formatCurrency(claim.claim_amount)}</TableCell>
                <TableCell>{formatDate(claim.claim_date)}</TableCell>
                <TableCell>{getStatusChip(claim.claim_status)}</TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleOpenDialog(claim)}
                    title="Edit"
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="secondary"
                    onClick={() => handleOpenStatusDialog(claim)}
                    title="Update Status"
                  >
                    <Assignment />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Claim Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedClaim ? 'Edit Klaim Asuransi' : 'Tambah Klaim Asuransi Baru'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="claim_number"
                label="No. Klaim"
                value={formData.claim_number}
                onChange={(e) => setFormData({ ...formData, claim_number: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                sx={{ width: '100%' }}
                options={creditOptionList}
                getOptionLabel={(option) => `${option.contract_number} - ${option.Debtor.full_name}`}
                value={selectedCreditOption}
                onChange={(_, newValue) => {
                  setSelectedCreditOption(newValue);
                  setFormData((prev) => ({
                    ...prev,
                    debtor_id: newValue ? newValue.Debtor.id : '',
                  }));
                  setCreditSearchTerm(
                    newValue ? `${newValue.contract_number} - ${newValue.Debtor.full_name}` : ''
                  );
                }}
                inputValue={creditSearchTerm}
                onInputChange={(_, newInputValue, reason) => {
                  if (reason === 'reset') {
                    setCreditSearchTerm(newInputValue);
                    return;
                  }
                  setCreditSearchTerm(newInputValue);
                  const trimmed = newInputValue.trim();
                  if (reason === 'clear') {
                    scheduleCreditSearch('');
                    setFormData((prev) => ({ ...prev, debtor_id: '' }));
                    return;
                  }
                  if (trimmed.length === 0 || trimmed.length >= 2) {
                    scheduleCreditSearch(trimmed);
                  }
                }}
                onOpen={() => {
                  if (!creditOptions.length) {
                    fetchCreditOptions('');
                  }
                }}
                filterOptions={(options) => options}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                loading={creditLoading}
                noOptionsText={creditSearchTerm ? 'Kredit tidak ditemukan' : 'Ketik untuk mencari kredit'}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Kredit / Debitur"
                    required
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {creditLoading ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Asuransi</InputLabel>
                <Select
                  name="insurance_id"
                  value={formData.insurance_id}
                  onChange={(e) => setFormData({ ...formData, insurance_id: e.target.value })}
                  label="Asuransi"
                  required
                >
                  {insurances?.map((insurance) => (
                    <MenuItem key={insurance.id} value={insurance.id}>
                      {insurance.insurance_company} - {insurance.policy_number}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Jenis Klaim</InputLabel>
                <Select
                  name="claim_type"
                  value={formData.claim_type}
                  onChange={(e) => setFormData({ ...formData, claim_type: e.target.value })}
                  label="Jenis Klaim"
                >
                  {claimTypes.map((type) => (
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
                name="claim_amount"
                label="Nilai Klaim"
                type="number"
                value={formData.claim_amount}
                onChange={(e) => setFormData({ ...formData, claim_amount: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="claim_date"
                label="Tanggal Klaim"
                type="date"
                value={formData.claim_date}
                onChange={(e) => setFormData({ ...formData, claim_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="incident_date"
                label="Tanggal Kejadian"
                type="date"
                value={formData.incident_date}
                onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="incident_description"
                label="Deskripsi Kejadian"
                multiline
                rows={3}
                value={formData.incident_description}
                onChange={(e) => setFormData({ ...formData, incident_description: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="notes"
                label="Catatan"
                multiline
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Batal</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedClaim ? 'Update' : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={openStatusDialog} onClose={() => setOpenStatusDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Status Klaim</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status Klaim</InputLabel>
                <Select
                  name="claim_status"
                  value={statusFormData.claim_status}
                  onChange={(e) => setStatusFormData({ ...statusFormData, claim_status: e.target.value })}
                  label="Status Klaim"
                >
                  {claimStatuses.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="status_reason"
                label="Alasan/Keterangan"
                multiline
                rows={3}
                value={statusFormData.status_reason}
                onChange={(e) => setStatusFormData({ ...statusFormData, status_reason: e.target.value })}
              />
            </Grid>
            {statusFormData.claim_status === 'paid' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    name="settlement_amount"
                    label="Nilai Settlement"
                    type="number"
                    value={statusFormData.settlement_amount}
                    onChange={(e) => setStatusFormData({ ...statusFormData, settlement_amount: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    name="settlement_date"
                    label="Tanggal Settlement"
                    type="date"
                    value={statusFormData.settlement_date}
                    onChange={(e) => setStatusFormData({ ...statusFormData, settlement_date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Metode Pembayaran</InputLabel>
                    <Select
                      name="payment_method"
                      value={statusFormData.payment_method}
                      onChange={(e) => setStatusFormData({ ...statusFormData, payment_method: e.target.value })}
                      label="Metode Pembayaran"
                    >
                      {paymentMethods.map((method) => (
                        <MenuItem key={method.value} value={method.value}>
                          {method.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStatusDialog(false)}>Batal</Button>
          <Button onClick={handleStatusUpdate} variant="contained">
            Update Status
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InsuranceClaims;
