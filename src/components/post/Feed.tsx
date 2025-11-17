"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box,
    Container,
    Grid,
    Typography,
    Avatar,
    Button,
    IconButton,
    Stack,
    CircularProgress,
    Fab,
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import Post from './Post';
import AppLayout from '../layout/AppLayout';
import CreatePostModal from './CreatePostModal';
import { useToast } from '@/context/toast';
import { fetchHomePosts, getProfileInfo } from '@/services/api.service';
import { Post as PostType } from '@/types/post.types';
import { useUser } from '@/context/user/UserContext';
import { useRouter } from 'next/navigation';

// Mock data for suggested hiking buddies
const suggestedHikingBuddies = [
    { name: 'Alex Mountain', handle: '@alexm', avatar: null, bio: 'Summit chaser' },
    { name: 'Emma Trail', handle: '@emmat', avatar: null, bio: 'Trail explorer' },
    { name: 'Chris Peak', handle: '@chrispeak', avatar: null, bio: 'Rock climber' },
    { name: 'Lisa Summit', handle: '@lisas', avatar: null, bio: 'Adventure seeker' },
];

export default function Feed({ isConnected, setIsConnected }: { isConnected: boolean, setIsConnected: (isConnected: boolean) => void }) {
    const [posts, setPosts] = useState<PostType[]>([]);
    const [loading, setLoading] = useState(true);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [scrollLocked, setScrollLocked] = useState(false);
    const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
    const toast = useToast();
    const observerTarget = useRef<HTMLDivElement>(null);
    const { user, logout } = useUser();
    const router = useRouter();

    // Prevent browser scroll restoration and load posts
    useEffect(() => {
        // Disable browser's automatic scroll restoration
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }

        // Force scroll to top immediately
        window.scrollTo(0, 0);

        // Load posts
        loadPosts(undefined, true);

        // Cleanup: restore scroll restoration on unmount
        return () => {
            if ('scrollRestoration' in window.history) {
                window.history.scrollRestoration = 'auto';
            }
        };
    }, []);

    const userName = user?.userName;

    // Force scroll to top during initial load to prevent layout shift jumps
    useEffect(() => {
        if (loading && isInitialLoad) {
            const intervalId = setInterval(() => {
                if (window.scrollY > 0) {
                    window.scrollTo(0, 0);
                }
            }, 50);

            return () => clearInterval(intervalId);
        }
    }, [loading, isInitialLoad]);

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

    const handleLogout = useCallback(() => {
        logout();
        router.refresh();
    }, [logout, router]);

    const loadPosts = useCallback(async (cursor?: string, isInitial: boolean = false) => {
        try {
            if (cursor) {
                setLoadingMore(true);
            } else if (isInitial) {
                setLoading(true);
            } else {
                setRefreshing(true);
            }

            const result = await fetchHomePosts(cursor);

            if (cursor) {
                // Append to existing posts, but deduplicate by _id
                setPosts(prev => {
                    const existingIds = new Set(prev.map(p => p._id));
                    const newPosts = result.posts.filter(p => !existingIds.has(p._id));
                    return [...prev, ...newPosts];
                });
            } else {
                // Replace posts
                setPosts(result.posts);

                // Delay enabling infinite scroll until layout is stable
                // Increased delay to allow images to load and layout to stabilize
                setTimeout(() => {
                    setIsInitialLoad(false);
                }, 500);

                // Scroll to top when refreshing
                if (!isInitial) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }

            setNextCursor(result.nextCursor);
        } catch (error) {
            console.error('Error fetching posts:', error);
            toast.error("Failed to load posts. Please try again.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    }, [toast]);

    // Infinite scroll with Intersection Observer
    // Only enable after initial load completes and layout is stable
    useEffect(() => {
        // 🚫 Stop early if still in initial load or scroll is locked (during refresh)
        if (isInitialLoad || scrollLocked) return;

        // Don't set up observer if no more posts or if currently loading
        if (loading || loadingMore || !nextCursor) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && nextCursor && !loadingMore && !loading) {
                    loadPosts(nextCursor);
                }
            },
            {
                threshold: 0.1,
                rootMargin: '100px' // Start loading when within 100px of the target
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
    }, [nextCursor, loadingMore, isInitialLoad, loading, scrollLocked]);

    const handlePostCreated = async () => {
        // Lock scroll to prevent infinite scroll from triggering
        setScrollLocked(true);

        // Close modal
        setCreateModalOpen(false);

        // Inform user immediately
        toast.success("Post created successfully!");

        // LAZY LOADING: Give backend time to process and save to database
        // Wait 1 second before fetching to ensure data is saved
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Scroll to top to see the new post
        window.scrollTo(0, 0);

        // Force a feed refresh to pull the latest posts
        await loadPosts(undefined, false);

        // Allow scroll after layout stabilizes
        setTimeout(() => {
            setScrollLocked(false);
        }, 500);
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


    return (
        <AppLayout>
            {/* Floating Action Button for Create Post */}

            {/* Create Post Modal */}
            <CreatePostModal
                open={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                onPostCreated={handlePostCreated}
            />

            <Container maxWidth="md">
                <Grid container spacing={4} justifyContent="center">
                    {/* Main Feed */}
                    <Grid size={{ xs: 12, md: 7 }}>
                        {/* Show refreshing indicator at the top */}
                        {refreshing && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                <CircularProgress size={24} sx={{ color: '#0095f6' }} />
                            </Box>
                        )}

                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                                <CircularProgress />
                            </Box>
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
                                <Typography variant="body2" sx={{ color: '#8e8e8e' }}>
                                    Connect with hikers to see their adventures here
                                </Typography>
                            </Box>
                        ) : (
                            <>
                                <Stack spacing={0}>
                                    {posts.map((post) => (
                                        <Post
                                            key={post._id}
                                            post={post}
                                            onPostUpdated={handlePostUpdated}
                                            onPostDeleted={handlePostDeleted}
                                        />
                                    ))}
                                </Stack>

                                {/* Infinite scroll trigger and loading indicator */}
                                {nextCursor && (
                                    <Box
                                        ref={observerTarget}
                                        sx={{ display: 'flex', justifyContent: 'center', py: 4 }}
                                    >
                                        {loadingMore && (
                                            <CircularProgress size={32} sx={{ color: '#0095f6' }} />
                                        )}
                                    </Box>
                                )}

                                {/* End of feed message */}
                                {!nextCursor && posts.length > 0 && (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                    </Box>
                                )}
                            </>
                        )}
                    </Grid>

                    {/* Right Sidebar - Suggestions (hidden on mobile) */}
                    <Grid size={{ md: 4 }} sx={{ display: { xs: 'none', md: 'block' } }}>
                        <Box sx={{ position: 'sticky', top: 0, pt: 2 }}>
                            {/* Current User Profile */}
                            {currentUserProfile && (
                                <Box sx={{ mb: 3 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            {currentUserProfile.userProfilePic ? (
                                                <Avatar
                                                    src={currentUserProfile.userProfilePic}
                                                    sx={{ width: 44, height: 44 }}
                                                />
                                            ) : (
                                                <AccountCircleIcon
                                                    sx={{
                                                        width: 48,
                                                        height: 48,
                                                        color: '#8e8e8e',
                                                    }}
                                                />
                                            )}
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: 600,
                                                        fontSize: '0.875rem',
                                                        color: '#262626',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {currentUserProfile.userName}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        color: '#8e8e8e',
                                                        fontSize: '0.75rem',
                                                        display: 'block',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {currentUserProfile.profileDescription || 'No bio yet'}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <IconButton
                                            onClick={handleLogout}
                                            size="small"
                                            sx={{
                                                color: '#8e8e8e',
                                                '&:hover': {
                                                    color: '#262626',
                                                    bgcolor: 'rgba(0,0,0,0.04)',
                                                },
                                            }}
                                        >
                                            <LogoutIcon sx={{ fontSize: 18 }} />
                                        </IconButton>
                                    </Box>
                                </Box>
                            )}

                            <Box>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: 600,
                                        color: '#8e8e8e',
                                        mb: 2.5,
                                        fontSize: '0.875rem',
                                    }}
                                >
                                    Hiking Buddies for You
                                </Typography>
                                <Stack spacing={2}>
                                    {suggestedHikingBuddies.map((user, index) => (
                                        <Box
                                            key={index}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                {user.avatar ? (
                                                    <Avatar
                                                        src={user.avatar}
                                                        sx={{ width: 44, height: 44 }}
                                                    />
                                                ) : (
                                                    <AccountCircleIcon
                                                        sx={{
                                                            width: 44,
                                                            height: 44,
                                                            color: '#8e8e8e',
                                                        }}
                                                    />
                                                )}
                                                <Box>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            fontWeight: 600,
                                                            fontSize: '0.875rem',
                                                            color: '#262626',
                                                        }}
                                                    >
                                                        {user.name}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{ color: '#8e8e8e', fontSize: '0.75rem' }}
                                                    >
                                                        {user.bio}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Button
                                                size="small"
                                                sx={{
                                                    textTransform: 'none',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    color: '#2e7d32',
                                                    minWidth: 'auto',
                                                    px: 0,
                                                    '&:hover': {
                                                        bgcolor: 'transparent',
                                                        color: '#1b5e20',
                                                    },
                                                }}
                                            >
                                                Connect
                                            </Button>
                                        </Box>
                                    ))}
                                </Stack>
                            </Box>
                        </Box>
                    </Grid>
                </Grid>
            </Container>
        </AppLayout>
    );
}

