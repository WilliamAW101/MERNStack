"use client"

import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Container,
    Grid,
    Avatar,
    Typography,
    Button,
    Tabs,
    Tab,
    CircularProgress,
    IconButton,
    Tooltip,
} from '@mui/material';
import GridOnIcon from '@mui/icons-material/GridOn';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import PersonPinIcon from '@mui/icons-material/PersonPin';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import AppLayout from '../layout/AppLayout';
import EditProfileModal from './EditProfileModal';
import CommentModal from '../post/CommentModal';
import { useToast } from '@/context/toast';
import { useUser } from '@/context/user/UserContext';
import { Post } from '@/types/post.types';
import {
    getProfileInfo,
    fetchProfilePosts,
    getUploadUrl,
    uploadProfilePictureKey,
    likePost,
    fetchPostById,
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

// Note: ProfilePost is now the full Post type from fetchProfilePosts
// which includes all fields needed for CommentModal

export default function Profile({ userName }: { userName: string }) {
    const [tabValue, setTabValue] = useState(0);
    const [openEditModal, setOpenEditModal] = useState(false);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const observerTarget = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const toast = useToast();
    const { user } = useUser();

    // Check if this is the current user's profile
    const isOwnProfile = user?.userName === userName;


    // Load profile info on mount and scroll to top
    useEffect(() => {
        window.scrollTo(0, 0);
        setIsInitialLoad(true);
        loadProfileInfo();
        loadPosts();
    }, [userName]);

    // Cleanup avatar preview URL on unmount
    useEffect(() => {
        return () => {
            if (avatarPreview) {
                URL.revokeObjectURL(avatarPreview);
            }
        };
    }, [avatarPreview]);

    // Infinite scroll for posts
    // Only enable after initial load completes
    useEffect(() => {
        // Don't set up observer during initial load
        if (isInitialLoad || loading) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && nextCursor && !loadingMore) {
                    loadPosts(nextCursor);
                }
            },
            { threshold: 0.1 }
        );

        const currentTarget = observerTarget.current;
        if (currentTarget) {
            observer.observe(currentTarget);
        }

        return () => {
            if (currentTarget) {
                observer.unobserve(currentTarget);
            }
        };
    }, [nextCursor, loadingMore, loading, isInitialLoad]);

    const loadProfileInfo = async () => {
        try {
            const response = await getProfileInfo(userName);
            if (response.success) {
                setUserInfo(response.data.userInfo);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            toast.error('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const loadPosts = async (cursor?: string) => {
        try {
            if (cursor) {
                setLoadingMore(true);
            } else {
                setLoading(true);
            }

            const result = await fetchProfilePosts(userName, cursor);
            console.log('result', result);

            if (cursor) {
                // Append to existing posts, but deduplicate by _id
                setPosts(prev => {
                    const existingIds = new Set(prev.map(p => p._id));
                    const newPosts = result.posts.filter(p => !existingIds.has(p._id));
                    return [...prev, ...newPosts];
                });
            } else {
                setPosts(result.posts);
                setIsInitialLoad(false);
            }

            setNextCursor(result.nextCursor);
        } catch (error) {
            console.error('Error loading posts:', error);
            toast.error('Failed to load posts');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleOpenEditModal = () => {
        setOpenEditModal(true);
    };

    const handleCloseEditModal = () => {
        setOpenEditModal(false);
    };

    const handleProfileUpdated = async (updatedUser: UserInfo) => {
        setUserInfo(updatedUser);
        // Reload profile to get the latest picture URL from backend
        await loadProfileInfo();
    };

    const handleAvatarClick = () => {
        if (isOwnProfile && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

        // Create local preview
        const previewUrl = URL.createObjectURL(file);
        setAvatarPreview(previewUrl);
        setUploadingAvatar(true);

        try {
            // Get file extension from file name
            const fileExtension = file.name.split('.').pop()?.toLowerCase() as 'jpg' | 'jpeg' | 'png' | 'webp' | 'heic' || 'jpg';

            // Step 1: Get upload URL and key from backend
            // NOTE: The backend /uploads/url generates keys like "posts/{userId}/{uuid}.{ext}"
            // For profile pictures, you may need to modify the backend to:
            // - Accept a "type" parameter (e.g., type: 'profile' vs 'post')
            // - Generate keys like "profile/{userId}/{uuid}.{ext}" for profile pictures
            // OR create a separate endpoint like /uploads/profile-url
            const uploadUrlResponse = await getUploadUrl({
                contentType: file.type as any,
                ext: fileExtension,
            });

            // Backend generates the key for us
            const { uploadUrl, key } = uploadUrlResponse;

            if (!uploadUrl || !key) {
                throw new Error('Failed to get upload URL or key from server');
            }

            // Step 3: Update profile with the generated key
            // NOTE: uploadProfilePictureKey validates that key starts with "profile/{userId}/"
            // Make sure the key from Step 1 matches this format
            const updateResponse = await uploadProfilePictureKey(key);

            if (updateResponse.success) {
                toast.success('Profile picture updated successfully');
                // Reload profile to get the new picture URL
                await loadProfileInfo();
            } else {
                throw new Error(updateResponse.message || 'Failed to update profile picture');
            }
        } catch (error) {
            console.error('Error uploading avatar:', error);
            toast.error('Failed to upload profile picture');
            // Revert preview on error
            setAvatarPreview(null);
        } finally {
            setUploadingAvatar(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handlePostClick = async (post: Post) => {
        try {
            const fullPost = await fetchPostById(post._id);
            setSelectedPost(fullPost);
            setCommentModalOpen(true);
        } catch (error) {
            console.error('Error loading post:', error);
            toast.error('Failed to load post details');
        }
    };

    const handleCloseCommentModal = () => {
        setCommentModalOpen(false);
        setSelectedPost(null);
    };

    const handleLikePost = async () => {
        if (!selectedPost) return;

        const previousLiked = selectedPost.isLiked ?? false;
        const previousCount = selectedPost.likeCount ?? 0;

        // Optimistically update the selected post
        const updatedPost = {
            ...selectedPost,
            isLiked: !previousLiked,
            likeCount: previousLiked ? previousCount - 1 : previousCount + 1,
        };
        setSelectedPost(updatedPost);

        // Update the post in the grid immediately
        setPosts(prev => prev.map(p =>
            p._id === selectedPost._id ? updatedPost : p
        ));

        try {
            const response = await likePost(selectedPost._id);
            if (response.isLiked !== undefined) {
                // Update with server response
                const finalPost = {
                    ...selectedPost,
                    isLiked: response.isLiked,
                    likeCount: response.likeCount,
                };
                setSelectedPost(finalPost);
                setPosts(prev => prev.map(p =>
                    p._id === selectedPost._id ? finalPost : p
                ));
            }
        } catch (error) {
            // Revert on error
            setSelectedPost({ ...selectedPost, isLiked: previousLiked, likeCount: previousCount });
            setPosts(prev => prev.map(p =>
                p._id === selectedPost._id
                    ? { ...p, isLiked: previousLiked, likeCount: previousCount }
                    : p
            ));
            toast.error('Failed to update like');
        }
    };

    const handleCommentAdded = () => {
        if (!selectedPost) return;

        const newCount = (selectedPost.commentCount ?? 0) + 1;
        const updatedPost = { ...selectedPost, commentCount: newCount };
        setSelectedPost(updatedPost);

        // Update the post in the grid
        setPosts(prev => prev.map(p =>
            p._id === selectedPost._id ? updatedPost : p
        ));
    };

    const handleCommentDeleted = () => {
        if (!selectedPost) return;

        const newCount = Math.max(0, (selectedPost.commentCount ?? 0) - 1);
        const updatedPost = { ...selectedPost, commentCount: newCount };
        setSelectedPost(updatedPost);

        // Update the post in the grid
        setPosts(prev => prev.map(p =>
            p._id === selectedPost._id ? updatedPost : p
        ));
    };

    if (loading && !userInfo) {
        return (
            <AppLayout>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                    <CircularProgress />
                </Box>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Box sx={{ minHeight: '100vh', pt: 0 }}>
                <Container maxWidth="lg" sx={{ px: { xs: 0, sm: 1, md: 2 } }}>
                    <Box
                        sx={{
                            py: { xs: 2, md: 4 },
                            px: { xs: 2, md: 3 },
                            bgcolor: '#fff',
                        }}
                    >
                        <Box sx={{ display: 'flex', gap: { xs: 3, md: 6 }, alignItems: 'flex-start' }}>
                            {/* Avatar with upload functionality */}
                            <Box sx={{ display: 'flex', justifyContent: 'center', flex: { xs: '0 0 auto', md: '0 0 auto' } }}>
                                {/* Hidden file input */}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                />

                                <Tooltip
                                    title={isOwnProfile ? "Change profile picture" : ""}
                                    placement="bottom"
                                >
                                    <Box
                                        sx={{
                                            position: 'relative',
                                            cursor: isOwnProfile ? 'pointer' : 'default',
                                            '&:hover .avatar-overlay': {
                                                opacity: isOwnProfile ? 1 : 0,
                                            },
                                        }}
                                        onClick={handleAvatarClick}
                                    >
                                        {userInfo?.userProfilePic || avatarPreview ? (
                                            <Avatar
                                                src={avatarPreview || userInfo?.userProfilePic || undefined}
                                                sx={{
                                                    width: { xs: 50, sm: 77, md: 150 },
                                                    height: { xs: 50, sm: 77, md: 150 },
                                                }}
                                            />
                                        ) : (
                                            <AccountCircleIcon
                                                sx={{
                                                    width: { xs: 50, sm: 77, md: 150 },
                                                    height: { xs: 50, sm: 77, md: 150 },
                                                    color: '#262626',
                                                }}
                                            />
                                        )}

                                        {/* Hover overlay with camera icon (only for own profile) */}
                                        {isOwnProfile && (
                                            <Box
                                                className="avatar-overlay"
                                                sx={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    borderRadius: '50%',
                                                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    opacity: 0,
                                                    transition: 'opacity 0.3s',
                                                }}
                                            >
                                                {uploadingAvatar ? (
                                                    <CircularProgress size={30} sx={{ color: '#fff' }} />
                                                ) : (
                                                    <CameraAltIcon
                                                        sx={{
                                                            color: '#fff',
                                                            fontSize: { xs: '1.5rem', sm: '2rem', md: '3rem' }
                                                        }}
                                                    />
                                                )}
                                            </Box>
                                        )}
                                    </Box>
                                </Tooltip>
                            </Box>

                            {/* Profile Info */}
                            <Box sx={{ flex: 1 }}>
                                {/* Username and Edit Button */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
                                    <Typography variant="h5" sx={{ fontWeight: 400, fontSize: { xs: '1.1rem', md: '1.25rem' }, color: '#000' }}>
                                        {userInfo?.userName}
                                    </Typography>
                                    {isOwnProfile && (
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
                                    )}
                                </Box>

                                {/* Stats */}
                                <Box sx={{ display: 'flex', gap: 4, mb: 2.5 }}>
                                    <Typography variant="body2" sx={{ fontSize: '1rem', color: '#000' }}>
                                        <strong>{posts.length}</strong> posts
                                    </Typography>
                                    <Typography variant="body2" sx={{ cursor: 'pointer', fontSize: '1rem', color: '#000' }}>
                                        <strong>0</strong> followers
                                    </Typography>
                                    <Typography variant="body2" sx={{ cursor: 'pointer', fontSize: '1rem', color: '#000' }}>
                                        <strong>0</strong> following
                                    </Typography>
                                </Box>

                                {/* Name and Bio */}
                                <Box>
                                    {(userInfo?.firstName || userInfo?.lastName) && (
                                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, fontSize: '0.875rem', color: '#000' }}>
                                            {userInfo.firstName} {userInfo.lastName}
                                        </Typography>
                                    )}
                                    {userInfo?.profileDescription && (
                                        <Typography variant="body2" sx={{ color: '#000', whiteSpace: 'pre-line', fontSize: '0.875rem' }}>
                                            {userInfo.profileDescription}
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                        </Box>
                    </Box>

                    {/* Tabs */}
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
                                sx={{ gap: { xs: 0.5, md: 1 } }}
                            />
                            <Tab
                                icon={<BookmarkBorderIcon sx={{ fontSize: { xs: 16, sm: 18, md: 20 } }} />}
                                label="Saved"
                                iconPosition="start"
                                sx={{ gap: { xs: 0.5, md: 1 } }}
                            />
                            <Tab
                                icon={<PersonPinIcon sx={{ fontSize: { xs: 16, sm: 18, md: 20 } }} />}
                                label="Tagged"
                                iconPosition="start"
                                sx={{ gap: { xs: 0.5, md: 1 } }}
                            />
                        </Tabs>
                    </Box>

                    {/* Posts Grid */}
                    <Box sx={{ mt: 0, bgcolor: '#fff', minHeight: '400px', pb: 4 }}>
                        {posts.length === 0 ? (
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
                                    <Box component="span" sx={{ fontSize: '2rem' }}>
                                        📷
                                    </Box>
                                </Box>
                                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, fontSize: '1.75rem', color: '#000' }}>
                                    Share Photos
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#737373', mb: 2 }}>
                                    When you share photos, they will appear on your profile.
                                </Typography>
                            </Box>
                        ) : (
                            <>
                                {/* Posts Grid */}
                                <Grid container spacing={{ xs: 0.15, sm: 0.25, md: 0.4 }}>
                                    {posts.map((post) => (
                                        <Grid
                                            size={{
                                                xs: 4,  // 3 columns on mobile
                                                sm: 4,  // 3 columns on small tablets
                                                md: 4,  // 3 columns on medium screens
                                                lg: 2.4 // 5 columns on large screens (12 / 5 = 2.4)
                                            }}
                                            key={post._id}
                                        >
                                            <Box
                                                onClick={() => handlePostClick(post)}
                                                sx={{
                                                    position: 'relative',
                                                    paddingTop: '133.33%', // 4:3 aspect ratio (portrait like Instagram: 308.469/231.359)
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
                                                    src={post.imageURLs?.[0]}
                                                    alt="Post"
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
                                                        gap: { xs: 0.5, sm: 1, md: 2 },
                                                        opacity: 0,
                                                        transition: 'opacity 0.2s',
                                                    }}
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <FavoriteIcon sx={{
                                                            color: '#fff',
                                                            fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' }
                                                        }} />
                                                        <Typography
                                                            variant="body1"
                                                            sx={{
                                                                color: '#fff',
                                                                fontWeight: 600,
                                                                fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }
                                                            }}
                                                        >
                                                            {post.likeCount ?? 0}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <ChatBubbleOutlineIcon sx={{
                                                            color: '#fff',
                                                            fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' }
                                                        }} />
                                                        <Typography
                                                            variant="body1"
                                                            sx={{
                                                                color: '#fff',
                                                                fontWeight: 600,
                                                                fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }
                                                            }}
                                                        >
                                                            {post.commentCount ?? 0}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>

                                {/* Infinite scroll trigger */}
                                {nextCursor && (
                                    <Box ref={observerTarget} sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                        {loadingMore && <CircularProgress size={32} sx={{ color: '#0095f6' }} />}
                                    </Box>
                                )}

                                {/* End of posts message */}
                                {!nextCursor && posts.length > 0 && (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                        <Typography variant="body2" sx={{ color: '#8e8e8e' }}>
                                            You&apos;ve reached the end! 🎉
                                        </Typography>
                                    </Box>
                                )}
                            </>
                        )}
                    </Box>
                </Container>
            </Box>

            {/* Edit Profile Modal */}
            <EditProfileModal
                open={openEditModal}
                onClose={handleCloseEditModal}
                userInfo={userInfo}
                onProfileUpdated={handleProfileUpdated}
            />

            {/* Comment Modal */}
            {selectedPost && (
                <CommentModal
                    open={commentModalOpen}
                    onClose={handleCloseCommentModal}
                    post={selectedPost}
                    isLiked={selectedPost.isLiked}
                    likeCount={selectedPost.likeCount}
                    onLikePost={handleLikePost}
                    onCommentAdded={handleCommentAdded}
                    onCommentDeleted={handleCommentDeleted}
                />
            )}
        </AppLayout>
    );
}

