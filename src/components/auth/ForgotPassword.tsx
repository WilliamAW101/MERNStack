'use client';
import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useToast } from '@/context/toast';
import { useRouter } from 'next/navigation';
import SignatureLogo from '../common/SignatureLogo';

interface ForgotPasswordProps {
  onBackToSignIn?: () => void;
}

export default function ForgotPassword({ onBackToSignIn }: ForgotPasswordProps) {
  const [loading, setLoading] = React.useState(false);
  const [emailError, setEmailError] = React.useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = React.useState('');
  const toast = useToast();

  const router = useRouter();

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

  const validateEmail = (email: string) => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setEmailError(true);
      setEmailErrorMessage('Please enter a valid email address.');
      return false;
    }
    setEmailError(false);
    setEmailErrorMessage('');
    return true;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;

    if (!validateEmail(email)) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/api/sendCode?email=${email}`, {
        method: 'GET',
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/verify-code?email=${encodeURIComponent(email)}`);

      } else {
        toast.error(result.message || "Email is not found");
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton
          onClick={onBackToSignIn}
          sx={{ mr: 1 }}
          aria-label="back to sign in"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography component="h1" variant="h5">
          Forgot Password
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Enter your email address and we'll send you a verification code to reset your password.
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit}
        noValidate
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <FormControl>
          <FormLabel htmlFor="email">Email Address</FormLabel>
          <TextField
            error={emailError}
            helperText={emailErrorMessage}
            id="email"
            type="email"
            name="email"
            placeholder="your@email.com"
            autoComplete="email"
            autoFocus
            required
            fullWidth
            variant="outlined"
            color={emailError ? 'error' : 'primary'}
          />
        </FormControl>

        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Finding...' : 'Find your email'}
        </Button>

        <Button
          type="button"
          sx={{ backgroundColor: "gray[200]", color: "text.secondary" }}
          fullWidth
          variant="text"
          onClick={onBackToSignIn}
        >
          Back to Sign In
        </Button>
      </Box >
    </>
  );
}