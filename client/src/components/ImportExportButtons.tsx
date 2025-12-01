import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
} from '@mui/material';
import {
  Upload,
  Download,
  GetApp,
  CloudUpload,
} from '@mui/icons-material';
import api from '../utils/api';

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    data: any;
    error: string;
  }>;
}

interface ImportExportButtonsProps {
  onImportComplete?: () => void;
  exportPath?: string; // e.g., '/debtors/export'
  templatePath?: string; // e.g., '/debtors/template'
  importPath?: string; // e.g., '/debtors/import'
  templateFilename?: string; // download filename
  dialogTitle?: string; // e.g., 'Import Data Debitur'
  errorPrimaryBuilder?: (error: { row: number; error: string }) => React.ReactNode;
  errorSecondaryBuilder?: (data: any) => React.ReactNode;
  onExportSuccess?: (filename?: string) => void;
  onTemplateSuccess?: (filename?: string) => void;
  onImportSuccess?: (result: ImportResult) => void;
}

const ImportExportButtons: React.FC<ImportExportButtonsProps> = ({
  onImportComplete,
  exportPath = '/debtors/export',
  templatePath = '/debtors/template',
  importPath = '/debtors/import',
  templateFilename = 'template-data-debitur.xlsx',
  dialogTitle = 'Import Data Debitur',
  errorPrimaryBuilder,
  errorSecondaryBuilder,
  onExportSuccess,
  onTemplateSuccess,
  onImportSuccess,
}) => {
  const [importDialog, setImportDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await api.get(exportPath, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // Get filename from response headers or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = exportPath.includes('credit') ? 'data-kredit.xlsx' : 'data-debitur.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      if (onExportSuccess) onExportSuccess(filename);
    } catch (error) {
      console.error('Export error:', error);
      alert('Gagal mengekspor data. Silakan coba lagi.');
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get(templatePath, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', templateFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      if (onTemplateSuccess) onTemplateSuccess(templateFilename);
    } catch (error) {
      console.error('Template download error:', error);
      alert('Gagal mengunduh template. Silakan coba lagi.');
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Hanya file Excel (.xlsx, .xls) yang diperbolehkan');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Ukuran file tidak boleh lebih dari 10MB');
      return;
    }

    try {
      setUploading(true);
      setImportResult(null);

      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(importPath, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutes for large imports
      });

      setImportResult(response.data.data);
      if (onImportSuccess) onImportSuccess(response.data.data);
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (error: any) {
      console.error('Import error:', error);
      const errorMessage = error.response?.data?.message || 'Gagal mengimpor data';
      alert(errorMessage);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCloseImportDialog = () => {
    setImportDialog(false);
    setImportResult(null);
  };

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          startIcon={<Download />}
          onClick={handleDownloadTemplate}
          size="small"
        >
          Template Excel
        </Button>

        <Button
          variant="outlined"
          startIcon={<Upload />}
          onClick={() => setImportDialog(true)}
          size="small"
        >
          Import Excel
        </Button>

        <Button
          variant="contained"
          startIcon={<GetApp />}
          onClick={handleExport}
          disabled={exporting}
          size="small"
        >
          {exporting ? 'Mengekspor...' : 'Export Excel'}
        </Button>
      </Box>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
      />

      {/* Import Dialog */}
      <Dialog
        open={importDialog}
        onClose={handleCloseImportDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          {!importResult && !uploading && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CloudUpload sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Pilih File Excel untuk Diimpor
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Format yang didukung: .xlsx, .xls (maksimal 10MB)
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={handleDownloadTemplate}
                  startIcon={<Download />}
                >
                  Download Template
                </Button>
                <Button
                  variant="contained"
                  onClick={handleFileSelect}
                  startIcon={<Upload />}
                >
                  Pilih File
                </Button>
              </Box>
            </Box>
          )}

          {uploading && (
            <Box sx={{ py: 3 }}>
              <Typography variant="h6" align="center" gutterBottom>
                Mengimpor Data...
              </Typography>
              <LinearProgress sx={{ mb: 2 }} />
              <Typography variant="body2" align="center" color="text.secondary">
                Mohon tunggu, sedang memproses file Excel Anda
              </Typography>
              <Typography variant="caption" align="center" display="block" sx={{ mt: 1 }} color="text.secondary">
                Proses ini mungkin memakan waktu beberapa menit untuk file besar
              </Typography>
              <Typography variant="caption" align="center" display="block" sx={{ mt: 0.5 }} color="primary.main">
                💡 Tip: Jangan tutup browser selama proses import
              </Typography>
            </Box>
          )}

          {importResult && (
            <Box sx={{ py: 2 }}>
              <Alert
                severity={importResult.failed === 0 ? 'success' : 'warning'}
                sx={{ mb: 2 }}
              >
                Import selesai: {importResult.success} berhasil, {importResult.failed} gagal
              </Alert>

              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Chip
                  label={`${importResult.success} Berhasil`}
                  color="success"
                  variant="outlined"
                />
                <Chip
                  label={`${importResult.failed} Gagal`}
                  color="error"
                  variant="outlined"
                />
              </Box>

              {importResult.errors.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Detail Error:
                  </Typography>
                  <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {importResult.errors.map((error, index) => (
                      <ListItem key={index} divider>
                        <ListItemText
                          primary={errorPrimaryBuilder ? errorPrimaryBuilder(error) : `Baris ${error.row}: ${error.error}`}
                          secondary={
                            <Box component="span">
                              {errorSecondaryBuilder ? (
                                errorSecondaryBuilder(error.data)
                              ) : (
                                <>
                                  <strong>Data:</strong> {error.data['Nama Lengkap'] || 'N/A'} - {error.data['Kode Debitur'] || 'N/A'}
                                </>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseImportDialog}>
            {importResult ? 'Tutup' : 'Batal'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ImportExportButtons;
