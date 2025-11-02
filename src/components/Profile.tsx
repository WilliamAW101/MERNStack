"use client"

import React, { useState } from 'react';
import {
    Box,
    Container,
    Grid,
    Avatar,
    Typography,
    Button,
    Tabs,
    Tab,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Divider,
} from '@mui/material';
import GridOnIcon from '@mui/icons-material/GridOn';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import PersonPinIcon from '@mui/icons-material/PersonPin';
import AppLayout from './AppLayout';

// Mock data for user profile
const userProfile = {
    username: 'tanngocle0413',
    fullName: 'Tan Ngoc Le',
    avatar: '/api/placeholder/150/150',
    posts: 0,
    followers: 10,
    following: 43,
    bio: '',
};

// Mock data for user posts (empty array for now to show "Share Photos" message)
const userPosts: Array<{ id: number; image: string; likes: number; comments: number }> = [];

export default function Profile() {
    const [tabValue, setTabValue] = useState(0);
    const [openEditModal, setOpenEditModal] = useState(false);
    const [formData, setFormData] = useState({
        fullName: userProfile.fullName,
        username: userProfile.username,
        bio: userProfile.bio,
    });

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleOpenEditModal = () => {
        setOpenEditModal(true);
    };

    const handleCloseEditModal = () => {
        setOpenEditModal(false);
    };

    const handleFormChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [field]: event.target.value,
        });
    };

    const handleSaveProfile = () => {
        // Here you would typically make an API call to save the profile
        console.log('Saving profile:', formData);
        handleCloseEditModal();
    };

    return (
        <AppLayout>
            <Box sx={{ minHeight: '100vh', pt: 0 }}>
                <Container maxWidth="lg">
                    {/* Profile Header */}
                    <Box
                        sx={{
                            py: 5,
                            px: 3,
                            bgcolor: '#fff',
                        }}
                    >
                        <Box sx={{ display: 'flex', gap: { xs: 4, md: 8 }, alignItems: 'flex-start' }}>
                            {/* Avatar */}
                            <Box sx={{ display: 'flex', justifyContent: 'center', flex: { xs: '0 0 auto', md: '0 0 auto' } }}>
                                <Avatar
                                    src={userProfile.avatar}
                                    sx={{
                                        width: { xs: 77, md: 150 },
                                        height: { xs: 77, md: 150 },
                                        cursor: 'pointer',
                                    }}
                                />
                            </Box>

                            {/* Profile Info */}
                            <Box sx={{ flex: 1 }}>
                                {/* Username and Edit Button */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
                                    <Typography variant="h5" sx={{ fontWeight: 400, fontSize: '1.25rem' }}>
                                        {userProfile.username}
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={handleOpenEditModal}
                                        sx={{
                                            textTransform: 'none',
                                            bgcolor: '#efefef',
                                            color: '#000',
                                            fontWeight: 600,
                                            fontSize: '0.875rem',
                                            px: 2,
                                            py: 0.5,
                                            boxShadow: 'none',
                                            borderRadius: 2,
                                            '&:hover': {
                                                bgcolor: '#e0e0e0',
                                                boxShadow: 'none',
                                            },
                                        }}
                                    >
                                        Edit profile
                                    </Button>
                                </Box>

                                {/* Stats */}
                                <Box sx={{ display: 'flex', gap: 4, mb: 2.5 }}>
                                    <Typography variant="body2" sx={{ fontSize: '1rem' }}>
                                        <strong>{userProfile.posts}</strong> posts
                                    </Typography>
                                    <Typography variant="body2" sx={{ cursor: 'pointer', fontSize: '1rem' }}>
                                        <strong>{userProfile.followers}</strong> followers
                                    </Typography>
                                    <Typography variant="body2" sx={{ cursor: 'pointer', fontSize: '1rem' }}>
                                        <strong>{userProfile.following}</strong> following
                                    </Typography>
                                </Box>



                                {/* Name and Bio */}
                                {(userProfile.fullName || userProfile.bio) && (
                                    <Box>
                                        {userProfile.fullName && (
                                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, fontSize: '0.875rem' }}>
                                                {userProfile.fullName}
                                            </Typography>
                                        )}
                                        {userProfile.bio && (
                                            <Typography variant="body2" sx={{ color: '#262626', whiteSpace: 'pre-line', fontSize: '0.875rem' }}>
                                                {userProfile.bio}
                                            </Typography>
                                        )}
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Box>


                    <Box
                        sx={{
                            bgcolor: '#fff',
                            borderBottom: '1px solid #dbdbdb',
                        }}
                    >
                        <Tabs
                            value={tabValue}
                            onChange={handleTabChange}
                            centered
                            sx={{
                                '& .MuiTab-root': {
                                    textTransform: 'uppercase',
                                    fontWeight: 600,
                                    fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.875rem' },
                                    color: '#8e8e8e',
                                    letterSpacing: { xs: 0.5, md: 1 },
                                    minHeight: { xs: 48, md: 56 },
                                    py: { xs: 1.5, md: 2 },
                                    px: { xs: 2, md: 3 },
                                },
                                '& .Mui-selected': {
                                    color: '#262626',
                                },
                            }}
                        >
                            <Tab
                                icon={<GridOnIcon sx={{ fontSize: { xs: 16, sm: 18, md: 20 } }} />}
                                label="Posts"
                                iconPosition="start"
                                sx={{
                                    gap: { xs: 0.5, md: 1 },
                                }}
                            />
                            <Tab
                                icon={<BookmarkBorderIcon sx={{ fontSize: { xs: 16, sm: 18, md: 20 } }} />}
                                label="Saved"
                                iconPosition="start"
                                sx={{
                                    gap: { xs: 0.5, md: 1 },
                                }}
                            />
                            <Tab
                                icon={<PersonPinIcon sx={{ fontSize: { xs: 16, sm: 18, md: 20 } }} />}
                                label="Tagged"
                                iconPosition="start"
                                sx={{
                                    gap: { xs: 0.5, md: 1 },
                                }}
                            />
                        </Tabs>
                    </Box>

                    {/* Posts Grid */}
                    <Box sx={{ mt: 3, bgcolor: '#fff', minHeight: '400px' }}>
                        {userPosts.length === 0 ? (
                            // Empty State
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    py: 8,
                                    px: 3,
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 62,
                                        height: 62,
                                        borderRadius: '50%',
                                        border: '3px solid #262626',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mb: 2,
                                    }}
                                >
                                    <Box
                                        component="span"
                                        sx={{
                                            fontSize: '2rem',
                                        }}
                                    >
                                        📷
                                    </Box>
                                </Box>
                                <Typography
                                    variant="h5"
                                    sx={{
                                        fontWeight: 700,
                                        mb: 1,
                                        fontSize: '1.75rem',
                                    }}
                                >
                                    Share Photos
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: '#737373',
                                        mb: 2,
                                    }}
                                >
                                    When you share photos, they will appear on your profile.
                                </Typography>
                                <Button
                                    sx={{
                                        textTransform: 'none',
                                        color: '#0095f6',
                                        fontWeight: 600,
                                        fontSize: '0.875rem',
                                        '&:hover': {
                                            bgcolor: 'transparent',
                                            color: '#00376b',
                                        },
                                    }}
                                >
                                    Share your first photo
                                </Button>
                            </Box>
                        ) : (
                            // Posts Grid
                            <Grid container spacing={1}>
                                {userPosts.map((post) => (
                                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={post.id}>
                                        <Box
                                            sx={{
                                                position: 'relative',
                                                paddingTop: '100%',
                                                bgcolor: '#f0f0f0',
                                                cursor: 'pointer',
                                                overflow: 'hidden',
                                                '&:hover .overlay': {
                                                    opacity: 1,
                                                },
                                            }}
                                        >
                                            <Box
                                                component="img"
                                                src={post.image}
                                                alt={`Post ${post.id}`}
                                                sx={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                }}
                                            />
                                            <Box
                                                className="overlay"
                                                sx={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    bgcolor: 'rgba(0,0,0,0.3)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 2,
                                                    opacity: 0,
                                                    transition: 'opacity 0.2s',
                                                }}
                                            >
                                                <Typography
                                                    variant="body1"
                                                    sx={{ color: '#fff', fontWeight: 600 }}
                                                >
                                                    ❤️ {post.likes}
                                                </Typography>
                                                <Typography
                                                    variant="body1"
                                                    sx={{ color: '#fff', fontWeight: 600 }}
                                                >
                                                    💬 {post.comments}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>
                        )}
                    </Box>
                </Container>
            </Box>

            {/* Edit Profile Modal */}
            <Dialog
                open={openEditModal}
                onClose={handleCloseEditModal}
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
                    }}
                >
                    Edit Profile
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 1 }}>
                        {/* Avatar Section */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar
                                src={userProfile.avatar}
                                sx={{ width: 56, height: 56 }}
                            />
                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {formData.username}
                                </Typography>
                                <Button
                                    size="small"
                                    sx={{
                                        textTransform: 'none',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        color: '#0095f6',
                                        p: 0,
                                        minWidth: 'auto',
                                        '&:hover': {
                                            bgcolor: 'transparent',
                                            color: '#00376b',
                                        },
                                    }}
                                >
                                    Change profile photo
                                </Button>
                            </Box>
                        </Box>

                        <Divider />

                        {/* Form Fields */}
                        <Box>
                            <Typography variant="caption" sx={{ color: '#8e8e8e', fontWeight: 600, mb: 0.5, display: 'block' }}>
                                Name
                            </Typography>
                            <TextField
                                fullWidth
                                value={formData.fullName}
                                onChange={handleFormChange('fullName')}
                                variant="outlined"
                                size="small"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 1,
                                    }
                                }}
                            />
                        </Box>

                        <Box>
                            <Typography variant="caption" sx={{ color: '#8e8e8e', fontWeight: 600, mb: 0.5, display: 'block' }}>
                                Username
                            </Typography>
                            <TextField
                                fullWidth
                                value={formData.username}
                                onChange={handleFormChange('username')}
                                variant="outlined"
                                size="small"
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
                                value={formData.bio}
                                onChange={handleFormChange('bio')}
                                variant="outlined"
                                multiline
                                rows={3}
                                placeholder="Write a bio about yourself..."
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 1,
                                    }
                                }}
                            />
                            <Typography variant="caption" sx={{ color: '#8e8e8e', mt: 0.5, display: 'block' }}>
                                {formData.bio.length} / 150
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
                        onClick={handleCloseEditModal}
                        sx={{
                            textTransform: 'none',
                            color: '#262626',
                            fontWeight: 600,
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSaveProfile}
                        variant="contained"
                        sx={{
                            textTransform: 'none',
                            bgcolor: '#0095f6',
                            fontWeight: 600,
                            px: 3,
                            '&:hover': {
                                bgcolor: '#0084e0',
                            },
                        }}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </AppLayout>
    );
}

