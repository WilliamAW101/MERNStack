"use client"

import React, { useState, useRef } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Box,
    Typography,
    Avatar,
    IconButton,
    CircularProgress,
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { useToast } from '@/context/toast';
import {
    changeProfileInfo,
    getUploadUrl,
} from '@/services/api.service';

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
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewAvatar, setPreviewAvatar] = useState<string | null>(userInfo?.profilePicture || null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
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
            setPreviewAvatar(userInfo.profilePicture);
        }
    }, [userInfo]);

    const handleFormChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [field]: event.target.value,
        });
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size must be less than 5MB');
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewAvatar(reader.result as string);
        };
        reader.readAsDataURL(file);

        setSelectedFile(file);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Upload avatar first if a new one was selected
            if (selectedFile) {
                setUploading(true);
                const ext = selectedFile.name.split('.').pop()?.toLowerCase() || 'jpg';
                const uploadUrlResponse = await getUploadUrl({
                    contentType: selectedFile.type as any,
                    ext: ext as any,
                });

                setUploading(false);
            }

            // Update profile info
            const response = await changeProfileInfo(formData);

            if (response.success) {
                onProfileUpdated(response.data.updatedUser);
                toast.success('Profile updated successfully!');
                onClose();
                setSelectedFile(null);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile');
        } finally {
            setSaving(false);
            setUploading(false);
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        setPreviewAvatar(userInfo?.profilePicture || null);
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
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
                }}
            >
                Edit Profile
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 1 }}>
                    {/* Avatar Section */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ position: 'relative' }}>
                            {previewAvatar ? (
                                <Avatar
                                    src={previewAvatar}
                                    sx={{
                                        width: 100,
                                        height: 100,
                                        cursor: 'pointer',
                                    }}
                                    onClick={handleAvatarClick}
                                />
                            ) : (
                                <Box
                                    onClick={handleAvatarClick}
                                    sx={{
                                        width: 100,
                                        height: 100,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <AccountCircleIcon
                                        sx={{
                                            width: 100,
                                            height: 100,
                                            color: '#262626',
                                        }}
                                    />
                                </Box>
                            )}
                            {uploading && (
                                <CircularProgress
                                    size={24}
                                    sx={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        marginTop: '-12px',
                                        marginLeft: '-12px',
                                    }}
                                />
                            )}
                        </Box>
                        <Button
                            variant="outlined"
                            startIcon={<PhotoCameraIcon />}
                            onClick={handleAvatarClick}
                            disabled={uploading || saving}
                            sx={{
                                textTransform: 'none',
                                borderColor: '#dbdbdb',
                                color: '#0095f6',
                                fontWeight: 600,
                                '&:hover': {
                                    borderColor: '#0095f6',
                                    bgcolor: 'rgba(0, 149, 246, 0.05)',
                                },
                            }}
                        >
                            {selectedFile ? 'Change Photo' : 'Upload Photo'}
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />
                    </Box>

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
                    disabled={saving || uploading}
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





