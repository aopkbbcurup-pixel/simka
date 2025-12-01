import React, { useState, useEffect, useCallback } from 'react';
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
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  FormControl,
  Tab,
  Tabs,
  Alert,
  Snackbar,
  Pagination,
  Checkbox,
  CircularProgress,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  Visibility,
  Security,
  Home,
  DirectionsCar,
  Warning,
  CheckCircle,
  Upload,
  Description,
  Print,
} from '@mui/icons-material';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import ImportExportButtons from '../../components/ImportExportButtons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Collateral {
  id: string;
  credit_id?: string;
  collateral_code: string;
  credit_contract: string;
  debtor_name: string;
  type: string;
  certificate_number?: string;
  police_number?: string;
  address?: string;
  appraisal_value: number;
  insurance_end_date?: string;
  tax_due_date?: string;
  status: string;
  condition: string;
  physical_location?: string;
  notes?: string;
}

interface HandoverItem {
  id: string;
  documentName: string;
  locationDescription: string;
  sizeOrValue: string;
  issuer: string;
  onBehalf: string;
}

interface HandoverFormData {
  documentTitle: string;
  documentNumber: string;
  documentKind: string;
  eventDate: string;
  location: string;
  firstPartyInstitution: string;
  firstPartyAddress: string;
  firstPartyRepresentative: string;
  firstPartyPosition: string;
  firstPartySignatureLabel: string;
  secondPartyName: string;
  secondPartyRole: string;
  secondPartyAddress: string;
  secondPartyRepresentative: string;
  secondPartyPosition: string;
  secondPartySignatureLabel: string;
  copiesCount: string;
  copiesCountInWords: string;
  closingCity: string;
  closingDate: string;
}

const createDefaultHandoverForm = (): HandoverFormData => {
  const today = new Date().toISOString().slice(0, 10);
  return {
    documentTitle: 'BERITA ACARA SERAH TERIMA DOKUMEN ESSENSIALIA',
    documentNumber: '',
    documentKind: 'Dokumen Essensialia',
    eventDate: today,
    location: '',
    firstPartyInstitution: '',
    firstPartyAddress: '',
    firstPartyRepresentative: '',
    firstPartyPosition: '',
    firstPartySignatureLabel: 'Yang Menyerahkan',
    secondPartyName: '',
    secondPartyRole: '',
    secondPartyAddress: '',
    secondPartyRepresentative: '',
    secondPartyPosition: '',
    secondPartySignatureLabel: 'Yang Menerima',
    copiesCount: '2',
    copiesCountInWords: 'dua',
    closingCity: '',
    closingDate: today,
  };
};

const Collaterals: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCollateral, setSelectedCollateral] = useState<Collateral | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // Delete confirmation dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [collateralToDelete, setCollateralToDelete] = useState<Collateral | null>(null);
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Selection for printing
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Handover document states
  const [handoverDialogOpen, setHandoverDialogOpen] = useState(false);
  const [handoverForm, setHandoverForm] = useState<HandoverFormData>(() => createDefaultHandoverForm());
  const [handoverItems, setHandoverItems] = useState<HandoverItem[]>([]);
  const [handoverPrintData, setHandoverPrintData] = useState<{ form: HandoverFormData; items: HandoverItem[] } | null>(null);

  const resetHandoverState = useCallback(() => {
    setHandoverForm((prev) => {
      const base = createDefaultHandoverForm();
      return {
        ...base,
        documentTitle: prev.documentTitle || base.documentTitle,
        firstPartyInstitution: prev.firstPartyInstitution,
        firstPartyAddress: prev.firstPartyAddress,
        firstPartyRepresentative: prev.firstPartyRepresentative,
        firstPartyPosition: prev.firstPartyPosition,
        firstPartySignatureLabel: prev.firstPartySignatureLabel || base.firstPartySignatureLabel,
        secondPartySignatureLabel: prev.secondPartySignatureLabel || base.secondPartySignatureLabel,
        copiesCount: prev.copiesCount || base.copiesCount,
        copiesCountInWords: prev.copiesCountInWords || base.copiesCountInWords,
      };
    });
    setHandoverItems([]);
  }, []);

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const [collaterals, setCollaterals] = useState<Collateral[]>([]);
  const [loading, setLoading] = useState(false);
  const [creditOptions, setCreditOptions] = useState<any[]>([]);
  const [creditSearchTerm, setCreditSearchTerm] = useState('');
  const [creditLoading, setCreditLoading] = useState(false);
  const [selectedCreditOption, setSelectedCreditOption] = useState<any | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [formData, setFormData] = useState({
    collateral_code: '',
    credit_id: '',
    type: 'SHM',
    certificate_number: '',
    police_number: '',
    address: '',
    appraisal_value: '',
    appraisal_date: '',
    appraiser: '',
    physical_location: '',
    land_area: '',
    building_area: '',
    owner_name: '',
    condition: 'Baik',
    insurance_company: '',
    policy_number: '',
    insurance_start_date: '',
    insurance_end_date: '',
    insurance_value: '',
    tax_due_date: '',
    tax_amount: '',
    notes: ''
  });

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const fetchCollaterals = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        search: searchTerm,
        type: typeFilter,
      });
      const response = await api.get(`/collaterals?${params.toString()}`);
      if (response.data.success) {
        const transformedCollaterals = response.data.data.collaterals.map((item: any) => ({
          id: item.id,
          credit_id: item.credit_id,
          collateral_code: item.collateral_code,
          credit_contract: item.Credit?.contract_number || 'N/A',
          debtor_name: item.Credit?.Debtor?.full_name || 'N/A',
          type: item.type,
          certificate_number: item.certificate_number,
          police_number: item.police_number,
          address: item.address,
          appraisal_value: parseFloat(item.appraisal_value) || 0,
          insurance_end_date: item.insurance_end_date,
          tax_due_date: item.tax_due_date,
          status: item.status,
          condition: item.condition,
          physical_location: item.physical_location,
          notes: item.notes,
        }));
        setCollaterals(transformedCollaterals);
        setPage(response.data.data.pagination.current_page);
        setTotalPages(response.data.data.pagination.total_pages);
      }
    } catch (error) {
      console.error('Error fetching collaterals:', error);
      setCollaterals([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [page, searchTerm, typeFilter]);

  const fetchCredits = useCallback(async (search: string) => {
    if (!search) {
      setCreditOptions(selectedCreditOption ? [selectedCreditOption] : []);
      return;
    }

    setCreditLoading(true);
    try {
      const response = await api.get('/credits', {
        params: {
          search,
          limit: 20,
        },
      });

      if (response.data.success) {
        if (search !== creditSearchTerm.trim()) {
          return;
        }
        const results = response.data.data.credits || [];
        const mergedOptions = selectedCreditOption
          ? [
              selectedCreditOption,
              ...results.filter((credit: any) => credit.id !== selectedCreditOption.id),
            ]
          : results;
        setCreditOptions(mergedOptions);
      } else {
        setCreditOptions(selectedCreditOption ? [selectedCreditOption] : []);
      }
    } catch (error) {
      console.error('Error searching credits:', error);
      setCreditOptions(selectedCreditOption ? [selectedCreditOption] : []);
    } finally {
      setCreditLoading(false);
    }
  }, [creditSearchTerm, selectedCreditOption]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCollaterals();
    }, 500); // Debounce search/filter to avoid rapid API calls
    return () => clearTimeout(timer);
  }, [fetchCollaterals]);

  useEffect(() => {
    if (!openDialog) return;

    if (creditSearchTerm.trim().length < 2) {
      setCreditOptions(selectedCreditOption ? [selectedCreditOption] : []);
      return;
    }

    const handler = setTimeout(() => {
      fetchCredits(creditSearchTerm.trim());
    }, 400);

    return () => clearTimeout(handler);
  }, [creditSearchTerm, openDialog, selectedCreditOption, fetchCredits]);

  useEffect(() => {
    if (!openDialog || !formData.credit_id) return;
    if (
      selectedCreditOption &&
      selectedCreditOption.id === formData.credit_id &&
      !selectedCreditOption.__isPlaceholder
    ) {
      return;
    }

    let isCurrent = true;
    const loadCreditDetail = async () => {
      try {
        const response = await api.get(`/credits/${formData.credit_id}`);
        if (response.data.success && response.data.data?.credit && isCurrent) {
          const creditData = response.data.data.credit;
          setSelectedCreditOption(creditData);
          setCreditOptions((prev) => {
            const exists = prev.some((item: any) => item.id === creditData.id);
            if (exists) {
              return prev.map((item: any) => (item.id === creditData.id ? creditData : item));
            }
            return [creditData, ...prev];
          });
        }
      } catch (error) {
        console.error('Error loading credit detail:', error);
      }
    };

    loadCreditDetail();

    return () => {
      isCurrent = false;
    };
  }, [openDialog, formData.credit_id, selectedCreditOption]);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPage(1);
    setSearchTerm(e.target.value);
  };

  const handleTypeFilterChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    setPage(1);
    setTypeFilter(e.target.value as string);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SHM':
      case 'SHGB':
        return <Home />;
      case 'SK':
      case 'SK Berkala':
        return <Description />;
      case 'BPKB':
        return <DirectionsCar />;
      default:
        return <Security />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aktif':
        return 'success';
      case 'Dilepas':
        return 'info';
      case 'Disita':
        return 'error';
      case 'Dijual':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const numberToWords = (value: number): string => {
    const words = [
      '',
      'satu',
      'dua',
      'tiga',
      'empat',
      'lima',
      'enam',
      'tujuh',
      'delapan',
      'sembilan',
      'sepuluh',
      'sebelas',
    ];

    if (value < 0) {
      return `minus ${numberToWords(Math.abs(value))}`;
    }

    if (value === 0) {
      return 'nol';
    }

    if (value < 12) {
      return words[value];
    }

    if (value < 20) {
      return `${numberToWords(value - 10)} belas`.trim();
    }

    if (value < 100) {
      const tens = Math.floor(value / 10);
      const remainder = value % 10;
      return `${numberToWords(tens)} puluh${remainder ? ` ${numberToWords(remainder)}` : ''}`.trim();
    }

    if (value < 200) {
      return `seratus${value > 100 ? ` ${numberToWords(value - 100)}` : ''}`.trim();
    }

    if (value < 1000) {
      const hundreds = Math.floor(value / 100);
      const remainder = value % 100;
      return `${numberToWords(hundreds)} ratus${remainder ? ` ${numberToWords(remainder)}` : ''}`.trim();
    }

    if (value < 2000) {
      return `seribu${value > 1000 ? ` ${numberToWords(value - 1000)}` : ''}`.trim();
    }

    if (value < 1000000) {
      const thousands = Math.floor(value / 1000);
      const remainder = value % 1000;
      return `${numberToWords(thousands)} ribu${remainder ? ` ${numberToWords(remainder)}` : ''}`.trim();
    }

    if (value < 1000000000) {
      const millions = Math.floor(value / 1000000);
      const remainder = value % 1000000;
      return `${numberToWords(millions)} juta${remainder ? ` ${numberToWords(remainder)}` : ''}`.trim();
    }

    const billions = Math.floor(value / 1000000000);
    const remainder = value % 1000000000;
    return `${numberToWords(billions)} miliar${remainder ? ` ${numberToWords(remainder)}` : ''}`.trim();
  };

  const capitalizeSentence = (text: string) => {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const getDateNarration = (dateValue: string) => {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthNames = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];

    const dayName = dayNames[date.getDay()];
    const monthName = monthNames[date.getMonth()];
    const dayNumber = date.getDate();
    const yearNumber = date.getFullYear();

    return {
      dayName,
      monthName,
      dayNumber,
      yearNumber,
      dayNumberWords: capitalizeSentence(numberToWords(dayNumber)),
      yearNumberWords: capitalizeSentence(numberToWords(yearNumber)),
      formattedDate: `${dayNumber.toString().padStart(2, '0')} ${monthName} ${yearNumber}`,
    };
  };

  const getCreditLabel = (credit: any) => {
    if (!credit) return '';
    const parts = [credit.contract_number, credit.Debtor?.full_name].filter(Boolean);
    const baseLabel = parts.join(' - ');
    return credit.credit_type ? `${baseLabel} (${credit.credit_type})` : baseLabel || 'Kontrak kredit';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  const isExpiringSoon = (dateString?: string) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  const handleOpenDialog = (collateral?: Collateral) => {
    let initialCreditOption: any | null = null;

    if (collateral) {
      setSelectedCollateral(collateral);
      // Use the credit_id from the collateral data
      const creditId = collateral.credit_id || '';
      
      if (creditId) {
        initialCreditOption = {
          id: creditId,
          contract_number: collateral.credit_contract,
          Debtor: { full_name: collateral.debtor_name },
          __isPlaceholder: true,
        };
      }

      setFormData({
        collateral_code: collateral.collateral_code,
        credit_id: creditId,
        type: collateral.type,
        certificate_number: collateral.certificate_number || '',
        police_number: collateral.police_number || '',
        address: collateral.address || '',
        appraisal_value: collateral.appraisal_value.toString(),
        appraisal_date: '',
        appraiser: '',
        physical_location: collateral.physical_location || '',
        land_area: '',
        building_area: '',
        owner_name: '',
        condition: collateral.condition,
        insurance_company: '',
        policy_number: '',
        insurance_start_date: '',
        insurance_end_date: collateral.insurance_end_date || '',
        insurance_value: '',
        tax_due_date: collateral.tax_due_date || '',
        tax_amount: '',
        notes: collateral.notes || ''
      });
    } else {
      setSelectedCollateral(null);
      setFormData({
        collateral_code: '',
        credit_id: '',
        type: 'SHM',
        certificate_number: '',
        police_number: '',
        address: '',
        appraisal_value: '',
        appraisal_date: '',
        appraiser: '',
        physical_location: '',
        land_area: '',
        building_area: '',
        owner_name: '',
        condition: 'Baik',
        insurance_company: '',
        policy_number: '',
        insurance_start_date: '',
        insurance_end_date: '',
        insurance_value: '',
        tax_due_date: '',
        tax_amount: '',
        notes: ''
      });
    }
    setSelectedCreditOption(initialCreditOption);
    setCreditOptions(initialCreditOption ? [initialCreditOption] : []);
    setCreditSearchTerm('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCollateral(null);
    setTabValue(0);
    setUploadedFiles([]);
    setSelectedCreditOption(null);
    setCreditOptions([]);
    setCreditSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadDocuments = async (collateralId: string) => {
    setUploadLoading(true);
    try {
      for (const file of uploadedFiles) {
        const formData = new FormData();
        formData.append('document', file);
        formData.append('document_type', 'Lainnya');
        formData.append('document_name', file.name);
        
        await api.post(`/collaterals/${collateralId}/documents`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }
    } catch (error) {
      console.error('Error uploading documents:', error);
      throw error;
    } finally {
      setUploadLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (!formData.collateral_code.trim()) {
        alert('Kode agunan harus diisi');
        return;
      }
      if (!formData.credit_id) {
        alert('Kontrak kredit harus dipilih');
        return;
      }
      if (!formData.appraisal_value || parseFloat(formData.appraisal_value) <= 0) {
        alert('Nilai taksasi harus diisi dengan nilai yang valid');
        return;
      }

      const submitData = {
        ...formData,
        appraisal_value: parseFloat(formData.appraisal_value) || 0,
        land_area: formData.land_area ? parseFloat(formData.land_area) : null,
        building_area: formData.building_area ? parseFloat(formData.building_area) : null,
        insurance_value: formData.insurance_value ? parseFloat(formData.insurance_value) : null,
        tax_amount: formData.tax_amount ? parseFloat(formData.tax_amount) : null,
      };

      let collateralId;
      if (selectedCollateral) {
        await api.put(`/collaterals/${selectedCollateral.id}`, submitData);
        collateralId = selectedCollateral.id;
      } else {
        const response = await api.post('/collaterals', submitData);
        collateralId = response.data.data.collateral.id;
      }
      
      // Upload documents if any
      if (uploadedFiles.length > 0) {
        await uploadDocuments(collateralId);
      }
      
      showSnackbar(`Agunan ${selectedCollateral ? 'diperbarui' : 'dibuat'}`, 'success');
      fetchCollaterals();
      handleCloseDialog();
    } catch (error: any) {
      console.error('Error saving collateral:', error);
      const errorMessage = error.response?.data?.message || 'Terjadi kesalahan saat menyimpan data agunan';
      alert(errorMessage);
    }
  };

  const handleDelete = (collateral: Collateral) => {
    setCollateralToDelete(collateral);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setCollateralToDelete(null);
    setPassword('');
    setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    if (!collateralToDelete) return;
    if (!password) {
      setDeleteError('Password harus diisi');
      return;
    }

    try {
      // 1. Verify password
      await api.post('/auth/verify-password', { password });

      // 2. If password is correct, delete collateral
      await api.delete(`/collaterals/${collateralToDelete.id}`);
      
      showSnackbar('Agunan berhasil dihapus', 'success');
      handleCloseDeleteDialog();
      fetchCollaterals();

    } catch (error: any) {
      console.error('Error during delete process:', error);
      const message = error.response?.data?.message || 'Terjadi kesalahan';
      setDeleteError(message);
    }
  };

  const handleView = (collateral: Collateral) => {
    // Open view dialog or navigate to detail page
    console.log('View collateral:', collateral);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(collaterals.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleOpenHandoverDialog = () => {
    if (selectedIds.length === 0) {
      showSnackbar('Pilih setidaknya satu agunan untuk membuat berita acara serah terima', 'warning');
      return;
    }

    const selectedCollaterals = collaterals.filter((collateral) => selectedIds.includes(collateral.id));

    if (selectedCollaterals.length === 0) {
      showSnackbar('Data agunan terpilih tidak ditemukan', 'error');
      return;
    }

    const primaryCollateral = selectedCollaterals[0];
    const currentForm = handoverForm;
    const baseForm = createDefaultHandoverForm();
    const inferredLocation = primaryCollateral.physical_location || primaryCollateral.address || '';

    const updatedForm: HandoverFormData = {
      ...baseForm,
      documentTitle: currentForm.documentTitle || baseForm.documentTitle,
      firstPartyInstitution: currentForm.firstPartyInstitution,
      firstPartyAddress: currentForm.firstPartyAddress,
      firstPartyRepresentative: currentForm.firstPartyRepresentative,
      firstPartyPosition: currentForm.firstPartyPosition,
      firstPartySignatureLabel: currentForm.firstPartySignatureLabel || baseForm.firstPartySignatureLabel,
      secondPartySignatureLabel: currentForm.secondPartySignatureLabel || baseForm.secondPartySignatureLabel,
      copiesCount: currentForm.copiesCount || baseForm.copiesCount,
      copiesCountInWords: currentForm.copiesCountInWords || baseForm.copiesCountInWords,
      secondPartyName: primaryCollateral.debtor_name || baseForm.secondPartyName,
      secondPartyRole: 'Debitur',
      secondPartyAddress: primaryCollateral.address || baseForm.secondPartyAddress,
      secondPartyRepresentative: primaryCollateral.debtor_name || baseForm.secondPartyRepresentative,
      secondPartyPosition: '',
      location: inferredLocation || currentForm.location || baseForm.location,
      closingCity: inferredLocation || currentForm.closingCity || baseForm.closingCity,
      documentNumber: '',
    };

    setHandoverForm(updatedForm);

    const newItems = selectedCollaterals.map((collateral, index) => ({
      id: collateral.id || `collateral-${index}`,
      documentName: collateral.certificate_number
        ? `${collateral.type ? `${collateral.type} ` : ''}${collateral.certificate_number}`.trim()
        : `${collateral.type || 'Agunan'} ${collateral.collateral_code}`.trim(),
      locationDescription: collateral.address || collateral.physical_location || '-',
      sizeOrValue: collateral.appraisal_value ? formatCurrency(collateral.appraisal_value) : '',
      issuer: collateral.notes || '',
      onBehalf: collateral.debtor_name || '',
    }));

    setHandoverItems(newItems);
    setHandoverDialogOpen(true);
  };

  const handleCloseHandoverDialog = () => {
    setHandoverDialogOpen(false);
    setHandoverPrintData(null);
    resetHandoverState();
  };

  const handleHandoverFormChange = (field: keyof HandoverFormData, value: string) => {
    setHandoverForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleHandoverItemChange = (itemId: string, field: keyof HandoverItem, value: string) => {
    setHandoverItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
    );
  };

  const handleAddHandoverItem = () => {
    const timestamp = Date.now();
    setHandoverItems((prev) => [
      ...prev,
      {
        id: `temp-${timestamp}`,
        documentName: '',
        locationDescription: '',
        sizeOrValue: '',
        issuer: '',
        onBehalf: '',
      },
    ]);
  };

  const handleRemoveHandoverItem = (itemId: string) => {
    setHandoverItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handlePrintPDF = () => {
    if (selectedIds.length === 0) {
      showSnackbar('Pilih setidaknya satu agunan untuk dicetak ke PDF', 'warning');
      return;
    }

    const doc = new jsPDF();
    const selectedCollaterals = collaterals.filter(c => selectedIds.includes(c.id));

    autoTable(doc, {
      head: [['Kode Agunan', 'Nama Debitur', 'Jenis', 'Nilai Taksasi', 'Status']],
      body: selectedCollaterals.map(c => [
        c.collateral_code,
        c.debtor_name,
        c.type,
        formatCurrency(c.appraisal_value),
        c.status,
      ]),
      startY: 20,
      didDrawPage: (data) => {
        // Header
        doc.setFontSize(20);
        doc.setTextColor(40);
        doc.text('Laporan Data Agunan Terpilih', data.settings.margin.left, 15);
      },
    });

    doc.save('laporan-agunan-terpilih.pdf');
  };

  const handleGenerateHandoverDocument = () => {
    const requiredFields: Array<{ key: keyof HandoverFormData; label: string }> = [
      { key: 'documentNumber', label: 'Nomor dokumen' },
      { key: 'eventDate', label: 'Tanggal serah terima' },
      { key: 'location', label: 'Lokasi serah terima' },
      { key: 'firstPartyInstitution', label: 'Nama instansi pihak pertama' },
      { key: 'firstPartyRepresentative', label: 'Nama perwakilan pihak pertama' },
      { key: 'firstPartyPosition', label: 'Jabatan perwakilan pihak pertama' },
      { key: 'secondPartyName', label: 'Nama pihak kedua' },
      { key: 'secondPartyRepresentative', label: 'Nama perwakilan pihak kedua' },
      { key: 'secondPartyPosition', label: 'Jabatan perwakilan pihak kedua' },
      { key: 'closingCity', label: 'Kota penandatanganan' },
      { key: 'closingDate', label: 'Tanggal penandatanganan' },
    ];

    const missingField = requiredFields.find((field) => !handoverForm[field.key]?.trim());

    if (missingField) {
      showSnackbar(`Harap lengkapi ${missingField.label}`, 'warning');
      return;
    }

    if (handoverItems.length === 0) {
      showSnackbar('Tambahkan minimal satu dokumen jaminan yang akan diserahkan', 'warning');
      return;
    }

    setHandoverPrintData({
      form: handoverForm,
      items: handoverItems,
    });

    setHandoverDialogOpen(false);
    resetHandoverState();

    setTimeout(() => {
      window.print();
    }, 200);
  };

  useEffect(() => {
    const handleAfterPrint = () => {
      setHandoverPrintData(null);
    };

    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const handleUploadDocument = (collateral: Collateral) => {
    // Open document upload dialog
    console.log('Upload document for collateral:', collateral);
  };

  const handoverEventInfo = handoverPrintData ? getDateNarration(handoverPrintData.form.eventDate) : null;
  const handoverClosingInfo = handoverPrintData ? getDateNarration(handoverPrintData.form.closingDate) : null;

  return (
    <Box>
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #handover-print-area, #handover-print-area * {
              visibility: visible;
            }
            #handover-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 20mm;
              box-sizing: border-box;
            }
          }
        `}
      </style>

      {handoverPrintData && (
        <Box
          id="handover-print-area"
          sx={{
            fontFamily: '"Times New Roman", Times, serif',
            color: '#000',
            lineHeight: 1.6,
            fontSize: '11pt',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '14pt' }}>
              {handoverPrintData.form.documentTitle || 'BERITA ACARA SERAH TERIMA DOKUMEN'}
            </Typography>
            <Typography sx={{ fontWeight: 500, mt: 0.5 }}>
              Nomor : {handoverPrintData.form.documentNumber || '______________'}
            </Typography>
          </Box>

          <Typography sx={{ textAlign: 'justify', mb: 2 }}>
            Pada hari ini <strong>{handoverEventInfo?.dayName || '________'}</strong>, tanggal{' '}
            <strong>{handoverEventInfo?.dayNumberWords || '________'}</strong> bulan{' '}
            <strong>{handoverEventInfo?.monthName || '________'}</strong> tahun{' '}
            <strong>{handoverEventInfo?.yearNumberWords || '________'}</strong> bertempat di{' '}
            <strong>{handoverPrintData.form.location || '________'}</strong> telah dilaksanakan
            serah terima {handoverPrintData.form.documentKind || 'Dokumen'}.
            Maka kami kedua belah pihak sebagai berikut:
          </Typography>

          <Box component="ol" sx={{ pl: 3, mb: 2 }}>
            <Box component="li" sx={{ mb: 1, textAlign: 'justify' }}>
              <strong>PIHAK PERTAMA</strong> : {handoverPrintData.form.firstPartyInstitution || '________________'}{' '}
              {handoverPrintData.form.firstPartyAddress
                ? `beralamat di ${handoverPrintData.form.firstPartyAddress}, `
                : ''}
              diwakili oleh <strong>{handoverPrintData.form.firstPartyRepresentative || '________________'}</strong>{' '}
              ({handoverPrintData.form.firstPartyPosition || '________________'}).
            </Box>
            <Box component="li" sx={{ mb: 1, textAlign: 'justify' }}>
              <strong>PIHAK KEDUA</strong> : {handoverPrintData.form.secondPartyName || '________________'}{' '}
              {handoverPrintData.form.secondPartyRole
                ? `/ ${handoverPrintData.form.secondPartyRole}`
                : ''}{' '}
              {handoverPrintData.form.secondPartyAddress
                ? `beralamat di ${handoverPrintData.form.secondPartyAddress}.`
                : ''}
            </Box>
          </Box>

          <Typography sx={{ textAlign: 'justify', mb: 2 }}>
            Dengan ini dinyatakan bahwa PIHAK PERTAMA menyerahkan {handoverPrintData.form.documentKind || 'dokumen'}
            kepada PIHAK KEDUA, sebagaimana PIHAK KEDUA menerima penyerahan tersebut dari PIHAK PERTAMA
            yang terdiri dari dokumen-dokumen sebagai berikut :
          </Typography>

          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginBottom: '16px',
              fontSize: '10.5pt',
            }}
          >
            <thead>
              <tr>
                <th style={{ border: '1px solid #000', padding: '6px', width: '5%' }}>No.</th>
                <th style={{ border: '1px solid #000', padding: '6px', width: '25%' }}>
                  Jenis Dokumen / Nomor
                </th>
                <th style={{ border: '1px solid #000', padding: '6px', width: '25%' }}>
                  Lokasi / Keterangan
                </th>
                <th style={{ border: '1px solid #000', padding: '6px', width: '15%' }}>Luas / Nominal</th>
                <th style={{ border: '1px solid #000', padding: '6px', width: '15%' }}>Penerbit</th>
                <th style={{ border: '1px solid #000', padding: '6px', width: '15%' }}>Atas Nama</th>
              </tr>
            </thead>
            <tbody>
              {handoverPrintData.items.map((item, index) => (
                <tr key={item.id || index}>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>
                    {index + 1}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{item.documentName || '-'}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>
                    {item.locationDescription || '-'}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>
                    {item.sizeOrValue || '-'}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>
                    {item.issuer || '-'}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>
                    {item.onBehalf || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Typography sx={{ textAlign: 'justify', mb: 2 }}>
            Dengan penyerahan dokumen-dokumen tersebut di atas, maka segala tanggung jawab atas penyimpanan
            dokumen dimaksud dialihkan kepada PIHAK KEDUA sejak tanggal berita acara ini.
          </Typography>

          <Typography sx={{ textAlign: 'justify', mb: 2 }}>
            Berita acara ini dibuat dalam rangkap {handoverPrintData.form.copiesCount || '___'} (
            {handoverPrintData.form.copiesCountInWords || '___'}) yang masing-masing memiliki kekuatan hukum yang sama
            dan telah ditandatangani oleh para pihak pada akhir berita acara.
          </Typography>

          <Typography sx={{ textAlign: 'justify', mb: 2 }}>
            Demikian berita acara serah terima {handoverPrintData.form.documentKind || 'dokumen'} ini dibuat dengan
            sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
          </Typography>

          <Box sx={{ textAlign: 'right', mb: 4 }}>
            <Typography>
              {handoverPrintData.form.closingCity || '________'}, {handoverClosingInfo?.formattedDate || '________'}
            </Typography>
          </Box>

          <table style={{ width: '100%', fontSize: '10.5pt' }}>
            <tbody>
              <tr>
                <td style={{ width: '50%', textAlign: 'center', padding: '0 12px' }}>
                  <div style={{ fontWeight: 600 }}>{handoverPrintData.form.secondPartySignatureLabel}</div>
                  <div style={{ marginTop: '4px' }}>{handoverPrintData.form.secondPartyName}</div>
                </td>
                <td style={{ width: '50%', textAlign: 'center', padding: '0 12px' }}>
                  <div style={{ fontWeight: 600 }}>{handoverPrintData.form.firstPartySignatureLabel}</div>
                  <div style={{ marginTop: '4px' }}>{handoverPrintData.form.firstPartyInstitution}</div>
                </td>
              </tr>
              <tr>
                <td style={{ height: '80px' }} />
                <td />
              </tr>
              <tr>
                <td style={{ textAlign: 'center', fontWeight: 700, textTransform: 'uppercase' }}>
                  {handoverPrintData.form.secondPartyRepresentative}
                </td>
                <td style={{ textAlign: 'center', fontWeight: 700, textTransform: 'uppercase' }}>
                  {handoverPrintData.form.firstPartyRepresentative}
                </td>
              </tr>
              <tr>
                <td style={{ textAlign: 'center' }}>{handoverPrintData.form.secondPartyPosition}</td>
                <td style={{ textAlign: 'center' }}>{handoverPrintData.form.firstPartyPosition}</td>
              </tr>
            </tbody>
          </table>
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Manajemen Agunan
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<Description />}
            onClick={handleOpenHandoverDialog}
            disabled={selectedIds.length === 0}
            title={selectedIds.length === 0 ? 'Pilih agunan untuk membuat berita acara serah terima' : 'Buat berita acara serah terima dari agunan terpilih'}
          >
            Cetak Berita Acara
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Print />}
            onClick={handlePrintPDF}
            disabled={selectedIds.length === 0}
            title={selectedIds.length === 0 ? 'Pilih agunan untuk dicetak ke PDF' : 'Cetak data terpilih ke PDF'}
          >
            Cetak PDF ({selectedIds.length})
          </Button>
          <ImportExportButtons
            onImportComplete={() => fetchCollaterals(true)}
            templatePath="/collaterals/template"
            importPath="/collaterals/import"
            templateFilename="template-impor-agunan.xlsx"
            dialogTitle="Impor Data Agunan"
            onImportSuccess={(result) => showSnackbar(`Impor selesai: ${result.success} berhasil, ${result.failed} gagal`, result.failed > 0 ? 'warning' : 'success')}
            onTemplateSuccess={() => showSnackbar('Template berhasil diunduh', 'info')}
            errorPrimaryBuilder={(e) => `Baris ${e.row}: ${e.error}`}
            errorSecondaryBuilder={(data) => (
              <>
                <strong>Data:</strong> {data['Kode Agunan'] || 'N/A'} - {data['No. Kontrak'] || 'N/A'}
              </>
            )}
          />
          {(user?.role === 'admin' || user?.role === 'analyst') && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
            >
              Tambah Agunan
            </Button>
          )}
        </Box>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                placeholder="Cari agunan berdasarkan kode, nomor sertifikat, plat nomor, atau nama debitur..."
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <TextField
                  select
                  fullWidth
                  label="Filter Jenis"
                  value={typeFilter}
                  onChange={handleTypeFilterChange}
                  variant="outlined"
                  SelectProps={{
                    native: true,
                  }}
                >
                  <option value="">Semua Jenis</option>
                  <option value="SHM">SHM (Sertifikat Hak Milik)</option>
                  <option value="SHGB">SHGB (Sertifikat Hak Guna Bangunan)</option>
                  <option value="SK">SK</option>
                  <option value="SK Berkala">SK Berkala</option>
                  <option value="BPKB">BPKB (Kendaraan Bermotor)</option>
                  <option value="Deposito">Deposito</option>
                  <option value="Emas">Emas</option>
                  <option value="Lainnya">Lainnya</option>
                </TextField>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedIds.length > 0 && selectedIds.length < collaterals.length}
                  checked={collaterals.length > 0 && selectedIds.length === collaterals.length}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                />
              </TableCell>
              <TableCell>Kode Agunan</TableCell>
              <TableCell>Kontrak Kredit</TableCell>
              <TableCell>Debitur</TableCell>
              <TableCell>Jenis & Identitas</TableCell>
              <TableCell>Nilai Taksasi</TableCell>
              <TableCell>Asuransi</TableCell>
              <TableCell>Pajak</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Lokasi &amp; Keterangan</TableCell>
              <TableCell>Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Typography>Memuat data agunan...</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : collaterals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <Security sx={{ fontSize: 48, color: 'text.secondary' }} />
                    <Typography variant="h6" color="text.secondary">
                      {searchTerm || typeFilter ? 'Tidak ada agunan yang sesuai dengan filter' : 'Belum ada data agunan'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm || typeFilter ? 'Coba ubah kriteria pencarian atau filter' : 'Klik tombol "Tambah Agunan" untuk menambah data baru'}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              collaterals.map((collateral) => (
              <TableRow key={collateral.id} hover selected={selectedIds.includes(collateral.id)}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedIds.includes(collateral.id)}
                    onChange={() => toggleSelect(collateral.id)}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {getTypeIcon(collateral.type)}
                    <Box sx={{ ml: 1 }}>
                      <Chip label={collateral.collateral_code} color="primary" variant="outlined" />
                      <Typography variant="caption" display="block" color="text.secondary">
                        {collateral.type}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={collateral.credit_contract} variant="outlined" />
                </TableCell>
                <TableCell>{collateral.debtor_name}</TableCell>
                <TableCell>
                  <Box>
                    {collateral.certificate_number && (
                      <Typography variant="body2" fontWeight="medium">
                        {collateral.certificate_number}
                      </Typography>
                    )}
                    {collateral.police_number && (
                      <Typography variant="body2" fontWeight="medium">
                        {collateral.police_number}
                      </Typography>
                    )}
                    {collateral.address && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {collateral.address}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>{formatCurrency(collateral.appraisal_value)}</TableCell>
                <TableCell>
                  {collateral.insurance_end_date ? (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {isExpiringSoon(collateral.insurance_end_date) ? (
                        <Warning sx={{ color: 'error.main', mr: 0.5, fontSize: 16 }} />
                      ) : (
                        <CheckCircle sx={{ color: 'success.main', mr: 0.5, fontSize: 16 }} />
                      )}
                      <Typography variant="body2">
                        {formatDate(collateral.insurance_end_date)}
                      </Typography>
                    </Box>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {collateral.tax_due_date ? (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {isExpiringSoon(collateral.tax_due_date) ? (
                        <Warning sx={{ color: 'error.main', mr: 0.5, fontSize: 16 }} />
                      ) : (
                        <CheckCircle sx={{ color: 'success.main', mr: 0.5, fontSize: 16 }} />
                      )}
                      <Typography variant="body2">
                        {formatDate(collateral.tax_due_date)}
                      </Typography>
                    </Box>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={collateral.status}
                    color={getStatusColor(collateral.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {collateral.physical_location || 'Belum ditentukan'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {collateral.notes ? `Keterangan: ${collateral.notes}` : 'Keterangan: -'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <IconButton 
                    size="small" 
                    title="Lihat Detail"
                    onClick={() => handleView(collateral)}
                  >
                    <Visibility />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    title="Edit"
                    onClick={() => handleOpenDialog(collateral)}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    title="Upload Dokumen"
                    onClick={() => handleUploadDocument(collateral)}
                  >
                    <Upload />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error" 
                    title="Hapus"
                    onClick={() => handleDelete(collateral)}
                  >
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 2 }}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={handlePageChange}
          color="primary"
          showFirstButton
          showLastButton
          disabled={loading}
        />
      </Box>

      {/* Collateral Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          {selectedCollateral ? 'Edit Agunan' : 'Tambah Agunan Baru'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
              <Tab label="Informasi Umum" />
              <Tab label="Detail Agunan" />
              <Tab label="Asuransi & Pajak" />
              <Tab label="Dokumen" />
            </Tabs>
          </Box>

          {tabValue === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Kode Agunan"
                  name="collateral_code"
                  value={formData.collateral_code}
                  onChange={handleInputChange}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  fullWidth
                  openOnFocus={false}
                  options={creditOptions}
                  loading={creditLoading}
                  value={selectedCreditOption}
                  onChange={(event, newValue) => {
                    setSelectedCreditOption(newValue);
                    setFormData((prev) => ({
                      ...prev,
                      credit_id: newValue?.id || '',
                    }));
                    if (!newValue) {
                      setCreditOptions([]);
                    }
                  }}
                  onInputChange={(event, value, reason) => {
                    if (reason === 'input') {
                      setCreditSearchTerm(value);
                    } else if (reason === 'clear' || reason === 'reset') {
                      setCreditSearchTerm('');
                    }
                  }}
                  getOptionLabel={(option) => getCreditLabel(option)}
                  filterOptions={(options) => options}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  noOptionsText={
                    creditSearchTerm.trim().length < 2
                      ? 'Ketik minimal 2 karakter untuk mencari'
                      : 'Tidak ada hasil'
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Kontrak Kredit"
                      variant="outlined"
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
                      helperText="Cari berdasarkan nomor kontrak atau nama debitur"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Jenis Agunan"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  variant="outlined"
                  SelectProps={{
                    native: true,
                  }}
                >
                  <option value="SHM">SHM (Sertifikat Hak Milik)</option>
                  <option value="SHGB">SHGB (Sertifikat Hak Guna Bangunan)</option>
                  <option value="SK">SK</option>
                  <option value="SK Berkala">SK Berkala</option>
                  <option value="BPKB">BPKB (Kendaraan Bermotor)</option>
                  <option value="Deposito">Deposito</option>
                  <option value="Emas">Emas</option>
                  <option value="Lainnya">Lainnya</option>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Nilai Taksasi" 
                  name="appraisal_value"
                  value={formData.appraisal_value}
                  onChange={handleInputChange}
                  type="number" 
                  required 
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Tanggal Taksasi" 
                  name="appraisal_date"
                  value={formData.appraisal_date}
                  onChange={handleInputChange}
                  type="date" 
                  InputLabelProps={{ shrink: true }} 
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                fullWidth 
                label="Penilai" 
                name="appraiser"
                value={formData.appraiser}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Lokasi Penyimpanan Berkas Fisik"
                name="physical_location"
                value={formData.physical_location}
                onChange={handleInputChange}
                placeholder="Contoh: Lemari A - Rak 3"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Alamat Agunan"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Keterangan Agunan"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Catatan tambahan terkait agunan atau dokumen pendukung"
              />
            </Grid>
            </Grid>
          )}

          {tabValue === 1 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Isi sesuai dengan jenis agunan yang dipilih
                </Alert>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Nomor Sertifikat/BPKB" 
                  name="certificate_number"
                  value={formData.certificate_number}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Nomor Polisi (untuk kendaraan)" 
                  name="police_number"
                  value={formData.police_number}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Luas Tanah (m²)" 
                  name="land_area"
                  value={formData.land_area}
                  onChange={handleInputChange}
                  type="number" 
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Luas Bangunan (m²)" 
                  name="building_area"
                  value={formData.building_area}
                  onChange={handleInputChange}
                  type="number" 
                />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Alamat Agunan" multiline rows={2} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Nama Pemilik" 
                  name="owner_name"
                  value={formData.owner_name}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Kondisi"
                  name="condition"
                  value={formData.condition}
                  onChange={handleInputChange}
                  variant="outlined"
                  SelectProps={{
                    native: true,
                  }}
                >
                  <option value="Baik">Baik</option>
                  <option value="Cukup">Cukup</option>
                  <option value="Kurang">Kurang</option>
                  <option value="Rusak">Rusak</option>
                </TextField>
              </Grid>
            </Grid>
          )}

          {tabValue === 2 && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Perusahaan Asuransi" 
                  name="insurance_company"
                  value={formData.insurance_company}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Nomor Polis" 
                  name="policy_number"
                  value={formData.policy_number}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Tanggal Mulai Asuransi" 
                  name="insurance_start_date"
                  value={formData.insurance_start_date}
                  onChange={handleInputChange}
                  type="date" 
                  InputLabelProps={{ shrink: true }} 
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Tanggal Berakhir Asuransi" 
                  name="insurance_end_date"
                  value={formData.insurance_end_date}
                  onChange={handleInputChange}
                  type="date" 
                  InputLabelProps={{ shrink: true }} 
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Nilai Asuransi" 
                  name="insurance_value"
                  value={formData.insurance_value}
                  onChange={handleInputChange}
                  type="number" 
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Tanggal Jatuh Tempo Pajak" 
                  name="tax_due_date"
                  value={formData.tax_due_date}
                  onChange={handleInputChange}
                  type="date" 
                  InputLabelProps={{ shrink: true }} 
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Jumlah Pajak" 
                  name="tax_amount"
                  value={formData.tax_amount}
                  onChange={handleInputChange}
                  type="number" 
                />
              </Grid>
            </Grid>
          )}

          {tabValue === 3 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Upload dokumen-dokumen terkait agunan
                </Alert>
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  startIcon={<Upload />}
                  component="label"
                  fullWidth
                  sx={{ height: 100, borderStyle: 'dashed' }}
                  disabled={uploadLoading}
                >
                  {uploadLoading ? 'Mengupload...' : 'Klik untuk upload dokumen atau drag & drop'}
                  <input 
                    type="file" 
                    hidden 
                    multiple 
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" 
                    onChange={handleFileChange}
                  />
                </Button>
              </Grid>
              {uploadedFiles.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    File yang akan diupload:
                  </Typography>
                  {uploadedFiles.map((file, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </Typography>
                      <Button 
                        size="small" 
                        color="error" 
                        onClick={() => removeFile(index)}
                      >
                        Hapus
                      </Button>
                    </Box>
                  ))}
                </Grid>
              )}
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Format yang didukung: PDF, JPG, PNG, DOC, DOCX (Maksimal 10MB per file)
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Batal</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {selectedCollateral ? 'Update' : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Handover Document Dialog */}
      <Dialog
        open={handoverDialogOpen}
        onClose={handleCloseHandoverDialog}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>Berita Acara Serah Terima Dokumen</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Lengkapi detail berikut untuk menghasilkan berita acara serah terima. Semua data dapat disesuaikan sebelum dicetak.
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Judul Dokumen"
                value={handoverForm.documentTitle}
                onChange={(e) => handleHandoverFormChange('documentTitle', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Nomor Dokumen"
                value={handoverForm.documentNumber}
                onChange={(e) => handleHandoverFormChange('documentNumber', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Jenis Dokumen"
                value={handoverForm.documentKind}
                onChange={(e) => handleHandoverFormChange('documentKind', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="date"
                label="Tanggal Serah Terima"
                value={handoverForm.eventDate}
                onChange={(e) => handleHandoverFormChange('eventDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Lokasi Serah Terima"
                value={handoverForm.location}
                onChange={(e) => handleHandoverFormChange('location', e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 1 }}>
                Data Pihak Pertama
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Nama Instansi"
                value={handoverForm.firstPartyInstitution}
                onChange={(e) => handleHandoverFormChange('firstPartyInstitution', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Alamat Instansi"
                value={handoverForm.firstPartyAddress}
                onChange={(e) => handleHandoverFormChange('firstPartyAddress', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Label Tanda Tangan"
                value={handoverForm.firstPartySignatureLabel}
                onChange={(e) => handleHandoverFormChange('firstPartySignatureLabel', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nama Perwakilan"
                value={handoverForm.firstPartyRepresentative}
                onChange={(e) => handleHandoverFormChange('firstPartyRepresentative', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Jabatan Perwakilan"
                value={handoverForm.firstPartyPosition}
                onChange={(e) => handleHandoverFormChange('firstPartyPosition', e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2 }}>
                Data Pihak Kedua
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Nama Pihak Kedua"
                value={handoverForm.secondPartyName}
                onChange={(e) => handleHandoverFormChange('secondPartyName', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Peran / Status"
                value={handoverForm.secondPartyRole}
                onChange={(e) => handleHandoverFormChange('secondPartyRole', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Label Tanda Tangan"
                value={handoverForm.secondPartySignatureLabel}
                onChange={(e) => handleHandoverFormChange('secondPartySignatureLabel', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Alamat Pihak Kedua"
                value={handoverForm.secondPartyAddress}
                onChange={(e) => handleHandoverFormChange('secondPartyAddress', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Nama Penandatangan"
                value={handoverForm.secondPartyRepresentative}
                onChange={(e) => handleHandoverFormChange('secondPartyRepresentative', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Jabatan Penandatangan"
                value={handoverForm.secondPartyPosition}
                onChange={(e) => handleHandoverFormChange('secondPartyPosition', e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2 }}>
                Informasi Penandatanganan
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Jumlah Rangkap"
                value={handoverForm.copiesCount}
                onChange={(e) => handleHandoverFormChange('copiesCount', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Terbilang Rangkap"
                value={handoverForm.copiesCountInWords}
                onChange={(e) => handleHandoverFormChange('copiesCountInWords', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Kota Penandatanganan"
                value={handoverForm.closingCity}
                onChange={(e) => handleHandoverFormChange('closingCity', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="date"
                label="Tanggal Penandatanganan"
                value={handoverForm.closingDate}
                onChange={(e) => handleHandoverFormChange('closingDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
            Daftar Dokumen Jaminan
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Sesuaikan kolom di bawah ini agar rincian dokumen sesuai dengan kebutuhan berita acara.
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width="5%">No.</TableCell>
                  <TableCell width="25%">Jenis Dokumen / Nomor</TableCell>
                  <TableCell width="25%">Lokasi / Keterangan</TableCell>
                  <TableCell width="15%">Luas / Nominal</TableCell>
                  <TableCell width="15%">Penerbit</TableCell>
                  <TableCell width="15%">Atas Nama</TableCell>
                  <TableCell align="center" width="5%">
                    Aksi
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {handoverItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      Tidak ada dokumen terpilih. Tambahkan baris baru jika diperlukan.
                    </TableCell>
                  </TableRow>
                )}
                {handoverItems.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        variant="standard"
                        value={item.documentName}
                        onChange={(e) => handleHandoverItemChange(item.id, 'documentName', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        variant="standard"
                        value={item.locationDescription}
                        onChange={(e) => handleHandoverItemChange(item.id, 'locationDescription', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        variant="standard"
                        value={item.sizeOrValue}
                        onChange={(e) => handleHandoverItemChange(item.id, 'sizeOrValue', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        variant="standard"
                        value={item.issuer}
                        onChange={(e) => handleHandoverItemChange(item.id, 'issuer', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        variant="standard"
                        value={item.onBehalf}
                        onChange={(e) => handleHandoverItemChange(item.id, 'onBehalf', e.target.value)}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        aria-label="hapus"
                        color="error"
                        size="small"
                        onClick={() => handleRemoveHandoverItem(item.id)}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Button startIcon={<Add />} onClick={handleAddHandoverItem}>
              Tambah Dokumen
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseHandoverDialog}>Batal</Button>
          <Button variant="contained" onClick={handleGenerateHandoverDocument}>
            Cetak Berita Acara
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Konfirmasi Hapus Agunan</DialogTitle>
        <DialogContent>
          <Typography>
            Anda akan menghapus agunan dengan kode <strong>{collateralToDelete?.collateral_code}</strong>. 
            Tindakan ini tidak dapat dibatalkan.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Masukkan Password Anda"
            type="password"
            fullWidth
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!deleteError}
            helperText={deleteError}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Batal</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Hapus
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Collaterals;
