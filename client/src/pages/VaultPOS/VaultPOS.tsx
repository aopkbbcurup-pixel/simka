import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
  Stack,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  Paper,
  CircularProgress,
  Alert,
  List,
  ListItemButton,
  ListItemText,
  IconButton,
  MenuItem,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  AssignmentReturned,
  AssignmentTurnedIn,
} from '@mui/icons-material';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

interface Debtor {
  id: string;
  full_name: string;
  debtor_code: string;
}

interface CreditSummary {
  id: string;
  contract_number: string;
  account_number?: string;
  credit_type: string;
  plafond: number;
  outstanding: number;
  status: string;
  collectibility: string;
  Debtor: Debtor;
  Collaterals?: Array<{
    id: string;
    collateral_code: string;
    type: string;
    physical_location?: string | null;
  }>;
}

interface CollateralSearchResult {
  id: string;
  collateral_code: string;
  Credit?: CreditSummary;
}

interface CreditFileMovementLog {
  id: string;
  movement_type: 'OUT' | 'IN';
  movement_time: string;
  released_to?: string | null;
  responsible_officer?: string | null;
  expected_return_date?: string | null;
  received_by?: string | null;
  purpose?: string | null;
  notes?: string | null;
  Collateral?: {
    id: string;
    collateral_code: string;
    type: string;
  } | null;
  Document?: {
    id: string;
    document_name: string;
  } | null;
  creator?: {
    id: string;
    full_name: string;
    role: string;
  } | null;
}

const COLLATERAL_TYPE_LABELS: Record<string, string> = {
  SHM: 'SHM',
  SHGB: 'SHGB',
  SK: 'SK',
  'SK Berkala': 'SK Berkala',
  BPKB: 'BPKB',
  Deposito: 'Deposito',
  Emas: 'Emas',
  Lainnya: 'Lainnya',
};

const getStatusFromCollectibility = (collectibility: string | number | null | undefined): string => {
  if (collectibility === null || collectibility === undefined || collectibility === '') {
    return 'Tidak Diketahui';
  }
  const code = typeof collectibility === 'string' ? parseInt(collectibility, 10) : collectibility;
  switch (code) {
    case 1:
      return 'Lancar';
    case 2:
      return 'Dalam Perhatian Khusus';
    case 3:
      return 'Kurang Lancar';
    case 4:
      return 'Diragukan';
    case 5:
      return 'Macet';
    default:
      return 'Tidak Diketahui';
  }
};

const getStatusColor = (
  status: string
): 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary' => {
  switch (status) {
    case 'Lancar':
      return 'success';
    case 'Dalam Perhatian Khusus':
      return 'warning';
    case 'Kurang Lancar':
    case 'Diragukan':
    case 'Macet':
      return 'error';
    case 'Lunas':
      return 'info';
    default:
      return 'info';
  }
};

const VaultPOS: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<CreditSummary[]>([]);
  const [selectedCredit, setSelectedCredit] = useState<CreditSummary | null>(null);
  const [fileMovements, setFileMovements] = useState<CreditFileMovementLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [movementType, setMovementType] = useState<'OUT' | 'IN'>('OUT');
  const [form, setForm] = useState({
    released_to: '',
    responsible_officer: '',
    expected_return_date: '',
    received_by: '',
    purpose: '',
    notes: '',
    collateral_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [activeMovements, setActiveMovements] = useState<CreditFileMovementLog[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    fetchActiveMovements();
  }, []);

  const fetchActiveMovements = async () => {
    try {
      const response = await api.get('/credits/file-movements/active');
      if (response.data.success) {
        setActiveMovements(response.data.data.movements || []);
      }
    } catch (error) {
      console.error('Failed to fetch active movements:', error);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    setSearchResults([]);
    setSelectedCredit(null);
    setFileMovements([]);
    setMessage(null);

    try {
      const trimmed = searchTerm.trim();
      const creditResp = await api.get('/credits', {
        params: {
          search: trimmed,
          limit: 5,
        },
      });

      if (creditResp.data.success && creditResp.data.data?.credits?.length) {
        const credits: CreditSummary[] = creditResp.data.data.credits;
        setSearchResults(credits);
        if (credits.length === 1) {
          await handleSelectCredit(credits[0].id);
        }
      } else {
        const collateralResp = await api.get('/collaterals', {
          params: {
            search: trimmed,
            limit: 5,
          },
        });

        if (
          collateralResp.data.success &&
          collateralResp.data.data?.collaterals?.length
        ) {
          const collaterals: CollateralSearchResult[] = collateralResp.data.data.collaterals;
          const creditIds = Array.from(
            new Set(
              collaterals
                .map((item) => item.Credit?.id)
                .filter((id): id is string => Boolean(id))
            )
          );

          if (creditIds.length > 0) {
            const detailPromises = creditIds.map((id) => api.get(`/credits/${id}`));
            const detailResponses = await Promise.all(detailPromises);
            const credits = detailResponses
              .map((resp) => resp.data.data?.credit)
              .filter(Boolean) as CreditSummary[];
            setSearchResults(credits);
            if (credits.length === 1) {
              await handleSelectCredit(credits[0].id);
            }
          } else {
            setMessage({ type: 'info', text: 'Tidak ditemukan data kredit atau agunan untuk pencarian tersebut.' });
          }
        } else {
          setMessage({ type: 'info', text: 'Tidak ditemukan data kredit atau agunan untuk pencarian tersebut.' });
        }
      }
    } catch (error: any) {
      console.error('Vault POS search error:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Terjadi kesalahan saat mencari data. Coba lagi.',
      });
    } finally {
      setSearching(false);
    }
  };

  const fetchCreditDetail = async (creditId: string) => {
    const response = await api.get(`/credits/${creditId}`);
    if (response.data.success) {
      return response.data.data.credit as CreditSummary;
    }
    throw new Error(response.data.message || 'Gagal mengambil detail kredit');
  };

  const fetchHistory = async (creditId: string) => {
    setHistoryLoading(true);
    try {
      const response = await api.get(`/credits/${creditId}/file-movements`);
      if (response.data.success) {
        setFileMovements(response.data.data.movements || []);
      }
    } catch (error) {
      console.error('Vault POS history error:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelectCredit = async (creditId: string) => {
    setMessage(null);
    try {
      const credit = await fetchCreditDetail(creditId);
      setSelectedCredit(credit);
      setForm((prev) => ({
        ...prev,
        collateral_id: '',
        released_to: '',
        responsible_officer: '',
        expected_return_date: '',
        received_by: user?.full_name || '',
        purpose: '',
        notes: '',
      }));
      await fetchHistory(creditId);
    } catch (error: any) {
      console.error('Vault POS select credit error:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Gagal mengambil detail kredit',
      });
    }
  };

  const handleMovementSubmit = async () => {
    if (!selectedCredit) return;

    if (movementType === 'OUT') {
      if (!form.released_to.trim() || !form.responsible_officer.trim()) {
        setMessage({ type: 'error', text: 'Nama penerima dan penanggung jawab wajib diisi.' });
        return;
      }
    } else if (movementType === 'IN') {
      if (!form.received_by.trim()) {
        setMessage({ type: 'error', text: 'Nama penerima wajib diisi saat berkas masuk.' });
        return;
      }
    }

    setSaving(true);
    setMessage(null);
    try {
      const payload: Record<string, any> = {
        movement_type: movementType,
        purpose: form.purpose || undefined,
        notes: form.notes || undefined,
      };

      if (form.collateral_id) {
        payload.collateral_id = form.collateral_id;
      }

      if (movementType === 'OUT') {
        payload.released_to = form.released_to.trim();
        payload.responsible_officer = form.responsible_officer.trim();
        if (form.expected_return_date) {
          payload.expected_return_date = form.expected_return_date;
        }
      } else if (movementType === 'IN') {
        payload.received_by = form.received_by.trim();
      }

      const response = await api.post(`/credits/${selectedCredit.id}/file-movements`, payload);
      setMessage({ type: 'success', text: 'Pergerakan berkas berhasil dicatat.' });

      if (response.data?.data?.movement) {
        setFileMovements((prev) => [response.data.data.movement, ...prev]);
      }

      setForm({
        released_to: '',
        responsible_officer: '',
        expected_return_date: '',
        received_by: user?.full_name || '',
        purpose: '',
        notes: '',
        collateral_id: '',
      });
      await fetchHistory(selectedCredit.id);
      await fetchActiveMovements(); // Refresh global list
    } catch (error: any) {
      console.error('Vault POS submit movement error:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Gagal mencatat pergerakan berkas.',
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredHistory = useMemo(() => {
    if (!historyDateFilter) return fileMovements;
    return fileMovements.filter((movement) => {
      const movementDate = new Date(movement.movement_time).toISOString().slice(0, 10);
      return movementDate === historyDateFilter;
    });
  }, [fileMovements, historyDateFilter]);

  const renderCreditSummary = () => {
    if (!selectedCredit) {
      return (
        <Card variant="outlined" sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Cari dan pilih kredit atau agunan untuk mulai mencatat pergerakan.
          </Typography>
        </Card>
      );
    }

    return (
      <Card variant="outlined" sx={{ height: '100%' }}>
        <CardContent>
          <Stack spacing={1}>
            <Box>
              <Typography variant="h6">{selectedCredit.contract_number}</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedCredit.account_number || 'No. rekening tidak tersedia'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2">Debitur</Typography>
              <Typography variant="body1">{selectedCredit.Debtor?.full_name || '-'}</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedCredit.Debtor?.debtor_code || '-'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip label={selectedCredit.credit_type} color="primary" variant="outlined" />
              <Chip
                label={`Kolektibilitas: ${getStatusFromCollectibility(selectedCredit.collectibility)}`}
                color={getStatusColor(getStatusFromCollectibility(selectedCredit.collectibility))}
                variant="outlined"
              />
              {selectedCredit.status &&
                selectedCredit.status !== getStatusFromCollectibility(selectedCredit.collectibility) && (
                  <Chip label={`Status Sistem: ${selectedCredit.status}`} color="secondary" variant="outlined" />
                )}
            </Stack>
            <Box>
              <Typography variant="subtitle2">Nilai Kredit</Typography>
              <Typography variant="body2">Plafond: {formatCurrency(selectedCredit.plafond)}</Typography>
              <Typography variant="body2">Outstanding: {formatCurrency(selectedCredit.outstanding)}</Typography>
            </Box>
            <Divider />
            <Box>
              <Typography variant="subtitle2" gutterBottom>Agunan Terkait</Typography>
              {selectedCredit.Collaterals && selectedCredit.Collaterals.length > 0 ? (
                <Stack spacing={1}>
                  {selectedCredit.Collaterals.map((item) => (
                    <Paper key={item.id} variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {item.collateral_code} • {COLLATERAL_TYPE_LABELS[item.type] || item.type}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Lokasi: {item.physical_location || '-'}
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Tidak ada agunan terdata.
                </Typography>
              )}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            POS Brankas Berkas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Mode cepat untuk mencatat keluar-masuk berkas kredit berdasarkan data yang sudah ada.
          </Typography>
        </Box>
        <IconButton onClick={() => {
          if (selectedCredit) fetchHistory(selectedCredit.id);
          fetchActiveMovements();
        }}>
          <RefreshIcon />
        </IconButton>
      </Stack>

      {message && (
        <Alert
          severity={message.type}
          onClose={() => setMessage(null)}
          sx={{ mb: 2 }}
        >
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={2}>
              <TextField
                inputRef={inputRef}
                label="Cari No. Kontrak / Kode Agunan"
                placeholder="Scan atau ketik di sini"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      color="primary"
                      onClick={handleSearch}
                      disabled={searching}
                    >
                      {searching ? <CircularProgress size={20} /> : <SearchIcon />}
                    </IconButton>
                  ),
                }}
              />
              {searchResults.length > 0 && (
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Hasil Pencarian
                    </Typography>
                    <List dense>
                      {searchResults.map((result) => (
                        <ListItemButton
                          key={result.id}
                          selected={selectedCredit?.id === result.id}
                          onClick={() => handleSelectCredit(result.id)}
                        >
                          <ListItemText
                            primary={result.contract_number}
                            secondary={`${result.Debtor?.full_name || '-'} | ${result.credit_type} | Kolektibilitas: ${getStatusFromCollectibility(result.collectibility)}`}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              )}
              {renderCreditSummary()}
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">Form Pergerakan Berkas</Typography>
                <ToggleButtonGroup
                  color="primary"
                  exclusive
                  value={movementType}
                  onChange={(_, value) => value && setMovementType(value)}
                  fullWidth
                >
                  <ToggleButton value="OUT">
                    <AssignmentTurnedIn sx={{ mr: 1 }} fontSize="small" />
                    Keluar
                  </ToggleButton>
                  <ToggleButton value="IN">
                    <AssignmentReturned sx={{ mr: 1 }} fontSize="small" />
                    Masuk
                  </ToggleButton>
                </ToggleButtonGroup>

                <TextField
                  select
                  label="Agunan Terkait (opsional)"
                  value={form.collateral_id}
                  onChange={(e) => setForm({ ...form, collateral_id: e.target.value })}
                  disabled={!selectedCredit || !selectedCredit.Collaterals?.length}
                  helperText={!selectedCredit ? 'Pilih kredit terlebih dahulu' : 'Kosongkan jika berkas umum kredit'}
                >
                  <MenuItem value="">Berkas Kredit Umum</MenuItem>
                  {selectedCredit?.Collaterals?.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.collateral_code} ({COLLATERAL_TYPE_LABELS[item.type] || item.type})
                    </MenuItem>
                  ))}
                </TextField>

                {movementType === 'OUT' ? (
                  <>
                    <TextField
                      label="Diserahkan Kepada"
                      value={form.released_to}
                      onChange={(e) => setForm({ ...form, released_to: e.target.value })}
                      disabled={!selectedCredit}
                      required
                    />
                    <TextField
                      label="Penanggung Jawab"
                      value={form.responsible_officer}
                      onChange={(e) => setForm({ ...form, responsible_officer: e.target.value })}
                      disabled={!selectedCredit}
                      required
                    />
                    <TextField
                      label="Estimasi Tanggal Kembali"
                      type="date"
                      value={form.expected_return_date}
                      onChange={(e) => setForm({ ...form, expected_return_date: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                      disabled={!selectedCredit}
                    />
                  </>
                ) : (
                  <TextField
                    label="Diterima Oleh"
                    value={form.received_by}
                    onChange={(e) => setForm({ ...form, received_by: e.target.value })}
                    disabled={!selectedCredit}
                    required
                  />
                )}

                <TextField
                  label="Tujuan"
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  disabled={!selectedCredit}
                />
                <TextField
                  label="Catatan Tambahan"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  multiline
                  minRows={2}
                  disabled={!selectedCredit}
                />

                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleMovementSubmit}
                  disabled={!selectedCredit || saving}
                >
                  {saving ? 'Menyimpan...' : movementType === 'OUT' ? 'Catat Berkas Keluar' : 'Catat Berkas Masuk'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6">Berkas yang Sedang di Luar</Typography>
                {activeMovements.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Tidak ada berkas yang sedang di luar brankas.
                  </Typography>
                ) : (
                  <Stack spacing={1.5} sx={{ mt: 1, maxHeight: 300, overflowY: 'auto' }}>
                    {activeMovements.map((movement) => (
                      <Paper key={movement.id} variant="outlined" sx={{ p: 1.5 }}>
                        <Typography variant="subtitle2">
                          {movement.Collateral
                            ? `${movement.Collateral.collateral_code} (${COLLATERAL_TYPE_LABELS[movement.Collateral.type] || movement.Collateral.type})`
                            : 'Berkas Kredit Umum'}
                        </Typography>
                        <Typography variant="caption" display="block" color="primary">
                          {(movement as any).Credit?.contract_number} - {(movement as any).Credit?.Debtor?.full_name}
                        </Typography>
                        <Typography variant="body2">Dipinjam oleh {movement.released_to || '-'}</Typography>
                        {movement.expected_return_date && (
                          <Typography variant="caption" color="text.secondary">
                            Estimasi kembali: {formatDate(movement.expected_return_date)}
                          </Typography>
                        )}
                      </Paper>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">Riwayat Terbaru</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      size="small"
                      type="date"
                      label="Filter tanggal"
                      value={historyDateFilter}
                      onChange={(e) => setHistoryDateFilter(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      disabled={!selectedCredit}
                    />
                    <IconButton
                      size="small"
                      onClick={() => {
                        setHistoryDateFilter('');
                        selectedCredit && fetchHistory(selectedCredit.id);
                      }}
                      disabled={!selectedCredit || historyLoading}
                    >
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
                {historyLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress size={22} />
                  </Box>
                ) : filteredHistory.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {historyDateFilter
                      ? 'Tidak ada log pada tanggal tersebut.'
                      : 'Belum ada log pergerakan.'}
                  </Typography>
                ) : (
                  <Stack spacing={1.5} sx={{ mt: 1, maxHeight: 420, overflowY: 'auto', pr: 1 }}>
                    {filteredHistory.map((movement) => (
                      <Paper
                        key={movement.id}
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          borderColor: movement.movement_type === 'OUT' ? 'warning.light' : 'success.light',
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Typography
                            variant="subtitle2"
                            color={movement.movement_type === 'OUT' ? 'warning.main' : 'success.main'}
                          >
                            {movement.movement_type === 'OUT' ? 'Keluar' : 'Masuk'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDateTime(movement.movement_time)}
                          </Typography>
                        </Stack>
                        <Typography variant="body2">
                          {movement.movement_type === 'OUT'
                            ? `Diberikan kepada ${movement.released_to || '-'}`
                            : `Diterima oleh ${movement.received_by || '-'}`}
                        </Typography>
                        {movement.Collateral && (
                          <Typography variant="caption" color="text.secondary">
                            Agunan: {movement.Collateral.collateral_code}
                          </Typography>
                        )}
                        {movement.purpose && (
                          <Typography variant="caption" color="text.secondary">
                            Tujuan: {movement.purpose}
                          </Typography>
                        )}
                      </Paper>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default VaultPOS;
