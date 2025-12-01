import React from 'react';
import { Box, Typography, Card, CardContent, Avatar, Grid } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { AccountCircle } from '@mui/icons-material';

const Profile: React.FC = () => {
  const { user } = useAuth();

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Profil Pengguna
      </Typography>
      {user ? (
        <Card sx={{ maxWidth: 600, margin: 'auto', mt: 4 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main' }}>
                  <AccountCircle sx={{ fontSize: 60 }} />
                </Avatar>
              </Grid>
              <Grid item xs>
                <Typography variant="h5" component="div">
                  {user.full_name}
                </Typography>
                <Typography sx={{ mb: 1.5 }} color="text.secondary">
                  {user.role}
                </Typography>
                <Typography variant="body2">
                  Email: {user.email}
                </Typography>
                <Typography variant="body2">
                  Username: {user.username}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ) : (
        <Typography>Gagal memuat informasi pengguna.</Typography>
      )}
    </Box>
  );
};

export default Profile;
