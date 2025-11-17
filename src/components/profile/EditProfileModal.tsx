"use client"

import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Box,
    Typography,
    CircularProgress,
} from '@mui/material';
import { useToast } from '@/context/toast';
import { changeProfileInfo } from '@/services/api.service';
import SignatureLogo from '../common/SignatureLogo';

interface UserInfo {
    _id: string;
    userName: string;
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    profileDescription: string;
    profilePicture: string | null;
    userProfilePic: string | null;
}

interface EditProfileModalProps {
    userName: string;
    open: boolean;
    onClose: () => void;
    userInfo: UserInfo | null;
    onProfileUpdated: (updatedUser: UserInfo) => void;
}

export default function EditProfileModal({
    open,
    onClose,
    userInfo,
    onProfileUpdated,
}: EditProfileModalProps) {
    const [formData, setFormData] = useState({
        firstName: userInfo?.firstName || '',
        lastName: userInfo?.lastName || '',
        phone: userInfo?.phone || '',
        profileDescription: userInfo?.profileDescription || '',
    });
    const [saving, setSaving] = useState(false);
    const toast = useToast();

    // Update form data when userInfo changes
    React.useEffect(() => {
        if (userInfo) {
            setFormData({
                firstName: userInfo.firstName || '',
                lastName: userInfo.lastName || '',
                phone: userInfo.phone || '',
                profileDescription: userInfo.profileDescription || '',
            });
        }
    }, [userInfo]);

    const handleFormChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [field]: event.target.value,
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Update profile info
            const response = await changeProfileInfo(formData);

            if (response.success) {
                onProfileUpdated(response.data.updatedUser);
                toast.success('Profile updated successfully!');
                onClose();
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            disableAutoFocus
            disableEnforceFocus
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                }
            }}
        >
            <DialogTitle
                sx={{
                    textAlign: 'center',
                    fontWeight: 600,
                    borderBottom: '1px solid #dbdbdb',
                    py: 2,
                    color: '#000',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <SignatureLogo size="small" color="#000" />
                </Box>
                Edit Profile
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 1 }}>

                    {/* Form Fields */}
                    <Box>
                        <Typography variant="caption" sx={{ color: '#8e8e8e', fontWeight: 600, mb: 0.5, display: 'block' }}>
                            First Name
                        </Typography>
                        <TextField
                            fullWidth
                            value={formData.firstName}
                            onChange={handleFormChange('firstName')}
                            variant="outlined"
                            size="small"
                            disabled={saving}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 1,
                                }
                            }}
                        />
                    </Box>

                    <Box>
                        <Typography variant="caption" sx={{ color: '#8e8e8e', fontWeight: 600, mb: 0.5, display: 'block' }}>
                            Last Name
                        </Typography>
                        <TextField
                            fullWidth
                            value={formData.lastName}
                            onChange={handleFormChange('lastName')}
                            variant="outlined"
                            size="small"
                            disabled={saving}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 1,
                                }
                            }}
                        />
                    </Box>

                    <Box>
                        <Typography variant="caption" sx={{ color: '#8e8e8e', fontWeight: 600, mb: 0.5, display: 'block' }}>
                            Phone
                        </Typography>
                        <TextField
                            fullWidth
                            value={formData.phone}
                            onChange={handleFormChange('phone')}
                            variant="outlined"
                            size="small"
                            disabled={saving}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 1,
                                }
                            }}
                        />
                    </Box>

                    <Box>
                        <Typography variant="caption" sx={{ color: '#8e8e8e', fontWeight: 600, mb: 0.5, display: 'block' }}>
                            Bio
                        </Typography>
                        <TextField
                            fullWidth
                            value={formData.profileDescription}
                            onChange={handleFormChange('profileDescription')}
                            variant="outlined"
                            multiline
                            rows={3}
                            placeholder="Write a bio about yourself..."
                            disabled={saving}
                            inputProps={{ maxLength: 150 }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 1,
                                }
                            }}
                        />
                        <Typography variant="caption" sx={{ color: '#8e8e8e', mt: 0.5, display: 'block' }}>
                            {formData.profileDescription.length} / 150
                        </Typography>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions
                sx={{
                    borderTop: '1px solid #dbdbdb',
                    px: 3,
                    py: 2,
                    gap: 1,
                }}
            >
                <Button
                    onClick={handleClose}
                    disabled={saving}
                    sx={{
                        textTransform: 'none',
                        color: '#262626',
                        fontWeight: 600,
                    }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    disabled={saving}
                    sx={{
                        textTransform: 'none',
                        bgcolor: '#0095f6',
                        fontWeight: 600,
                        px: 3,
                        '&:hover': {
                            bgcolor: '#0084e0',
                        },
                        '&:disabled': {
                            bgcolor: '#b3e0ff',
                        }
                    }}
                >
                    {saving ? (
                        <>
                            <CircularProgress size={16} sx={{ mr: 1, color: '#fff' }} />
                            Saving...
                        </>
                    ) : (
                        'Save'
                    )}
                </Button>
            </DialogActions>
        </Dialog>
    );
}





