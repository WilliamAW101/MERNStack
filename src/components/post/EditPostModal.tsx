"use client"

import React, { useState, useEffect, useRef } from 'react';
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
import StarIcon from '@mui/icons-material/Star';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useToast } from '@/context/toast';
import { updatePost, getUploadUrl } from '@/services/api.service';
import { Post } from '@/types/post.types';
import { ContentType, FileExtension } from '@/types/upload.types';
import SignatureLogo from '../common/SignatureLogo';

interface EditPostModalProps {
    open: boolean;
    onClose: () => void;
    onPostUpdated: () => void;
    post: Post;
}

export default function EditPostModal({ open, onClose, onPostUpdated, post }: EditPostModalProps) {
    const [caption, setCaption] = useState(post.caption || '');
    const [difficulty, setDifficulty] = useState(post.difficulty || 3);
    const [rating, setRating] = useState(post.rating || 3);
    const [location, setLocation] = useState(post.location || '');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [updating, setUpdating] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const toast = useToast();

    // Update form when post changes
    useEffect(() => {
        if (post) {
            setCaption(post.caption || '');
            setDifficulty(post.difficulty || 3);
            setRating(post.rating || 3);
            setLocation(post.location || '');
            // Reset file states when post changes
            setSelectedFile(null);
            setPreviewUrl(null);
        }
    }, [post]);

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

    const handleRemoveNewImage = () => {
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

        setUpdating(true);

        try {
            // Only send fields that might have changed
            const postData: {
                caption: string;
                difficulty: number;
                rating: number;
                location?: string;
                images?: Array<{ key: string; type: 'image' | 'video' }>;
            } = {
                caption: caption.trim(),
                difficulty,
                rating,
            };

            // Only include location if it's not empty, otherwise don't send it
            if (location.trim()) {
                postData.location = location.trim();
            }

            // If user selected a new image, upload it first
            if (selectedFile) {
                setUploadingImage(true);
                try {
                    // Step 1: Get presigned upload URL from backend
                    const ext = getFileExtension(selectedFile.name);
                    const uploadUrlResponse = await getUploadUrl({
                        contentType: selectedFile.type as ContentType,
                        ext,
                    });


                    // Step 3: Include the new image key in the update
                    const isVideo = selectedFile.type.startsWith('video/');
                    postData.images = [{
                        key: uploadUrlResponse.key,
                        type: isVideo ? 'video' : 'image',
                    }];
                } catch (uploadError) {
                    console.error('Error uploading image:', uploadError);
                    toast.error('Failed to upload image. Please try again.');
                    setUpdating(false);
                    setUploadingImage(false);
                    return;
                } finally {
                    setUploadingImage(false);
                }
            }

            const response = await updatePost(post._id, postData);

            if (response.success) {
                toast.success(response.message || 'Post updated successfully!');

                // Close modal
                onClose();

                // Notify parent to refresh
                onPostUpdated();
            } else {
                toast.error(response.message || 'Failed to update post');
            }

        } catch (error: any) {
            console.error('Error updating post:', error);
            toast.error(error.message || 'Failed to update post. Please try again.');
        } finally {
            setUpdating(false);
        }
    };

    const handleClose = () => {
        if (updating) return;

        setCaption(post.caption || '');
        setDifficulty(post.difficulty || 3);
        setRating(post.rating || 3);
        setLocation(post.location || '');
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
                    disabled={updating}
                    size="small"
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 3, pb: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Current Image & Change Option */}
                    <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
                            Post Image
                        </Typography>

                        {/* Show current image or new preview */}
                        {(previewUrl || post.imageURLs?.[0]) && (
                            <Box sx={{ position: 'relative', mb: 2 }}>
                                <Box
                                    component={
                                        previewUrl && selectedFile?.type.startsWith('video/')
                                            ? 'video'
                                            : post.imageURLs?.[0]?.includes('.mp4') || post.imageURLs?.[0]?.includes('.mov')
                                                ? 'video'
                                                : 'img'
                                    }
                                    src={previewUrl || post.imageURLs?.[0]}
                                    controls={
                                        (previewUrl && selectedFile?.type.startsWith('video/')) ||
                                        post.imageURLs?.[0]?.includes('.mp4') ||
                                        post.imageURLs?.[0]?.includes('.mov')
                                    }
                                    sx={{
                                        width: '100%',
                                        maxHeight: 300,
                                        objectFit: 'cover',
                                        borderRadius: 2,
                                        border: '1px solid #dbdbdb',
                                    }}
                                />
                                {previewUrl && (
                                    <IconButton
                                        onClick={handleRemoveNewImage}
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
                                )}
                            </Box>
                        )}

                        {/* Change image button */}
                        {!previewUrl && (
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                startIcon={<EditIcon />}
                                variant="outlined"
                                sx={{
                                    textTransform: 'none',
                                    borderColor: '#dbdbdb',
                                    color: '#262626',
                                    fontWeight: 600,
                                    '&:hover': {
                                        borderColor: '#0095f6',
                                        bgcolor: '#f0f8ff',
                                    },
                                }}
                            >
                                Change Image
                            </Button>
                        )}

                        {/* Or upload new image if no current image */}
                        {!post.imageURLs?.[0] && !previewUrl && (
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
                    disabled={updating}
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
                    disabled={updating || uploadingImage || !caption.trim()}
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
                    {updating || uploadingImage ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress size={20} sx={{ color: '#fff' }} />
                            {uploadingImage && <Typography variant="body2">Uploading...</Typography>}
                        </Box>
                    ) : (
                        'Save Changes'
                    )}
                </Button>
            </DialogActions>
        </Dialog>
    );
}


