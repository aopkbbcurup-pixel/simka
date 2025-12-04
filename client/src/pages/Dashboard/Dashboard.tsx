import React, { useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  Skeleton,
  Stack,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Warning,
  Schedule,
  TrendingUp,
  People,
  CreditCard,
  Security,
  Assessment,
  Assignment,
  Description,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useDashboard } from '../../hooks/queries/useDashboard';

// Skeleton Loading Component
const DashboardSkeleton = () => (
  <Box sx={{ flexGrow: 1 }}>
    <Skeleton variant="text" width={300} height={60} sx={{ mb: 4 }} />
    <Grid container spacing={2.5} sx={{ mb: 4 }}>
      {[1, 2, 3, 4].map((i) => (
        <Grid item xs={12} sm={6} md={3} key={i}>
          <Skeleton variant="rounded" height={120} sx={{ borderRadius: 2 }} />
        </Grid>
      ))}
    </Grid>
    <Grid container spacing={2.5}>
      <Grid item xs={12} md={8}>
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 2 }} />
      </Grid>
      <Grid item xs={12} md={4}>
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 2 }} />
      </Grid>
    </Grid>
  </Box>
);

// Enhanced Stat Card Component
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  gradient: string;
  trend?: { value: number; isPositive: boolean };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, gradient, trend }) => {
  return (
    <Card
      sx={{
        background: gradient,
        color: 'white',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-4px) scale(1.02)',
          boxShadow: '0 12px 24px -8px rgba(0, 0, 0, 0.3)',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          width: '100px',
          height: '100px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          transform: 'translate(30%, -30%)',
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255,255,255,0.85)',
                fontWeight: 600,
                mb: 1,
                letterSpacing: '0.5px',
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                mb: 0.5,
                background: 'linear-gradient(to bottom, #fff, rgba(255,255,255,0.9))',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {typeof value === 'number' ? value.toLocaleString('id-ID') : value}
            </Typography>
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {trend.isPositive ? (
                  <ArrowUpward sx={{ fontSize: 16, mr: 0.5 }} />
                ) : (
                  <ArrowDownward sx={{ fontSize: 16, mr: 0.5 }} />
                )}
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {Math.abs(trend.value)}% vs bulan lalu
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: 2,
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const { data: stats, isLoading: loading, error } = useDashboard();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const PIE_CHART_COLORS: { [key: string]: string } = {
    Lancar: '#10b981',
    'Dalam Perhatian Khusus': '#f59e0b',
    'Kurang Lancar': '#ef4444',
    Diragukan: '#8b5cf6',
    Macet: '#64748b',
    Lunas: '#3b82f6',
  };

  // Memoized chart data
  const creditStatusData = useMemo(() => {
    if (!stats?.statistics?.credits_by_status) return [];
    return stats.statistics.credits_by_status.map((item: any) => ({
      name: item.status,
      value: parseInt(item.count, 10),
      color: PIE_CHART_COLORS[item.status] || '#8884d8',
    }));
  }, [stats?.statistics?.credits_by_status]);

  const collateralTypeData = useMemo(() => {
    if (!stats?.statistics?.collaterals_by_type) return [];
    return stats.statistics.collaterals_by_type.map((item: any) => ({
      name: item.type,
      count: parseInt(item.count, 10),
    }));
  }, [stats?.statistics?.collaterals_by_type]);

  // Custom Tooltip for Charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            bgcolor: 'background.paper',
            p: 1.5,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            {label || payload[0].name}
          </Typography>
          <Typography variant="body2" color="primary">
            {payload[0].value?.toLocaleString()} {payload[0].name === 'count' ? 'item' : ''}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  if (loading) return <DashboardSkeleton />;

  if (error || !stats) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Gagal memuat data dashboard. Silakan refresh halaman.
      </Alert>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 0.5,
            }}
          >
            Dashboard Monitoring
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ringkasan sistem kredit & agunan
          </Typography>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Debitur"
            value={stats?.statistics?.total_debtors || 0}
            icon={<People sx={{ fontSize: 32, color: 'white' }} />}
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Kredit"
            value={stats?.statistics?.total_credits || 0}
            icon={<CreditCard sx={{ fontSize: 32, color: 'white' }} />}
            gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Agunan"
            value={stats?.statistics?.total_collaterals || 0}
            icon={<Security sx={{ fontSize: 32, color: 'white' }} />}
            gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Dokumen Tidak Lengkap"
            value={stats?.statistics?.incomplete_documents || 0}
            icon={<Assessment sx={{ fontSize: 32, color: 'white' }} />}
            gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
          />
        </Grid>
      </Grid>

      {/* Alerts Section */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: '100%',
              transition: 'box-shadow 0.3s',
              '&:hover': { boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
            }}
          >
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Warning sx={{ color: 'error.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Asuransi Akan Berakhir
                </Typography>
                <Chip
                  label={stats?.alerts?.insurance_expiring?.items?.length || 0}
                  size="small"
                  color="error"
                  sx={{ ml: 'auto' }}
                />
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Chip label={`30 hari: ${stats?.alerts?.insurance_expiring?.next_30_days || 0}`} color="error" size="small" />
                <Chip label={`60 hari: ${stats?.alerts?.insurance_expiring?.next_60_days || 0}`} color="warning" size="small" />
                <Chip label={`90 hari: ${stats?.alerts?.insurance_expiring?.next_90_days || 0}`} color="info" size="small" />
              </Stack>

              <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                {stats?.alerts?.insurance_expiring?.items?.slice(0, 4)?.map((item: any) => (
                  <ListItem
                    key={item.id}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Schedule color="warning" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {item.Credit?.Debtor?.full_name || 'Unknown'}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {item.insurance_company} • {formatDate(item.insurance_end_date)}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
                {(!stats?.alerts?.insurance_expiring?.items || stats.alerts.insurance_expiring.items.length === 0) && (
                  <ListItem>
                    <ListItemText
                      primary={
                        <Typography variant="body2" color="text.secondary" align="center">
                          Tidak ada asuransi yang akan berakhir
                        </Typography>
                      }
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: '100%',
              transition: 'box-shadow 0.3s',
              '&:hover': { boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
            }}
          >
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Schedule sx={{ color: 'warning.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Kredit Akan Jatuh Tempo
                </Typography>
                <Chip
                  label={stats?.alerts?.credits_maturing?.items?.length || 0}
                  size="small"
                  color="warning"
                  sx={{ ml: 'auto' }}
                />
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Chip label={`30 hari: ${stats?.alerts?.credits_maturing?.next_30_days || 0}`} color="error" size="small" />
                <Chip label={`60 hari: ${stats?.alerts?.credits_maturing?.next_60_days || 0}`} color="warning" size="small" />
                <Chip label={`90 hari: ${stats?.alerts?.credits_maturing?.next_90_days || 0}`} color="info" size="small" />
              </Stack>

              <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                {stats?.alerts?.credits_maturing?.items?.slice(0, 4)?.map((item: any) => (
                  <ListItem
                    key={item.id}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <TrendingUp color="info" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {item.Debtor?.full_name || 'Unknown'} • {item.contract_number}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {formatCurrency(item.outstanding)} • {formatDate(item.maturity_date)}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
                {(!stats?.alerts?.credits_maturing?.items || stats.alerts.credits_maturing.items.length === 0) && (
                  <ListItem>
                    <ListItemText
                      primary={
                        <Typography variant="body2" color="text.secondary" align="center">
                          Tidak ada kredit yang akan jatuh tempo
                        </Typography>
                      }
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={8}>
          <Card sx={{ transition: 'box-shadow 0.3s', '&:hover': { boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
                Distribusi Jenis Agunan
              </Typography>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={collateralTypeData}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#667eea" stopOpacity={1} />
                      <stop offset="100%" stopColor="#764ba2" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
                  <XAxis dataKey="name" stroke={theme.palette.text.secondary} style={{ fontSize: '12px' }} />
                  <YAxis stroke={theme.palette.text.secondary} style={{ fontSize: '12px' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="count"
                    fill="url(#barGradient)"
                    radius={[8, 8, 0, 0]}
                    barSize={60}
                    maxBarSize={80}
                    animationDuration={1000}
                    isAnimationActive={true}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ transition: 'box-shadow 0.3s', '&:hover': { boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
                Status Kredit
              </Typography>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={creditStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    fill="#8884d8"
                    dataKey="value"
                    animationDuration={1000}
                    isAnimationActive={true}
                  >
                    {creditStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
