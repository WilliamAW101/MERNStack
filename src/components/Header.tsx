"use client"

import * as React from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import { MountainIcon } from '../asset/icons/CustomIcons';
import { useUser } from '@/context/user/UserContext';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import { Typography, Divider } from '@mui/material';
import { useRouter } from 'next/navigation';

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0,
  borderRadius: `calc(${theme.shape.borderRadius}px + 8px)`,
  padding: '0 12px',
}));

export default function Header() {
  const router = useRouter();
  const { logout, getToken } = useUser();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);


  const handleOpenSignIn = () => {
    router.push('/login');
  };

  const handleOpenSignUp = () => {
    router.push('/signup');
  };

  React.useEffect(() => {
    setIsAuthenticated(!!getToken());
  }, [getToken]);

  const handleUserMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleUserMenuClose();
    router.push('/');
  };

  return (
    <Box sx={{
      flexGrow: 1
    }}>
      <AppBar
        sx={{
          mt: 'calc(var(--template-frame-height, 0px))',
          width: '100%',
          boxShadow: 0,
          bgcolor: 'transparent',
          background: 'transparent',
        }}
      >
        <StyledToolbar variant="dense" disableGutters sx={{ px: { xs: 1, sm: 2 } }}>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', px: 0, gap: 0.5 }}>
            <IconButton
              onClick={() => router.push('/')}
              sx={{
                backgroundColor: 'transparent',
                borderRadius: 'none',
                border: 'none',
                '&:focus': {
                  outline: 'none',
                  border: 'none',
                },
                '&:active': {
                  outline: 'none',
                  border: 'none',
                },
              }}
            >
              <MountainIcon />
            </IconButton>
            <Typography
              variant="h6"
              sx={{
                color: 'white',
                fontWeight: 700,
                fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
                lineHeight: 1,
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)',
              }}
            >
              CragTag
            </Typography>
          </Box>
          <Box
            sx={{
              display: { xs: 'flex', md: 'flex' },
              gap: { xs: 0.5, sm: 1 },
              alignItems: 'center',
              flexDirection: { xs: 'row', sm: 'row' },
            }}
          >
            {isAuthenticated ? (
              <>
                <IconButton
                  onClick={handleUserMenuClick}
                  size="large"
                  sx={{
                    ml: 2,
                    p: 0.5,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(10px)',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    color: '#ffffff',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.3)',
                      border: '2px solid rgba(255, 255, 255, 0.5)',
                      transform: 'scale(1.05)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                  aria-controls={anchorEl ? 'user-menu' : undefined}
                  aria-haspopup="true"
                  aria-expanded={anchorEl ? 'true' : undefined}
                >
                  <AccountCircleIcon sx={{ fontSize: 40 }} />
                </IconButton>
                <Menu
                  id="user-menu"
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleUserMenuClose}
                  PaperProps={{
                    elevation: 3,
                    sx: {
                      overflow: 'visible',
                      filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                      mt: 1.5,
                      minWidth: 200,
                      '& .MuiAvatar-root': {
                        width: 32,
                        height: 32,
                        ml: -0.5,
                        mr: 1,
                      },
                      '&:before': {
                        content: '""',
                        display: 'block',
                        position: 'absolute',
                        top: 0,
                        right: 14,
                        width: 10,
                        height: 10,
                        bgcolor: 'background.paper',
                        transform: 'translateY(-50%) rotate(45deg)',
                        zIndex: 0,
                      },
                    },
                  }}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <MenuItem onClick={handleUserMenuClose}>
                    <ListItemIcon>
                      <PersonIcon fontSize="small" />
                    </ListItemIcon>
                    Profile
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    Logout
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleOpenSignIn}
                  sx={{
                    color: 'black',
                    borderColor: 'rgba(15,61,46,0.6)',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    px: { xs: 1.8, sm: 3 },
                    minWidth: { xs: 'auto', sm: 'auto' },
                    borderRadius: "8px",
                    "&:hover": {
                      backgroundColor: '#ffffff',
                      borderColor: '#0f3d2e',
                      color: '#0f3d2e',
                      transform: "translateY(-1px)",
                    },
                    transition: "all 0.3s ease"
                  }}
                >
                  Sign in
                </Button>

                <Button
                  variant="contained"
                  size="small"
                  onClick={handleOpenSignUp}
                  sx={{
                    backgroundColor: '#2e7d32',
                    color: '#ffffff',
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    borderRadius: "8px",
                    px: { xs: 2.5, sm: 3.5 },
                    minWidth: { xs: 'auto', sm: 'auto' },
                    transition: "all 0.3s ease"
                  }}
                >
                  Sign up
                </Button>
              </>
            )}
          </Box>
        </StyledToolbar>
      </AppBar>

    </Box>
  );
}