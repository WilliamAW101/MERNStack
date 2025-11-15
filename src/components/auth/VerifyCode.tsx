import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmailIcon from '@mui/icons-material/Email';
import { useToast } from '@/context/toast';
import { useRouter } from 'next/navigation';

interface VerifyCodeProps {
    email: string;
    onBack?: () => void;
}

export default function VerifyCode({ email, onBack }: VerifyCodeProps) {
    const [loading, setLoading] = React.useState(false);
    const [code, setCode] = React.useState('');
    const [codeError, setCodeError] = React.useState(false);
    const [codeErrorMessage, setCodeErrorMessage] = React.useState('');
    const toast = useToast();
    const router = useRouter();
    const baseUrl = 'http://localhost:5000';

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
            const response = await fetch(`${baseUrl}/api/checkCode`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Code verified successfully!");
                router.push(`/reset-password?id=${result.data.id}`);
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

    return (
        <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <IconButton
                    onClick={onBack}
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

                <Button
                    type="button"
                    fullWidth
                    variant="text"
                    onClick={onBack}
                >
                    Use Different Email
                </Button>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                Didn't receive the code? Check your spam folder or try resending.
            </Typography>
        </>
    );
}

