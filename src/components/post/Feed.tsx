"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box,
    Container,
    Grid,
    Typography,
    Avatar,
    Button,
    Stack,
    CircularProgress,
    Fab,
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Post from './Post';
import AppLayout from '../layout/AppLayout';
import CreatePostModal from './CreatePostModal';
import { useToast } from '@/context/toast';
import { fetchHomePosts } from '@/services/api.service';
import { Post as PostType } from '@/types/post.types';

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
    const toast = useToast();
    const observerTarget = useRef<HTMLDivElement>(null);

    // Scroll to top on mount and initial load
    useEffect(() => {
        window.scrollTo(0, 0);
        loadPosts(undefined, true);
    }, []);

    const loadPosts = async (cursor?: string, isInitial: boolean = false) => {
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
                setIsInitialLoad(false);

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
    };

    // Infinite scroll with Intersection Observer
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
    }, [nextCursor, loadingMore, isInitialLoad, loading]);

    const handlePostCreated = async () => {
        console.log('📝 Post created, starting refresh process...');

        // Close modal
        setCreateModalOpen(false);

        // Inform user immediately
        toast.success("Post created successfully!");

        // LAZY LOADING: Give backend time to process and save to database
        // Wait 1 second before fetching to ensure data is saved
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('🔄 Refreshing feed...');
        // Force a feed refresh to pull the latest posts
        await loadPosts(undefined, false);

        console.log('✅ Feed refreshed successfully');
    };

    const handlePostUpdated = (postId: string, updatedPost: PostType) => {
        // Update the specific post in local state without refetching
        setPosts(prev => prev.map(post =>
            post._id === postId ? updatedPost : post
        ));
    };

    const handlePostDeleted = (postId: string) => {
        // Remove the post from local state without refetching
        setPosts(prev => prev.filter(post => post._id !== postId));
    };


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
                                        <Typography variant="body2" sx={{ color: '#8e8e8e' }}>
                                            You&apos;re all caught up! 🎉
                                        </Typography>
                                    </Box>
                                )}
                            </>
                        )}
                    </Grid>

                    {/* Right Sidebar - Suggestions (hidden on mobile) */}
                    <Grid size={{ md: 4 }} sx={{ display: { xs: 'none', md: 'block' } }}>
                        <Box sx={{ position: 'sticky', top: 80, pt: 2 }}>
                            <Box sx={{ mb: 3 }}>
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

