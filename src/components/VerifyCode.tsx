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

interface VerifyCodeProps {
    open: boolean;
    handleClose: () => void;
    email: string;
    onCodeVerified?: () => void;
}

export default function VerifyCode({ open, handleClose, email, onCodeVerified }: VerifyCodeProps) {
    const [loading, setLoading] = React.useState(false);
    const [code, setCode] = React.useState('');
    const toast = useToast();
    const baseUrl = process.env.REMOTE_URL;

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
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
                handleClose();
                if (onCodeVerified) onCodeVerified();
            } else {
                toast.error(result.message || "Invalid verification code");
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
                <DialogTitle>Enter Verification Code</DialogTitle>
                <DialogContent
                    sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}
                >
                    <DialogContentText>
                        We've sent a verification code to <strong>{email}</strong>. Please enter the code below.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        required
                        margin="dense"
                        id="code"
                        name="code"
                        label="Verification Code"
                        placeholder="Enter 6-digit code"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        inputProps={{
                            maxLength: 6,
                            pattern: '[0-9]*',
                        }}
                    />
                    <Typography variant="body2" color="text.secondary">
                        Didn't receive the code? Check your spam folder or request a new one.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ pb: 3, px: 3 }}>
                    <Button onClick={handleClose} disabled={loading}>Cancel</Button>
                    <Button variant="contained" type="submit" disabled={loading || code.length !== 6}>
                        {loading ? 'Verifying...' : 'Verify Code'}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
}

