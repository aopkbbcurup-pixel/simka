const { Op } = require('sequelize');
const { Debtor, Credit, Collateral } = require('../models');

// --- Database Helper Functions ---
const tools = {
    getDebtorCount: async () => {
        try {
            const count = await Debtor.count();
            return `Saat ini terdapat ${count} debitur terdaftar dalam sistem.`;
        } catch (error) {
            console.error("Error in getDebtorCount:", error);
            return "Maaf, gagal mengambil data jumlah debitur.";
        }
    },
    getCreditCount: async () => {
        try {
            const count = await Credit.count();
            return `Total fasilitas kredit yang aktif adalah ${count}.`;
        } catch (error) {
            console.error("Error in getCreditCount:", error);
            return "Maaf, gagal mengambil data jumlah kredit.";
        }
    },
    getCollateralCount: async () => {
        try {
            const count = await Collateral.count();
            return `Total agunan yang tersimpan adalah ${count}.`;
        } catch (error) {
            console.error("Error in getCollateralCount:", error);
            return "Maaf, gagal mengambil data jumlah agunan.";
        }
    },
    getNPLCredits: async () => {
        try {
            const nplCredits = await Credit.findAll({
                where: {
                    collectibility: { [Op.in]: ['3', '4', '5'] }
                },
                include: [{
                    model: Debtor,
                    attributes: ['full_name', 'debtor_code']
                }],
                limit: 5
            });

            if (nplCredits.length === 0) {
                return "Tidak ada kredit macet (NPL) saat ini. Bagus!";
            }

            const list = nplCredits.map(c => `- ${c.Debtor ? c.Debtor.full_name : 'Unknown'} (Status: ${c.status})`).join('\n');
            return `Ditemukan ${nplCredits.length} kredit macet (Top 5):\n${list}`;
        } catch (error) {
            console.error("Error in getNPLCredits:", error);
            return "Maaf, gagal mengambil data kredit macet.";
        }
    },
    searchDebtor: async (name) => {
        try {
            const debtors = await Debtor.findAll({
                where: {
                    full_name: { [Op.like]: `%${name}%` }
                },
                limit: 3
            });

            if (debtors.length === 0) {
                return `Tidak ditemukan debitur dengan nama "${name}".`;
            }

            const list = debtors.map(d => `- ${d.full_name} (NIK: ${d.ktp_number})`).join('\n');
            return `Ditemukan ${debtors.length} debitur:\n${list}`;
        } catch (error) {
            console.error("Error in searchDebtor:", error);
            return "Maaf, gagal mencari debitur.";
        }
    }
};

const AIController = {
    processMessage: async (req, res) => {
        try {
            const { message } = req.body;
            const lowerMsg = message.toLowerCase();

            let reply = "Maaf, saya tidak mengerti. Coba tanya tentang 'jumlah debitur', 'kredit macet', atau 'cari debitur [nama]'.";

            // Simple Rule-Based Logic
            if (lowerMsg.includes('halo') || lowerMsg.includes('hi') || lowerMsg.includes('selamat')) {
                reply = "Halo! Saya asisten SIMKA. Ada yang bisa saya bantu terkait data kredit atau debitur?";
            }
            else if (lowerMsg.includes('jumlah debitur') || lowerMsg.includes('total debitur')) {
                reply = await tools.getDebtorCount();
            }
            else if (lowerMsg.includes('jumlah kredit') || lowerMsg.includes('total kredit')) {
                reply = await tools.getCreditCount();
            }
            else if (lowerMsg.includes('jumlah agunan') || lowerMsg.includes('total agunan')) {
                reply = await tools.getCollateralCount();
            }
            else if (lowerMsg.includes('macet') || lowerMsg.includes('npl')) {
                reply = await tools.getNPLCredits();
            }
            else if (lowerMsg.includes('cari debitur') || lowerMsg.includes('cari nama')) {
                // Extract name roughly
                const parts = message.split(' ');
                const nameIndex = parts.findIndex(p => p.toLowerCase() === 'debitur' || p.toLowerCase() === 'nama');
                if (nameIndex !== -1 && nameIndex < parts.length - 1) {
                    const name = parts.slice(nameIndex + 1).join(' ');
                    reply = await tools.searchDebtor(name);
                } else {
                    reply = "Sebutkan nama debitur yang ingin dicari, contoh: 'Cari debitur Budi'.";
                }
            }
            else if (lowerMsg.includes('bantuan') || lowerMsg.includes('help') || lowerMsg.includes('menu')) {
                reply = "Saya bisa membantu dengan:\n- Cek jumlah debitur/kredit/agunan\n- Cek kredit macet (NPL)\n- Cari debitur berdasarkan nama";
            }

            return res.json({ reply });

        } catch (error) {
            console.error('AI Controller Error:', error);
            res.status(500).json({ reply: "Maaf, terjadi kesalahan pada server." });
        }
    }
};

module.exports = AIController;
