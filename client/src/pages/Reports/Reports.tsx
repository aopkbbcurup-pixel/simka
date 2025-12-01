import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  GetApp,
  Assessment,
  Schedule,
  Warning,
  Description,
  TrendingUp,
  Assignment,
  History,
  Print,
} from '@mui/icons-material';
import api from '../../utils/api';
import { API_BASE_URL } from '../../config/apiConfig';
import ImportExportButtons from '../../components/ImportExportButtons';

const Reports: React.FC = () => {
  const [reportType, setReportType] = useState('');
  const [dateRange, setDateRange] = useState('90');
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const reportRef = useRef<HTMLDivElement>(null);

  const reportTypes = [
    { value: 'insurance-expiry', endpoint: 'insurance-expiry', label: 'Laporan Asuransi Akan Berakhir', icon: <Warning />, dateMode: 'days' },
    { value: 'tax-due', endpoint: 'tax-due', label: 'Laporan Pajak Jatuh Tempo', icon: <Schedule />, dateMode: 'days' },
    { value: 'credit-maturity', endpoint: 'credit-maturity', label: 'Laporan Kredit Jatuh Tempo', icon: <TrendingUp />, dateMode: 'days' },
    { value: 'document-status', endpoint: 'document-status', label: 'Laporan Status Dokumen', icon: <Description />, dateMode: 'none' },
    { value: 'unpaid-claims', endpoint: 'unpaid-claims', label: 'Laporan Klaim Belum Dibayar', icon: <Assignment />, dateMode: 'none' },
    { value: 'file-movements-out', endpoint: 'file-movements', label: 'Laporan Pergerakan Berkas Keluar', icon: <History />, dateMode: 'range', movementType: 'OUT' },
    { value: 'file-movements-in', endpoint: 'file-movements', label: 'Laporan Pergerakan Berkas Masuk', icon: <History />, dateMode: 'range', movementType: 'IN' },
  ];

  const selectedReport = reportTypes.find(r => r.value === reportType);

  useEffect(() => {
    if (selectedReport?.dateMode === 'range') {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 7);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    }
  }, [reportType]);

  const generateReport = async () => {
    if (!reportType) return;
    setLoading(true);
    setError('');
    setReportData([]);

    try {
      if (selectedReport?.dateMode === 'range') {
        if (!startDate || !endDate) {
          setError('Tanggal mulai dan akhir wajib diisi.');
          setLoading(false);
          return;
        }
        if (new Date(startDate) > new Date(endDate)) {
          setError('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.');
          setLoading(false);
          return;
        }
      }

      const params: Record<string, string> = {};
      if (selectedReport?.dateMode === 'days') {
        params.days = dateRange;
      } else if (selectedReport?.dateMode === 'range') {
        params.start_date = startDate;
        params.end_date = endDate;
      }

      if (selectedReport?.movementType) {
        params.movement_type = selectedReport.movementType;
      }

      const response = await api.get(`/reports/${selectedReport?.endpoint || reportType}`, {
        params,
      });
      if (response.data.success) {
        const data = response.data.data;
        // The data key can be 'collaterals', 'credits', or 'claims'
        const key = Object.keys(data).find(k => Array.isArray(data[k]));
        setReportData(key ? data[key] : []);
      } else {
        setError(response.data.message || 'Gagal mengambil data laporan.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Terjadi kesalahan saat membuat laporan.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!reportType) return;
    if (selectedReport?.dateMode === 'range') {
      if (!startDate || !endDate) {
        setError('Tanggal mulai dan akhir wajib diisi sebelum mengunduh laporan.');
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        setError('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.');
        return;
      }
    }

    const token = localStorage.getItem('token');

    const params = new URLSearchParams();
    params.set('format', 'csv');
    if (selectedReport?.dateMode === 'days') {
      params.set('days', dateRange);
    } else if (selectedReport?.dateMode === 'range') {
      params.set('start_date', startDate);
      params.set('end_date', endDate);
    }
    if (selectedReport?.movementType) {
      params.set('movement_type', selectedReport.movementType);
    }
    
    // Use fetch to handle downloads that require auth headers
    fetch(`${API_BASE_URL}/reports/${selectedReport?.endpoint || reportType}?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok.');
      }
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laporan-${reportType}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    })
    .catch(err => {
      console.error('Download error:', err);
      setError('Gagal mengunduh laporan. Pastikan Anda telah generate laporan terlebih dahulu.');
    });
  };

  const printReport = () => {
    if (!reportType || loading || reportData.length === 0 || !reportRef.current) return;
    const printContent = reportRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=900,height=650');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan ${reportTypes.find(r => r.value === reportType)?.label || ''}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #999; padding: 6px 10px; font-size: 12px; }
            th { background: #f1f1f1; }
            h2 { margin-top: 0; }
          </style>
        </head>
        <body>
          <h2>${reportTypes.find(r => r.value === reportType)?.label || ''}</h2>
          <div>Generated: ${new Date().toLocaleString('id-ID')}</div>
          ${selectedReport?.dateMode === 'range' ? `<div>Periode: ${formatDate(startDate)} s/d ${formatDate(endDate)}</div>` : ''}
          <div style="margin:16px 0;">Data: ${reportData.length} baris</div>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onafterprint = () => printWindow.close();
    printWindow.print();
  };

  const formatCurrency = (amount: number) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  const renderReportTable = () => {
    if (!reportData.length) return null;

    switch (reportType) {
      case 'insurance-expiry':
        return (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nama Debitur</TableCell>
                  <TableCell>No. Kontrak</TableCell>
                  <TableCell>Kode Agunan</TableCell>
                  <TableCell>Tanggal Berakhir</TableCell>
                  <TableCell>Hari Tersisa</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.debtor_name}</TableCell>
                    <TableCell>{row.contract_number}</TableCell>
                    <TableCell>{row.collateral_code}</TableCell>
                    <TableCell>{formatDate(row.insurance_end_date)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={`${row.days_until_expiry} hari`}
                        color={row.days_until_expiry <= 30 ? 'error' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        );
      case 'file-movements-out':
      case 'file-movements-in':
        return (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Tanggal</TableCell>
                  <TableCell>Jenis</TableCell>
                  <TableCell>Waktu</TableCell>
                  <TableCell>No. Kontrak</TableCell>
                  <TableCell>Nama Debitur</TableCell>
                  <TableCell>Kode Agunan</TableCell>
                  <TableCell>Penanggung Jawab</TableCell>
                  <TableCell>Diberikan Kepada</TableCell>
                  <TableCell>Diterima Oleh</TableCell>
                  <TableCell>Tgl Estimasi Kembali</TableCell>
                  <TableCell>Tujuan</TableCell>
                  <TableCell>Catatan</TableCell>
                </TableRow>
              </TableHead>
                <TableBody>
                  {reportData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{formatDate(row.movement_date)}</TableCell>
                      <TableCell>
                        <Chip
                          label={row.movement_type === 'IN' ? 'Masuk' : 'Keluar'}
                          color={row.movement_type === 'IN' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{row.movement_time}</TableCell>
                      <TableCell>{row.contract_number}</TableCell>
                      <TableCell>{row.debtor_name}</TableCell>
                      <TableCell>{row.collateral_code}</TableCell>
                      <TableCell>{row.responsible_officer}</TableCell>
                    <TableCell>{row.released_to}</TableCell>
                    <TableCell>{row.received_by}</TableCell>
                    <TableCell>{row.expected_return_date ? formatDate(row.expected_return_date) : '-'}</TableCell>
                    <TableCell>{row.purpose}</TableCell>
                    <TableCell>{row.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        );
      case 'unpaid-claims':
        return (
            <TableContainer component={Paper}>
            <Table size="small">
                <TableHead>
                <TableRow>
                    <TableCell>No. Klaim</TableCell>
                    <TableCell>Nama Debitur</TableCell>
                    <TableCell>No. Polis</TableCell>
                    <TableCell>Tgl. Klaim</TableCell>
                    <TableCell>Jumlah</TableCell>
                    <TableCell>Status</TableCell>
                </TableRow>
                </TableHead>
                <TableBody>
                {reportData.map((row, index) => (
                    <TableRow key={index}>
                    <TableCell>{row.claim_number}</TableCell>
                    <TableCell>{row.debtor_name}</TableCell>
                    <TableCell>{row.policy_number}</TableCell>
                    <TableCell>{formatDate(row.claim_date)}</TableCell>
                    <TableCell>{formatCurrency(row.claim_amount)}</TableCell>
                    <TableCell>
                        <Chip label={row.claim_status} size="small" />
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            </TableContainer>
        );
      default:
        // A generic table for other reports
        const headers = reportData.length > 0 ? Object.keys(reportData[0]) : [];
        return (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {headers.map(header => <TableCell key={header}>{header.replace(/_/g, ' ').toUpperCase()}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.map((row, index) => (
                  <TableRow key={index}>
                    {headers.map(header => <TableCell key={header}>{row[header]}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        );
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Laporan & Analisis
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Assessment sx={{ mr: 1 }} />
                Konfigurasi Laporan
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Jenis Laporan</InputLabel>
                <Select
                  value={reportType}
                  label="Jenis Laporan"
                  onChange={(e) => setReportType(e.target.value)}
                >
                  {reportTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {type.icon}
                        <Typography sx={{ ml: 1 }}>{type.label}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedReport?.dateMode === 'days' && (
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Periode</InputLabel>
                  <Select
                    value={dateRange}
                    label="Periode"
                    onChange={(e) => setDateRange(e.target.value)}
                  >
                    <MenuItem value="30">30 Hari ke Depan</MenuItem>
                    <MenuItem value="60">60 Hari ke Depan</MenuItem>
                    <MenuItem value="90">90 Hari ke Depan</MenuItem>
                  </Select>
                </FormControl>
              )}

              {selectedReport?.dateMode === 'range' && (
                <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Tanggal Mulai"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="Tanggal Akhir"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
              )}

              <Button
                fullWidth
                variant="contained"
                onClick={generateReport}
                disabled={!reportType || loading}
                sx={{ mb: 1 }}
              >
                {loading ? 'Membuat Laporan...' : 'Generate Laporan'}
              </Button>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<GetApp />}
                onClick={downloadReport}
                disabled={!reportType || loading}
              >
                Download CSV
              </Button>
              <Button
                fullWidth
                sx={{ mt: 1 }}
                variant="outlined"
                startIcon={<Print />}
                onClick={printReport}
                disabled={!reportType || loading || reportData.length === 0}
              >
                Cetak Laporan
              </Button>
            </CardContent>
          </Card>
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Ekspor Cepat
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<GetApp />}
                onClick={async () => {
                  try {
                    const resp = await api.get('/payments/export', { responseType: 'blob' });
                    const url = window.URL.createObjectURL(new Blob([resp.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `data-pembayaran-${new Date().toISOString().split('T')[0]}.xlsx`);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(url);
                  } catch (e) {
                    console.error('Export payments error:', e);
                    alert('Gagal mengekspor data pembayaran.');
                  }
                }}
              >
                Export Pembayaran (Semua)
              </Button>
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Import Pembayaran
                </Typography>
                <ImportExportButtons
                  exportPath="/payments/export"
                  templatePath="/payments/template"
                  importPath="/payments/import"
                  templateFilename="template-pembayaran.xlsx"
                  dialogTitle="Import Data Pembayaran"
                  errorPrimaryBuilder={(e) => `Baris ${e.row}: ${e.error}`}
                  errorSecondaryBuilder={(data) => (
                    <>
                      <strong>Data:</strong> {data['No. Kontrak'] || 'N/A'} - {data['Tanggal'] || 'N/A'}
                    </>
                  )}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Hasil Laporan
              </Typography>
              
              {loading && <CircularProgress />}
              
              {error && <Alert severity="error">{error}</Alert>}

              {!loading && !error && reportData.length === 0 && (
                <Alert severity="info">
                  Pilih jenis laporan dan klik "Generate Laporan" untuk melihat hasil.
                </Alert>
              )}

              {reportData.length > 0 && (
                <Box ref={reportRef}>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Laporan berhasil dibuat dengan {reportData.length} data.
                  </Alert>
                  {renderReportTable()}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Reports;
