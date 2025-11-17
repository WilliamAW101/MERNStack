"use client"

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import MuiCard from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { styled } from '@mui/material/styles';
import AppTheme from '@/theme/AppTheme';
import { useUser } from '@/context/user/UserContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/toast';
import SignatureLogo from '../common/SignatureLogo';


const Card = styled(MuiCard)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'center',
  width: '100%',
  padding: theme.spacing(2),
  gap: theme.spacing(2),
  margin: 'auto',
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(3),
    maxWidth: '450px',
  },
  [theme.breakpoints.up('md')]: {
    padding: theme.spacing(4),
  },
  boxShadow:
    'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px',
  ...theme.applyStyles('dark', {
    boxShadow:
      'hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px',
  }),
}));

const SignInContainer = styled(Stack)(({ theme }) => ({
  height: 'calc((1 - var(--template-frame-height, 0)) * 100dvh)',
  minHeight: '100vh',
  padding: theme.spacing(1),
  background: '#E9EDE8',
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(2),
  },
  [theme.breakpoints.up('md')]: {
    padding: theme.spacing(4),
  },
  [theme.breakpoints.up('lg')]: {
    padding: theme.spacing(6),
  },
  ...theme.applyStyles('dark', {
    background: '#E9EDE8',
  }),
}));

export default function SignIn() {
  const [usernameError, setUsernameError] = React.useState(false);
  const [usernameErrorMessage, setUsernameErrorMessage] = React.useState('');
  const [passwordError, setPasswordError] = React.useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const router = useRouter()
  const toast = useToast();
  const { setUser } = useUser();


  const BASE_URL = process.env.NEXT_PUBLIC_API_URL;


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (usernameError || passwordError) return;

    const data = new FormData(event.currentTarget);

    const jsonData = {
      userName: data.get('username'),
      password: data.get('password'),
    };

    try {
      const response = await fetch(`${BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData),
      });

      const result = await response.json();

      if (result.success && result.data.token) {
        const token = result.data.token;
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
        }
        // Extract user data from the response
        const userData = {
          id: result.data.id,
          firstName: result.data.firstName,
          lastName: result.data.lastName,
          userName: result.data.userName
        };

        setUser(userData);
        toast.success("Login successful");
        router.push("/");
      } else {
        // Check if it's an email verification error
        if (result.message && result.message.toLowerCase().includes('verify')) {
          toast.error("Please verify your email before signing in. Check your inbox for the verification link.");
        } else {
          toast.error(result.message || result.error || "Login failed");
        }
        return;
      }
    } catch (error) {
      console.error('Error sending data:', error);
      toast.error("Network error. Please try again.");

    }
  };

  const validateInputs = () => {
    const username = document.getElementById('username') as HTMLInputElement;
    const password = document.getElementById('password') as HTMLInputElement;

    let isValid = true;

    if (!username.value) {
      setUsernameError(true);
      setUsernameErrorMessage('Username should not be empty');
      isValid = false;
    } else {
      setUsernameError(false);
      setUsernameErrorMessage('');
    }

    if (!password.value) {
      setPasswordError(true);
      setPasswordErrorMessage('Password should not be empty.');
      isValid = false;
    } else {
      setPasswordError(false);
      setPasswordErrorMessage('');
    }

    return isValid;
  };

  return (
    <AppTheme>
      <CssBaseline enableColorScheme />
      <SignInContainer direction="column" justifyContent="space-between">
        {/* <ColorModeSelect sx={{ position: 'fixed', top: '1rem', right: '1rem' }} /> */}
        <Card variant="outlined">
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
            <SignatureLogo size="small" color="black" />
          </Box>
          <Typography
            component="h1"
            variant="h4"
            sx={{
              width: '100%',
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.15rem' },
              textAlign: 'center'
            }}
          >
            Sign in
          </Typography>
          <Box
            component="form"
            noValidate
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 2 }}
          >
            <FormControl>
              <FormLabel htmlFor="username">Username</FormLabel>
              <TextField
                error={usernameError}
                helperText={usernameErrorMessage}
                id="username"
                type="text"
                name="username"
                placeholder="Your username"
                autoComplete="username"
                autoFocus
                required
                fullWidth
                variant="outlined"
                color={usernameError ? 'error' : 'primary'}
              />
            </FormControl>
            <FormControl sx={{ marginBottom: 2 }}>
              <FormLabel htmlFor="password">Password</FormLabel>
              <TextField
                error={passwordError}
                helperText={passwordErrorMessage}
                name="password"
                placeholder="••••••"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                required
                fullWidth
                variant="outlined"
                color={passwordError ? 'error' : 'primary'}
                InputProps={{
                  endAdornment: (
                    <Box
                      onClick={() => setShowPassword(!showPassword)}
                      sx={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        color: 'text.secondary',
                        '&:hover': {
                          color: 'text.primary',
                        },
                      }}
                    >
                      {showPassword ? <Visibility /> : <VisibilityOff />}
                    </Box>
                  ),
                }}
              />
            </FormControl>
            <Button type="submit" fullWidth variant="contained" onClick={validateInputs}>
              Sign in
            </Button>
            <Link
              component="button"
              type="button"
              onClick={() => router.push('/forgot-password')}
              variant="body2"
              sx={{ alignSelf: 'center', cursor: 'pointer' }}
            >
              Forgot your password?
            </Link>
          </Box>
          <Divider>or</Divider>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography sx={{ textAlign: 'center' }}>
              Don&apos;t have an account?{' '}
              <Link href="/signup" variant="body2" sx={{ alignSelf: 'center' }}>
                Sign up
              </Link>
            </Typography>
          </Box>
        </Card>
      </SignInContainer>
    </AppTheme>
  );
}
