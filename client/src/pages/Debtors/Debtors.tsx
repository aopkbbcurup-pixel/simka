import React, { useState, useEffect, useRef } from 'react';
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
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Snackbar,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  SelectChangeEvent,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  Visibility,
  Person,
  Phone,
  Email,
  Work,
  FirstPage,
  LastPage,
  NavigateBefore,
  NavigateNext,
} from '@mui/icons-material';
import { useQueryClient } from '@tanstack/react-query';
import { useDebtors, DEBTORS_QUERY_KEY, type DebtorsParams, type Debtor } from '../../hooks/queries/useDebtors';
import DebtorCardComponent from '../../components/Debtors/DebtorCard';
import DebtorSkeleton from '../../components/Debtors/DebtorSkeleton';
import DebtorsFilter from '../../components/Debtors/DebtorsFilter';
import ImportExportButtons from '../../components/ImportExportButtons';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

// Debtor interface imported from useDebtors.ts

const emptyForm = {
  debtor_code: '',
  full_name: '',
  ktp_number: '',
  birth_date: '',
  birth_place: '',
  gender: 'L',
  marital_status: 'single',
  address: '',
  city: '',
  province: '',
  postal_code: '',
  phone: '',
  mobile: '',
  email: '',
  occupation: '',
  company_name: '',
  company_address: '',
  monthly_income: '',
  spouse_name: '',
  spouse_ktp: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relation: '',
  notes: '',
};

const Debtors: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [maritalStatusFilter, setMaritalStatusFilter] = useState('');

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState<Debtor | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  // Snackbar states
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // React Query hook
  const { data, isLoading, error } = useDebtors({
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
  });

  const debtors = data?.debtors || [];
  const totalPages = data?.pagination?.total_pages || 1;
  const totalRecords = data?.pagination?.total_records || 0;

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // fetchDebtors removed - handled by React Query

  // Debounced search is automatic via React Query
  // When searchTerm changes, React Query refetches with new params

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  // Use server-side data directly
  const filteredDebtors = debtors;

  const handleOpenDialog = async (debtor?: Debtor, viewMode = false) => {
    setIsViewMode(viewMode);
    if (debtor) {
      try {
        const response = await api.get(`/debtors/${debtor.id}`);
        if (response.data.success) {
          const fullDebtor = response.data.data.debtor;
          setSelectedDebtor(fullDebtor);
          const sanitizedDebtor = Object.entries(fullDebtor).reduce((acc, [key, value]) => {
            if (key === 'birth_date' && value) {
              acc[key] = (value as string).split('T')[0];
            } else {
              acc[key] = value === null || value === undefined ? '' : String(value);
            }
            return acc;
          }, {} as any);
          setFormData({ ...emptyForm, ...sanitizedDebtor });
        }
      } catch (error) {
        console.error("Failed to fetch debtor details", error);
      }
    } else {
      setSelectedDebtor(null);
      setFormData(emptyForm);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedDebtor(null);
    setIsViewMode(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    if (!user) {
      console.error("User not found, cannot save debtor.");
      return;
    }
    const payload = {
      ...formData,
      monthly_income: formData.monthly_income ? Number(formData.monthly_income) : null,
      birth_date: formData.birth_date || null
    };
    try {
      if (selectedDebtor) {
        await api.put(`/debtors/${selectedDebtor.id}`, payload);
        showSnackbar('Debitur berhasil diperbarui', 'success');
      } else {
        await api.post('/debtors', { ...payload, created_by: user.id });
        showSnackbar('Debitur berhasil dibuat', 'success');
      }
      queryClient.invalidateQueries({ queryKey: [DEBTORS_QUERY_KEY] });
      handleCloseDialog();
    } catch (error: any) {
      console.error('Error saving debtor:', error.response?.data || error.message);
      const serverErrors = error.response?.data?.errors;
      let alertMessage = error.response?.data?.message || 'Terjadi kesalahan yang tidak diketahui.';

      if (serverErrors && Array.isArray(serverErrors) && serverErrors.length > 0) {
        alertMessage = serverErrors.map((err: any) => err.msg).join('\n');
      }

      alert(`Gagal menyimpan data:\n${alertMessage}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data debitur ini?')) {
      try {
        await api.delete(`/debtors/${id}`);
        queryClient.invalidateQueries({ queryKey: [DEBTORS_QUERY_KEY] });
        showSnackbar('Debitur berhasil dihapus', 'success');
      } catch (error: any) {
        console.error('Error deleting debtor:', error);
        alert(`Gagal menghapus data: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Manajemen Debitur
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <ImportExportButtons
            onImportComplete={() => queryClient.invalidateQueries({ queryKey: [DEBTORS_QUERY_KEY] })}
            onImportSuccess={(result) => showSnackbar(`Import selesai: ${result.success} berhasil, ${result.failed} gagal`, result.failed ? 'warning' : 'success')}
            onExportSuccess={(filename) => showSnackbar(`Berhasil mengekspor ${filename}`, 'success')}
            onTemplateSuccess={() => showSnackbar('Template berhasil diunduh', 'info')}
          />
          {(user?.role === 'admin' || user?.role === 'analyst') && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
            >
              Tambah Debitur
            </Button>
          )}
        </Box>
      </Box>

      {/* Filter Component */}
      <DebtorsFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        genderFilter={genderFilter}
        onGenderChange={setGenderFilter}
        maritalStatusFilter={maritalStatusFilter}
        onMaritalStatusChange={setMaritalStatusFilter}
        onClearFilters={() => {
          setSearchTerm('');
          setGenderFilter('');
          setMaritalStatusFilter('');
        }}
      />

      {/* Card Grid for Screen */}
      {isLoading ? (
        <Grid container spacing={2}>
          {[...Array(12)].map((_, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              <DebtorSkeleton />
            </Grid>
          ))}
        </Grid>
      ) : error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          Gagal memuat data debitur. Silakan refresh halaman.
        </Alert>
      ) : debtors.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          Tidak ada data debitur yang ditemukan.
        </Alert>
      ) : (
        <>
          {/* Card Grid */}
          <Grid container spacing={2} sx={{ '@media print': { display: 'none' } }}>
            {debtors.map((debtor) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={debtor.id}>
                <DebtorCardComponent
                  debtor={debtor}
                  onView={() => handleOpenDialog(debtor, true)}
                  onEdit={
                    user?.role === 'admin' || user?.role === 'analyst'
                      ? () => handleOpenDialog(debtor)
                      : undefined
                  }
                  onDelete={
                    user?.role === 'admin'
                      ? () => handleDelete(debtor.id)
                      : undefined
                  }
                  canEdit={user?.role === 'admin' || user?.role === 'analyst'}
                  canDelete={user?.role === 'admin'}
                />
              </Grid>
            ))}
          </Grid>

          {/* Table for Print */}
          <TableContainer component={Paper} sx={{ display: 'none', '@media print': { display: 'block' } }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Kode Debitur</TableCell>
                  <TableCell>Nama Lengkap</TableCell>
                  <TableCell>KTP</TableCell>
                  <TableCell>Kontak</TableCell>
                  <TableCell>Pekerjaan</TableCell>
                  <TableCell>Kota</TableCell>
                  <TableCell>Tanggal Dibuat</TableCell>
                  <TableCell>Aksi</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {debtors.map((debtor) => (
                  <TableRow key={debtor.id} hover>
                    <TableCell>
                      <Chip label={debtor.debtor_code} color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Person sx={{ mr: 1, color: 'text.secondary' }} />
                        {debtor.full_name}
                      </Box>
                    </TableCell>
                    <TableCell>{debtor.ktp_number}</TableCell>
                    <TableCell>
                      <Box>
                        {debtor.phone && (
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <Phone sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                            <Typography variant="body2">{debtor.phone}</Typography>
                          </Box>
                        )}
                        {debtor.email && (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Email sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                            <Typography variant="body2">{debtor.email}</Typography>
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Work sx={{ mr: 1, color: 'text.secondary' }} />
                        {debtor.occupation || '-'}
                      </Box>
                    </TableCell>
                    <TableCell>{debtor.city || '-'}</TableCell>
                    <TableCell>{formatDate(debtor.created_at)}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        title="Lihat Detail"
                        onClick={() => handleOpenDialog(debtor, true)}
                      >
                        <Visibility />
                      </IconButton>
                      {(user?.role === 'admin' || user?.role === 'analyst') && (
                        <>
                          <IconButton
                            size="small"
                            title="Edit"
                            onClick={() => handleOpenDialog(debtor)}
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            title="Hapus"
                            onClick={() => handleDelete(debtor.id)}
                          >
                            <Delete />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Pagination Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Menampilkan {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalRecords)} dari {totalRecords} debitur
          {searchTerm && (
            <span style={{ fontWeight: 'bold', color: '#1976d2' }}>
              {' '}(hasil pencarian global)
            </span>
          )}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            size="small"
          >
            <FirstPage />
          </IconButton>
          <IconButton
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            size="small"
          >
            <NavigateBefore />
          </IconButton>

          <Typography variant="body2" sx={{ mx: 2 }}>
            Halaman {currentPage} dari {totalPages}
          </Typography>

          <IconButton
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            size="small"
          >
            <NavigateNext />
          </IconButton>
          <IconButton
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            size="small"
          >
            <LastPage />
          </IconButton>

          <FormControl size="small" sx={{ ml: 2, minWidth: 80 }}>
            <InputLabel>Per Halaman</InputLabel>
            <Select
              value={pageSize}
              label="Per Halaman"
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            >
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
              <MenuItem value={200}>200</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {isViewMode ? 'Detail Debitur' : (selectedDebtor ? 'Edit Debitur' : 'Tambah Debitur Baru')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth label="Kode Debitur" name="debtor_code" value={formData.debtor_code} onChange={handleInputChange} required disabled={isViewMode} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth label="Nama Lengkap" name="full_name" value={formData.full_name} onChange={handleInputChange} required disabled={isViewMode} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth label="Nomor KTP" name="ktp_number" value={formData.ktp_number} onChange={handleInputChange} required inputProps={{ maxLength: 16 }} disabled={isViewMode} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth label="Tempat Lahir" name="birth_place" value={formData.birth_place} onChange={handleInputChange} disabled={isViewMode} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth label="Tanggal Lahir" name="birth_date" type="date" value={formData.birth_date} onChange={handleInputChange} InputLabelProps={{ shrink: true }} disabled={isViewMode} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth disabled={isViewMode}>
                <InputLabel>Jenis Kelamin</InputLabel>
                <Select name="gender" value={formData.gender} label="Jenis Kelamin" onChange={handleInputChange}>
                  <MenuItem value="L">Laki-laki</MenuItem>
                  <MenuItem value="P">Perempuan</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth disabled={isViewMode}>
                <InputLabel>Status Pernikahan</InputLabel>
                <Select name="marital_status" value={formData.marital_status} label="Status Pernikahan" onChange={handleInputChange}>
                  <MenuItem value="single">Belum Menikah</MenuItem>
                  <MenuItem value="married">Menikah</MenuItem>
                  <MenuItem value="divorced">Cerai</MenuItem>
                  <MenuItem value="widowed">Janda/Duda</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={8}>
              <TextField fullWidth label="Alamat" name="address" value={formData.address} onChange={handleInputChange} multiline rows={2} disabled={isViewMode} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth label="Kota" name="city" value={formData.city} onChange={handleInputChange} disabled={isViewMode} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth label="Provinsi" name="province" value={formData.province} onChange={handleInputChange} disabled={isViewMode} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth label="Kode Pos" name="postal_code" value={formData.postal_code} onChange={handleInputChange} disabled={isViewMode} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth label="Nomor Telepon" name="phone" value={formData.phone} onChange={handleInputChange} disabled={isViewMode} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth label="Nomor HP" name="mobile" value={formData.mobile} onChange={handleInputChange} disabled={isViewMode} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth label="Email" name="email" type="email" value={formData.email} onChange={handleInputChange} disabled={isViewMode} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth label="Pekerjaan" name="occupation" value={formData.occupation} onChange={handleInputChange} disabled={isViewMode} />
            </Grid>
            <Grid item xs={12} sm={6} md={8}>
              <TextField fullWidth label="Nama Perusahaan" name="company_name" value={formData.company_name} onChange={handleInputChange} disabled={isViewMode} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth label="Penghasilan Bulanan" name="monthly_income" type="number" value={formData.monthly_income} onChange={handleInputChange} disabled={isViewMode} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Catatan" name="notes" multiline rows={3} value={formData.notes} onChange={handleInputChange} disabled={isViewMode} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Batal</Button>
          {!isViewMode && (
            <Button onClick={handleSubmit} variant="contained">
              {selectedDebtor ? 'Update' : 'Simpan'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box >
  );
};

export default Debtors;
