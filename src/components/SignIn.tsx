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
import { styled } from '@mui/material/styles';
import AppTheme from '../theme/AppTheme';
import { useUser } from '@/context/user/UserContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/toast';
import ForgotPassword from './ForgotPassword';
import VerifyCode from './VerifyCode';
import ResetPassword from './ResetPassword';


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
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(2),
  },
  [theme.breakpoints.up('md')]: {
    padding: theme.spacing(4),
  },
  [theme.breakpoints.up('lg')]: {
    padding: theme.spacing(6),
  },

}));

export default function SignIn(props: { disableCustomTheme?: boolean; onClose?: () => void; onOpenSignUp?: () => void; onOpenSignIn?: () => void }) {
  const [usernameError, setUsernameError] = React.useState(false);
  const [usernameErrorMessage, setUsernameErrorMessage] = React.useState('');
  const [passwordError, setPasswordError] = React.useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = React.useState('');
  const router = useRouter()
  const toast = useToast();
  const { setUser } = useUser();

  const [isOpenForgotPassword, setIsOpenForgotPassword] = React.useState(false);
  const [isOpenVerifyCode, setIsOpenVerifyCode] = React.useState(false);
  const [isOpenResetPassword, setIsOpenResetPassword] = React.useState(false);
  const [resetEmail, setResetEmail] = React.useState('');

  const handleOpenForgotPassword = () => {
    setIsOpenForgotPassword(true);
  };

  const handleCloseForgotPassword = () => {
    setIsOpenForgotPassword(false);
  };

  const handleCodeSent = (email: string) => {
    setResetEmail(email);
    setIsOpenVerifyCode(true);
  };

  const handleCloseVerifyCode = () => {
    setIsOpenVerifyCode(false);
  };

  const handleCodeVerified = () => {
    setIsOpenResetPassword(true);
  };

  const handleCloseResetPassword = () => {
    setIsOpenResetPassword(false);
  };

  const handlePasswordReset = () => {
    // Open SignIn modal after password reset
    if (props.onOpenSignIn) props.onOpenSignIn();
  };
  const baseUrl = process.env.REMOTE_URL;


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (usernameError || passwordError) return;

    const data = new FormData(event.currentTarget);

    const jsonData = {
      userName: data.get('username'),
      password: data.get('password'),
    };

    try {
      const response = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData),
      });

      const result = await response.json();

      if (result.success && result.data.token) {
        const token = result.data.token;
        localStorage.setItem('token', token);

        // Extract user data from the response
        const userData = {
          token: result.data.token,
          id: result.data.id,
          first_name: result.data.first_name,
          last_name: result.data.last_name,
        };

        setUser(userData);
        toast.success("Login successful");
        if (props.onClose) props.onClose();
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
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography
          component="h1"
          variant="h4"
          sx={{
            width: '100%',
            fontSize: { xs: '1.25rem', sm: '1.75rem' },
            textAlign: 'center',
            mb: 2
          }}
        >
          Sign in
        </Typography>
        <Box
          component="form"
          noValidate
          onSubmit={handleSubmit}
          sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 1.5 }}
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
              size="small"
            />
          </FormControl>
          <FormControl>
            <FormLabel htmlFor="password">Password</FormLabel>
            <TextField
              error={passwordError}
              helperText={passwordErrorMessage}
              name="password"
              placeholder="••••••"
              type="password"
              id="password"
              autoComplete="current-password"
              required
              fullWidth
              variant="outlined"
              color={passwordError ? 'error' : 'primary'}
              size="small"
            />
          </FormControl>

          <ForgotPassword
            open={isOpenForgotPassword}
            handleClose={handleCloseForgotPassword}
            onCodeSent={handleCodeSent}
          />
          <VerifyCode
            open={isOpenVerifyCode}
            handleClose={handleCloseVerifyCode}
            email={resetEmail}
            onCodeVerified={handleCodeVerified}
          />
          <ResetPassword
            open={isOpenResetPassword}
            handleClose={handleCloseResetPassword}
            email={resetEmail}
            onPasswordReset={handlePasswordReset}
          />
          <Button type="submit" fullWidth variant="contained" onClick={validateInputs} sx={{ mt: 1 }}>
            Sign in
          </Button>
          <Link
            component="button"
            type="button"
            onClick={handleOpenForgotPassword}
            variant="body2"
            sx={{ alignSelf: 'center', fontSize: '0.875rem' }}
          >
            Forgot your password?
          </Link>
        </Box>
        <Divider sx={{ my: 2 }}>or</Divider>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
          <Typography sx={{ textAlign: 'center', fontSize: '0.9rem' }}>
            Don&apos;t have an account?{' '}
            <Link
              component="button"
              type="button"
              variant="body2"
              sx={{ alignSelf: 'center' }}
              onClick={() => {
                if (props.onClose) props.onClose();
                setTimeout(() => {
                  if (props.onOpenSignUp) props.onOpenSignUp();
                }, 300);
              }}
            >
              Sign up
            </Link>
          </Typography>
        </Box>
      </Box>
    </AppTheme>
  );
}
