"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box,
    Container,
    Grid,
    Typography,
    Avatar,
    Stack,
    CircularProgress,
    Skeleton,
    IconButton,
    Menu,
    MenuItem,
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import Post from './Post';
import AppLayout from '../layout/AppLayout';
import CreatePostModal from './CreatePostModal';
import { useToast } from '@/context/toast';
import { fetchHomePosts, getProfileInfo } from '@/services/api.service';
import { Post as PostType } from '@/types/post.types';
import { useUser } from '@/context/user/UserContext';
import { useRouter } from 'next/navigation';


export default function Feed({ isConnected }: { isConnected: boolean }) {
    const [posts, setPosts] = useState<PostType[]>([]);
    const [loading, setLoading] = useState(true);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMorePosts, setHasMorePosts] = useState(true);
    const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

    const toast = useToast();
    const { user, logout } = useUser();
    const router = useRouter();
    const observerTarget = useRef<HTMLDivElement>(null);
    const isFetchingRef = useRef(false); // Prevent duplicate fetches
    const lastScrollY = useRef(0); // Track last scroll position

    // Load posts on mount
    useEffect(() => {
        loadPosts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const userName = user?.userName;

    // Fetch current user's profile info
    useEffect(() => {
        const loadUserProfile = async () => {
            if (!userName) return;

            try {
                const response = await getProfileInfo(userName);
                if (response.success) {
                    setCurrentUserProfile(response.data.userInfo);
                }
            } catch (error) {
                console.error('Failed to load user profile:', error);
            }
        };

        loadUserProfile();
    }, [userName]);

    const handleUserMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        setUserMenuAnchor(event.currentTarget);
    };

    const handleUserMenuClose = () => {
        setUserMenuAnchor(null);
    };

    const handleGoToProfile = () => {
        handleUserMenuClose();
        if (currentUserProfile?.userName) {
            router.push(`/${currentUserProfile.userName}`);
        }
    };

    const handleLogout = () => {
        handleUserMenuClose();
        logout();
        router.push('/login');
    };

    const loadPosts = useCallback(async (cursor?: string, isRefresh: boolean = false) => {
        // Prevent duplicate requests
        if (isFetchingRef.current) return;

        try {
            isFetchingRef.current = true;

            if (cursor) {
                setLoadingMore(true);
            } else if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            const result = await fetchHomePosts(cursor);

            if (cursor) {
                // Save scroll position and document height before adding posts
                const scrollY = window.scrollY;
                const oldHeight = document.documentElement.scrollHeight;

                // Append older posts (pagination)
                setPosts(prev => {
                    const existingIds = new Set(prev.map(p => p._id));
                    const newPosts = result.posts.filter(p => !existingIds.has(p._id));
                    return [...prev, ...newPosts];
                });

                // After React renders, restore scroll position
                // This prevents the page from jumping when new content is added
                requestAnimationFrame(() => {
                    const newHeight = document.documentElement.scrollHeight;
                    const heightDifference = newHeight - oldHeight;

                    // Maintain scroll position relative to existing content
                    if (heightDifference > 0) {
                        window.scrollTo(0, scrollY);
                    }
                });
            } else {
                // Initial load or refresh - replace all posts
                setPosts(result.posts);

                // Scroll to top when refreshing (only if explicitly requested)
                if (isRefresh) {
                    // Use instant scroll to prevent interference with user scrolling
                    window.scrollTo({ top: 0, behavior: 'auto' });
                }
            }

            // Update cursor and hasMorePosts flag
            setNextCursor(result.nextCursor);
            setHasMorePosts(!!result.nextCursor);

        } catch (error) {
            console.error('Error fetching posts:', error);
            toast.error("Failed to load posts. Please try again.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
            isFetchingRef.current = false;
        }
    }, [toast]);


    const handlePostCreated = async () => {
        // Close modal
        setCreateModalOpen(false);

        // Inform user immediately
        toast.success("Post created successfully!");

        // Give backend time to process and save to database
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Refresh the entire page to show the new post
        window.location.reload();
    };

    const handlePostUpdated = useCallback((postId: string, updatedPost: PostType) => {
        // Update the specific post in local state without refetching
        setPosts(prev => prev.map(post =>
            post._id === postId ? updatedPost : post
        ));
    }, []);

    const handlePostDeleted = useCallback((postId: string) => {
        // Remove the post from local state without refetching
        setPosts(prev => prev.filter(post => post._id !== postId));
    }, []);

    // Optimized Intersection Observer for infinite scroll
    useEffect(() => {
        // Don't observe if initial loading, already loading more, or no more posts
        if (loading || loadingMore || !hasMorePosts || !nextCursor) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];

                // Only trigger if element is intersecting and we're not already fetching
                if (entry.isIntersecting && nextCursor && !isFetchingRef.current) {
                    // Only load if user is scrolling down (not up)
                    const currentScrollY = window.scrollY;
                    if (currentScrollY <= lastScrollY.current && lastScrollY.current !== 0) {
                        // User is scrolling up or hasn't scrolled, don't load
                        return;
                    }

                    lastScrollY.current = currentScrollY;

                    // Small delay to ensure scroll has stabilized
                    setTimeout(() => {
                        if (!isFetchingRef.current && entry.isIntersecting) {
                            loadPosts(nextCursor);
                        }
                    }, 100);
                }
            },
            {
                // Trigger when most of element is visible to prevent premature loading
                threshold: 0.8,
                // Only load when reaching the trigger element (no pre-loading)
                rootMargin: '0px',
            }
        );

        const currentTarget = observerTarget.current;
        if (currentTarget) {
            observer.observe(currentTarget);
        }

        return () => {
            if (currentTarget) {
                observer.unobserve(currentTarget);
            }
            observer.disconnect();
        };
    }, [nextCursor, loading, loadingMore, hasMorePosts, loadPosts]);


    return (
        <AppLayout>
            {/* User Profile Dropdown - Bottom Right */}
            {currentUserProfile && (
                <Box
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        zIndex: 1100,
                        display: { xs: 'none', md: 'flex' },
                        alignItems: 'center',
                        gap: 1,
                        bgcolor: '#fff',
                        borderRadius: 3,
                        px: 2,
                        py: 1,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                        border: '1px solid rgba(46, 125, 50, 0.15)',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                    }}
                    onClick={handleUserMenuClick}
                >
                    {currentUserProfile.userProfilePic ? (
                        <Avatar
                            src={currentUserProfile.userProfilePic}
                            alt={`${currentUserProfile.userName}'s profile picture`}
                            sx={{ width: 30, height: 30 }}
                        />
                    ) : (
                        <AccountCircleIcon
                            sx={{
                                width: 36,
                                height: 36,
                                color: '#666666',
                            }}
                            aria-label={`${currentUserProfile.userName}'s profile icon`}
                        />
                    )}
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            variant="body2"
                            sx={{
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                color: '#262626',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: 120,
                            }}
                        >
                            {currentUserProfile.userName}
                        </Typography>
                    </Box>
                    <ArrowDropDownIcon sx={{ color: '#666666', fontSize: 20 }} />
                </Box>
            )}

            <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={handleUserMenuClose}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                PaperProps={{
                    sx: {
                        mb: 1,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        minWidth: 200,
                    }
                }}
            >
                <MenuItem
                    onClick={handleGoToProfile}
                    sx={{
                        gap: 1.5,
                        py: 1.5,
                        fontSize: '0.875rem',
                        '&:hover': {
                            bgcolor: '#f5f5f5',
                        }
                    }}
                >
                    <PersonIcon sx={{ fontSize: '1.25rem', color: '#0095f6' }} />
                    Go to Profile
                </MenuItem>
                <MenuItem
                    onClick={handleLogout}
                    sx={{
                        gap: 1.5,
                        py: 1.5,
                        fontSize: '0.875rem',
                        color: '#ed4956',
                        '&:hover': {
                            bgcolor: '#fff5f5',
                        }
                    }}
                >
                    <LogoutIcon sx={{ fontSize: '1.25rem' }} />
                    Log out
                </MenuItem>
            </Menu>

            {/* Create Post Modal */}
            <CreatePostModal
                open={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                onPostCreated={handlePostCreated}
            />




            <Container maxWidth="xl" sx={{ px: { xs: 0, sm: 2, md: 3 } }}>
                <Grid container spacing={{ xs: 0, sm: 2, md: 3 }} justifyContent="center">
                    {/* Main Feed */}
                    <Grid size={{ xs: 12, sm: 12, md: 7, lg: 7 }}>
                        {/* Show refreshing indicator at the top */}
                        {refreshing && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                <CircularProgress size={24} sx={{ color: '#0095f6' }} />
                            </Box>
                        )}

                        {loading ? (
                            // Skeleton loaders for better perceived performance
                            <Stack spacing={0}>
                                {[1, 2, 3].map((item) => (
                                    <Box key={item} sx={{ bgcolor: '#E9EDE8', mb: 0 }}>
                                        {/* Header skeleton */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5 }}>
                                            <Skeleton variant="circular" width={36} height={36} />
                                            <Box sx={{ flex: 1 }}>
                                                <Skeleton variant="text" width="40%" height={20} />
                                                <Skeleton variant="text" width="30%" height={16} />
                                            </Box>
                                        </Box>
                                        {/* Image skeleton */}
                                        <Skeleton
                                            variant="rectangular"
                                            width="100%"
                                            sx={{ aspectRatio: '1/1', maxHeight: 600 }}
                                        />
                                        {/* Action buttons skeleton */}
                                        <Box sx={{ display: 'flex', gap: 2, py: 1 }}>
                                            <Skeleton variant="circular" width={24} height={24} />
                                            <Skeleton variant="circular" width={24} height={24} />
                                        </Box>
                                        {/* Caption skeleton */}
                                        <Skeleton variant="text" width="80%" height={20} sx={{ mb: 1 }} />
                                        <Skeleton variant="text" width="60%" height={20} sx={{ mb: 2 }} />
                                    </Box>
                                ))}
                            </Stack>
                        ) : posts.length === 0 ? (
                            <Box sx={{
                                textAlign: 'center',
                                py: 8,
                                bgcolor: '#fff',
                                borderRadius: 2,
                                border: '1px solid #dbdbdb'
                            }}>
                                <Typography variant="h6" sx={{ mb: 1, color: '#737373' }}>
                                    No posts yet
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#666666' }}>
                                    Connect with hikers to see their adventures here
                                </Typography>
                            </Box>
                        ) : (
                            <>
                                <Stack spacing={0}>
                                    {posts.map((post, index) => (
                                        <Box
                                            key={post._id}
                                            sx={{
                                                // Optimize rendering for off-screen posts
                                                ...(index > 5 && {
                                                    willChange: 'auto',
                                                }),
                                            }}
                                        >
                                            <Post
                                                post={post}
                                                onPostUpdated={handlePostUpdated}
                                                onPostDeleted={handlePostDeleted}
                                                priority={index < 2} // Priority load first 2 posts
                                            />
                                        </Box>
                                    ))}
                                </Stack>

                                {/* Infinite scroll trigger element */}
                                {hasMorePosts && nextCursor && !loadingMore && (
                                    <Box
                                        ref={observerTarget}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            py: 3,
                                            minHeight: '60px',
                                        }}
                                        role="status"
                                        aria-label="Load more posts trigger"
                                    >
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: '#666666',
                                                fontSize: '0.8rem'
                                            }}
                                        >
                                            Scroll to load more
                                        </Typography>
                                    </Box>
                                )}

                                {/* Loading more skeleton */}
                                {loadingMore && (
                                    <Box sx={{ bgcolor: '#E9EDE8', mb: 0 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5 }}>
                                            <Skeleton variant="circular" width={36} height={36} />
                                            <Box sx={{ flex: 1 }}>
                                                <Skeleton variant="text" width="40%" height={20} />
                                                <Skeleton variant="text" width="30%" height={16} />
                                            </Box>
                                        </Box>
                                        <Skeleton
                                            variant="rectangular"
                                            width="100%"
                                            sx={{ aspectRatio: '1/1', maxHeight: 600 }}
                                        />
                                        <Box sx={{ display: 'flex', gap: 2, py: 1 }}>
                                            <Skeleton variant="circular" width={24} height={24} />
                                            <Skeleton variant="circular" width={24} height={24} />
                                        </Box>
                                        <Skeleton variant="text" width="80%" height={20} sx={{ mb: 1 }} />
                                    </Box>
                                )}

                                {/* End of feed message */}
                                {!hasMorePosts && posts.length > 0 && (
                                    <Box sx={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        py: 4
                                    }}>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: '#666666',
                                                fontSize: '0.875rem'
                                            }}
                                        >
                                            You're all caught up! 🎉
                                        </Typography>
                                    </Box>
                                )}
                            </>
                        )}
                    </Grid>

                    {/* Right Sidebar - Static Content */}
                    <Grid size={{ md: 4, lg: 3 }} sx={{ display: { xs: 'none', sm: 'none', md: 'block' } }}>
                        <Box sx={{ position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {/* Top Hiking Spots */}
                            <Box
                                sx={{
                                    bgcolor: '#fff',
                                    borderRadius: 3,
                                    p: 2.5,
                                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                                    border: '1px solid rgba(46, 125, 50, 0.08)',
                                }}
                            >
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontWeight: 700,
                                        mb: 2,
                                        color: '#2e7d32',
                                        fontSize: '1rem',
                                    }}
                                >
                                    🏔️ Top Hiking Spots This Week
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    {[
                                        { icon: '🏔️', name: 'Tantalus Range', color: '#1976d2' },
                                        { icon: '🚶‍♂️', name: 'Mt. Rainier', color: '#388e3c' },
                                        { icon: '❄️', name: 'Whistler Lines', color: '#0288d1' },
                                        { icon: '🌲', name: 'Pacific Crest Trail', color: '#689f38' },
                                        { icon: '⛰️', name: 'Half Dome', color: '#5d4037' },
                                    ].map((spot, idx) => (
                                        <Box
                                            key={idx}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1.5,
                                                p: 1,
                                                borderRadius: 2,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    bgcolor: 'rgba(46, 125, 50, 0.05)',
                                                    transform: 'translateX(4px)',
                                                }
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    fontSize: '1.5rem',
                                                    width: 36,
                                                    height: 36,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    bgcolor: `${spot.color}15`,
                                                    borderRadius: 2,
                                                }}
                                            >
                                                {spot.icon}
                                            </Box>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 600,
                                                    color: '#262626',
                                                    fontSize: '0.875rem',
                                                }}
                                            >
                                                {spot.name}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                            </Box>

                            {/* Trending Hashtags */}
                            <Box
                                sx={{
                                    bgcolor: '#fff',
                                    borderRadius: 3,
                                    p: 2.5,
                                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                                    border: '1px solid rgba(46, 125, 50, 0.08)',
                                }}
                            >
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontWeight: 700,
                                        mb: 2,
                                        color: '#2e7d32',
                                        fontSize: '1rem',
                                    }}
                                >
                                    🔥 Trending Hashtags
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {[
                                        '#Backcountry',
                                        '#HikeLife',
                                        '#Snow',
                                        '#MountainLife',
                                        '#TrailMix',
                                        '#SummitViews',
                                        '#WildernessAdventure',
                                        '#PeakBagger'
                                    ].map((tag, idx) => (
                                        <Box
                                            key={idx}
                                            sx={{
                                                bgcolor: 'rgba(46, 125, 50, 0.08)',
                                                color: '#2e7d32',
                                                px: 1.5,
                                                py: 0.75,
                                                borderRadius: 2,
                                                fontSize: '0.8125rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    bgcolor: '#2e7d32',
                                                    color: '#fff',
                                                    transform: 'scale(1.05)',
                                                }
                                            }}
                                        >
                                            {tag}
                                        </Box>
                                    ))}
                                </Box>
                            </Box>

                            {/* Safety Reminder */}
                            <Box
                                sx={{
                                    bgcolor: 'linear-gradient(135deg, #fff9c4 0%, #fff59d 100%)',
                                    background: 'linear-gradient(135deg, #fff9c4 0%, #fff59d 100%)',
                                    borderRadius: 3,
                                    p: 2.5,
                                    boxShadow: '0 2px 12px rgba(255, 193, 7, 0.15)',
                                    border: '2px solid #fbc02d',
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                    <Typography sx={{ fontSize: '1.5rem' }}>⚠️</Typography>
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            fontWeight: 700,
                                            color: '#f57c00',
                                            fontSize: '1rem',
                                        }}
                                    >
                                        Safety Reminder
                                    </Typography>
                                </Box>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: '#5d4037',
                                        fontWeight: 500,
                                        lineHeight: 1.6,
                                        fontSize: '0.875rem',
                                    }}
                                >
                                    Always tell someone your route before hiking. Check weather conditions and carry the 10 essentials!
                                </Typography>
                            </Box>

                            {/* Community Stats */}
                            <Box
                                sx={{
                                    bgcolor: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                    background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                    borderRadius: 3,
                                    p: 2.5,
                                    boxShadow: '0 2px 12px rgba(33, 150, 243, 0.15)',
                                    border: '2px solid #2196f3',
                                }}
                            >
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontWeight: 700,
                                        mb: 2,
                                        color: '#1565c0',
                                        fontSize: '1rem',
                                    }}
                                >
                                    📊 Community Stats
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" sx={{ color: '#0d47a1', fontWeight: 500 }}>
                                            Total Trails Logged
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#0d47a1', fontWeight: 700 }}>
                                            12,847
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" sx={{ color: '#0d47a1', fontWeight: 500 }}>
                                            Miles Hiked
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#0d47a1', fontWeight: 700 }}>
                                            284,392
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" sx={{ color: '#0d47a1', fontWeight: 500 }}>
                                            Active Hikers
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#0d47a1', fontWeight: 700 }}>
                                            3,241
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        </Box>
                    </Grid>
                </Grid>
            </Container>
        </AppLayout>
    );
}

