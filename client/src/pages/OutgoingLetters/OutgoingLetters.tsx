import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, Button, TextField, InputAdornment, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, IconButton, Chip, Dialog, DialogTitle,
    DialogContent, DialogActions, Grid, MenuItem, FormControl, InputLabel, Select,
    Alert, Skeleton, Card, CardContent, Tooltip, Pagination, Tabs, Tab, Autocomplete,
    CircularProgress, Divider, List, ListItem, ListItemText, ListItemIcon, FormControlLabel,
    Checkbox,
} from '@mui/material';
import {
    Search, Add, Edit, Delete, Send, Settings, Refresh, Visibility, AttachFile,
    Download, Email, CloudUpload, Draw, Notifications, Print, Description, Person,
} from '@mui/icons-material';
import {
    useOutgoingLetters, useCreateOutgoingLetter, useUpdateOutgoingLetter, useDeleteOutgoingLetter,
    useNextLetterNumber, useLetterConfiguration, useUpdateLetterConfiguration, useLetterStats,
    useLetterTemplates, useCreateLetterTemplate, useSendLetter, useSignLetter, useSetLetterReminder,
    useUploadAttachments, exportLettersToExcel,
    type OutgoingLetter, type LetterContentTemplate, OUTGOING_LETTERS_QUERY_KEY,
} from '../../hooks/queries/useOutgoingLetters';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';

const OutgoingLettersPage: React.FC = () => {
    const queryClient = useQueryClient();
    const currentYear = new Date().getFullYear();
    const signatureCanvasRef = useRef<HTMLCanvasElement>(null);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'eksternal' | 'internal' | ''>('');
    const [statusFilter, setStatusFilter] = useState<'draft' | 'sent' | 'archived' | ''>('');
    const [yearFilter, setYearFilter] = useState<number>(currentYear);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // Dialog states
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfigDialog, setOpenConfigDialog] = useState(false);
    const [openPreviewDialog, setOpenPreviewDialog] = useState(false);
    const [openTemplateDialog, setOpenTemplateDialog] = useState(false);
    const [openSignDialog, setOpenSignDialog] = useState(false);
    const [openSendDialog, setOpenSendDialog] = useState(false);
    const [selectedLetter, setSelectedLetter] = useState<OutgoingLetter | null>(null);
    const [selectedType, setSelectedType] = useState<'eksternal' | 'internal'>('eksternal');
    const [previewLetter, setPreviewLetter] = useState<OutgoingLetter | null>(null);

    // Debtor search
    const [debtorOptions, setDebtorOptions] = useState<any[]>([]);
    const [debtorLoading, setDebtorLoading] = useState(false);
    const [selectedDebtor, setSelectedDebtor] = useState<any>(null);

    // Form data
    const [formData, setFormData] = useState({
        letter_type: 'eksternal' as 'eksternal' | 'internal',
        subject: '',
        recipient: '',
        recipient_address: '',
        letter_date: new Date().toISOString().split('T')[0],
        content: '',
        notes: '',
        status: 'draft' as 'draft' | 'sent' | 'archived',
        debtor_id: '',
        credit_id: '',
        template_id: '',
        needs_followup: false,
        followup_date: '',
        email_recipient: '',
    });

    const [configData, setConfigData] = useState({ unit_code: '', unit_name: '' });
    const [templateFormData, setTemplateFormData] = useState({ name: '', description: '', letter_type: 'both' as 'both' | 'eksternal' | 'internal', subject_template: '', content_template: '' });

    // React Query hooks
    const { data, isLoading, error } = useOutgoingLetters({
        page: currentPage, limit: pageSize, type: typeFilter || undefined,
        status: statusFilter || undefined, year: yearFilter, search: searchTerm || undefined,
    });
    const { data: nextNumber, refetch: refetchNextNumber } = useNextLetterNumber(selectedType);
    const { data: config } = useLetterConfiguration();
    const { data: stats } = useLetterStats(yearFilter);
    const { data: templates } = useLetterTemplates();

    const createMutation = useCreateOutgoingLetter();
    const updateMutation = useUpdateOutgoingLetter();
    const deleteMutation = useDeleteOutgoingLetter();
    const updateConfigMutation = useUpdateLetterConfiguration();
    const createTemplateMutation = useCreateLetterTemplate();
    const sendMutation = useSendLetter();
    const signMutation = useSignLetter();
    const reminderMutation = useSetLetterReminder();
    const uploadMutation = useUploadAttachments();

    const letters = data?.letters || [];
    const pagination = data?.pagination;

    useEffect(() => { if (config) setConfigData({ unit_code: config.unit_code, unit_name: config.unit_name || '' }); }, [config]);
    useEffect(() => { if (openDialog && !selectedLetter) refetchNextNumber(); }, [selectedType, openDialog, selectedLetter, refetchNextNumber]);

    // Debtor search
    const searchDebtors = async (query: string) => {
        if (query.length < 2) return;
        setDebtorLoading(true);
        try {
            const response = await api.get('/debtors', { params: { search: query, limit: 10 } });
            setDebtorOptions(response.data.data.debtors || []);
        } catch (e) { console.error(e); }
        setDebtorLoading(false);
    };

    const handleOpenDialog = (letter?: OutgoingLetter) => {
        if (letter) {
            setSelectedLetter(letter);
            setSelectedType(letter.letter_type);
            setSelectedDebtor(letter.debtor || null);
            setFormData({
                letter_type: letter.letter_type, subject: letter.subject, recipient: letter.recipient,
                recipient_address: letter.recipient_address || '', letter_date: letter.letter_date,
                content: letter.content || '', notes: letter.notes || '', status: letter.status,
                debtor_id: letter.debtor_id || '', credit_id: letter.credit_id || '',
                template_id: letter.template_id || '', needs_followup: letter.needs_followup || false,
                followup_date: letter.followup_date || '', email_recipient: letter.email_recipient || '',
            });
        } else {
            setSelectedLetter(null);
            setSelectedType('eksternal');
            setSelectedDebtor(null);
            setFormData({
                letter_type: 'eksternal', subject: '', recipient: '', recipient_address: '',
                letter_date: new Date().toISOString().split('T')[0], content: '', notes: '', status: 'draft',
                debtor_id: '', credit_id: '', template_id: '', needs_followup: false, followup_date: '', email_recipient: '',
            });
        }
        setOpenDialog(true);
    };

    const handleSubmit = async () => {
        try {
            // Clean up empty strings to avoid foreign key constraint errors
            const cleanData = Object.fromEntries(
                Object.entries(formData).map(([key, value]) => [
                    key,
                    value === '' ? (key.endsWith('_id') ? null : value) : value
                ])
            );

            if (selectedLetter) {
                await updateMutation.mutateAsync({ id: selectedLetter.id, data: cleanData });
            } else {
                await createMutation.mutateAsync(cleanData);
            }
            setOpenDialog(false);
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Hapus surat ini?')) {
            try { await deleteMutation.mutateAsync(id); } catch (e) { console.error(e); }
        }
    };

    const handleSend = async () => {
        if (!selectedLetter) return;
        try {
            await sendMutation.mutateAsync({ id: selectedLetter.id, email_recipient: formData.email_recipient || undefined });
            setOpenSendDialog(false);
            setSelectedLetter(null);
        } catch (e) { console.error(e); }
    };

    const handleSign = async () => {
        if (!selectedLetter || !signatureCanvasRef.current) return;
        const signatureImage = signatureCanvasRef.current.toDataURL();
        try {
            await signMutation.mutateAsync({ id: selectedLetter.id, signature_image: signatureImage });
            setOpenSignDialog(false);
            setSelectedLetter(null);
        } catch (e) { console.error(e); }
    };

    const handleExport = async () => {
        try { await exportLettersToExcel({ year: yearFilter, type: typeFilter || undefined, status: statusFilter || undefined }); }
        catch (e) { console.error(e); }
    };

    const handlePrint = () => { window.print(); };

    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const getStatusChip = (status: string) => {
        switch (status) {
            case 'draft': return <Chip label="Draft" size="small" />;
            case 'sent': return <Chip label="Terkirim" color="success" size="small" />;
            case 'archived': return <Chip label="Diarsipkan" color="info" size="small" />;
            default: return <Chip label={status} size="small" />;
        }
    };
    const getTypeChip = (type: string) => type === 'eksternal'
        ? <Chip label="Eksternal" color="primary" size="small" variant="outlined" />
        : <Chip label="Internal" color="secondary" size="small" variant="outlined" />;
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

    // Initialize signature canvas
    useEffect(() => {
        if (openSignDialog && signatureCanvasRef.current) {
            const canvas = signatureCanvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                let drawing = false;
                const getPos = (e: MouseEvent) => ({ x: e.offsetX, y: e.offsetY });
                canvas.onmousedown = (e) => { drawing = true; ctx.beginPath(); ctx.moveTo(getPos(e).x, getPos(e).y); };
                canvas.onmousemove = (e) => { if (drawing) { ctx.lineTo(getPos(e).x, getPos(e).y); ctx.stroke(); } };
                canvas.onmouseup = () => { drawing = false; };
                canvas.onmouseleave = () => { drawing = false; };
            }
        }
    }, [openSignDialog]);

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h4" sx={{ mb: 0 }}>📤 Surat Keluar</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button variant="outlined" size="small" startIcon={<Download />} onClick={handleExport}>Export</Button>
                    <Button variant="outlined" size="small" startIcon={<Print />} onClick={handlePrint}>Print</Button>
                    <Button variant="outlined" size="small" startIcon={<Description />} onClick={() => setOpenTemplateDialog(true)}>Template</Button>
                    <Button variant="outlined" size="small" startIcon={<Settings />} onClick={() => setOpenConfigDialog(true)}>Config</Button>
                    <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>Buat Surat</Button>
                </Box>
            </Box>

            {/* Stats */}
            {stats && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    {[
                        { label: `Total ${yearFilter}`, value: stats.total, color: 'primary.main' },
                        { label: 'Eksternal', value: stats.totalEksternal, color: 'primary.main' },
                        { label: 'Internal', value: stats.totalInternal, color: 'secondary.main' },
                        { label: 'Terkirim', value: stats.totalSent, color: 'success.main' },
                        { label: 'Perlu Follow-up', value: stats.needsFollowup, color: 'warning.main' },
                    ].map((s, i) => (
                        <Grid item xs={6} sm={2.4} key={i}>
                            <Card><CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                                <Typography variant="h5" color={s.color}>{s.value}</Typography>
                                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                            </CardContent></Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={3}>
                        <TextField fullWidth size="small" placeholder="Cari..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} />
                    </Grid>
                    <Grid item xs={6} sm={2}>
                        <FormControl fullWidth size="small"><InputLabel>Tipe</InputLabel>
                            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} label="Tipe">
                                <MenuItem value="">Semua</MenuItem><MenuItem value="eksternal">Eksternal</MenuItem><MenuItem value="internal">Internal</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={2}>
                        <FormControl fullWidth size="small"><InputLabel>Status</InputLabel>
                            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} label="Status">
                                <MenuItem value="">Semua</MenuItem><MenuItem value="draft">Draft</MenuItem><MenuItem value="sent">Terkirim</MenuItem><MenuItem value="archived">Arsip</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={2}>
                        <FormControl fullWidth size="small"><InputLabel>Tahun</InputLabel>
                            <Select value={yearFilter} onChange={(e) => setYearFilter(e.target.value as number)} label="Tahun">
                                {yearOptions.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Button fullWidth variant="outlined" startIcon={<Refresh />} onClick={() => { setSearchTerm(''); setTypeFilter(''); setStatusFilter(''); setYearFilter(currentYear); }}>Reset</Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Table */}
            {isLoading ? (
                <TableContainer component={Paper}><Table><TableHead><TableRow>
                    {['Nomor', 'Tanggal', 'Tipe', 'Perihal', 'Tujuan', 'Status', 'Aksi'].map((h, i) => <TableCell key={i}>{h}</TableCell>)}
                </TableRow></TableHead><TableBody>
                        {[...Array(5)].map((_, i) => <TableRow key={i}>{[...Array(7)].map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>)}
                    </TableBody></Table></TableContainer>
            ) : error ? (
                <Alert severity="error">Gagal memuat data. Silakan refresh halaman.</Alert>
            ) : letters.length === 0 ? (
                <Alert severity="info">Tidak ada surat keluar ditemukan.</Alert>
            ) : (
                <>
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead><TableRow>
                                <TableCell>Nomor Surat</TableCell><TableCell>Tanggal</TableCell><TableCell>Tipe</TableCell>
                                <TableCell>Perihal</TableCell><TableCell>Tujuan</TableCell><TableCell>Debitur</TableCell>
                                <TableCell>Status</TableCell><TableCell align="center">Aksi</TableCell>
                            </TableRow></TableHead>
                            <TableBody>
                                {letters.map((letter) => (
                                    <TableRow key={letter.id} hover>
                                        <TableCell><Typography variant="body2" fontWeight="medium">{letter.letter_number}</Typography></TableCell>
                                        <TableCell>{formatDate(letter.letter_date)}</TableCell>
                                        <TableCell>{getTypeChip(letter.letter_type)}</TableCell>
                                        <TableCell><Tooltip title={letter.subject}><Typography noWrap sx={{ maxWidth: 180 }}>{letter.subject}</Typography></Tooltip></TableCell>
                                        <TableCell><Typography noWrap sx={{ maxWidth: 120 }}>{letter.recipient}</Typography></TableCell>
                                        <TableCell>{letter.debtor ? <Chip label={letter.debtor.debtor_code} size="small" variant="outlined" /> : '-'}</TableCell>
                                        <TableCell>{getStatusChip(letter.status)} {letter.email_sent && <Chip label="📧" size="small" sx={{ ml: 0.5 }} />}</TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="Preview"><IconButton size="small" onClick={() => { setPreviewLetter(letter); setOpenPreviewDialog(true); }}><Visibility /></IconButton></Tooltip>
                                            <Tooltip title="Edit"><IconButton size="small" color="primary" onClick={() => handleOpenDialog(letter)}><Edit /></IconButton></Tooltip>
                                            <Tooltip title="Kirim"><IconButton size="small" color="success" onClick={() => { setSelectedLetter(letter); setFormData(prev => ({ ...prev, email_recipient: letter.email_recipient || '' })); setOpenSendDialog(true); }}><Send /></IconButton></Tooltip>
                                            <Tooltip title="Tanda Tangan"><IconButton size="small" color="secondary" onClick={() => { setSelectedLetter(letter); setOpenSignDialog(true); }}><Draw /></IconButton></Tooltip>
                                            <Tooltip title="Hapus"><IconButton size="small" color="error" onClick={() => handleDelete(letter.id)}><Delete /></IconButton></Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    {pagination && pagination.totalPages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                            <Pagination count={pagination.totalPages} page={currentPage} onChange={(_, p) => setCurrentPage(p)} color="primary" />
                        </Box>
                    )}
                </>
            )}

            {/* Letter Form Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>{selectedLetter ? 'Edit Surat' : 'Buat Surat Baru'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        {!selectedLetter && (
                            <Grid item xs={12}>
                                <Tabs value={selectedType} onChange={(_, v) => { setSelectedType(v); setFormData(prev => ({ ...prev, letter_type: v })); }}>
                                    <Tab value="eksternal" label="Eksternal" /><Tab value="internal" label="Internal" />
                                </Tabs>
                            </Grid>
                        )}
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Nomor Surat" value={selectedLetter ? selectedLetter.letter_number : (nextNumber?.letter_number || '...')} InputProps={{ readOnly: true }} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth name="letter_date" label="Tanggal" type="date" value={formData.letter_date} onChange={(e) => setFormData(prev => ({ ...prev, letter_date: e.target.value }))} InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Autocomplete
                                options={debtorOptions}
                                getOptionLabel={(o) => `${o.full_name} (${o.debtor_code})`}
                                value={selectedDebtor}
                                onInputChange={(_, v) => searchDebtors(v)}
                                onChange={(_, v) => { setSelectedDebtor(v); setFormData(prev => ({ ...prev, debtor_id: v?.id || '' })); }}
                                loading={debtorLoading}
                                renderInput={(params) => <TextField {...params} label="Link Debitur (opsional)" placeholder="Cari debitur..." InputProps={{ ...params.InputProps, endAdornment: <>{debtorLoading && <CircularProgress size={20} />}{params.InputProps.endAdornment}</> }} />}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth><InputLabel>Template (opsional)</InputLabel>
                                <Select value={formData.template_id} onChange={(e) => {
                                    const tpl = templates?.find(t => t.id === e.target.value);
                                    setFormData(prev => ({ ...prev, template_id: e.target.value, content: tpl?.content_template || prev.content, subject: tpl?.subject_template || prev.subject }));
                                }} label="Template (opsional)">
                                    <MenuItem value="">-- Tidak ada --</MenuItem>
                                    {templates?.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}><TextField fullWidth label="Perihal" value={formData.subject} onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))} required /></Grid>
                        <Grid item xs={12} sm={6}><TextField fullWidth label="Tujuan/Penerima" value={formData.recipient} onChange={(e) => setFormData(prev => ({ ...prev, recipient: e.target.value }))} required /></Grid>
                        <Grid item xs={12} sm={6}><TextField fullWidth label="Email Penerima" value={formData.email_recipient} onChange={(e) => setFormData(prev => ({ ...prev, email_recipient: e.target.value }))} placeholder="email@example.com" /></Grid>
                        <Grid item xs={12}><TextField fullWidth label="Alamat Penerima" value={formData.recipient_address} onChange={(e) => setFormData(prev => ({ ...prev, recipient_address: e.target.value }))} multiline rows={2} /></Grid>
                        <Grid item xs={12}><TextField fullWidth label="Isi Surat" value={formData.content} onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))} multiline rows={4} /></Grid>
                        <Grid item xs={12} sm={6}><FormControl fullWidth><InputLabel>Status</InputLabel>
                            <Select value={formData.status} onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))} label="Status">
                                <MenuItem value="draft">Draft</MenuItem><MenuItem value="sent">Terkirim</MenuItem><MenuItem value="archived">Arsip</MenuItem>
                            </Select>
                        </FormControl></Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControlLabel control={<Checkbox checked={formData.needs_followup} onChange={(e) => setFormData(prev => ({ ...prev, needs_followup: e.target.checked }))} />} label="Perlu follow-up" />
                            {formData.needs_followup && <TextField fullWidth size="small" type="date" label="Tanggal Follow-up" value={formData.followup_date} onChange={(e) => setFormData(prev => ({ ...prev, followup_date: e.target.value }))} InputLabelProps={{ shrink: true }} sx={{ mt: 1 }} />}
                        </Grid>
                        <Grid item xs={12}><TextField fullWidth label="Catatan" value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} multiline rows={2} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Batal</Button>
                    <Button onClick={handleSubmit} variant="contained" disabled={createMutation.isPending || updateMutation.isPending}>{selectedLetter ? 'Update' : 'Simpan'}</Button>
                </DialogActions>
            </Dialog>

            {/* Preview Dialog */}
            <Dialog open={openPreviewDialog} onClose={() => setOpenPreviewDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>📄 Preview Surat</DialogTitle>
                <DialogContent>
                    {previewLetter && (
                        <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: 1, fontFamily: 'serif' }}>
                            <Box sx={{ textAlign: 'right', mb: 2 }}>
                                <Typography variant="body2"><strong>{previewLetter.letter_number}</strong></Typography>
                                <Typography variant="body2">{formatDate(previewLetter.letter_date)}</Typography>
                            </Box>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body2">Kepada Yth.</Typography>
                                <Typography variant="body2"><strong>{previewLetter.recipient}</strong></Typography>
                                {previewLetter.recipient_address && <Typography variant="body2">{previewLetter.recipient_address}</Typography>}
                            </Box>
                            <Typography variant="body2" sx={{ mb: 2 }}><strong>Perihal: {previewLetter.subject}</strong></Typography>
                            <Typography variant="body2" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>{previewLetter.content || '(Isi surat belum diisi)'}</Typography>
                            {previewLetter.signature_image && (
                                <Box sx={{ mt: 3 }}>
                                    <img src={previewLetter.signature_image} alt="Signature" style={{ maxHeight: 80 }} />
                                    <Typography variant="caption" display="block">{previewLetter.signer?.full_name}</Typography>
                                </Box>
                            )}
                            {previewLetter.attachments && previewLetter.attachments.length > 0 && (
                                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #ddd' }}>
                                    <Typography variant="body2"><strong>Lampiran:</strong></Typography>
                                    {previewLetter.attachments.map((a, i) => <Chip key={i} label={a.originalname} size="small" sx={{ mr: 0.5, mb: 0.5 }} />)}
                                </Box>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenPreviewDialog(false)}>Tutup</Button></DialogActions>
            </Dialog>

            {/* Config Dialog */}
            <Dialog open={openConfigDialog} onClose={() => setOpenConfigDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>⚙️ Konfigurasi</DialogTitle>
                <DialogContent>
                    <TextField fullWidth label="Kode Unit" value={configData.unit_code} onChange={(e) => setConfigData(prev => ({ ...prev, unit_code: e.target.value }))} sx={{ mt: 2 }} placeholder="AOPK/C.2" />
                    <TextField fullWidth label="Nama Unit" value={configData.unit_name} onChange={(e) => setConfigData(prev => ({ ...prev, unit_name: e.target.value }))} sx={{ mt: 2 }} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenConfigDialog(false)}>Batal</Button>
                    <Button onClick={async () => { await updateConfigMutation.mutateAsync(configData); setOpenConfigDialog(false); }} variant="contained" disabled={updateConfigMutation.isPending}>Simpan</Button>
                </DialogActions>
            </Dialog>

            {/* Template Dialog */}
            <Dialog open={openTemplateDialog} onClose={() => setOpenTemplateDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>📝 Kelola Template</DialogTitle>
                <DialogContent>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Template Tersedia:</Typography>
                    <List dense>
                        {templates?.map(t => (
                            <ListItem key={t.id}><ListItemIcon><Description /></ListItemIcon><ListItemText primary={t.name} secondary={t.description} /></ListItem>
                        ))}
                        {(!templates || templates.length === 0) && <ListItem><ListItemText primary="Belum ada template" /></ListItem>}
                    </List>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Buat Template Baru:</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Nama" value={templateFormData.name} onChange={(e) => setTemplateFormData(prev => ({ ...prev, name: e.target.value }))} /></Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small"><InputLabel>Tipe</InputLabel>
                                <Select value={templateFormData.letter_type} onChange={(e) => setTemplateFormData(prev => ({ ...prev, letter_type: e.target.value as any }))} label="Tipe">
                                    <MenuItem value="both">Semua</MenuItem><MenuItem value="eksternal">Eksternal</MenuItem><MenuItem value="internal">Internal</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}><TextField fullWidth size="small" label="Template Perihal" value={templateFormData.subject_template} onChange={(e) => setTemplateFormData(prev => ({ ...prev, subject_template: e.target.value }))} /></Grid>
                        <Grid item xs={12}><TextField fullWidth size="small" label="Template Isi" value={templateFormData.content_template} onChange={(e) => setTemplateFormData(prev => ({ ...prev, content_template: e.target.value }))} multiline rows={3} /></Grid>
                        <Grid item xs={12}><Button onClick={async () => { await createTemplateMutation.mutateAsync(templateFormData); setTemplateFormData({ name: '', description: '', letter_type: 'both', subject_template: '', content_template: '' }); }} variant="contained" size="small" disabled={createTemplateMutation.isPending}>Simpan Template</Button></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenTemplateDialog(false)}>Tutup</Button></DialogActions>
            </Dialog>

            {/* Send Dialog */}
            <Dialog open={openSendDialog} onClose={() => setOpenSendDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>📧 Kirim Surat</DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 2 }}>Surat akan diubah statusnya menjadi "Terkirim".</Alert>
                    <TextField fullWidth label="Email Penerima (opsional)" value={formData.email_recipient} onChange={(e) => setFormData(prev => ({ ...prev, email_recipient: e.target.value }))} placeholder="email@example.com" helperText="Kosongkan jika tidak ingin mengirim email" />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenSendDialog(false)}>Batal</Button>
                    <Button onClick={handleSend} variant="contained" color="success" disabled={sendMutation.isPending} startIcon={<Send />}>Kirim</Button>
                </DialogActions>
            </Dialog>

            {/* Sign Dialog */}
            <Dialog open={openSignDialog} onClose={() => setOpenSignDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>✍️ Tanda Tangan Digital</DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 2 }}>Gambar tanda tangan Anda di area di bawah ini.</Alert>
                    <Box sx={{ border: '1px solid #ccc', borderRadius: 1, display: 'flex', justifyContent: 'center' }}>
                        <canvas ref={signatureCanvasRef} width={400} height={150} style={{ cursor: 'crosshair' }} />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { if (signatureCanvasRef.current) { const ctx = signatureCanvasRef.current.getContext('2d'); if (ctx) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 400, 150); } } }}>Hapus</Button>
                    <Button onClick={() => setOpenSignDialog(false)}>Batal</Button>
                    <Button onClick={handleSign} variant="contained" disabled={signMutation.isPending} startIcon={<Draw />}>Simpan Tanda Tangan</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default OutgoingLettersPage;
