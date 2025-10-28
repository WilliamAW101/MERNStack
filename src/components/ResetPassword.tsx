import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useToast } from '@/context/toast';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

interface ResetPasswordProps {
    open: boolean;
    handleClose: () => void;
    email: string;
    onPasswordReset?: () => void;
}

export default function ResetPassword({ open, handleClose, email, onPasswordReset }: ResetPasswordProps) {
    const [loading, setLoading] = React.useState(false);
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [error, setError] = React.useState('');
    const toast = useToast();
    const baseUrl = process.env.REMOTE_URL;

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');

        // Validate passwords match
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        // Validate password length
        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
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
                toast.success("Password reset successfully!");
                handleClose();
                if (onPasswordReset) onPasswordReset();
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
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="xs"
            fullWidth
        >
            <Box component="form" onSubmit={handleSubmit}>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircleOutlineIcon color="success" />
                        Reset Your Password
                    </Box>
                </DialogTitle>
                <DialogContent
                    sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}
                >
                    <DialogContentText>
                        Create a new password for <strong>{email}</strong>
                    </DialogContentText>
                    <TextField
                        autoFocus
                        required
                        margin="dense"
                        id="password"
                        name="password"
                        label="New Password"
                        placeholder="Enter new password"
                        type="password"
                        fullWidth
                        variant="outlined"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        error={!!error}
                    />
                    <TextField
                        required
                        margin="dense"
                        id="confirmPassword"
                        name="confirmPassword"
                        label="Confirm Password"
                        placeholder="Confirm new password"
                        type="password"
                        fullWidth
                        variant="outlined"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        error={!!error}
                        helperText={error}
                    />
                    <Typography variant="body2" color="text.secondary">
                        Password must be at least 6 characters long.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ pb: 3, px: 3 }}>
                    <Button onClick={handleClose} disabled={loading}>Cancel</Button>
                    <Button
                        variant="contained"
                        type="submit"
                        disabled={loading || !password || !confirmPassword}
                    >
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
}


