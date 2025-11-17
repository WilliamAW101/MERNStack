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
import { styled } from '@mui/material/styles';
import AppTheme from '@/theme/AppTheme';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/user/UserContext';
import { useToast } from '@/context/toast';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import EmailIcon from '@mui/icons-material/Email';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import InputAdornment from '@mui/material/InputAdornment';
import SignatureLogo from '../common/SignatureLogo';

const Card = styled(MuiCard)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'center',
  width: '100%',
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  margin: 'auto',
  boxShadow:
    'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px',
  [theme.breakpoints.up('sm')]: {
    width: '450px',
    maxWidth: '90vw',
  },
  [theme.breakpoints.up('md')]: {
    width: '500px',
  },
  ...theme.applyStyles('dark', {
    boxShadow:
      'hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px',
  }),
}));

const SignUpContainer = styled(Stack)(({ theme }) => ({
  height: 'calc((1 - var(--template-frame-height, 0)) * 100dvh)',
  minHeight: '100%',
  padding: theme.spacing(2),
  background: '#E9EDE8',
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(2),
  },
  [theme.breakpoints.up('md')]: {
    padding: theme.spacing(4),
  },
  ...theme.applyStyles('dark', {
    background: '#E9EDE8',
  }),
}));

export default function SignUp() {
  const [emailError, setEmailError] = React.useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = React.useState('');
  const [usernameError, setUsernameError] = React.useState(false);
  const [usernameErrorMessage, setUsernameErrorMessage] = React.useState('');
  const [passwordError, setPasswordError] = React.useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = React.useState('');
  const [firstnameError, setFirstNameError] = React.useState(false);
  const [lastnameError, setLastNameError] = React.useState(false);
  const [firstNameErrorMessage, setFirstNameErrorMessage] = React.useState('');
  const [lastNameErrorMessage, setLastNameErrorMessage] = React.useState('');
  const [phoneError, setPhoneError] = React.useState(false);
  const [phoneErrorMessage, setPhoneErrorMessage] = React.useState('');
  const [showVerificationDialog, setShowVerificationDialog] = React.useState(false);
  const [userEmail, setUserEmail] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);


  const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

  const toast = useToast();
  const router = useRouter()


  const validateInputs = () => {
    const email = document.getElementById('email') as HTMLInputElement;
    const password = document.getElementById('password') as HTMLInputElement;
    const firstname = document.getElementById('firstname') as HTMLInputElement;
    const lastname = document.getElementById('lastname') as HTMLInputElement;
    const username = document.getElementById('username') as HTMLInputElement;
    const phone = document.getElementById('phone') as HTMLInputElement;


    let isValid = true;

    if (!username.value || username.value.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username.value)) {
      setUsernameError(true);
      setUsernameErrorMessage('Username must be at least 3 characters and contain only letters, numbers, or underscores.');
      isValid = false;
    } else {
      setUsernameError(false);
      setUsernameErrorMessage('');
    }

    if (!email.value || !/\S+@\S+\.\S+/.test(email.value)) {
      setEmailError(true);
      setEmailErrorMessage('Please enter a valid email address.');
      isValid = false;
    } else {
      setEmailError(false);
      setEmailErrorMessage('');
    }

    if (!password.value || password.value.length < 6) {
      setPasswordError(true);
      setPasswordErrorMessage('Password must be at least 6 characters long.');
      isValid = false;
    } else {
      setPasswordError(false);
      setPasswordErrorMessage('');
    }

    if (!firstname.value || firstname.value.length < 1) {
      setFirstNameError(true);
      setFirstNameErrorMessage('Name is required.');
      isValid = false;
    } else {
      setFirstNameError(false);
      setFirstNameErrorMessage('');
    }

    if (!lastname.value || lastname.value.length < 1) {
      setLastNameError(true);
      setLastNameErrorMessage('Name is required.');
      isValid = false;
    } else {
      setLastNameError(false);
      setLastNameErrorMessage('');
    }

    if (!phone.value || !/^[0-9]{10,15}$/.test(phone.value)) {
      setPhoneError(true);
      setPhoneErrorMessage('Phone must be 10-15 digits.');
      isValid = false;
    } else {
      setPhoneError(false);
      setPhoneErrorMessage('');
    }

    return isValid;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // prevent default form submission

    if (firstnameError || lastnameError || emailError || passwordError || usernameError || phoneError) {
      return;
    }

    const data = new FormData(event.currentTarget);

    // Convert FormData to JSON object
    const jsonData = {
      userName: data.get('username'),
      password: data.get('password'),
      firstName: data.get('firstname'),
      lastName: data.get('lastname'),
      email: data.get('email'),
      phone: data.get('phone'),
    };

    try {
      const response = await fetch(`${BASE_URL}/api/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // send JSON
        },
        body: JSON.stringify(jsonData),
      });

      const result = await response.json(); // assuming PHP returns JSON

      if (result.success) {
        // Store the user's email for the verification dialog
        setUserEmail(jsonData.email as string);
        // Show verification dialog
        setShowVerificationDialog(true);
        toast.success("Account created successfully!");
      } else {
        toast.error(result.message || result.error || "Signup failed");
      }

    } catch (error) {
      console.error('Error sending data:', error);
      toast.error("Network error. Please try again.");
    }
  };


  const handleVerificationDialogClose = () => {
    setShowVerificationDialog(false);
    // Navigate to sign in page after closing verification dialog
    router.push('/login');
  };

  return (
    <AppTheme>
      <CssBaseline enableColorScheme />
      <SignUpContainer>

        <Card sx={{ backgroundColor: 'white' }}>

          <Dialog
            open={showVerificationDialog}
            onClose={handleVerificationDialogClose}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <CheckCircleOutlineIcon sx={{ fontSize: 60, color: 'success.main' }} />
              </Box>
              <Typography variant="h5" component="div" fontWeight={600}>
                Verify Your Email
              </Typography>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ textAlign: 'center', px: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    mb: 2,
                    p: 2,
                    bgcolor: 'action.hover',
                    borderRadius: 1
                  }}
                >
                  <EmailIcon color="primary" />
                  <Typography variant="body1" fontWeight={500}>
                    {userEmail}
                  </Typography>
                </Box>

                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  We've sent a verification link to your email address. Please check your inbox and click the verification link to activate your account.
                </Typography>

                <Box sx={{ bgcolor: 'info.lighter', p: 2, borderRadius: 1, mb: 2 }}>
                  <Typography variant="body2" color="info.dark">
                    <strong>Important:</strong> You must verify your email before you can sign in.
                  </Typography>
                </Box>

                <Typography variant="body2" color="text.secondary">
                  Didn't receive the email? Check your spam folder or contact support.
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 1 }}>
              <Button
                variant="contained"
                onClick={handleVerificationDialogClose}
                size="large"
              >
                Got it, Sign In
              </Button>
            </DialogActions>
          </Dialog>

          <Box sx={{ p: 2, maxHeight: '100vh', overflow: 'auto', backgroundColor: 'white' }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
              <SignatureLogo size="small" color="#000" />
            </Box>
            <Typography
              component="h1"
              variant="h4"
              sx={{
                width: '100%',
                fontSize: { xs: '1.5rem', sm: '2rem', md: '2.15rem' },
                textAlign: 'center',
                mb: 2
              }}
            >
              Sign up
            </Typography>
            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              <FormControl>
                <FormLabel htmlFor="first name">First name</FormLabel>
                <TextField
                  autoComplete="firstname"
                  name="firstname"
                  required
                  fullWidth
                  id="firstname"
                  placeholder="Jon"
                  error={firstnameError}
                  helperText={firstNameErrorMessage}
                  color={firstnameError ? 'error' : 'primary'}
                />
              </FormControl>
              <FormControl>
                <FormLabel htmlFor="name">Last name</FormLabel>
                <TextField
                  autoComplete="lastname"
                  name="lastname"
                  required
                  fullWidth
                  id="lastname"
                  placeholder="Snow"
                  error={lastnameError}
                  helperText={lastNameErrorMessage}
                  color={lastnameError ? 'error' : 'primary'}
                />
              </FormControl>
              <FormControl>
                <FormLabel htmlFor="email">Email</FormLabel>
                <TextField
                  required
                  fullWidth
                  id="email"
                  placeholder="your@email.com"
                  name="email"
                  autoComplete="email"
                  variant="outlined"
                  error={emailError}
                  helperText={emailErrorMessage}
                  color={passwordError ? 'error' : 'primary'}
                />
              </FormControl>
              <FormControl>
                <FormLabel htmlFor="phone">Phone</FormLabel>
                <TextField
                  required
                  fullWidth
                  id="phone"
                  placeholder="1234567890"
                  name="phone"
                  autoComplete="phone"
                  variant="outlined"
                  error={phoneError}
                  helperText={phoneErrorMessage}
                  color={phoneError ? 'error' : 'primary'}
                />
              </FormControl>
              <FormControl>
                <FormLabel htmlFor="user name">Username</FormLabel>
                <TextField
                  autoComplete="username"
                  name="username"
                  required
                  fullWidth
                  id="username"
                  placeholder="Your username"
                  error={usernameError}
                  helperText={usernameErrorMessage}
                  color={usernameError ? 'error' : 'primary'}
                />
              </FormControl>
              <FormControl>
                <FormLabel htmlFor="password">Password</FormLabel>
                <TextField
                  required
                  fullWidth
                  name="password"
                  placeholder="••••••"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="new-password"
                  variant="outlined"
                  error={passwordError}
                  helperText={passwordErrorMessage}
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

              <Button
                type="submit"
                fullWidth
                variant="contained"
                onClick={validateInputs}
              >
                Sign up
              </Button>
            </Box>
            <Divider sx={{ my: 2 }}>
              <Typography sx={{ color: 'text.secondary' }}>or</Typography>
            </Divider>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography sx={{ textAlign: 'center' }}>
                Already have an account?{' '}
                <Link
                  variant="body2"
                  sx={{ alignSelf: 'center', cursor: 'pointer' }}
                  onClick={() => router.push('/login')}
                >
                  Sign in
                </Link>
              </Typography>
            </Box>
          </Box>
        </Card>
      </SignUpContainer>
    </AppTheme>
  );
}