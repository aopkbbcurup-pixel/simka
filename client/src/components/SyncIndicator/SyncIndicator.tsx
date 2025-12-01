import React from 'react';
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Typography,
  Popover,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  CloudDone,
  CloudOff,
  CloudSync,
  Sync as SyncIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useSyncContext } from '../../contexts/SyncContext';
import { formatDistanceToNow } from 'date-fns';

const SyncIndicator: React.FC = () => {
  const {
    isOnline,
    isOffline,
    isSyncing,
    lastSyncTime,
    storageStats,
    performSync
  } = useSyncContext();

  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSyncClick = async () => {
    if (isOnline && !isSyncing) {
      await performSync();
    }
  };

  const open = Boolean(anchorEl);
  const id = open ? 'sync-popover' : undefined;

  // Determine status icon and color
  const getStatusIcon = () => {
    if (isSyncing) {
      return <CloudSync color="primary" />;
    }
    if (isOffline) {
      return <CloudOff color="error" />;
    }
    return <CloudDone color="success" />;
  };

  const getStatusText = () => {
    if (isSyncing) {
      return 'Syncing...';
    }
    if (isOffline) {
      return 'Offline';
    }
    return 'Online';
  };

  const getStatusColor = (): 'default' | 'primary' | 'error' | 'success' => {
    if (isSyncing) return 'primary';
    if (isOffline) return 'error';
    return 'success';
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* Status Chip */}
      <Chip
        icon={getStatusIcon()}
        label={getStatusText()}
        color={getStatusColor()}
        size="small"
        variant="outlined"
      />

      {/* Sync Button */}
      <Tooltip title={isOffline ? 'Cannot sync while offline' : 'Sync now'}>
        <span>
          <IconButton
            size="small"
            onClick={handleSyncClick}
            disabled={isOffline || isSyncing}
            color="primary"
          >
            {isSyncing ? (
              <CircularProgress size={20} />
            ) : (
              <SyncIcon />
            )}
          </IconButton>
        </span>
      </Tooltip>

      {/* Info Button */}
      <Tooltip title="Sync information">
        <IconButton size="small" onClick={handleClick}>
          <InfoIcon />
        </IconButton>
      </Tooltip>

      {/* Info Popover */}
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ p: 2, minWidth: 300 }}>
          <Typography variant="h6" gutterBottom>
            Sync Status
          </Typography>

          <Divider sx={{ my: 1 }} />

          <List dense>
            <ListItem>
              <ListItemText
                primary="Connection Status"
                secondary={isOnline ? 'Online' : 'Offline'}
              />
            </ListItem>

            <ListItem>
              <ListItemText
                primary="Last Sync"
                secondary={
                  lastSyncTime
                    ? formatDistanceToNow(lastSyncTime, { addSuffix: true })
                    : 'Never'
                }
              />
            </ListItem>

            {storageStats && (
              <>
                <Divider sx={{ my: 1 }} />
                <ListItem>
                  <ListItemText
                    primary="Local Storage"
                    secondary={
                      <Box component="span">
                        <Typography variant="body2" component="div">
                          Debtors: {storageStats.debtors}
                        </Typography>
                        <Typography variant="body2" component="div">
                          Credits: {storageStats.credits}
                        </Typography>
                        <Typography variant="body2" component="div">
                          Collaterals: {storageStats.collaterals}
                        </Typography>
                        <Typography variant="body2" component="div">
                          Notifications: {storageStats.notifications}
                        </Typography>
                        {storageStats.pendingSync > 0 && (
                          <Typography variant="body2" component="div" color="warning.main">
                            Pending Sync: {storageStats.pendingSync}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              </>
            )}
          </List>

          {isOffline && (
            <Box sx={{ mt: 2, p: 1, bgcolor: 'warning.light', borderRadius: 1 }}>
              <Typography variant="body2" color="warning.dark">
                You are currently offline. Changes will be synced when connection is restored.
              </Typography>
            </Box>
          )}
        </Box>
      </Popover>
    </Box>
  );
};

export default SyncIndicator;
