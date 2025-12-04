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

    const reportTitle = reportTypes.find(r => r.value === reportType)?.label || '';
    const currentDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    printWindow.document.write(`
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body { 
              font-family: 'Times New Roman', Times, serif; 
              margin: 40px; 
              color: #000;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px double #000;
              padding-bottom: 10px;
            }
            .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
            .header h2 { margin: 5px 0; font-size: 16px; font-weight: normal; }
            .header p { margin: 0; font-size: 12px; font-style: italic; }
            
            .report-info {
              margin-bottom: 20px;
            }
            .report-info table { width: auto; border: none; }
            .report-info td { border: none; padding: 2px 10px 2px 0; font-weight: bold; }
            .report-info td:last-child { font-weight: normal; }

            table.data-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 30px;
            }
            table.data-table th, table.data-table td { 
              border: 1px solid #000; 
              padding: 8px; 
              font-size: 12px; 
              text-align: left;
            }
            table.data-table th { 
              background-color: #f0f0f0; 
              font-weight: bold; 
              text-align: center;
            }
            
            .footer {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
              page-break-inside: avoid;
            }
            .signature-box {
              text-align: center;
              width: 200px;
            }
            .signature-line {
              margin-top: 60px;
              border-top: 1px solid #000;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PT. BANK SIMKA INDONESIA</h1>
            <h2>Sistem Informasi Manajemen Kredit & Agunan</h2>
            <p>Jl. Jend. Sudirman No. 123, Jakarta Pusat - Indonesia</p>
          </div>

          <div class="report-info">
            <table>
              <tr>
                <td>Laporan:</td>
                <td>${reportTitle}</td>
              </tr>
              <tr>
                <td>Tanggal Cetak:</td>
                <td>${currentDate}</td>
              </tr>
              ${selectedReport?.dateMode === 'range' ? `
              <tr>
                <td>Periode:</td>
                <td>${formatDate(startDate)} s/d ${formatDate(endDate)}</td>
              </tr>` : ''}
              <tr>
                <td>Total Data:</td>
                <td>${reportData.length} Baris</td>
              </tr>
            </table>
          </div>

          ${printContent}

          <div class="footer">
            <div class="signature-box">
              <p>Dibuat Oleh,</p>
              <div class="signature-line">Staff Admin</div>
            </div>
            <div class="signature-box">
              <p>Disetujui Oleh,</p>
              <div class="signature-line">Kepala Cabang</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    // Small delay to ensure styles are loaded
    setTimeout(() => {
      printWindow.print();
      // printWindow.close(); // Optional: close after print
    }, 500);
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

    // Helper to render table content
    const renderContent = () => {
      switch (reportType) {
        case 'insurance-expiry':
          return (
            <>
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
                        variant="outlined" // Use outlined for better print contrast
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          );
        case 'file-movements-out':
        case 'file-movements-in':
          return (
            <>
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
                        variant="outlined"
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
            </>
          );
        case 'unpaid-claims':
          return (
            <>
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
                      <Chip label={row.claim_status} size="small" variant="outlined" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          );
        default:
          const headers = reportData.length > 0 ? Object.keys(reportData[0]) : [];
          return (
            <>
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
            </>
          );
      }
    };

    // Use a specific class for the print table
    return (
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
        <Table size="small" className="data-table">
          {renderContent()}
        </Table>
      </TableContainer>
    );
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
                <Box>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Laporan berhasil dibuat dengan {reportData.length} data.
                  </Alert>
                  <Box ref={reportRef}>
                    {renderReportTable()}
                  </Box>
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
