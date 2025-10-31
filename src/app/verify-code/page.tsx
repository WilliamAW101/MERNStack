"use client"

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import MuiCard from '@mui/material/Card';
import { styled } from '@mui/material/styles';
import AppTheme from '../../theme/AppTheme';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/context/toast';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IconButton from '@mui/material/IconButton';
import EmailIcon from '@mui/icons-material/Email';

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

const VerifyCodeContainer = styled(Stack)(({ theme }) => ({
    height: 'calc((1 - var(--template-frame-height, 0)) * 100dvh)',
    minHeight: '100vh',
    padding: theme.spacing(1),
    background: 'linear-gradient(135deg, #FBEED7 0%, #E8D4B8 50%, #C9AE8E 100%)',
    [theme.breakpoints.up('sm')]: {
        padding: theme.spacing(2),
    },
    [theme.breakpoints.up('md')]: {
        padding: theme.spacing(4),
    },
    ...theme.applyStyles('dark', {
        background: 'linear-gradient(135deg, #FBEED7 0%, #E8D4B8 50%, #C9AE8E 100%)',
    }),
}));

export default function VerifyCodePage() {
    const [loading, setLoading] = React.useState(false);
    const [code, setCode] = React.useState('');
    const [codeError, setCodeError] = React.useState(false);
    const [codeErrorMessage, setCodeErrorMessage] = React.useState('');
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email');
    const toast = useToast();
    const baseUrl = process.env.REMOTE_URL;

    React.useEffect(() => {
        // If no email is provided, redirect to forgot password page
        if (!email) {
            toast.error("Please enter your email first");
            router.push('/forgot-password');
        }
    }, [email, router, toast]);

    const validateCode = (code: string) => {
        if (!code || code.length !== 6 || !/^[0-9]+$/.test(code)) {
            setCodeError(true);
            setCodeErrorMessage('Please enter a valid 6-digit code.');
            return false;
        }
        setCodeError(false);
        setCodeErrorMessage('');
        return true;
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!validateCode(code)) {
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${baseUrl}/api/verify-reset-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Code verified successfully!");
                // Navigate to reset password page with email
                router.push(`/reset-password?email=${encodeURIComponent(email || '')}`);
            } else {
                toast.error(result.message || "Invalid verification code");
                setCodeError(true);
                setCodeErrorMessage(result.message || "Invalid verification code");
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (!email) return;

        try {
            const response = await fetch(`${baseUrl}/api/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success("New verification code sent!");
            } else {
                toast.error(result.message || "Failed to resend code");
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error("Network error. Please try again.");
        }
    };

    if (!email) {
        return null; // Will redirect in useEffect
    }

    return (
        <AppTheme>
            <CssBaseline enableColorScheme />
            <VerifyCodeContainer direction="column" justifyContent="space-between">
                <Card variant="outlined">
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <IconButton
                            onClick={() => router.push('/forgot-password')}
                            sx={{ mr: 1 }}
                            aria-label="back"
                        >
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography component="h1" variant="h5">
                            Enter Verification Code
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            mb: 2,
                            p: 2,
                            bgcolor: 'action.hover',
                            borderRadius: 1
                        }}
                    >
                        <EmailIcon color="primary" />
                        <Typography variant="body2" fontWeight={500}>
                            {email}
                        </Typography>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        We've sent a 6-digit verification code to your email address. Please enter it below.
                    </Typography>

                    <Box
                        component="form"
                        onSubmit={handleSubmit}
                        noValidate
                        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                    >
                        <FormControl>
                            <FormLabel htmlFor="code">Verification Code</FormLabel>
                            <TextField
                                error={codeError}
                                helperText={codeErrorMessage}
                                id="code"
                                type="text"
                                name="code"
                                placeholder="Enter 6-digit code"
                                autoFocus
                                required
                                fullWidth
                                variant="outlined"
                                color={codeError ? 'error' : 'primary'}
                                value={code}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                                    setCode(value);
                                    if (codeError) {
                                        setCodeError(false);
                                        setCodeErrorMessage('');
                                    }
                                }}
                                inputProps={{
                                    maxLength: 6,
                                    pattern: '[0-9]*',
                                    inputMode: 'numeric',
                                }}
                            />
                        </FormControl>

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={loading || code.length !== 6}
                        >
                            {loading ? 'Verifying...' : 'Verify Code'}
                        </Button>

                        <Button
                            type="button"
                            fullWidth
                            variant="text"
                            onClick={handleResendCode}
                            disabled={loading}
                        >
                            Resend Code
                        </Button>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                        Didn't receive the code? Check your spam folder or try resending.
                    </Typography>
                </Card>
            </VerifyCodeContainer>
        </AppTheme>
    );
}

