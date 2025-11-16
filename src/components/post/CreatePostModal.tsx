"use client"

import React, { useState, useRef } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    IconButton,
    Rating,
    CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import { useToast } from '@/context/toast';
import { getUploadUrl, createPost } from '@/services/api.service';
import { ContentType, FileExtension } from '@/types/upload.types';
import SignatureLogo from '../common/SignatureLogo';

interface CreatePostModalProps {
    open: boolean;
    onClose: () => void;
    onPostCreated: () => void;
}

export default function CreatePostModal({ open, onClose, onPostCreated }: CreatePostModalProps) {
    const [caption, setCaption] = useState('');
    const [difficulty, setDifficulty] = useState(3);
    const [rating, setRating] = useState(3);
    const [location, setLocation] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const toast = useToast();

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/mov', 'image/heic'];
        if (!validTypes.includes(file.type)) {
            toast.error('Please select a valid image or video file');
            return;
        }

        // Validate file size (max 50MB)
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error('File size must be less than 50MB');
            return;
        }

        setSelectedFile(file);

        // Create preview URL
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const getFileExtension = (filename: string): FileExtension => {
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        if (ext === 'jpg') return 'jpeg';
        return ext as FileExtension;
    };

    const handleSubmit = async () => {
        // Validation
        if (!caption.trim()) {
            toast.error('Please enter a caption');
            return;
        }

        if (!selectedFile) {
            toast.error('Please select an image or video');
            return;
        }

        setUploading(true);

        try {
            // Step 1: Get presigned upload URL from backend
            const ext = getFileExtension(selectedFile.name);
            const uploadUrlResponse = await getUploadUrl({
                contentType: selectedFile.type as ContentType,
                ext,
            });

            // Step 2: Upload file directly to S3 using presigned URL

            // Step 3: Create post with the S3 key
            const isVideo = selectedFile.type.startsWith('video/');
            const postData = {
                caption: caption.trim(),
                difficulty,
                rating,
                images: [{
                    key: uploadUrlResponse.key,
                    type: (isVideo ? 'video' : 'image') as 'video' | 'image',
                }],
                location: location.trim() || undefined,
            };

            console.log('📤 Sending post to backend...');
            await createPost(postData);
            console.log('✅ Post saved to backend');

            // Clear form fields
            setCaption('');
            setDifficulty(3);
            setRating(3);
            setLocation('');
            setSelectedFile(null);
            setPreviewUrl(null);

            // Close modal
            onClose();

            // Notify parent to refresh feed (with lazy loading)
            onPostCreated();

        } catch (error) {
            console.error('Error creating post:', error);
            toast.error('Failed to create post. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        if (uploading) return;

        setCaption('');
        setDifficulty(3);
        setRating(3);
        setLocation('');
        setSelectedFile(null);
        setPreviewUrl(null);
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
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #dbdbdb',
                    py: 2,
                    px: 3,
                    fontWeight: 600,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <SignatureLogo size="small" color="#000" />
                </Box>
                <IconButton
                    onClick={handleClose}
                    disabled={uploading}
                    size="small"
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 3, pb: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* File Upload Section */}
                    <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
                            Image or Video *
                        </Typography>

                        {!previewUrl ? (
                            <Box
                                onClick={() => fileInputRef.current?.click()}
                                sx={{
                                    border: '2px dashed #dbdbdb',
                                    borderRadius: 2,
                                    p: 4,
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    bgcolor: '#fafafa',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        borderColor: '#0095f6',
                                        bgcolor: '#f0f8ff',
                                    },
                                }}
                            >
                                <CloudUploadIcon sx={{ fontSize: 48, color: '#8e8e8e', mb: 1 }} />
                                <Typography variant="body2" sx={{ color: '#262626', fontWeight: 600 }}>
                                    Click to upload
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#8e8e8e' }}>
                                    JPG, PNG, WEBP, MP4, MOV, or HEIC (max 50MB)
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{ position: 'relative' }}>
                                <Box
                                    component={selectedFile?.type.startsWith('video/') ? 'video' : 'img'}
                                    src={previewUrl}
                                    controls={selectedFile?.type.startsWith('video/')}
                                    sx={{
                                        width: '100%',
                                        maxHeight: 300,
                                        objectFit: 'cover',
                                        borderRadius: 2,
                                    }}
                                />
                                <IconButton
                                    onClick={handleRemoveFile}
                                    sx={{
                                        position: 'absolute',
                                        top: 8,
                                        right: 8,
                                        bgcolor: 'rgba(0, 0, 0, 0.6)',
                                        color: '#fff',
                                        '&:hover': {
                                            bgcolor: 'rgba(0, 0, 0, 0.8)',
                                        },
                                    }}
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </Box>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,video/mp4,video/mov,image/heic"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />
                    </Box>

                    {/* Caption */}
                    <TextField
                        label="Caption"
                        placeholder="Write a caption..."
                        multiline
                        rows={3}
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        fullWidth
                        required
                        inputProps={{ maxLength: 500 }}
                        helperText={`${caption.length}/500 characters`}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                            }
                        }}
                    />

                    {/* Location */}
                    <TextField
                        label="Location"
                        placeholder="Add a location..."
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        fullWidth
                        inputProps={{ maxLength: 100 }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                            }
                        }}
                    />

                    {/* Difficulty */}
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <Typography component="span" sx={{ fontSize: '1.25rem' }}>
                                ⛰️
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                Difficulty
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {[1, 2, 3, 4, 5].map((level) => (
                                <Button
                                    key={level}
                                    onClick={() => setDifficulty(level)}
                                    variant={difficulty === level ? 'contained' : 'outlined'}
                                    sx={{
                                        minWidth: 56,
                                        height: 48,
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        borderRadius: 2,
                                        bgcolor: difficulty === level ? '#ff6b35' : 'transparent',
                                        color: difficulty === level ? '#fff' : '#8e8e8e',
                                        borderColor: difficulty === level ? '#ff6b35' : '#e0e0e0',
                                        '&:hover': {
                                            bgcolor: difficulty === level ? '#e55a2b' : 'rgba(255, 107, 53, 0.08)',
                                            borderColor: difficulty === level ? '#e55a2b' : '#ff6b35',
                                        },
                                    }}
                                >
                                    {level}
                                </Button>
                            ))}
                        </Box>
                    </Box>

                    {/* Rating */}
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <Typography component="span" sx={{ fontSize: '1.25rem' }}>
                                ⭐
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                Rating
                            </Typography>
                        </Box>
                        <Rating
                            value={rating}
                            onChange={(_, value) => setRating(value || 1)}
                            size="large"
                            icon={<StarIcon sx={{ fontSize: '2.5rem' }} />}
                            emptyIcon={<StarIcon sx={{ fontSize: '2.5rem' }} />}
                            sx={{
                                '& .MuiRating-iconFilled': {
                                    color: '#ffc107',
                                },
                                '& .MuiRating-iconEmpty': {
                                    color: '#e0e0e0',
                                },
                            }}
                        />
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
                    disabled={uploading}
                    sx={{
                        textTransform: 'none',
                        color: '#262626',
                        fontWeight: 600,
                    }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={uploading || !caption.trim() || !selectedFile}
                    variant="contained"
                    sx={{
                        textTransform: 'none',
                        bgcolor: '#0095f6',
                        fontWeight: 600,
                        px: 3,
                        minWidth: 100,
                        '&:hover': {
                            bgcolor: '#0084e0',
                        },
                        '&.Mui-disabled': {
                            bgcolor: '#b2dffc',
                            color: '#fff',
                        },
                    }}
                >
                    {uploading ? (
                        <CircularProgress size={20} sx={{ color: '#fff' }} />
                    ) : (
                        'Share'
                    )}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

