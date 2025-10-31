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
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
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

const ResetPasswordContainer = styled(Stack)(({ theme }) => ({
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

export default function ResetPasswordPage() {
    const [loading, setLoading] = React.useState(false);
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [passwordError, setPasswordError] = React.useState(false);
    const [passwordErrorMessage, setPasswordErrorMessage] = React.useState('');
    const [confirmPasswordError, setConfirmPasswordError] = React.useState(false);
    const [confirmPasswordErrorMessage, setConfirmPasswordErrorMessage] = React.useState('');
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email');
    const toast = useToast();
    const baseUrl = process.env.REMOTE_URL;

    React.useEffect(() => {
        // If no email is provided, redirect to forgot password page
        if (!email) {
            toast.error("Session expired. Please start over.");
            router.push('/forgot-password');
        }
    }, [email, router, toast]);

    const validatePassword = () => {
        let isValid = true;

        // Validate password length
        if (!password || password.length < 6) {
            setPasswordError(true);
            setPasswordErrorMessage('Password must be at least 6 characters long');
            isValid = false;
        } else {
            setPasswordError(false);
            setPasswordErrorMessage('');
        }

        // Validate passwords match
        if (!confirmPassword || password !== confirmPassword) {
            setConfirmPasswordError(true);
            setConfirmPasswordErrorMessage('Passwords do not match');
            isValid = false;
        } else {
            setConfirmPasswordError(false);
            setConfirmPasswordErrorMessage('');
        }

        return isValid;
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!validatePassword()) {
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${baseUrl}/api/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, newPassword: password }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Password reset successfully! Please sign in with your new password.");
                // Navigate to login page
                router.push('/login');
            } else {
                toast.error(result.message || "Failed to reset password");
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (!email) {
        return null; // Will redirect in useEffect
    }

    return (
        <AppTheme>
            <CssBaseline enableColorScheme />
            <ResetPasswordContainer direction="column" justifyContent="space-between">
                <Card variant="outlined">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                        <CheckCircleOutlineIcon sx={{ fontSize: 48, color: 'success.main', mr: 1 }} />
                        <Typography component="h1" variant="h5">
                            Reset Your Password
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
                        Create a new password for your account. Make sure it's at least 6 characters long.
                    </Typography>

                    <Box
                        component="form"
                        onSubmit={handleSubmit}
                        noValidate
                        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                    >
                        <FormControl>
                            <FormLabel htmlFor="password">New Password</FormLabel>
                            <TextField
                                error={passwordError}
                                helperText={passwordErrorMessage}
                                id="password"
                                type="password"
                                name="password"
                                placeholder="Enter new password"
                                autoFocus
                                required
                                fullWidth
                                variant="outlined"
                                color={passwordError ? 'error' : 'primary'}
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (passwordError) {
                                        setPasswordError(false);
                                        setPasswordErrorMessage('');
                                    }
                                }}
                            />
                        </FormControl>

                        <FormControl>
                            <FormLabel htmlFor="confirmPassword">Confirm Password</FormLabel>
                            <TextField
                                error={confirmPasswordError}
                                helperText={confirmPasswordErrorMessage}
                                id="confirmPassword"
                                type="password"
                                name="confirmPassword"
                                placeholder="Confirm new password"
                                required
                                fullWidth
                                variant="outlined"
                                color={confirmPasswordError ? 'error' : 'primary'}
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    if (confirmPasswordError) {
                                        setConfirmPasswordError(false);
                                        setConfirmPasswordErrorMessage('');
                                    }
                                }}
                            />
                        </FormControl>

                        <Box sx={{ bgcolor: 'info.lighter', p: 2, borderRadius: 1 }}>
                            <Typography variant="body2" color="info.dark">
                                <strong>Password Requirements:</strong>
                            </Typography>
                            <Typography variant="body2" color="info.dark">
                                • At least 6 characters long
                            </Typography>
                        </Box>

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={loading || !password || !confirmPassword}
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </Button>

                        <Button
                            type="button"
                            fullWidth
                            variant="text"
                            onClick={() => router.push('/login')}
                        >
                            Back to Sign In
                        </Button>
                    </Box>
                </Card>
            </ResetPasswordContainer>
        </AppTheme>
    );
}

