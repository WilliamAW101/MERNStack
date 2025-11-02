"use client"

import React from 'react';
import {
    Box,
    Container,
    Grid,
    Typography,
    Avatar,
    Button,
    Stack,
} from '@mui/material';
import Post from './Post';
import AppLayout from './AppLayout';

// Mock data for posts
const mockPosts = [
    {
        id: 1,
        username: 'Ben Sweet',
        userHandle: '@craig',
        userAvatar: '/api/placeholder/50/50',
        timestamp: '2m',
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop',
        caption: 'Half Dome was incredible! The views from the top were absolutely breathtaking. Can\'t wait to go back!',
        hashtags: ['#Yosemite', '#Climbing', '#Adventure'],
        likes: 400,
        comments: 14,
        rating: 5,
    },
    {
        id: 2,
        username: 'Keval Patel',
        userHandle: '@keval1',
        userAvatar: '/api/placeholder/50/50',
        timestamp: '31m',
        image: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&auto=format&fit=crop',
        caption: 'It was a challenging climb, but reaching the summit made it all worthwhile!',
        hashtags: ['#RockClimbing', '#Summit', '#Challenge'],
        likes: 287,
        comments: 23,
        rating: 4,
    },
    {
        id: 3,
        username: 'Sarah Johnson',
        userHandle: '@sarahj',
        userAvatar: '/api/placeholder/50/50',
        timestamp: '1h',
        image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&auto=format&fit=crop',
        caption: 'Morning hikes hit different! The sunrise at this peak was worth the early wake-up call.',
        hashtags: ['#MorningHike', '#Sunrise', '#NatureLovers'],
        likes: 542,
        comments: 34,
        rating: 5,
    },
    {
        id: 4,
        username: 'Mike Torres',
        userHandle: '@mtorres',
        userAvatar: '/api/placeholder/50/50',
        timestamp: '3h',
        image: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=800&auto=format&fit=crop',
        caption: 'First time bouldering and I\'m hooked! Anyone have tips for a beginner?',
        hashtags: ['#Bouldering', '#Climbing', '#NewToClimbing'],
        likes: 198,
        comments: 47,
        rating: 4,
    },
];

// Mock data for suggested users
const suggestedUsers = [
    { name: 'Alex Mountain', handle: '@alexm', avatar: '/api/placeholder/40/40' },
    { name: 'Emma Trail', handle: '@emmat', avatar: '/api/placeholder/40/40' },
    { name: 'Chris Peak', handle: '@chrispeak', avatar: '/api/placeholder/40/40' },
    { name: 'Lisa Summit', handle: '@lisas', avatar: '/api/placeholder/40/40' },
];

export default function Feed() {
    return (
        <AppLayout>
            <Container maxWidth="lg">
                <Grid container spacing={4} justifyContent="center">
                    {/* Main Feed */}
                    <Grid size={{ xs: 12, md: 7 }}>
                        <Stack spacing={0}>
                            {mockPosts.map((post) => (
                                <Post key={post.id} post={post} />
                            ))}
                        </Stack>
                    </Grid>

                    {/* Right Sidebar - Suggestions (hidden on mobile) */}
                    <Grid size={{ md: 3 }} sx={{ display: { xs: 'none', md: 'block' } }}>
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
                                    Suggested for you
                                </Typography>
                                <Stack spacing={2}>
                                    {suggestedUsers.map((user, index) => (
                                        <Box
                                            key={index}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Avatar
                                                    src={user.avatar}
                                                    sx={{ width: 44, height: 44 }}
                                                />
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
                                                        Suggested for you
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Button
                                                size="small"
                                                sx={{
                                                    textTransform: 'none',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    color: '#0095f6',
                                                    minWidth: 'auto',
                                                    px: 0,
                                                    '&:hover': {
                                                        bgcolor: 'transparent',
                                                        color: '#00376b',
                                                    },
                                                }}
                                            >
                                                Follow
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

