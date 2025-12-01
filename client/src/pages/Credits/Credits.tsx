import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  MenuItem,
  Select,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  Alert,
  Checkbox,
  Snackbar,
  Divider,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  Visibility,
  CreditCard,
  TrendingUp,
  Schedule,
  Security,
  Inventory2,
  FirstPage,
  LastPage,
  NavigateBefore,
  NavigateNext,
  Print,
} from '@mui/icons-material';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import ImportExportButtons from '../../components/ImportExportButtons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useQueryClient } from '@tanstack/react-query';
import { useCredits, CREDITS_QUERY_KEY, type CreditsParams, type Credit } from '../../hooks/queries/useCredits';
import CreditCardComponent from '../../components/Credits/CreditCard';
import CreditSkeleton from '../../components/Credits/CreditSkeleton';
import CreditsFilter from '../../components/Credits/CreditsFilter';

interface Debtor {
  id: string;
  full_name: string;
  debtor_code: string;
}

interface Insurance {
  id: string;
  policy_number: string;
  insurance_company: string;
}

interface CreditCollateral {
  id: string;
  collateral_code: string;
  type: string;
  physical_location?: string | null;
  notes?: string | null;
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
  collateral?: CreditCollateral | null;
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

interface DocumentTemplateSummary {
  id: string;
  name: string;
  template_code: string;
  document_category: string;
  version?: number;
  is_active: boolean;
  placeholders?: Record<string, unknown>;
}

const COLLATERAL_TYPES = [
  { value: 'SHM', label: 'SHM (Sertifikat Hak Milik)' },
  { value: 'SHGB', label: 'SHGB (Sertifikat Hak Guna Bangunan)' },
  { value: 'SK', label: 'SK' },
  { value: 'SK Berkala', label: 'SK Berkala' },
  { value: 'BPKB', label: 'BPKB (Kendaraan Bermotor)' },
  { value: 'Deposito', label: 'Deposito' },
  { value: 'Emas', label: 'Emas' },
  { value: 'Lainnya', label: 'Lainnya' },
];

const DEFAULT_COLLATERAL_FORM = {
  collateral_code: '',
  type: 'SHM',
  physical_location: '',
  notes: '',
};

const DEFAULT_COLLATERAL_EDIT_FORM = {
  type: 'SHM',
  physical_location: '',
  notes: '',
};

// Credit interface imported from useCredits.ts

interface Payment {
  id: string;
  credit_id: string;
  amount: number;
  principal_amount?: number | null;
  interest_amount?: number | null;
  penalty_amount?: number | null;
  payment_date: string;
  channel?: string | null;
  reference_number?: string | null;
  notes?: string | null;
}

const Credits: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Filter and pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [creditTypeFilter, setCreditTypeFilter] = useState('');
  const [creditTypes, setCreditTypes] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // React Query for credits data
  const { data, isLoading, error } = useCredits({
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    status: statusFilter,
    credit_type: creditTypeFilter
  });

  // Extract data from React Query response
  const credits = data?.credits || [];
  const pagination = data?.pagination;
  const totalPages = pagination?.total_pages || 1;
  const totalRecords = pagination?.total_records || 0;

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openCollateralDialog, setOpenCollateralDialog] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
  const [collateralCredit, setCollateralCredit] = useState<Credit | null>(null);

  // Debtor related states
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [selectedDebtor, setSelectedDebtor] = useState<Debtor | null>(null);
  const [debtorSearchTerm, setDebtorSearchTerm] = useState('');
  const [debtorLoading, setDebtorLoading] = useState(false);
  const debtorOptions = useMemo(() => {
    if (selectedDebtor && !debtors.some((debtor) => debtor.id === selectedDebtor.id)) {
      return [selectedDebtor, ...debtors];
    }
    return debtors;
  }, [debtors, selectedDebtor]);
  const [unassignedInsurances, setUnassignedInsurances] = useState<Insurance[]>([]);
  const [formData, setFormData] = useState({
    contract_number: '',
    debtor_id: '',
    credit_type: 'KPR',
    plafond: '',
    interest_rate: '',
    tenor_months: '',
    start_date: '',
    maturity_date: '',
    purpose: '',
    outstanding: '',
    insurance_id: ''
  });
  const [collateralList, setCollateralList] = useState<CreditCollateral[]>([]);
  const [collateralForm, setCollateralForm] = useState({ ...DEFAULT_COLLATERAL_FORM });
  const [collateralLoading, setCollateralLoading] = useState(false);
  const [collateralSaving, setCollateralSaving] = useState(false);
  const [editingCollateralId, setEditingCollateralId] = useState<string | null>(null);
  const [collateralEditForm, setCollateralEditForm] = useState({ ...DEFAULT_COLLATERAL_EDIT_FORM });
  const [openFileMovementDialog, setOpenFileMovementDialog] = useState(false);
  const [fileMovementCredit, setFileMovementCredit] = useState<Credit | null>(null);
  const [fileMovements, setFileMovements] = useState<CreditFileMovementLog[]>([]);
  const [fileMovementLoading, setFileMovementLoading] = useState(false);
  const [fileMovementSaving, setFileMovementSaving] = useState(false);
  const [fileMovementCollaterals, setFileMovementCollaterals] = useState<CreditCollateral[]>([]);
  const [fileMovementForm, setFileMovementForm] = useState({
    movement_type: 'OUT' as 'OUT' | 'IN',
    collateral_id: '',
    released_to: '',
    responsible_officer: '',
    expected_return_date: '',
    received_by: '',
    purpose: '',
    notes: ''
  });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const selectedEligibleCount = credits?.filter(c => selectedIds.includes(c.id) && c.status === 'Lunas')?.length || 0;

  const [handoverDialogOpen, setHandoverDialogOpen] = useState(false);
  const [handoverTemplates, setHandoverTemplates] = useState<DocumentTemplateSummary[]>([]);
  const [handoverTemplatesLoading, setHandoverTemplatesLoading] = useState(false);
  const [selectedHandoverTemplateId, setSelectedHandoverTemplateId] = useState<string>('');
  const [selectedCollateralIdsForHandover, setSelectedCollateralIdsForHandover] = useState<string[]>([]);
  const [handoverCustomFields, setHandoverCustomFields] = useState({
    handover_place: '',
    bank_officer_name: '',
    customer_representative_name: '',
    additional_notes: '',
  });
  const [generatingHandover, setGeneratingHandover] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  const debtorSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debtorFetchIdRef = useRef(0);

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // Payments state
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsTotalPages, setPaymentsTotalPages] = useState(1);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    principal_amount: '',
    interest_amount: '',
    penalty_amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  } as any);

  // Derived validation for payment form
  const paymentAmountNum = parseFloat(paymentForm.amount || '0') || 0;
  const paymentPrincipalNum = paymentForm.principal_amount
    ? (parseFloat(paymentForm.principal_amount || '0') || 0)
    : paymentAmountNum;
  const paymentInterestNum = paymentForm.interest_amount ? (parseFloat(paymentForm.interest_amount || '0') || 0) : 0;
  const paymentPenaltyNum = paymentForm.penalty_amount ? (parseFloat(paymentForm.penalty_amount || '0') || 0) : 0;
  const principalExceedsAmount = paymentPrincipalNum > paymentAmountNum;
  const principalNegative = paymentPrincipalNum < 0;
  const amountInvalid = paymentAmountNum <= 0 || Number.isNaN(paymentAmountNum);
  const principalExceedsOutstanding = selectedCredit ? paymentPrincipalNum > Number(selectedCredit.outstanding) : false;
  const interestNegative = paymentInterestNum < 0;
  const penaltyNegative = paymentPenaltyNum < 0;
  const breakdownExceedsAmount = (paymentPrincipalNum + paymentInterestNum + paymentPenaltyNum) > paymentAmountNum;
  const canSubmitPayment = !amountInvalid && !principalNegative && !principalExceedsAmount && !principalExceedsOutstanding && !interestNegative && !penaltyNegative && !breakdownExceedsAmount;

  const fetchPayments = async (creditId: number | string, page = 1, limit = 10) => {
    setPaymentsLoading(true);
    try {
      const resp = await api.get(`/payments?credit_id=${creditId}&page=${page}&limit=${limit}`);
      if (resp.data?.success) {
        setPayments(resp.data.data.payments);
        const p = resp.data.data.pagination;
        if (p) {
          setPaymentsPage(p.current_page || 1);
          setPaymentsTotalPages(p.total_pages || 1);
        }
      } else {
        setPayments([]);
        setPaymentsPage(1);
        setPaymentsTotalPages(1);
      }
    } catch (e) {
      console.error('Failed to fetch payments', e);
      setPayments([]);
      setPaymentsPage(1);
      setPaymentsTotalPages(1);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const refreshSelectedCredit = async (creditId: number | string): Promise<Credit | null> => {
    try {
      const resp = await api.get(`/credits/${creditId}`);
      if (resp.data?.success) {
        const detailedCredit = resp.data.data.credit as Credit;
        setSelectedCredit(detailedCredit);
        // Invalidate cache to update list
        queryClient.invalidateQueries({ queryKey: [CREDITS_QUERY_KEY] });
        return detailedCredit;
      }
    } catch (e) {
      console.error('Failed to refresh credit details', e);
    }
    return null;
  };

  const fetchHandoverTemplates = useCallback(async () => {
    setHandoverTemplatesLoading(true);
    try {
      const response = await api.get('/document-templates', {
        params: { document_category: 'ESSENTIALIA_HANDOVER' },
      });
      if (response.data?.success) {
        const templates = (response.data.data || []) as DocumentTemplateSummary[];
        setHandoverTemplates(templates);
        if (!templates.find((tpl) => tpl.id === selectedHandoverTemplateId)) {
          setSelectedHandoverTemplateId(templates[0]?.id || '');
        }
      }
    } catch (error) {
      console.error('Failed to fetch document templates', error);
      showSnackbar('Gagal memuat template dokumen', 'error');
    } finally {
      setHandoverTemplatesLoading(false);
    }
  }, [selectedHandoverTemplateId]);

  const fetchDebtors = useCallback(async (searchTerm = '') => {
    const requestId = ++debtorFetchIdRef.current;
    setDebtorLoading(true);
    try {
      const response = await api.get('/debtors', {
        params: {
          limit: 20,
          ...(searchTerm ? { search: searchTerm } : {})
        }
      });
      if (response.data.success && debtorFetchIdRef.current === requestId) {
        setDebtors(response.data.data.debtors || []);
      }
    } catch (error) {
      if (debtorFetchIdRef.current === requestId) {
        console.error('Error fetching debtors:', error);
      }
    } finally {
      if (debtorFetchIdRef.current === requestId) {
        setDebtorLoading(false);
      }
    }
  }, []);

  const scheduleDebtorSearch = useCallback(
    (value: string) => {
      if (debtorSearchTimeoutRef.current) {
        clearTimeout(debtorSearchTimeoutRef.current);
      }
      debtorSearchTimeoutRef.current = setTimeout(() => {
        fetchDebtors(value);
      }, 300);
    },
    [fetchDebtors]
  );

  const fetchUnassignedInsurances = async () => {
    try {
      const response = await api.get('/insurances/unassigned');
      if (response.data.success) {
        setUnassignedInsurances(response.data.data.insurances);
      }
    } catch (error) {
      console.error('Error fetching unassigned insurances:', error);
    }
  };

  const fetchCreditTypes = async () => {
    try {
      const response = await api.get('/credits/types');
      if (response.data.success) {
        setCreditTypes(response.data.data.types);
      }
    } catch (error) {
      console.error('Error fetching credit types:', error);
    }
  };

  // fetchCredits removed - handled by React Query useCredits hook

  const fetchCreditCollaterals = async (creditId: number | string) => {
    setCollateralLoading(true);
    try {
      const response = await api.get(`/credits/${creditId}`);
      if (response.data.success && response.data.data?.credit) {
        const creditData = response.data.data.credit as Credit;
        setCollateralList(creditData.Collaterals || []);
        setCollateralCredit((prev) => {
          if (!prev) return creditData;
          return { ...prev, ...creditData };
        });
      } else {
        setCollateralList([]);
      }
    } catch (error) {
      console.error('Error fetching credit collaterals:', error);
      setCollateralList([]);
      setSnackbarSeverity('error');
      setSnackbarMessage('Gagal mengambil data agunan');
      setSnackbarOpen(true);
    } finally {
      setCollateralLoading(false);
    }
  };

  const handleOpenCollateralManager = (credit: Credit) => {
    setCollateralCredit(credit);
    setCollateralForm({ ...DEFAULT_COLLATERAL_FORM });
    setEditingCollateralId(null);
    setCollateralEditForm({ ...DEFAULT_COLLATERAL_EDIT_FORM });
    setOpenCollateralDialog(true);
    fetchCreditCollaterals(credit.id);
  };

  const handleCloseCollateralDialog = () => {
    setOpenCollateralDialog(false);
    setCollateralCredit(null);
    setCollateralList([]);
    setCollateralForm({ ...DEFAULT_COLLATERAL_FORM });
    setEditingCollateralId(null);
    setCollateralEditForm({ ...DEFAULT_COLLATERAL_EDIT_FORM });
    setCollateralSaving(false);
    setCollateralLoading(false);
  };

  const handleCollateralFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCollateralForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateCollateral = async () => {
    if (!collateralCredit) return;
    if (!collateralForm.collateral_code.trim()) {
      setSnackbarSeverity('warning');
      setSnackbarMessage('Kode agunan wajib diisi');
      setSnackbarOpen(true);
      return;
    }

    setCollateralSaving(true);
    try {
      const payload = {
        credit_id: collateralCredit.id,
        collateral_code: collateralForm.collateral_code.trim(),
        type: collateralForm.type,
        physical_location: collateralForm.physical_location
          ? collateralForm.physical_location.trim()
          : undefined,
        notes: collateralForm.notes ? collateralForm.notes.trim() : undefined,
      };

      const response = await api.post('/collaterals', payload);

      if (response.data.success) {
        setSnackbarSeverity('success');
        setSnackbarMessage('Agunan berhasil ditambahkan');
        setSnackbarOpen(true);
        setCollateralForm({ ...DEFAULT_COLLATERAL_FORM });
        await fetchCreditCollaterals(collateralCredit.id);
        queryClient.invalidateQueries({ queryKey: [CREDITS_QUERY_KEY] });
      } else {
        setSnackbarSeverity('error');
        setSnackbarMessage(response.data.message || 'Gagal menambahkan agunan');
        setSnackbarOpen(true);
      }
    } catch (error: any) {
      console.error('Error creating collateral:', error);
      const errorMessage = error?.response?.data?.message || 'Gagal menambahkan agunan';
      setSnackbarSeverity('error');
      setSnackbarMessage(errorMessage);
      setSnackbarOpen(true);
    } finally {
      setCollateralSaving(false);
    }
  };

  const handleStartEditCollateral = (collateral: CreditCollateral) => {
    setEditingCollateralId(collateral.id);
    setCollateralEditForm({
      type: collateral.type || 'SHM',
      physical_location: collateral.physical_location || '',
      notes: collateral.notes || '',
    });
  };

  const handleCollateralEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCollateralEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdateCollateral = async () => {
    if (!editingCollateralId || !collateralCredit) return;
    setCollateralSaving(true);
    try {
      const payload = {
        type: collateralEditForm.type,
        physical_location: collateralEditForm.physical_location
          ? collateralEditForm.physical_location.trim()
          : null,
        notes: collateralEditForm.notes ? collateralEditForm.notes.trim() : null,
      };

      const response = await api.put(`/collaterals/${editingCollateralId}`, payload);
      if (response.data.success) {
        setSnackbarSeverity('success');
        setSnackbarMessage('Agunan berhasil diperbarui');
        setSnackbarOpen(true);
        setEditingCollateralId(null);
        setCollateralEditForm({ ...DEFAULT_COLLATERAL_EDIT_FORM });
        await fetchCreditCollaterals(collateralCredit.id);
        queryClient.invalidateQueries({ queryKey: [CREDITS_QUERY_KEY] });
      } else {
        setSnackbarSeverity('error');
        setSnackbarMessage(response.data.message || 'Gagal memperbarui agunan');
        setSnackbarOpen(true);
      }
    } catch (error: any) {
      console.error('Error updating collateral:', error);
      const errorMessage = error?.response?.data?.message || 'Gagal memperbarui agunan';
      setSnackbarSeverity('error');
      setSnackbarMessage(errorMessage);
      setSnackbarOpen(true);
    } finally {
      setCollateralSaving(false);
    }
  };

  const resetFileMovementForm = () => {
    setFileMovementForm({
      movement_type: 'OUT',
      collateral_id: '',
      released_to: '',
      responsible_officer: '',
      expected_return_date: '',
      received_by: '',
      purpose: '',
      notes: ''
    });
  };

  const fetchFileMovements = async (creditId: number | string) => {
    setFileMovementLoading(true);
    try {
      const response = await api.get(`/credits/${creditId}/file-movements`);
      if (response.data.success) {
        setFileMovements(response.data.data.movements || []);
      } else {
        setFileMovements([]);
        showSnackbar(response.data.message || 'Gagal mengambil riwayat berkas', 'error');
      }
    } catch (error) {
      console.error('Error fetching file movements:', error);
      setFileMovements([]);
      showSnackbar('Gagal mengambil riwayat berkas', 'error');
    } finally {
      setFileMovementLoading(false);
    }
  };

  const handleOpenFileMovementDialog = async (credit: Credit) => {
    setFileMovementCredit(credit);
    setOpenFileMovementDialog(true);
    resetFileMovementForm();
    setFileMovementCollaterals([]);
    setFileMovements([]);
    try {
      await fetchFileMovements(credit.id);
      const creditDetailResp = await api.get(`/credits/${credit.id}`);
      if (creditDetailResp.data.success) {
        const creditData = creditDetailResp.data.data.credit;
        setFileMovementCollaterals(creditData?.Collaterals || []);
      }
    } catch (error) {
      console.error('Error preparing file movement dialog:', error);
      showSnackbar('Gagal menyiapkan data berkas', 'error');
    }
  };

  const handleCloseFileMovementDialog = () => {
    setOpenFileMovementDialog(false);
    setFileMovementCredit(null);
    setFileMovements([]);
    resetFileMovementForm();
    setFileMovementCollaterals([]);
    setFileMovementSaving(false);
  };

  const handleFileMovementInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFileMovementForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileMovementTypeChange = (value: 'OUT' | 'IN') => {
    setFileMovementForm((prev) => ({
      ...prev,
      movement_type: value,
      released_to: value === 'OUT' ? prev.released_to : '',
      responsible_officer: value === 'OUT' ? prev.responsible_officer : '',
      expected_return_date: value === 'OUT' ? prev.expected_return_date : '',
      received_by: value === 'IN' ? (prev.received_by || user?.full_name || '') : '',
    }));
  };

  const handleSubmitFileMovement = async () => {
    if (!fileMovementCredit) return;

    if (fileMovementForm.movement_type === 'OUT') {
      if (!fileMovementForm.released_to.trim() || !fileMovementForm.responsible_officer.trim()) {
        showSnackbar('Nama penerima dan penanggung jawab wajib diisi saat berkas keluar', 'warning');
        return;
      }
    }

    if (fileMovementForm.movement_type === 'IN') {
      if (!fileMovementForm.received_by.trim()) {
        showSnackbar('Penerima wajib diisi saat berkas kembali', 'warning');
        return;
      }
    }

    setFileMovementSaving(true);
    try {
      const payload: Record<string, any> = {
        movement_type: fileMovementForm.movement_type,
        purpose: fileMovementForm.purpose || undefined,
        notes: fileMovementForm.notes || undefined
      };

      if (fileMovementForm.collateral_id) {
        payload.collateral_id = fileMovementForm.collateral_id;
      }

      if (fileMovementForm.movement_type === 'OUT') {
        payload.released_to = fileMovementForm.released_to.trim();
        payload.responsible_officer = fileMovementForm.responsible_officer.trim();
        if (fileMovementForm.expected_return_date) {
          payload.expected_return_date = fileMovementForm.expected_return_date;
        }
      } else if (fileMovementForm.movement_type === 'IN') {
        payload.received_by = fileMovementForm.received_by.trim() || user?.full_name;
      }

      const response = await api.post(
        `/credits/${fileMovementCredit.id}/file-movements`,
        payload
      );

      if (response.data.success) {
        await fetchFileMovements(fileMovementCredit.id);
        setFileMovementForm((prev) => ({
          movement_type: prev.movement_type,
          collateral_id: '',
          released_to: '',
          responsible_officer: '',
          expected_return_date: '',
          received_by: prev.movement_type === 'IN' ? (user?.full_name || '') : '',
          purpose: '',
          notes: ''
        }));
        showSnackbar('Pergerakan berkas berhasil dicatat', 'success');
      } else {
        showSnackbar(response.data.message || 'Gagal mencatat pergerakan berkas', 'error');
      }
    } catch (error: any) {
      console.error('Error submitting file movement:', error);
      const errorMessage = error?.response?.data?.message || 'Gagal mencatat pergerakan berkas';
      showSnackbar(errorMessage, 'error');
    } finally {
      setFileMovementSaving(false);
    }
  };

  useEffect(() => {
    // React Query will auto-fetch on mount
    fetchDebtors('');
    fetchUnassignedInsurances();
    fetchCreditTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (debtorSearchTimeoutRef.current) {
        clearTimeout(debtorSearchTimeoutRef.current);
      }
    };
  }, []);

  // React Query will auto-refetch when searchTerm, statusFilter, or creditTypeFilter changes
  // No need for manual debounce useEffect

  useEffect(() => {
    if (
      handoverDialogOpen &&
      !handoverTemplatesLoading &&
      handoverTemplates.length === 0
    ) {
      fetchHandoverTemplates();
    }
  }, [
    handoverDialogOpen,
    handoverTemplates.length,
    handoverTemplatesLoading,
    fetchHandoverTemplates,
  ]);

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // React Query will auto-refetch with new page
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    // React Query will auto-refetch with new page size
  };

  // Since we're using server-side filtering, we don't need client-side filtering
  const filteredCredits = credits || [];

  // Convert collectibility code to status label
  const getStatusFromCollectibility = (collectibility: string | number) => {
    const code = typeof collectibility === 'string' ? parseInt(collectibility) : collectibility;
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
        return collectibility?.toString() || 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Lancar':
        return 'success';
      case 'Dalam Perhatian Khusus':
        return 'warning';
      case 'Kurang Lancar':
        return 'error';
      case 'Diragukan':
        return 'error';
      case 'Macet':
        return 'error';
      case 'Lunas':
        return 'info';
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

  const getCollateralTypeLabel = (type: string) => {
    return COLLATERAL_TYPES.find((item) => item.value === type)?.label || type;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateProgress = (plafond: number, outstanding: number) => {
    return ((plafond - outstanding) / plafond) * 100;
  };

  const handleOpenDialog = (credit?: Credit) => {
    // Fetch the latest list of unassigned insurances every time dialog opens
    fetchUnassignedInsurances();
    fetchDebtors('');

    if (credit) {
      setSelectedCredit(credit);
      const linkedInsurance = credit.Insurances && credit.Insurances.length > 0 ? credit.Insurances[0] : null;
      setFormData({
        contract_number: credit.contract_number,
        debtor_id: credit.Debtor?.id || '',
        credit_type: credit.credit_type,
        plafond: credit.plafond.toString(),
        interest_rate: credit.interest_rate.toString(),
        tenor_months: credit.tenor_months.toString(),
        start_date: credit.start_date,
        maturity_date: credit.maturity_date,
        purpose: '',
        outstanding: credit.outstanding.toString(),
        insurance_id: linkedInsurance ? linkedInsurance.id : ''
      });
      if (credit.Debtor) {
        setSelectedDebtor(credit.Debtor);
        setDebtorSearchTerm(`${credit.Debtor.full_name} (${credit.Debtor.debtor_code})`);
      } else {
        setSelectedDebtor(null);
        setDebtorSearchTerm('');
      }
    } else {
      setSelectedCredit(null);
      setFormData({
        contract_number: '',
        debtor_id: '',
        credit_type: 'KPR',
        plafond: '',
        interest_rate: '',
        tenor_months: '',
        start_date: '',
        maturity_date: '',
        purpose: '',
        outstanding: '',
        insurance_id: ''
      });
      setSelectedDebtor(null);
      setDebtorSearchTerm('');
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCredit(null);
    setSelectedDebtor(null);
    setDebtorSearchTerm('');
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredCredits?.map(c => c.id) || []);
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkSetLunas = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Set status Lunas untuk ${selectedIds.length} kredit? Outstanding akan diset ke 0.`)) return;
    try {
      const response = await api.patch('/credits/bulk-status', {
        ids: selectedIds,
        status: 'Lunas',
        collectibility: '1',
        last_payment_date: new Date().toISOString().split('T')[0]
      });
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: [CREDITS_QUERY_KEY] });
      showSnackbar(response.data?.message || 'Berhasil mengubah status kredit', 'success');
    } catch (error: any) {
      console.error('Bulk set Lunas error:', error);
      alert(`Gagal update status massal: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleBulkDelete = async () => {
    const eligibleIds = credits?.filter(c => selectedIds.includes(c.id) && c.status === 'Lunas')?.map(c => c.id) || [];
    if (eligibleIds.length === 0) return;
    if (!window.confirm(`Hapus ${eligibleIds.length} kredit berstatus Lunas?`)) return;
    try {
      const response = await api.post('/credits/bulk-delete', { ids: eligibleIds });
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: [CREDITS_QUERY_KEY] });
      showSnackbar(response.data?.message || 'Berhasil menghapus kredit', 'success');
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      alert(`Gagal hapus massal: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleInputChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name as string]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    try {
      if (selectedCredit) {
        await api.put(`/credits/${selectedCredit.id}`, formData);
        showSnackbar('Kredit berhasil diperbarui', 'success');
      } else {
        await api.post('/credits', formData);
        showSnackbar('Kredit berhasil dibuat', 'success');
      }

      // Invalidate React Query cache to refetch
      queryClient.invalidateQueries({ queryKey: [CREDITS_QUERY_KEY] });
      handleCloseDialog();
    } catch (error: any) {
      console.error('Error saving credit:', error);
      const serverErrors = error.response?.data?.errors;
      let alertMessage = error.response?.data?.message || 'Terjadi kesalahan saat menyimpan data.';
      if (serverErrors && Array.isArray(serverErrors) && serverErrors.length > 0) {
        alertMessage = serverErrors.map((err: any) => err.msg).join('\n');
      }
      alert(`Gagal menyimpan data:\n${alertMessage}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data kredit ini?')) {
      try {
        await api.delete(`/credits/${id}`);
        showSnackbar('Kredit berhasil dihapus', 'success');
        // Invalidate cache to refetch
        queryClient.invalidateQueries({ queryKey: [CREDITS_QUERY_KEY] });
      } catch (error: any) {
        console.error('Error deleting credit:', error);
        alert(`Gagal menghapus kredit: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const handleView = (credit: Credit) => {
    setSelectedCredit(credit);
    setPaymentsPage(1);
    fetchPayments(credit.id, 1, 10);
    refreshSelectedCredit(credit.id);
    setOpenViewDialog(true);
  };

  const handleOpenHandoverDialog = async () => {
    if (!selectedCredit) return;

    let creditForDialog = selectedCredit;
    if (
      !creditForDialog.Collaterals ||
      creditForDialog.Collaterals.length === 0
    ) {
      const refreshed = await refreshSelectedCredit(selectedCredit.id);
      if (refreshed) {
        creditForDialog = refreshed;
      }
    }

    const defaultCollaterals =
      creditForDialog.Collaterals?.map((item) => item.id) || [];
    setSelectedCollateralIdsForHandover(defaultCollaterals);
    setHandoverCustomFields({
      handover_place: '',
      bank_officer_name: user?.full_name || '',
      customer_representative_name:
        creditForDialog.Debtor?.full_name || selectedCredit.Debtor?.full_name || '',
      additional_notes: '',
    });
    setHandoverDialogOpen(true);
  };

  const handleCloseHandoverDialog = () => {
    setHandoverDialogOpen(false);
  };

  const handleToggleCollateralSelection = (collateralId: string) => {
    setSelectedCollateralIdsForHandover((prev) =>
      prev.includes(collateralId)
        ? prev.filter((id) => id !== collateralId)
        : [...prev, collateralId]
    );
  };

  const handleHandoverCustomFieldChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setHandoverCustomFields((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGenerateHandoverDocument = async () => {
    if (!selectedCredit) return;
    if (!selectedHandoverTemplateId) {
      showSnackbar('Pilih template dokumen terlebih dahulu', 'warning');
      return;
    }
    if (selectedCollateralIdsForHandover.length === 0) {
      showSnackbar('Pilih minimal satu agunan untuk dicetak', 'warning');
      return;
    }

    setGeneratingHandover(true);
    try {
      const payload = {
        credit_id: selectedCredit.id,
        template_id: selectedHandoverTemplateId,
        collateral_ids: selectedCollateralIdsForHandover,
        custom_fields: {
          handover_place: handoverCustomFields.handover_place,
          bank_officer_name:
            handoverCustomFields.bank_officer_name || user?.full_name,
          customer_representative_name:
            handoverCustomFields.customer_representative_name ||
            selectedCredit.Debtor?.full_name,
          additional_notes: handoverCustomFields.additional_notes,
        },
      };

      const response = await api.post('/documents/essentialia/render', payload);
      if (response.data?.success) {
        const { html, filename } = response.data.data;
        const printWindow = window.open('', '_blank', 'noopener');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.title = filename;
          printWindow.document.close();
          printWindow.focus();
        } else {
          const blob = new Blob([html], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          showSnackbar(
            'Pratinjau diblokir, file HTML berhasil diunduh',
            'info'
          );
        }
      } else {
        showSnackbar('Gagal membuat dokumen serah terima', 'error');
      }
    } catch (error: any) {
      console.error('Generate handover document error:', error);
      const message =
        error.response?.data?.message || 'Gagal membuat dokumen serah terima';
      showSnackbar(message, 'error');
    } finally {
      setGeneratingHandover(false);
    }
  };

  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
    setSelectedCredit(null);
    setPayments([]);
    setPaymentsPage(1);
    setPaymentsTotalPages(1);
    setPaymentForm({ amount: '', principal_amount: '', interest_amount: '', penalty_amount: '', payment_date: new Date().toISOString().split('T')[0], notes: '' });
  };

  const handlePaymentInput = (e: any) => {
    setPaymentForm({ ...paymentForm, [e.target.name]: e.target.value });
  };

  const handleAddPayment = async () => {
    if (!selectedCredit) return;
    const amount = parseFloat(paymentForm.amount);
    const principal = paymentForm.principal_amount ? parseFloat(paymentForm.principal_amount) : amount;
    const interest = paymentForm.interest_amount ? parseFloat(paymentForm.interest_amount) : 0;
    const penalty = paymentForm.penalty_amount ? parseFloat(paymentForm.penalty_amount) : 0;
    if (!amount || amount <= 0) {
      alert('Nominal pembayaran harus lebih dari 0');
      return;
    }
    if (principal < 0) {
      alert('Pokok tidak boleh bernilai negatif');
      return;
    }
    if (principal > amount) {
      alert('Pokok tidak boleh melebihi nominal pembayaran');
      return;
    }
    if (selectedCredit && principal > Number(selectedCredit.outstanding)) {
      alert('Pokok melebihi outstanding kredit');
      return;
    }
    if (interest < 0 || penalty < 0) {
      alert('Bunga dan denda tidak boleh negatif');
      return;
    }
    if (principal + interest + penalty > amount) {
      alert('Rincian (pokok+bunga+denda) melebihi nominal pembayaran');
      return;
    }
    try {
      await api.post('/payments', {
        credit_id: selectedCredit.id,
        amount,
        principal_amount: principal,
        interest_amount: interest || undefined,
        penalty_amount: penalty || undefined,
        payment_date: paymentForm.payment_date,
        notes: paymentForm.notes || undefined,
      });
      showSnackbar('Pembayaran berhasil dicatat', 'success');
      await fetchPayments(selectedCredit.id, paymentsPage, 10);
      await refreshSelectedCredit(selectedCredit.id);
      setPaymentForm({ amount: '', principal_amount: '', interest_amount: '', penalty_amount: '', payment_date: new Date().toISOString().split('T')[0], notes: '' });
    } catch (error: any) {
      console.error('Add payment error:', error);
      alert(`Gagal mencatat pembayaran: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!selectedCredit) return;
    if (!window.confirm('Hapus pembayaran ini?')) return;
    try {
      await api.delete(`/payments/${paymentId}`);
      showSnackbar('Pembayaran berhasil dihapus', 'success');
      await fetchPayments(selectedCredit.id, paymentsPage, 10);
      await refreshSelectedCredit(selectedCredit.id);
    } catch (error: any) {
      console.error('Delete payment error:', error);
      alert(`Gagal menghapus pembayaran: ${error.response?.data?.message || error.message}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePrintPDF = () => {
    if (selectedIds.length === 0) {
      showSnackbar('Pilih setidaknya satu kredit untuk dicetak ke PDF', 'warning');
      return;
    }

    const doc = new jsPDF();
    const selectedCredits = credits.filter(c => selectedIds.includes(c.id));

    autoTable(doc, {
      head: [['No. Kontrak', 'Nama Debitur', 'Plafond', 'Saldo Akhir', 'Kolektibilitas']],
      body: selectedCredits.map(c => [
        c.contract_number,
        c.Debtor?.full_name || 'N/A',
        formatCurrency(c.plafond),
        formatCurrency(c.outstanding),
        getStatusFromCollectibility(c.collectibility),
      ]),
      startY: 20,
      didDrawPage: (data) => {
        // Header
        doc.setFontSize(20);
        doc.setTextColor(40);
        doc.text('Laporan Data Kredit Terpilih', data.settings.margin.left, 15);
      },
    });

    doc.save('laporan-kredit-terpilih.pdf');
  };

  return (
    <Box>
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #printableArea, #printableArea * {
              visibility: visible;
            }
            #printableArea {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none;
            }
          }
        `}
      </style>
      <Box className="no-print" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Manajemen Kredit
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={handlePrint}
          >
            Cetak
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Print />}
            onClick={handlePrintPDF}
            disabled={selectedIds.length === 0}
            title={selectedIds.length === 0 ? 'Pilih kredit untuk dicetak ke PDF' : 'Cetak data terpilih ke PDF'}
          >
            Cetak PDF ({selectedIds.length})
          </Button>
          <ImportExportButtons
            onImportComplete={() => queryClient.invalidateQueries({ queryKey: [CREDITS_QUERY_KEY] })}
            exportPath="/credits/export"
            templatePath="/credits/template"
            importPath="/credits/import"
            templateFilename="template-data-kredit.xlsx"
            dialogTitle="Import Data Kredit"
            errorPrimaryBuilder={(e) => `Baris ${e.row}: ${e.error}`}
            errorSecondaryBuilder={(data) => (
              <>
                <strong>Data:</strong> {data['No. Kontrak'] || 'N/A'} - {data['Kode Debitur'] || 'N/A'}
              </>
            )}
          />
          {(user?.role === 'admin' || user?.role === 'analyst') && (
            <Button
              variant="outlined"
              color="secondary"
              disabled={selectedIds.length === 0}
              onClick={handleBulkSetLunas}
            >
              Set Lunas ({selectedIds.length})
            </Button>
          )}
          {user?.role === 'admin' && (
            <Button
              variant="outlined"
              color="error"
              disabled={selectedEligibleCount === 0}
              onClick={handleBulkDelete}
              title={selectedEligibleCount === 0 ? 'Hapus massal hanya untuk kredit berstatus Lunas' : 'Hapus massal (Lunas saja)'}
            >
              Hapus ({selectedEligibleCount})
            </Button>
          )}
          {(user?.role === 'admin' || user?.role === 'analyst') && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
            >
              Tambah Kredit
            </Button>
          )}
        </Box>
      </Box>

      {/* Filter Section */}
      <Box className="no-print" sx={{ mb: 3 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Catatan: Hanya kredit dengan status <strong>Lunas</strong> yang dapat dihapus.
        </Alert>

        <CreditsFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          creditTypeFilter={creditTypeFilter}
          onCreditTypeFilterChange={setCreditTypeFilter}
          creditTypes={creditTypes}
          totalRecords={totalRecords}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Box>
            <FormControl size="small" sx={{ minWidth: 120 }}>
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
      </Box>

      {/* Card Grid Layout (Screen Only) */}
      <Box className="no-print" sx={{ mb: 3 }}>
        {/* Loading State */}
        {isLoading && (
          <Grid container spacing={2}>
            {[...Array(Math.min(pageSize, 12))].map((_, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                <CreditSkeleton />
              </Grid>
            ))}
          </Grid>
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error">
            Gagal memuat data kredit. Silakan coba lagi.
          </Alert>
        )}

        {/* Credits Grid */}
        {!isLoading && !error && (
          <>
            {credits.length === 0 ? (
              <Alert severity="info">
                Tidak ada data kredit yang ditemukan.
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {credits.map((credit) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={credit.id}>
                    <CreditCardComponent
                      credit={credit}
                      onView={() => handleView(credit)}
                      onEdit={
                        user?.role === 'admin' || user?.role === 'analyst'
                          ? () => handleOpenDialog(credit)
                          : undefined
                      }
                      onDelete={
                        user?.role === 'admin'
                          ? () => handleDelete(credit.id)
                          : undefined
                      }
                      canEdit={user?.role === 'admin' || user?.role === 'analyst'}
                      canDelete={user?.role === 'admin'}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}
      </Box>

      {/* Table Layout (Print Only) - Hidden from screen */}
      <TableContainer component={Paper} id="printableArea" sx={{ display: 'none', '@media print': { display: 'block' } }}>
        <Typography variant="h6" gutterBottom sx={{ m: 2, display: 'none', '@media print': { display: 'block' } }}>
          Laporan Data Kredit
        </Typography>
        <Table>
          <TableHead>
            <TableRow>
              {(user?.role === 'admin' || user?.role === 'analyst') && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedIds.length > 0 && selectedIds.length < (filteredCredits?.length || 0)}
                    checked={(filteredCredits?.length || 0) > 0 && selectedIds.length === (filteredCredits?.length || 0)}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                  />
                </TableCell>
              )}
              <TableCell>No. Perjanjian</TableCell>
              <TableCell>Rekening</TableCell>
              <TableCell>Nama</TableCell>
              <TableCell>Jenis Pinjaman</TableCell>
              <TableCell>Plafond</TableCell>
              <TableCell>Saldo Akhir</TableCell>
              <TableCell>Bunga (%)</TableCell>
              <TableCell>Jangka Waktu (Bln)</TableCell>
              <TableCell>Tgl Mulai</TableCell>
              <TableCell>Tgl JT</TableCell>
              <TableCell>Kolektibilitas</TableCell>
              <TableCell className="no-print">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCredits?.map((credit) => (
              <TableRow key={credit.id} hover>
                {(user?.role === 'admin' || user?.role === 'analyst') && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.includes(credit.id)}
                      onChange={() => toggleSelect(credit.id)}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <Chip label={credit.contract_number} color="primary" variant="outlined" size="small" />
                </TableCell>
                <TableCell>{credit.account_number || '-'}</TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {credit.Debtor?.full_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {credit.Debtor?.debtor_code}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={credit.credit_type} variant="outlined" size="small" />
                </TableCell>
                <TableCell>{formatCurrency(credit.plafond)}</TableCell>
                <TableCell>{formatCurrency(credit.outstanding)}</TableCell>
                <TableCell>{credit.interest_rate}%</TableCell>
                <TableCell>{credit.tenor_months}</TableCell>
                <TableCell>{formatDate(credit.start_date)}</TableCell>
                <TableCell>{formatDate(credit.maturity_date)}</TableCell>
                <TableCell>
                  <Chip
                    label={getStatusFromCollectibility(credit.collectibility)}
                    color={getStatusColor(getStatusFromCollectibility(credit.collectibility)) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell className="no-print">
                  {(user?.role === 'admin' || user?.role === 'analyst') && (
                    <IconButton
                      size="small"
                      title="Kelola Agunan"
                      onClick={() => handleOpenCollateralManager(credit)}
                    >
                      <Security />
                    </IconButton>
                  )}
                  {(user?.role === 'admin' || user?.role === 'analyst') && (
                    <IconButton
                      size="small"
                      title="Catat Pergerakan Berkas"
                      onClick={() => handleOpenFileMovementDialog(credit)}
                    >
                      <Inventory2 />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    title="Lihat Detail"
                    onClick={() => handleView(credit)}
                  >
                    <Visibility />
                  </IconButton>
                  {(user?.role === 'admin' || user?.role === 'analyst') && (
                    <IconButton
                      size="small"
                      title="Edit"
                      onClick={() => handleOpenDialog(credit)}
                    >
                      <Edit />
                    </IconButton>
                  )}
                  {user?.role === 'admin' && (
                    <IconButton
                      size="small"
                      color="error"
                      title={credit.status === 'Lunas' ? 'Hapus' : 'Hapus (hanya jika status Lunas)'}
                      onClick={() => handleDelete(credit.id)}
                      disabled={credit.status !== 'Lunas'}
                    >
                      <Delete />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination Controls */}
      <Box className="no-print" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Menampilkan {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalRecords)} dari {totalRecords} kredit
          {(searchTerm || statusFilter || creditTypeFilter) && (
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
        </Box>
      </Box>

      {/* View Credit Dialog */}
      <Dialog open={openViewDialog} onClose={handleCloseViewDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Detail Kredit</DialogTitle>
        <DialogContent>
          {selectedCredit && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6">{selectedCredit.Debtor?.full_name}</Typography>
              <Typography color="text.secondary" gutterBottom>No. Perjanjian: {selectedCredit.contract_number}</Typography>
              <Typography color="text.secondary" gutterBottom>Rekening: {selectedCredit.account_number || '-'}</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', my: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<Print />}
                  onClick={handleOpenHandoverDialog}
                  disabled={!selectedCredit.Collaterals || selectedCredit.Collaterals.length === 0}
                >
                  Cetak Serah Terima Jaminan
                </Button>
              </Box>
              <Grid container spacing={1} sx={{ mt: 2 }}>
                <Grid item xs={6}><Typography variant="body2"><strong>Jenis Pinjaman:</strong></Typography></Grid>
                <Grid item xs={6}><Typography variant="body2">{selectedCredit.credit_type}</Typography></Grid>

                <Grid item xs={6}><Typography variant="body2"><strong>Plafond:</strong></Typography></Grid>
                <Grid item xs={6}><Typography variant="body2">{formatCurrency(selectedCredit.plafond)}</Typography></Grid>

                <Grid item xs={6}><Typography variant="body2"><strong>Saldo Akhir:</strong></Typography></Grid>
                <Grid item xs={6}><Typography variant="body2">{formatCurrency(selectedCredit.outstanding)}</Typography></Grid>

                <Grid item xs={6}><Typography variant="body2"><strong>Bunga (%):</strong></Typography></Grid>
                <Grid item xs={6}><Typography variant="body2">{selectedCredit.interest_rate}%</Typography></Grid>

                <Grid item xs={6}><Typography variant="body2"><strong>Jangka Waktu (Bln):</strong></Typography></Grid>
                <Grid item xs={6}><Typography variant="body2">{selectedCredit.tenor_months} bulan</Typography></Grid>

                <Grid item xs={6}><Typography variant="body2"><strong>Tgl Mulai:</strong></Typography></Grid>
                <Grid item xs={6}><Typography variant="body2">{formatDate(selectedCredit.start_date)}</Typography></Grid>

                <Grid item xs={6}><Typography variant="body2"><strong>Tgl JT:</strong></Typography></Grid>
                <Grid item xs={6}><Typography variant="body2">{formatDate(selectedCredit.maturity_date)}</Typography></Grid>

                <Grid item xs={6}><Typography variant="body2"><strong>Kolektibilitas:</strong></Typography></Grid>
                <Grid item xs={6}><Chip label={getStatusFromCollectibility(selectedCredit.collectibility)} color={getStatusColor(getStatusFromCollectibility(selectedCredit.collectibility)) as any} size="small" /></Grid>

                {selectedCredit.Insurances && selectedCredit.Insurances.length > 0 && (
                  <>
                    <Grid item xs={12}><Divider sx={{ my: 1 }}><Chip label="Asuransi" /></Divider></Grid>
                    <Grid item xs={6}><Typography variant="body2"><strong>No. Polis:</strong></Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2">{selectedCredit.Insurances[0].policy_number}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2"><strong>Perusahaan:</strong></Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2">{selectedCredit.Insurances[0].insurance_company}</Typography></Grid>
                  </>
                )}
              </Grid>

              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>Pembayaran</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, gap: 1, flexWrap: 'wrap' }}>
                {(selectedCredit && (user?.role === 'admin' || user?.role === 'analyst')) && (
                  <ImportExportButtons
                    exportPath={`/payments/export?credit_id=${selectedCredit.id}`}
                    templatePath={'/payments/template?mode=credit'}
                    importPath={`/payments/import/${selectedCredit.id}`}
                    templateFilename={'template-pembayaran-kredit.xlsx'}
                    dialogTitle={'Import Pembayaran (Kredit ini)'}
                    onImportComplete={() => selectedCredit && fetchPayments(selectedCredit.id, 1, 10)}
                    onImportSuccess={(result: any) => showSnackbar(`Import pembayaran: ${result.success} berhasil, ${result.failed} gagal`, result.failed ? 'warning' : 'success')}
                    onExportSuccess={() => showSnackbar('Berhasil mengekspor pembayaran', 'success')}
                    errorPrimaryBuilder={(e) => `Baris ${e.row}: ${e.error}`}
                    errorSecondaryBuilder={(data) => (
                      <>
                        <strong>Data:</strong> {data['Tanggal'] || 'N/A'} - {data['Nominal'] || 'N/A'}
                      </>
                    )}
                  />
                )}
                <Button
                  size="small"
                  variant="outlined"
                  onClick={async () => {
                    if (!selectedCredit) return;
                    try {
                      const resp = await api.get(`/payments/export?credit_id=${selectedCredit.id}`, { responseType: 'blob' });
                      const url = window.URL.createObjectURL(new Blob([resp.data]));
                      const link = document.createElement('a');
                      link.href = url;
                      link.setAttribute('download', 'pembayaran.xlsx');
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      window.URL.revokeObjectURL(url);
                      showSnackbar('Berhasil mengekspor pembayaran', 'success');
                    } catch (e: any) {
                      console.error('Export payments error:', e);
                      alert('Gagal mengekspor pembayaran');
                    }
                  }}
                >
                  Export Pembayaran
                </Button>
              </Box>

              {paymentsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tanggal</TableCell>
                      <TableCell align="right">Nominal</TableCell>
                      <TableCell align="right">Pokok</TableCell>
                      <TableCell align="right">Bunga</TableCell>
                      <TableCell align="right">Denda</TableCell>
                      <TableCell>Catatan</TableCell>
                      {user?.role === 'admin' && (<TableCell>Aksi</TableCell>)}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.map(p => (
                      <TableRow key={p.id}>
                        <TableCell>{new Date(p.payment_date).toLocaleDateString('id-ID')}</TableCell>
                        <TableCell align="right">{formatCurrency(Number(p.amount))}</TableCell>
                        <TableCell align="right">{formatCurrency(Number(p.principal_amount ?? p.amount))}</TableCell>
                        <TableCell align="right">{formatCurrency(Number(p.interest_amount ?? 0))}</TableCell>
                        <TableCell align="right">{formatCurrency(Number(p.penalty_amount ?? 0))}</TableCell>
                        <TableCell>{p.notes || '-'}</TableCell>
                        {user?.role === 'admin' && (
                          <TableCell>
                            <IconButton size="small" color="error" onClick={() => handleDeletePayment(p.id)}>
                              <Delete />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {payments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={user?.role === 'admin' ? 7 : 6}>
                          <Typography variant="body2" color="text.secondary">Belum ada pembayaran.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
              {!paymentsLoading && paymentsTotalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                  <Typography variant="caption">Halaman {paymentsPage} dari {paymentsTotalPages}</Typography>
                  <Box>
                    <Button size="small" disabled={paymentsPage <= 1} onClick={() => selectedCredit && fetchPayments(selectedCredit.id, paymentsPage - 1, 10)}>Sebelumnya</Button>
                    <Button size="small" disabled={paymentsPage >= paymentsTotalPages} onClick={() => selectedCredit && fetchPayments(selectedCredit.id, paymentsPage + 1, 10)}>Berikutnya</Button>
                  </Box>
                </Box>
              )}

              {(user?.role === 'admin' || user?.role === 'analyst') && (
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={1}>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        label="Nominal"
                        name="amount"
                        value={paymentForm.amount}
                        onChange={handlePaymentInput}
                        type="number"
                        error={amountInvalid}
                        helperText={amountInvalid ? 'Nominal harus lebih dari 0' : ' '}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        label="Pokok"
                        name="principal_amount"
                        value={paymentForm.principal_amount}
                        onChange={handlePaymentInput}
                        type="number"
                        error={principalNegative || principalExceedsAmount || principalExceedsOutstanding}
                        helperText={
                          principalNegative
                            ? 'Pokok tidak boleh negatif'
                            : principalExceedsAmount
                              ? 'Pokok tidak boleh melebihi nominal'
                              : principalExceedsOutstanding
                                ? 'Pokok melebihi outstanding'
                                : 'Biarkan kosong untuk sama dengan nominal'
                        }
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        label="Bunga"
                        name="interest_amount"
                        value={paymentForm.interest_amount}
                        onChange={handlePaymentInput}
                        type="number"
                        error={interestNegative}
                        helperText={interestNegative ? 'Bunga tidak boleh negatif' : 'Opsional'}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        label="Denda"
                        name="penalty_amount"
                        value={paymentForm.penalty_amount}
                        onChange={handlePaymentInput}
                        type="number"
                        error={penaltyNegative}
                        helperText={penaltyNegative ? 'Denda tidak boleh negatif' : 'Opsional'}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth label="Tanggal" name="payment_date" type="date" value={paymentForm.payment_date} onChange={handlePaymentInput} InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid item xs={12}>
                      {breakdownExceedsAmount && (
                        <Alert severity="warning" sx={{ mb: 1 }}>
                          Rincian (pokok+bunga+denda) melebihi nominal pembayaran.
                        </Alert>
                      )}
                      <TextField fullWidth label="Catatan" name="notes" value={paymentForm.notes} onChange={handlePaymentInput} />
                    </Grid>
                    <Grid item xs={12}>
                      <Button variant="contained" onClick={handleAddPayment} disabled={!canSubmitPayment}>
                        Tambah Pembayaran
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Tutup</Button>
        </DialogActions>
      </Dialog>

      {/* Collateral Manager Dialog */}
      <Dialog open={handoverDialogOpen} onClose={handleCloseHandoverDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Cetak Dokumen Serah Terima</DialogTitle>
        <DialogContent dividers>
          {handoverTemplatesLoading ? (
            <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <>
              <FormControl fullWidth margin="normal">
                <InputLabel id="handover-template-label">Template Dokumen</InputLabel>
                <Select
                  labelId="handover-template-label"
                  label="Template Dokumen"
                  value={selectedHandoverTemplateId}
                  onChange={(event) => setSelectedHandoverTemplateId(event.target.value as string)}
                >
                  {handoverTemplates.map((template) => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.name} {template.version ? `(v${template.version})` : ''}
                    </MenuItem>
                  ))}
                  {handoverTemplates.length === 0 && (
                    <MenuItem value="" disabled>
                      Tidak ada template aktif
                    </MenuItem>
                  )}
                </Select>
              </FormControl>

              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                Pilih agunan yang akan dicantumkan
              </Typography>

              {selectedCredit?.Collaterals && selectedCredit.Collaterals.length > 0 ? (
                <FormGroup>
                  {selectedCredit.Collaterals.map((collateral) => (
                    <FormControlLabel
                      key={collateral.id}
                      control={
                        <Checkbox
                          checked={selectedCollateralIdsForHandover.includes(collateral.id)}
                          onChange={() => handleToggleCollateralSelection(collateral.id)}
                        />
                      }
                      label={`${collateral.collateral_code} - ${getCollateralTypeLabel(collateral.type)}`}
                    />
                  ))}
                </FormGroup>
              ) : (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Kredit ini belum memiliki data agunan aktif.
                </Alert>
              )}

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Lokasi Serah Terima"
                    name="handover_place"
                    value={handoverCustomFields.handover_place}
                    onChange={handleHandoverCustomFieldChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Nama Petugas Bank"
                    name="bank_officer_name"
                    value={handoverCustomFields.bank_officer_name}
                    onChange={handleHandoverCustomFieldChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Nama Penerima (Nasabah)"
                    name="customer_representative_name"
                    value={handoverCustomFields.customer_representative_name}
                    onChange={handleHandoverCustomFieldChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label="Catatan Tambahan"
                    name="additional_notes"
                    value={handoverCustomFields.additional_notes}
                    onChange={handleHandoverCustomFieldChange}
                  />
                </Grid>
              </Grid>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                Dokumen akan dibuka pada tab baru sebagai halaman HTML untuk dicetak atau disimpan.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseHandoverDialog}>Batal</Button>
          <Button
            variant="contained"
            onClick={handleGenerateHandoverDocument}
            disabled={
              generatingHandover ||
              !selectedHandoverTemplateId ||
              selectedCollateralIdsForHandover.length === 0 ||
              handoverTemplates.length === 0
            }
          >
            {generatingHandover ? 'Menyiapkan...' : 'Buka Dokumen'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openCollateralDialog} onClose={handleCloseCollateralDialog} maxWidth="md" fullWidth>
        <DialogTitle>Kelola Agunan Kredit</DialogTitle>
        <DialogContent dividers>
          {collateralCredit && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {collateralCredit.contract_number}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {collateralCredit.Debtor?.full_name || 'Nama debitur tidak tersedia'}
              </Typography>
            </Box>
          )}

          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateCollateral();
            }}
            sx={{ mb: 3 }}
          >
            <Typography variant="subtitle1" gutterBottom>Tambah Agunan</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Kode Agunan"
                  name="collateral_code"
                  value={collateralForm.collateral_code}
                  onChange={handleCollateralFormChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label="Jenis Agunan"
                  name="type"
                  value={collateralForm.type}
                  onChange={handleCollateralFormChange}
                  required
                >
                  {COLLATERAL_TYPES.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Lokasi Fisik"
                  name="physical_location"
                  value={collateralForm.physical_location}
                  onChange={handleCollateralFormChange}
                  placeholder="Contoh: Brankas Kantor Cabang"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Keterangan Agunan"
                  name="notes"
                  value={collateralForm.notes}
                  onChange={handleCollateralFormChange}
                  multiline
                  minRows={2}
                  placeholder="Catatan tambahan, misal kondisi dokumen atau nomor referensi lain"
                />
              </Grid>
              <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={collateralSaving}
                >
                  {collateralSaving ? 'Menyimpan...' : 'Simpan Agunan'}
                </Button>
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" gutterBottom>Agunan Tersimpan</Typography>

          {collateralLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : collateralList.length === 0 ? (
            <Alert severity="info">Belum ada agunan untuk kredit ini.</Alert>
          ) : (
            collateralList.map((collateral) => (
              <Paper
                key={collateral.id}
                variant="outlined"
                sx={{ p: 2, mb: 2 }}
              >
                {editingCollateralId === collateral.id ? (
                  <Grid container spacing={2} alignItems="flex-start">
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Jenis Agunan"
                        name="type"
                        select
                        value={collateralEditForm.type}
                        onChange={handleCollateralEditChange}
                      >
                        {COLLATERAL_TYPES.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <TextField
                        fullWidth
                        label="Lokasi Fisik"
                        name="physical_location"
                        value={collateralEditForm.physical_location}
                        onChange={handleCollateralEditChange}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Keterangan Agunan"
                        name="notes"
                        value={collateralEditForm.notes}
                        onChange={handleCollateralEditChange}
                        multiline
                        minRows={2}
                      />
                    </Grid>
                    <Grid
                      item
                      xs={12}
                      sx={{
                        display: 'flex',
                        gap: 1,
                        justifyContent: 'flex-end',
                        mt: 1
                      }}
                    >
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleUpdateCollateral}
                        disabled={collateralSaving}
                      >
                        {collateralSaving ? 'Menyimpan...' : 'Simpan'}
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setEditingCollateralId(null);
                          setCollateralEditForm({ ...DEFAULT_COLLATERAL_EDIT_FORM });
                        }}
                        disabled={collateralSaving}
                      >
                        Batal
                      </Button>
                    </Grid>
                  </Grid>
                ) : (
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}>
                      <Typography variant="subtitle2">{collateral.collateral_code}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {getCollateralTypeLabel(collateral.type)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2">
                        Lokasi Fisik: {collateral.physical_location || '-'}
                      </Typography>
                      <Typography variant="body2">
                        Keterangan: {collateral.notes || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={2} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                      <Button
                        size="small"
                        startIcon={<Edit fontSize="small" />}
                        onClick={() => handleStartEditCollateral(collateral)}
                      >
                        Ubah
                      </Button>
                    </Grid>
                  </Grid>
                )}
              </Paper>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCollateralDialog}>Tutup</Button>
        </DialogActions>
      </Dialog>

      {/* File Movement Dialog */}
      <Dialog open={openFileMovementDialog} onClose={handleCloseFileMovementDialog} maxWidth="md" fullWidth>
        <DialogTitle>Pergerakan Berkas Kredit</DialogTitle>
        <DialogContent dividers>
          {fileMovementCredit && (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {fileMovementCredit.contract_number}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {fileMovementCredit.Debtor?.full_name || 'Nama debitur tidak tersedia'}
                </Typography>
              </Box>

              <Box
                component="form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmitFileMovement();
                }}
                sx={{ mb: 3 }}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      select
                      fullWidth
                      label="Jenis Pergerakan"
                      value={fileMovementForm.movement_type}
                      onChange={(e) => handleFileMovementTypeChange(e.target.value as 'OUT' | 'IN')}
                    >
                      <MenuItem value="OUT">Keluar dari Brankas</MenuItem>
                      <MenuItem value="IN">Masuk ke Brankas</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={8}>
                    <TextField
                      select
                      fullWidth
                      label="Agunan Terkait (Opsional)"
                      value={fileMovementForm.collateral_id}
                      onChange={(e) =>
                        setFileMovementForm((prev) => ({
                          ...prev,
                          collateral_id: e.target.value,
                        }))
                      }
                    >
                      <MenuItem value="">Berkas Kredit Umum</MenuItem>
                      {fileMovementCollaterals.map((item) => (
                        <MenuItem key={item.id} value={item.id}>
                          {item.collateral_code} - {getCollateralTypeLabel(item.type)}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  {fileMovementForm.movement_type === 'OUT' && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Dikeluarkan Kepada"
                          name="released_to"
                          value={fileMovementForm.released_to}
                          onChange={handleFileMovementInputChange}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Penanggung Jawab"
                          name="responsible_officer"
                          value={fileMovementForm.responsible_officer}
                          onChange={handleFileMovementInputChange}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Estimasi Tanggal Kembali"
                          name="expected_return_date"
                          type="date"
                          value={fileMovementForm.expected_return_date}
                          onChange={handleFileMovementInputChange}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Tujuan Pengeluaran"
                          name="purpose"
                          value={fileMovementForm.purpose}
                          onChange={handleFileMovementInputChange}
                        />
                      </Grid>
                    </>
                  )}

                  {fileMovementForm.movement_type === 'IN' && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Diterima Oleh"
                        name="received_by"
                        value={fileMovementForm.received_by}
                        onChange={handleFileMovementInputChange}
                        required
                      />
                    </Grid>
                  )}

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Catatan Tambahan"
                      name="notes"
                      value={fileMovementForm.notes}
                      onChange={handleFileMovementInputChange}
                      multiline
                      minRows={2}
                    />
                  </Grid>
                  <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={fileMovementSaving}
                    >
                      {fileMovementSaving ? 'Menyimpan...' : 'Simpan Log'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle1" gutterBottom>Riwayat Keluar/Masuk Berkas</Typography>

              {fileMovementLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : fileMovements.length === 0 ? (
                <Alert severity="info">Belum ada riwayat pergerakan berkas.</Alert>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {fileMovements.map((movement) => (
                    <Paper key={movement.id} variant="outlined" sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="subtitle2">
                          {movement.movement_type === 'OUT' ? 'Keluar dari Brankas' : 'Masuk ke Brankas'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatDateTime(movement.movement_time)}
                        </Typography>
                      </Box>
                      {movement.collateral && (
                        <Typography variant="body2" color="text.secondary">
                          Agunan: {movement.collateral.collateral_code} ({getCollateralTypeLabel(movement.collateral.type)})
                        </Typography>
                      )}
                      {movement.Document && (
                        <Typography variant="body2" color="text.secondary">
                          Dokumen: {movement.Document.document_name}
                        </Typography>
                      )}
                      <Typography variant="body2">
                        {movement.movement_type === 'OUT'
                          ? `Dikeluarkan kepada ${movement.released_to || '-'}`
                          : `Diterima oleh ${movement.received_by || '-'}`}
                      </Typography>
                      {movement.movement_type === 'OUT' && movement.responsible_officer && (
                        <Typography variant="body2">
                          Penanggung jawab: {movement.responsible_officer}
                        </Typography>
                      )}
                      {movement.movement_type === 'OUT' && movement.expected_return_date && (
                        <Typography variant="body2" color="text.secondary">
                          Estimasi kembali: {formatDate(movement.expected_return_date)}
                        </Typography>
                      )}
                      {movement.purpose && (
                        <Typography variant="body2">
                          Tujuan: {movement.purpose}
                        </Typography>
                      )}
                      {movement.notes && (
                        <Typography variant="body2">
                          Catatan: {movement.notes}
                        </Typography>
                      )}
                      {movement.creator?.full_name && (
                        <Typography variant="caption" color="text.secondary">
                          Dicatat oleh: {movement.creator.full_name} ({movement.creator.role})
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFileMovementDialog}>Tutup</Button>
        </DialogActions>
      </Dialog>

      {/* Credit Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedCredit ? 'Edit Kredit' : 'Tambah Kredit Baru'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nomor Kontrak"
                name="contract_number"
                value={formData.contract_number}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                sx={{ width: '100%' }}
                options={debtorOptions}
                getOptionLabel={(option) => `${option.full_name} (${option.debtor_code})`}
                value={selectedDebtor}
                onChange={(_, newValue) => {
                  setSelectedDebtor(newValue);
                  setFormData((prev) => ({
                    ...prev,
                    debtor_id: newValue ? newValue.id : ''
                  }));
                  setDebtorSearchTerm(
                    newValue ? `${newValue.full_name} (${newValue.debtor_code})` : ''
                  );
                }}
                inputValue={debtorSearchTerm}
                onInputChange={(_, newInputValue, reason) => {
                  if (reason === 'reset') {
                    setDebtorSearchTerm(newInputValue);
                    return;
                  }
                  setDebtorSearchTerm(newInputValue);
                  const trimmed = newInputValue.trim();
                  if (reason === 'clear') {
                    scheduleDebtorSearch('');
                    setFormData((prev) => ({ ...prev, debtor_id: '' }));
                    return;
                  }
                  if (trimmed.length === 0 || trimmed.length >= 2) {
                    scheduleDebtorSearch(trimmed);
                  }
                }}
                onOpen={() => {
                  if (!debtors.length) {
                    fetchDebtors('');
                  }
                }}
                filterOptions={(options) => options}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                loading={debtorLoading}
                noOptionsText={debtorSearchTerm ? 'Debitur tidak ditemukan' : 'Ketik untuk mencari debitur'}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Debitur"
                    required
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {debtorLoading ? <CircularProgress color="inherit" size={20} /> : null}
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
                <InputLabel>Asuransi (Opsional)</InputLabel>
                <Select
                  name="insurance_id"
                  value={formData.insurance_id}
                  label="Asuransi (Opsional)"
                  onChange={handleInputChange}
                >
                  <MenuItem value="">
                    <em>Tidak Ada / Lepaskan Tautan</em>
                  </MenuItem>
                  {/* If editing, and the current insurance is already linked, it won't be in the unassigned list.
                      So we add it manually to the top of the options if it exists. */}
                  {selectedCredit && selectedCredit.Insurances && selectedCredit.Insurances.length > 0 && (
                    <MenuItem key={selectedCredit.Insurances[0].id} value={selectedCredit.Insurances[0].id}>
                      {`[Saat Ini] ${selectedCredit.Insurances[0].insurance_company} - ${selectedCredit.Insurances[0].policy_number}`}
                    </MenuItem>
                  )}
                  {unassignedInsurances.map((ins) => (
                    <MenuItem key={ins.id} value={ins.id}>
                      {`${ins.insurance_company} - ${ins.policy_number}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Jenis Kredit"
                name="credit_type"
                value={formData.credit_type}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Plafond"
                name="plafond"
                value={formData.plafond}
                onChange={handleInputChange}
                type="number"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Suku Bunga (%)"
                name="interest_rate"
                value={formData.interest_rate}
                onChange={handleInputChange}
                type="number"
                inputProps={{ step: 0.1 }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tenor (Bulan)"
                name="tenor_months"
                value={formData.tenor_months}
                onChange={handleInputChange}
                type="number"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tanggal Mulai"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                type="date"
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tanggal Jatuh Tempo"
                name="maturity_date"
                value={formData.maturity_date}
                onChange={handleInputChange}
                type="date"
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tujuan Kredit"
                name="purpose"
                value={formData.purpose}
                onChange={handleInputChange}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Batal</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {selectedCredit ? 'Update' : 'Simpan'}
          </Button>
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
    </Box>
  );
};

export default Credits;
