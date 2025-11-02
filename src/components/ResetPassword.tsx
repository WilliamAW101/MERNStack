import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EmailIcon from '@mui/icons-material/Email';
import { useToast } from '@/context/toast';
import { useRouter } from 'next/navigation';

interface ResetPasswordProps {
    email: string;
}

export default function ResetPassword({ email }: ResetPasswordProps) {
    const [loading, setLoading] = React.useState(false);
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [passwordError, setPasswordError] = React.useState(false);
    const [passwordErrorMessage, setPasswordErrorMessage] = React.useState('');
    const [confirmPasswordError, setConfirmPasswordError] = React.useState(false);
    const [confirmPasswordErrorMessage, setConfirmPasswordErrorMessage] = React.useState('');
    const toast = useToast();
    const router = useRouter();
    const baseUrl = process.env.REMOTE_URL;

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

    return (
        <>
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
        </>
    );
}


