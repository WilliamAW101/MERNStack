"use client"

import React, { useState } from 'react';
import {
    Card,
    CardHeader,
    CardMedia,
    CardContent,
    CardActions,
    Avatar,
    IconButton,
    Typography,
    Box,
    Chip,
    Menu,
    MenuItem,
    Rating,
} from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ShareIcon from '@mui/icons-material/Share';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import StarIcon from '@mui/icons-material/Star';

interface PostProps {
    post: {
        id: number;
        username: string;
        userHandle: string;
        userAvatar: string;
        timestamp: string;
        image: string;
        caption: string;
        hashtags: string[];
        likes: number;
        comments: number;
        rating: number;
    };
}

export default function Post({ post }: PostProps) {
    const [liked, setLiked] = useState(false);
    const [likes, setLikes] = useState(post.likes);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const handleLike = () => {
        if (liked) {
            setLikes(likes - 1);
        } else {
            setLikes(likes + 1);
        }
        setLiked(!liked);
    };

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    return (
        <Card
            sx={{
                maxWidth: '100%',
                bgcolor: '#fff',
                borderRadius: 0,
                boxShadow: 'none',
                border: 'none',
                borderBottom: '1px solid #dbdbdb',
            }}
        >
            <CardHeader
                avatar={
                    <Avatar
                        src={post.userAvatar}
                        sx={{
                            width: 40,
                            height: 40,
                            bgcolor: '#2e7d32',
                        }}
                    >
                        {post.username.charAt(0)}
                    </Avatar>
                }
                action={
                    <>
                        <IconButton onClick={handleMenuClick}>
                            <MoreVertIcon />
                        </IconButton>
                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={handleMenuClose}
                        >
                            <MenuItem onClick={handleMenuClose}>Report</MenuItem>
                            <MenuItem onClick={handleMenuClose}>Share</MenuItem>
                            <MenuItem onClick={handleMenuClose}>Copy link</MenuItem>
                        </Menu>
                    </>
                }
                title={
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        {post.username}
                    </Typography>
                }
                subheader={
                    <Typography variant="caption" sx={{ color: '#737373' }}>
                        {post.userHandle} • {post.timestamp}
                    </Typography>
                }
                sx={{
                    pb: 1,
                    px: 2,
                    '& .MuiCardHeader-avatar': {
                        marginRight: 1.5,
                    }
                }}
            />

            <CardMedia
                component="img"
                image={post.image}
                alt={post.caption}
                sx={{
                    height: 'auto',
                    maxHeight: 600,
                    objectFit: 'cover',
                }}
            />

            <CardActions
                disableSpacing
                sx={{
                    px: 2,
                    py: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                }}
            >
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                        onClick={handleLike}
                        sx={{
                            color: liked ? '#e53935' : 'inherit',
                            transition: 'all 0.2s',
                            '&:hover': {
                                transform: 'scale(1.1)',
                            },
                        }}
                    >
                        {liked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                    </IconButton>
                    <IconButton>
                        <ChatBubbleOutlineIcon />
                    </IconButton>
                    <IconButton>
                        <ShareIcon />
                    </IconButton>
                </Box>
                <IconButton>
                    <BookmarkBorderIcon />
                </IconButton>
            </CardActions>

            <CardContent sx={{ pt: 0, pb: 2 }}>
                <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, mb: 1, fontSize: '0.875rem' }}
                >
                    {likes.toLocaleString()} likes
                </Typography>

                <Box sx={{ mb: 1.5 }}>
                    <Typography
                        variant="body2"
                        component="span"
                        sx={{ fontWeight: 600, mr: 1 }}
                    >
                        {post.username}
                    </Typography>
                    <Typography variant="body2" component="span">
                        {post.caption}
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                    {post.hashtags.map((tag, index) => (
                        <Typography
                            key={index}
                            variant="body2"
                            component="span"
                            sx={{
                                color: '#2e7d32',
                                cursor: 'pointer',
                                '&:hover': {
                                    textDecoration: 'underline',
                                },
                            }}
                        >
                            {tag}
                        </Typography>
                    ))}
                </Box>

                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mt: 1,
                    }}
                >
                    <Typography
                        variant="body2"
                        sx={{ color: '#737373', cursor: 'pointer', fontSize: '0.875rem' }}
                    >
                        View all {post.comments} comments
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Rating
                            value={post.rating}
                            readOnly
                            size="small"
                            icon={<StarIcon sx={{ fontSize: '1.1rem' }} />}
                            emptyIcon={<StarIcon sx={{ fontSize: '1.1rem' }} />}
                            sx={{
                                '& .MuiRating-iconFilled': {
                                    color: '#ffc107',
                                },
                            }}
                        />
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
}

