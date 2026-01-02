import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Divider } from '@mui/material';
import { OutgoingLetter } from '../../hooks/queries/useOutgoingLetters';

interface PrintViewProps {
    letters: OutgoingLetter[];
    title: string;
    year: number;
    printRef: React.RefObject<any>;
}

const PrintView: React.FC<PrintViewProps> = ({ letters, title, year, printRef }) => {
    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    const currentDate = new Date().toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    const getStatusText = (status: string) => {
        switch (status) {
            case 'draft': return 'Draft';
            case 'sent': return 'Terkirim';
            case 'archived': return 'Arsip';
            default: return status;
        }
    };

    const getTypeText = (type: string) => type === 'eksternal' ? 'Eksternal' : 'Internal';

    return (
        <Box
            ref={printRef}
            sx={{
                p: 4,
                bgcolor: 'white',
                minHeight: '100%',
                '@media print': {
                    p: 2,
                    '& *': { fontSize: '10pt !important' }
                }
            }}
        >
            {/* Professional Header / Letterhead */}
            <Box sx={{ textAlign: 'center', mb: 3, borderBottom: '3px double #000', pb: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1a237e', mb: 0.5 }}>
                    PT. BANK PEMBANGUNAN DAERAH BENGKULU
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1a237e', letterSpacing: 2 }}>
                    CABANG CURUP
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, color: '#555' }}>
                    Jl. S Sukowati No. 06, Curup, Rejang Lebong, Bengkulu 39112
                </Typography>
                <Typography variant="body2" sx={{ color: '#555' }}>
                    Telp: (0732) 21234 | Email: cabang.curup@bankbengkulu.co.id
                </Typography>
            </Box>

            {/* Document Title */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>
                    {title}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: '#666' }}>
                    Tahun {year}
                </Typography>
            </Box>

            {/* Professional Table */}
            <TableContainer sx={{ mb: 3 }}>
                <Table size="small" sx={{
                    border: '1px solid #000',
                    '& th': {
                        bgcolor: '#e3f2fd',
                        fontWeight: 'bold',
                        borderBottom: '2px solid #000',
                        borderRight: '1px solid #000',
                        py: 1
                    },
                    '& td': {
                        borderBottom: '1px solid #ccc',
                        borderRight: '1px solid #ccc',
                        py: 0.75
                    },
                    '& tr:nth-of-type(even)': { bgcolor: '#fafafa' }
                }}>
                    <TableHead>
                        <TableRow>
                            <TableCell align="center" sx={{ width: 40 }}>No</TableCell>
                            <TableCell sx={{ minWidth: 140 }}>Nomor Surat</TableCell>
                            <TableCell sx={{ width: 100 }}>Tanggal</TableCell>
                            <TableCell sx={{ width: 80 }}>Tipe</TableCell>
                            <TableCell>Perihal</TableCell>
                            <TableCell sx={{ width: 120 }}>Tujuan</TableCell>
                            <TableCell sx={{ width: 70 }}>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {letters.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 3, fontStyle: 'italic', color: '#888' }}>
                                    Tidak ada data surat keluar
                                </TableCell>
                            </TableRow>
                        ) : (
                            letters.map((letter, index) => (
                                <TableRow key={letter.id}>
                                    <TableCell align="center">{index + 1}</TableCell>
                                    <TableCell sx={{ fontWeight: 500 }}>{letter.letter_number}</TableCell>
                                    <TableCell>{formatDate(letter.letter_date)}</TableCell>
                                    <TableCell>{getTypeText(letter.letter_type)}</TableCell>
                                    <TableCell>{letter.subject}</TableCell>
                                    <TableCell>{letter.recipient}</TableCell>
                                    <TableCell>{getStatusText(letter.status)}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Summary */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
                <Box>
                    <Typography variant="body2"><strong>Total Surat:</strong> {letters.length}</Typography>
                    <Typography variant="body2">
                        <strong>Eksternal:</strong> {letters.filter(l => l.letter_type === 'eksternal').length} |
                        <strong> Internal:</strong> {letters.filter(l => l.letter_type === 'internal').length}
                    </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2">Dicetak pada: {currentDate}</Typography>
                </Box>
            </Box>

            {/* Signature Area */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
                <Box sx={{ textAlign: 'center', minWidth: 200 }}>
                    <Typography variant="body2">Curup, {currentDate}</Typography>
                    <Typography variant="body2" sx={{ mb: 8 }}>Mengetahui,</Typography>
                    <Divider sx={{ borderColor: '#000', mb: 0.5 }} />
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Kepala Unit</Typography>
                </Box>
            </Box>

            {/* Print Footer */}
            <Box sx={{
                mt: 4,
                pt: 2,
                borderTop: '1px solid #ccc',
                textAlign: 'center',
                '@media print': { position: 'fixed', bottom: 0, left: 0, right: 0, bgcolor: 'white' }
            }}>
                <Typography variant="caption" sx={{ color: '#888' }}>
                    Dokumen ini dicetak dari Sistem Informasi Manajemen Kredit dan Agunan (SIMKA)
                </Typography>
            </Box>
        </Box>
    );
};

export default PrintView;
