"use client"
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import React, { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
    Card,
    CardHeader,
    CardContent,
    CardActions,
    Avatar,
    IconButton,
    Typography,
    Box,
    Menu,
    MenuItem,
    Rating,
    TextField,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
} from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import StarIcon from '@mui/icons-material/Star';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { PostProps, Post as PostType } from '@/types/post.types';
import { formatPostTimestamp, getDifficultyEmoji } from '@/utils/post.utils';
import { PLACEHOLDER_IMAGE } from '@/constants/images';
import CommentModal from './CommentModal';
import EditPostModal from './EditPostModal';
import { addComment, likePost, deletePost as deletePostAPI, fetchPostById } from '@/services/api.service';
import { useToast } from '@/context/toast';
import { useUser } from '@/context/user/UserContext';

const LAZY_REFRESH_DELAY = 800;
const MAX_REFRESH_RETRIES = 3;
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface PostComponentProps extends PostProps {
    onPostUpdated?: (postId: string, updatedPost: PostType) => void;
    onPostDeleted?: (postId: string) => void;
    priority?: boolean; // For priority image loading
}

function Post({ post, onPostUpdated, onPostDeleted, priority = false }: PostComponentProps) {
    const [liked, setLiked] = useState(post.isLiked ?? false);
    const [likes, setLikes] = useState(post.likeCount ?? 0);
    const [commentCount, setCommentCount] = useState(post.commentCount ?? 0);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [showCommentInput, setShowCommentInput] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [refreshingPost, setRefreshingPost] = useState(false);
    const toast = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user } = useUser();

    // Check if current user is the post owner
    const isOwnPost = user?.id === post.userId;

    const username = post.username || user?.userName || 'User';
    const usernameInitial = username.charAt(0);
    const userAvatar = post.userProfilePic;
    const userHandle = `@${post.username?.toLowerCase().replace(/\s+/g, '') ?? ''}`;

    // Get images array - use direct URLs from backend
    const imageURLs = post.imageURLs || [];
    const hasMultipleImages = imageURLs.length > 1;
    const isFirstImage = currentImageIndex === 0;
    const isLastImage = currentImageIndex === imageURLs.length - 1;

    const handleLike = async () => {

        setLiked(!liked);
        setLikes(liked ? likes - 1 : likes + 1);

        try {
            const response = await likePost(post._id);
            if (response.isLiked) {
                // Update with actual count from server
                setLikes(response.likeCount);
            }
        } catch (error) {
            toast.error('Failed to update like');
        }
    };

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleNextImage = () => {
        if (currentImageIndex < imageURLs.length - 1) {
            setCurrentImageIndex(currentImageIndex + 1);
        }
    };

    const handlePreviousImage = () => {
        if (currentImageIndex > 0) {
            setCurrentImageIndex(currentImageIndex - 1);
        }
    };

    // Listen for URL changes to open/close modal (Instagram style)
    useEffect(() => {
        const postIdFromUrl = searchParams.get('postId');
        if (postIdFromUrl === post._id) {
            setCommentModalOpen(true);
        } else {
            setCommentModalOpen(false);
        }
    }, [searchParams, post._id]);

    const handleCommentIconClick = () => {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('postId', post._id);

        router.push(`${pathname}?postId=${post._id}`, { scroll: false });
    };

    const handleCloseCommentModal = () => {
        // Remove postId from URL when closing modal
        router.push(pathname, { scroll: false });
    };



    const handleCommentSubmit = async () => {
        if (commentText.trim()) {
            try {
                await addComment(post._id, commentText);
                setCommentText('');
                setShowCommentInput(false);
                // Increment comment count
                handleCommentAdded();
                toast.success('Comment added successfully');
            } catch (error) {
                toast.error('Failed to add comment');
            }
        }
    };

    const handleEditPost = () => {
        setAnchorEl(null);
        setEditModalOpen(true);
    };

    const handleDeletePost = () => {
        setAnchorEl(null);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDeletePost = async () => {
        setDeleting(true);
        try {
            const response = await deletePostAPI(post._id);

            if (response.success) {
                setDeleteDialogOpen(false);
                toast.success(response.message || 'Post deleted successfully');

                // Remove post from parent's state (Feed or Profile)
                if (onPostDeleted) {
                    onPostDeleted(post._id);
                } else {
                    // Fallback: refresh page if no callback provided
                    router.refresh();
                }
            } else {
                toast.error(response.message || 'Failed to delete post');
            }
        } catch (error: any) {
            console.error('Error deleting post:', error);
            toast.error(error.message || 'Failed to delete post');
        } finally {
            setDeleting(false);
        }
    };

    const handlePostUpdated = async () => {
        setRefreshingPost(true);
        const hadImagesBefore = (post.imageURLs?.length ?? 0) > 0;

        try {
            // Lazy load: wait briefly to give backend time to process media updates
            await wait(LAZY_REFRESH_DELAY);

            let updatedPost: PostType | null = null;

            for (let attempt = 1; attempt <= MAX_REFRESH_RETRIES; attempt++) {
                const fetchedPost = await fetchPostById(post._id);
                const hasImagesNow = (fetchedPost.imageURLs?.length ?? 0) > 0;
                updatedPost = fetchedPost;

                if (!hadImagesBefore || hasImagesNow || attempt === MAX_REFRESH_RETRIES) {
                    break;
                }

                await wait(LAZY_REFRESH_DELAY);
            }

            if (updatedPost) {
                if (onPostUpdated) {
                    onPostUpdated(post._id, updatedPost);
                } else {
                    router.refresh();
                }
            }
        } catch (error) {
            console.error('Error fetching updated post:', error);
            router.refresh();
        } finally {
            setRefreshingPost(false);
        }
    };

    const handleCommentDeleted = () => {
        // Decrement comment count without refetching
        setCommentCount(prev => Math.max(0, prev - 1));
    };

    const handleCommentAdded = () => {
        // Increment comment count
        setCommentCount(prev => prev + 1);
    };

    return (
        <Card
            sx={{
                maxWidth: '100%',
                bgcolor: '#fff',
                borderRadius: 3,
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                border: '1px solid rgba(46, 125, 50, 0.08)',
                mb: 3,
                overflow: 'hidden',
                transition: 'all 0.3s',
                '&:hover': {
                    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                    transform: 'translateY(-2px)',
                },
            }}
        >
            <CardHeader
                avatar={
                    userAvatar ? (
                        <Avatar
                            src={userAvatar}
                            alt={`${post.username || 'User'}'s profile picture`}
                            sx={{
                                width: { xs: 32, sm: 36 },
                                height: { xs: 32, sm: 36 },
                                bgcolor: '#2e7d32',
                            }}
                        >
                            {usernameInitial}
                        </Avatar>
                    ) : (
                        <AccountCircleIcon
                            sx={{
                                width: { xs: 32, sm: 36 },
                                height: { xs: 32, sm: 36 },
                                color: '#262626',
                            }}
                            aria-label={`${post.username || 'User'}'s profile icon`}
                        />
                    )
                }
                action={
                    isOwnPost && (
                        <>
                            <IconButton
                                onClick={handleMenuClick}
                                size="small"
                                aria-label="Post options"
                                aria-haspopup="true"
                                sx={{
                                    color: '#262626',
                                    '&:hover': {
                                        color: '#737373',
                                    }
                                }}
                            >
                                <MoreVertIcon />
                            </IconButton>
                            <Menu
                                anchorEl={anchorEl}
                                open={Boolean(anchorEl)}
                                onClose={handleMenuClose}
                                anchorOrigin={{
                                    vertical: 'bottom',
                                    horizontal: 'right',
                                }}
                                transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                                PaperProps={{
                                    sx: {
                                        borderRadius: 2,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                        minWidth: 150,
                                    }
                                }}
                            >
                                <MenuItem
                                    onClick={handleEditPost}
                                    sx={{
                                        gap: 1.5,
                                        py: 1.5,
                                        fontSize: '0.875rem',
                                        '&:hover': {
                                            bgcolor: '#f5f5f5',
                                        }
                                    }}
                                >
                                    <EditIcon sx={{ fontSize: '1.25rem', color: '#0095f6' }} />
                                    Edit Post
                                </MenuItem>
                                <MenuItem
                                    onClick={handleDeletePost}
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
                                    <DeleteIcon sx={{ fontSize: '1.25rem' }} />
                                    Delete Post
                                </MenuItem>
                            </Menu>
                        </>
                    )
                }
                title={
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '0.9rem' }, color: '#000' }}>
                        {username}
                    </Typography>
                }
                subheader={
                    <Typography variant="caption" sx={{ color: '#737373', fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}>
                        {userHandle} • {formatPostTimestamp(post.timestamp)}
                    </Typography>
                }
                sx={{
                    padding: { xs: 1.5, sm: 2 },
                    paddingBottom: { xs: 1, sm: 1.5 },
                    bgcolor: 'rgba(46, 125, 50, 0.02)',
                    '& .MuiCardHeader-avatar': {
                        marginRight: { xs: 1, sm: 1.5 },
                        marginLeft: 0,
                    }
                }}
            />

            {/* Image Carousel */}
            <Box
                sx={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '1 / 1', // Fixed aspect ratio to prevent layout shift
                    maxHeight: 600,
                    backgroundColor: '#f0f0f0', // Placeholder color while loading
                    overflow: 'hidden',
                }}
            >
                <Box
                    component="img"
                    src={imageURLs.length > 0 ? imageURLs[currentImageIndex] : PLACEHOLDER_IMAGE}
                    alt={post.caption || 'Post image'}
                    loading={priority ? 'eager' : 'lazy'} // Priority images load immediately
                    decoding="async" // Async image decoding for better performance
                    sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                    }}
                />
                {refreshingPost && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            bgcolor: 'rgba(0, 0, 0, 0.65)',
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 2,
                        }}
                    >
                        <CircularProgress size={16} sx={{ color: '#fff' }} />
                        <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600 }}>
                            Refreshing…
                        </Typography>
                    </Box>
                )}

                {/* Navigation Arrows */}
                {hasMultipleImages && !isFirstImage && (
                    <IconButton
                        onClick={handlePreviousImage}
                        aria-label="Previous image"
                        sx={{
                            position: 'absolute',
                            left: 8,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            bgcolor: 'rgba(255, 255, 255, 0.9)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                            width: 32,
                            height: 32,
                            '&:hover': {
                                bgcolor: 'rgba(255, 255, 255, 1)',
                            },
                        }}
                    >
                        <ArrowBackIosNewIcon sx={{ fontSize: '1rem', ml: 0.5 }} />
                    </IconButton>
                )}

                {hasMultipleImages && !isLastImage && (
                    <IconButton
                        onClick={handleNextImage}
                        aria-label="Next image"
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            bgcolor: 'rgba(255, 255, 255, 0.9)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                            width: 32,
                            height: 32,
                            '&:hover': {
                                bgcolor: 'rgba(255, 255, 255, 1)',
                            },
                        }}
                    >
                        <ArrowForwardIosIcon sx={{ fontSize: '1rem' }} />
                    </IconButton>
                )}

                {/* Image Counter Dots */}
                {hasMultipleImages && (
                    <Box
                        role="group"
                        aria-label="Image navigation"
                        sx={{
                            position: 'absolute',
                            bottom: 12,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            gap: 0.5,
                        }}
                    >
                        {imageURLs.map((_, index) => (
                            <Box
                                key={index}
                                role="button"
                                tabIndex={0}
                                aria-label={`Go to image ${index + 1} of ${imageURLs.length}`}
                                aria-current={index === currentImageIndex ? 'true' : 'false'}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setCurrentImageIndex(index);
                                    }
                                }}
                                sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    bgcolor: index === currentImageIndex ? '#0095f6' : 'rgba(255, 255, 255, 0.6)',
                                    transition: 'all 0.3s',
                                    cursor: 'pointer',
                                    '&:focus': {
                                        outline: '2px solid #0095f6',
                                        outlineOffset: '2px',
                                    },
                                }}
                                onClick={() => setCurrentImageIndex(index)}
                            />
                        ))}
                    </Box>
                )}
            </Box>

            <CardActions
                disableSpacing
                sx={{
                    padding: { xs: 1, sm: 1.5 },
                    px: { xs: 1.5, sm: 2 },
                    borderTop: '1px solid rgba(0,0,0,0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {/* Like button with count */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconButton
                            onClick={handleLike}
                            aria-label={liked ? 'Unlike post' : 'Like post'}
                            sx={{
                                color: liked ? '#ed4956' : '#000',
                                padding: { xs: '2px', sm: '3px' },
                                transition: 'all 0.2s',
                                '&:hover': {
                                    color: liked ? '#e53935' : '#737373',
                                    transform: 'scale(1.05)',
                                },
                            }}
                        >
                            {liked ? <FavoriteIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} /> : <FavoriteBorderIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />}
                        </IconButton>
                        <Typography
                            variant="body2"
                            sx={{
                                color: '#000',
                                fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                                fontWeight: 500,
                                minWidth: { xs: '16px', sm: '20px' },
                            }}
                            aria-label={`${likes} likes`}
                        >
                            {likes}
                        </Typography>
                    </Box>

                    {/* Comment button with count */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconButton
                            onClick={handleCommentIconClick}
                            aria-label="View comments"
                            sx={{
                                color: '#000',
                                padding: { xs: '2px', sm: '3px' },
                                '&:hover': {
                                    color: '#737373',
                                },
                            }}
                        >
                            <ChatBubbleOutlineIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
                        </IconButton>
                        <Typography
                            variant="body2"
                            sx={{
                                color: '#000',
                                fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                                fontWeight: 500,
                                minWidth: { xs: '20px', sm: '24px' },
                            }}
                            aria-label={`${commentCount} comments`}
                        >
                            {commentCount}
                        </Typography>
                    </Box>
                </Box>
                <IconButton
                    aria-label="Save post"
                    sx={{
                        color: '#000',
                        padding: { xs: '4px', sm: '6px' },
                        '&:hover': {
                            color: '#737373',
                        },
                    }}
                >
                    <BookmarkBorderIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
                </IconButton>
            </CardActions>

            <CardContent sx={{ padding: { xs: 1.5, sm: 2 }, pt: { xs: 1, sm: 1.5 }, pb: { xs: 1.5, sm: 2 } }}>

                {/* Caption and Location - Responsive layout */}
                <Box sx={{
                    mb: { xs: 1, sm: 1.5 },
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: { xs: 0.5, sm: 1 }
                }}>
                    <Box sx={{
                        maxWidth: { xs: '100%', sm: '70%', md: '75%' },
                        flex: 1,
                        minWidth: 0
                    }}>
                        <Typography
                            variant="body2"
                            component="span"
                            sx={{ fontWeight: 600, mr: 1, color: '#000', fontSize: { xs: '0.8125rem', sm: '0.875rem' } }}
                        >
                            {username}
                        </Typography>
                        <Typography
                            variant="body2"
                            component="span"
                            sx={{
                                color: '#000',
                                fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                                wordBreak: 'break-word'
                            }}
                        >
                            {post.caption}
                        </Typography>
                    </Box>
                    {post.location && (
                        <Typography
                            variant="body2"
                            component="span"
                            sx={{
                                color: '#00376b',
                                cursor: 'pointer',
                                fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                '&:hover': {
                                    textDecoration: 'underline',
                                },
                            }}
                        >
                            📍 {post.location}
                        </Typography>
                    )}
                </Box>

                {/* Difficulty and Rating - Responsive layout */}
                <Box sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    gap: { xs: 1, sm: 2 },
                    mb: { xs: 1, sm: 1.5 }
                }}>
                    {post.difficulty && (
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            bgcolor: 'rgba(255, 107, 53, 0.1)',
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 2,
                            border: '1px solid rgba(255, 107, 53, 0.2)',
                        }}>
                            <Typography variant="body2" sx={{ color: '#ff6b35', fontSize: { xs: '0.8125rem', sm: '0.875rem' }, fontWeight: 600 }}>
                                Difficulty: {getDifficultyEmoji(post.difficulty)}
                            </Typography>
                        </Box>
                    )}
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        bgcolor: 'rgba(255, 193, 7, 0.1)',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 2,
                        border: '1px solid rgba(255, 193, 7, 0.2)',
                    }}>
                        <Typography variant="body2" sx={{ color: '#f57c00', fontSize: { xs: '0.8125rem', sm: '0.875rem' }, fontWeight: 600 }}>
                            Rating:
                        </Typography>
                        <Rating
                            value={post.rating}
                            readOnly
                            size="small"
                            icon={<StarIcon sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }} />}
                            emptyIcon={<StarIcon sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }} />}
                            sx={{
                                '& .MuiRating-iconFilled': {
                                    color: '#ffc107',
                                },
                            }}
                        />
                    </Box>
                </Box>

                {/* Add a comment link */}

                <Box
                    sx={{
                        paddingLeft: 0,
                        display: 'flex',
                        gap: 1.5,
                        alignItems: 'center',
                    }}
                >
                    <TextField
                        fullWidth
                        placeholder="Add a comment..."
                        variant="standard"
                        multiline
                        maxRows={3}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleCommentSubmit();
                            }
                        }}
                        autoFocus
                        InputProps={{
                            disableUnderline: true,
                            sx: {
                                fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                                color: '#000',
                            },
                        }}
                        sx={{
                            '& .MuiInputBase-input': {
                                padding: 0,
                            },
                            '& .MuiInputBase-input::placeholder': {
                                color: '#666666',
                                opacity: 1,
                            },
                        }}
                    />
                    {commentText.trim() && (
                        <Button
                            onClick={handleCommentSubmit}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                                color: '#0095f6',
                                padding: 0,
                                minWidth: 'auto',
                                '&:hover': {
                                    bgcolor: 'transparent',
                                    color: '#00376b',
                                },
                            }}
                        >
                            Post
                        </Button>
                    )}
                </Box>
            </CardContent>


            {/* Comment Modal - Instagram style with URL routing */}
            <CommentModal
                open={commentModalOpen}
                onClose={handleCloseCommentModal}
                post={post}
                isLiked={liked}
                likeCount={likes}
                onLikePost={handleLike}
                onCommentDeleted={handleCommentDeleted}
                onCommentAdded={handleCommentAdded}
            />

            {/* Edit Post Modal */}
            {isOwnPost && (
                <EditPostModal
                    open={editModalOpen}
                    onClose={() => setEditModalOpen(false)}
                    onPostUpdated={handlePostUpdated}
                    post={post}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => !deleting && setDeleteDialogOpen(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 600, color: '#000' }}>
                    Delete Post?
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: '#737373' }}>
                        Are you sure you want to delete this post? This action cannot be undone and will remove all comments and likes.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button
                        onClick={() => setDeleteDialogOpen(false)}
                        disabled={deleting}
                        sx={{
                            textTransform: 'none',
                            color: '#262626',
                            fontWeight: 600,
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmDeletePost}
                        disabled={deleting}
                        variant="contained"
                        sx={{
                            textTransform: 'none',
                            bgcolor: '#ed4956',
                            fontWeight: 600,
                            '&:hover': {
                                bgcolor: '#c13347',
                            },
                        }}
                    >
                        {deleting ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Card>
    );
}

// Memoize Post component to prevent unnecessary re-renders
export default React.memo(Post, (prevProps, nextProps) => {
    // Only re-render if post data actually changed
    return (
        prevProps.post._id === nextProps.post._id &&
        prevProps.post.likeCount === nextProps.post.likeCount &&
        prevProps.post.commentCount === nextProps.post.commentCount &&
        prevProps.post.isLiked === nextProps.post.isLiked &&
        prevProps.post.caption === nextProps.post.caption &&
        prevProps.post.imageURLs?.length === nextProps.post.imageURLs?.length &&
        prevProps.priority === nextProps.priority
    );
});
