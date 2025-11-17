import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useToast } from '@/context/toast';
import { useRouter } from 'next/navigation';

interface ResetPasswordProps {
    id: string;
}

export default function ResetPassword({ id }: ResetPasswordProps) {
    const [loading, setLoading] = React.useState(false);
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [passwordError, setPasswordError] = React.useState(false);
    const [passwordErrorMessage, setPasswordErrorMessage] = React.useState('');
    const [confirmPasswordError, setConfirmPasswordError] = React.useState(false);
    const [confirmPasswordErrorMessage, setConfirmPasswordErrorMessage] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
    const toast = useToast();
    const router = useRouter();

    const BASE_URL = process.env.NEXT_PUBLIC_API_URL;


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
            const response = await fetch(`${BASE_URL}/api/changePassword`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, newPassword: password, samePassword: password }),
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
                        type={showPassword ? 'text' : 'password'}
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

                <FormControl>
                    <FormLabel htmlFor="confirmPassword">Confirm Password</FormLabel>
                    <TextField
                        error={confirmPasswordError}
                        helperText={confirmPasswordErrorMessage}
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
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
                        InputProps={{
                            endAdornment: (
                                <Box
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                                    {showConfirmPassword ? <Visibility /> : <VisibilityOff />}
                                </Box>
                            ),
                        }}
                    />
                </FormControl>

                <Box sx={{ bgcolor: 'info.lighter', p: 2, borderRadius: 1 }}>
                    <Typography variant="body2" color="black">
                        <strong>Password Requirements:</strong>
                    </Typography>
                    <Typography variant="body2" color="black">
                        • At least 6 characters long
                    </Typography>
                </Box>

                <Button
                    type="submit"
                    fullWidth
                    variant="contained"                >
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


