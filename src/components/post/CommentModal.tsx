"use client"
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    IconButton,
    Avatar,
    Typography,
    TextField,
    Button,
    Divider,
    Menu,
    MenuItem,
    CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import { Post, PostComment } from '@/types/post.types';
import { formatPostTimestamp } from '@/utils/post.utils';
import { PLACEHOLDER_IMAGE } from '@/constants/images';
import { addComment, likePost, fetchComments, updateComment, deleteComment } from '@/services/api.service';
import { useUser } from '@/context/user/UserContext';
import { useToast } from '@/context/toast';

interface CommentModalProps {
    open: boolean;
    onClose: () => void;
    post: Post;
    isLiked?: boolean;
    likeCount?: number;
    onLikePost?: () => void;
    onCommentDeleted?: () => void;
    onCommentAdded?: () => void;
}

// Helper to format time ago (Instagram style)
const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const commentDate = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w`;
    return `${Math.floor(diffInSeconds / 2592000)}mo`;
};

export default function CommentModal({
    open,
    onClose,
    post,
    isLiked: isLikedProp,
    likeCount: likeCountProp,
    onLikePost,
    onCommentDeleted,
    onCommentAdded
}: CommentModalProps) {
    const [commentText, setCommentText] = useState('');
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [liked, setLiked] = useState(isLikedProp ?? post.isLiked ?? false);
    const [likeCount, setLikeCount] = useState(likeCountProp ?? post.likeCount ?? 0);
    const [comments, setComments] = useState<PostComment[]>(post.comments || []);
    const [loadingComments, setLoadingComments] = useState(false);
    const [commentLikes, setCommentLikes] = useState<Record<string, boolean>>({});
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [anchorEl, setAnchorEl] = useState<{ element: HTMLElement; commentId: string } | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
    const { user } = useUser();
    const toast = useToast();


    // Sync with parent's like state
    useEffect(() => {
        if (isLikedProp !== undefined) setLiked(isLikedProp);
        if (likeCountProp !== undefined) setLikeCount(likeCountProp);
    }, [isLikedProp, likeCountProp]);

    // Sync comments when post changes
    useEffect(() => {
        setComments(post.comments || []);
    }, [post.comments]);


    const username = post.username || user?.userName || 'User';
    const usernameInitial = username.charAt(0);
    const userAvatar = post.userProfilePic;

    const imageURLs = post.imageURLs || [];
    const hasMultipleImages = imageURLs.length > 1;
    const isFirstImage = currentImageIndex === 0;
    const isLastImage = currentImageIndex === imageURLs.length - 1;

    const handleLikePost = async () => {
        if (onLikePost) {
            onLikePost();
            return;
        }

        const previousLiked = liked;
        const previousCount = likeCount;

        setLiked(!liked);
        setLikeCount(liked ? likeCount - 1 : likeCount + 1);

        try {
            const response = await likePost(post._id);
            if (response.isLiked !== undefined) {
                setLikeCount(response.likeCount);
            }
        } catch (error) {
            setLiked(previousLiked);
            setLikeCount(previousCount);
            toast.error('Failed to update like');
        }
    };

    const handleCommentLike = (commentId: string) => {
        setCommentLikes(prev => ({
            ...prev,
            [commentId]: !prev[commentId]
        }));
        // TODO: API call to like comment
    };

    const refetchComments = async (showSuccessToast: boolean = true) => {
        try {
            setLoadingComments(true);
            const result = await fetchComments(post._id);
            setComments(result.comments as PostComment[]);
            if (showSuccessToast) {
                toast.success('Comments updated successfully');
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
            toast.error('Failed to refresh comments');
        } finally {
            setLoadingComments(false);
        }
    };

    const handleCommentSubmit = async () => {
        if (commentText.trim()) {
            try {
                await addComment(post._id, commentText);
                setCommentText('');
                if (onCommentAdded) {
                    onCommentAdded();
                }

                // Refetch comments to show the new one
                await refetchComments(false);
            } catch (error) {
                console.error('Error posting comment:', error);
                toast.error('Failed to add comment');
            }
        }
    };

    const handleEditComment = (comment: PostComment) => {
        setEditingCommentId(comment._id);
        setEditText(comment.commentText);
        setAnchorEl(null);
    };

    const handleSaveEdit = async () => {
        if (editText.trim() && editingCommentId) {
            try {
                await updateComment(editingCommentId, editText);
                setEditingCommentId(null);
                setEditText('');

                // Refetch comments to show the updated comment
                await refetchComments();
            } catch (error) {
                console.error('Error updating comment:', error);
                toast.error('Failed to update comment');
            }
        }
    };

    const handleDeleteCommentClick = (commentId: string) => {
        setCommentToDelete(commentId);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!commentToDelete) return;

        try {
            await deleteComment(commentToDelete);

            // Remove comment from local state without refetching
            setComments(prev => prev.filter(comment => comment._id !== commentToDelete));

            // Notify parent to decrement comment count
            if (onCommentDeleted) {
                onCommentDeleted();
            }

            setDeleteDialogOpen(false);
            setCommentToDelete(null);
            setAnchorEl(null);

            toast.success('Comment deleted successfully');
        } catch (error) {
            console.error('Error deleting comment:', error);
            toast.error('Failed to delete comment');
        }
    };

    const handleCancelDelete = () => {
        setDeleteDialogOpen(false);
        setCommentToDelete(null);
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, commentId: string) => {
        setAnchorEl({ element: event.currentTarget, commentId });
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

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={false}
            disableScrollLock={false}
            scroll="paper"
            PaperProps={{
                sx: {
                    width: { xs: '100%', md: '90vw' },
                    maxWidth: { xs: '100%', md: '1200px' },
                    height: { xs: '100vh', md: '90vh' },
                    maxHeight: { xs: '100vh', md: '90vh' },
                    margin: 0,
                    borderRadius: { xs: 0, md: 2 },
                    overflow: 'hidden',
                },
            }}
            BackdropProps={{
                sx: {
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                },
            }}
        >
            <Box sx={{ display: 'flex', height: '100%', position: 'relative' }}>
                {/* Close button */}
                <IconButton
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        zIndex: 10,
                        bgcolor: 'rgba(0, 0, 0, 0.5)',
                        color: '#fff',
                        '&:hover': {
                            bgcolor: 'rgba(0, 0, 0, 0.7)',
                        },
                    }}
                >
                    <CloseIcon />
                </IconButton>

                {/* Left side - Image */}
                <Box
                    sx={{
                        flex: { xs: 0, md: '0 0 60%' },
                        display: { xs: 'none', md: 'flex' },
                        bgcolor: '#000',
                        position: 'relative',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <img
                        src={imageURLs.length > 0 ? imageURLs[currentImageIndex] : PLACEHOLDER_IMAGE}
                        alt={post.caption}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                        }}
                    />

                    {/* Navigation Arrows */}
                    {hasMultipleImages && !isFirstImage && (
                        <IconButton
                            onClick={handlePreviousImage}
                            sx={{
                                position: 'absolute',
                                left: 16,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                bgcolor: 'rgba(255, 255, 255, 0.9)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                '&:hover': {
                                    bgcolor: 'rgba(255, 255, 255, 1)',
                                },
                            }}
                        >
                            <ArrowBackIosNewIcon sx={{ ml: 0.5 }} />
                        </IconButton>
                    )}

                    {hasMultipleImages && !isLastImage && (
                        <IconButton
                            onClick={handleNextImage}
                            sx={{
                                position: 'absolute',
                                right: 16,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                bgcolor: 'rgba(255, 255, 255, 0.9)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                '&:hover': {
                                    bgcolor: 'rgba(255, 255, 255, 1)',
                                },
                            }}
                        >
                            <ArrowForwardIosIcon />
                        </IconButton>
                    )}

                    {/* Image Counter */}
                    {hasMultipleImages && (
                        <Box
                            sx={{
                                position: 'absolute',
                                bottom: 16,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                color: '#fff',
                                bgcolor: 'rgba(0, 0, 0, 0.5)',
                                px: 2,
                                py: 0.5,
                                borderRadius: 2,
                            }}
                        >
                            <Typography variant="body2">
                                {currentImageIndex + 1} / {imageURLs.length}
                            </Typography>
                        </Box>
                    )}
                </Box>

                {/* Right side - Comments */}
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        bgcolor: '#fff',
                        height: '100%',
                        overflow: 'hidden',
                    }}
                >
                    {/* Header with user info */}
                    <Box
                        sx={{
                            p: 2,
                            borderBottom: '1px solid #dbdbdb',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                        }}
                    >
                        {userAvatar ? (
                            <Avatar src={userAvatar} sx={{ width: 36, height: 36 }}>
                                {usernameInitial}
                            </Avatar>
                        ) : (
                            <AccountCircleIcon sx={{ width: 36, height: 36, color: '#262626' }} />
                        )}
                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#000' }}>
                                {username}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#737373' }}>
                                {formatPostTimestamp(post.timestamp)}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Caption as first comment */}
                    <Box sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                            {userAvatar ? (
                                <Avatar src={userAvatar} sx={{ width: 32, height: 32 }}>
                                    {usernameInitial}
                                </Avatar>
                            ) : (
                                <AccountCircleIcon sx={{ width: 32, height: 32, color: '#262626' }} />
                            )}
                            <Box sx={{ flex: 1 }}>
                                <Typography
                                    variant="body2"
                                    component="span"
                                    sx={{ fontWeight: 600, mr: 1, color: '#000' }}
                                >
                                    {username}
                                </Typography>
                                <Typography variant="body2" component="span" sx={{ color: '#000' }}>
                                    {post.caption}
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'block', color: '#737373', mt: 1 }}>
                                    {formatPostTimestamp(post.timestamp)}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    {/* Comments list */}
                    <Box
                        sx={{
                            flex: 1,
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            p: 2,
                            minHeight: 0,
                            '&::-webkit-scrollbar': {
                                width: '8px',
                            },
                            '&::-webkit-scrollbar-track': {
                                background: '#f1f1f1',
                            },
                            '&::-webkit-scrollbar-thumb': {
                                background: '#888',
                                borderRadius: '4px',
                            },
                            '&::-webkit-scrollbar-thumb:hover': {
                                background: '#555',
                            },
                        }}
                    >
                        {comments && comments.length > 0 ? (
                            comments.map((comment, index) => {
                                const isOwnComment = user?.userName === comment.userName;
                                const isEditing = editingCommentId === comment._id;

                                return (
                                    <Box key={comment._id} sx={{ mb: 3 }}>
                                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                                            {comment.userProfilePic ? (
                                                <Avatar src={comment.userProfilePic} sx={{ width: 32, height: 32 }}>
                                                    {comment.userName?.charAt(0) || 'U'}
                                                </Avatar>
                                            ) : (
                                                <AccountCircleIcon sx={{ width: 32, height: 32, color: '#262626' }} />
                                            )}
                                            <Box sx={{ flex: 1 }}>
                                                {isEditing ? (
                                                    // Edit mode
                                                    <Box>
                                                        <TextField
                                                            fullWidth
                                                            multiline
                                                            value={editText}
                                                            onChange={(e) => setEditText(e.target.value)}
                                                            variant="outlined"
                                                            size="small"
                                                            sx={{ mb: 1 }}
                                                        />
                                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                                            <Button
                                                                size="small"
                                                                onClick={handleSaveEdit}
                                                                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                                            >
                                                                Save
                                                            </Button>
                                                            <Button
                                                                size="small"
                                                                onClick={() => setEditingCommentId(null)}
                                                                sx={{ textTransform: 'none', fontSize: '0.75rem', color: '#737373' }}
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </Box>
                                                    </Box>
                                                ) : (
                                                    // Display mode
                                                    <>
                                                        <Box>
                                                            <Typography
                                                                variant="body2"
                                                                component="span"
                                                                sx={{ fontWeight: 600, mr: 1, color: '#000', fontSize: '0.875rem' }}
                                                            >
                                                                {comment.userName || 'User'}
                                                            </Typography>
                                                            <Typography variant="body2" component="span" sx={{ color: '#000', fontSize: '0.875rem' }}>
                                                                {comment.commentText}
                                                            </Typography>
                                                        </Box>

                                                        {/* Comment actions */}
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                                                            <Typography
                                                                variant="caption"
                                                                sx={{ color: '#737373', fontSize: '0.75rem' }}
                                                            >
                                                                {formatTimeAgo(comment.timestamp)}
                                                            </Typography>
                                                            {commentLikes[comment._id] && (
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{ color: '#737373', fontSize: '0.75rem', fontWeight: 600 }}
                                                                >
                                                                    1 like
                                                                </Typography>
                                                            )}
                                                            {isOwnComment ? (
                                                                // Show Edit and Delete for own comments
                                                                <>
                                                                    <Typography
                                                                        variant="caption"
                                                                        onClick={() => handleEditComment(comment)}
                                                                        sx={{
                                                                            color: '#737373',
                                                                            fontSize: '0.75rem',
                                                                            fontWeight: 600,
                                                                            cursor: 'pointer',
                                                                            '&:hover': { color: '#262626' }
                                                                        }}
                                                                    >
                                                                        Edit
                                                                    </Typography>
                                                                    <Typography
                                                                        variant="caption"
                                                                        onClick={() => handleDeleteCommentClick(comment._id)}
                                                                        sx={{
                                                                            color: '#ed4956',
                                                                            fontSize: '0.75rem',
                                                                            fontWeight: 600,
                                                                            cursor: 'pointer',
                                                                            '&:hover': { color: '#c13347' }
                                                                        }}
                                                                    >
                                                                        Delete
                                                                    </Typography>
                                                                </>
                                                            ) : (
                                                                // Show Reply for others' comments
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{
                                                                        color: '#737373',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 600,
                                                                        cursor: 'pointer',
                                                                        '&:hover': { color: '#262626' }
                                                                    }}
                                                                >
                                                                    Reply
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </>
                                                )}
                                            </Box>

                                            {/* Comment like button */}
                                            {!isEditing && (
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleCommentLike(comment._id)}
                                                    sx={{
                                                        padding: 0,
                                                        height: 'fit-content',
                                                        mt: 0.5,
                                                        transition: 'transform 0.2s',
                                                        '&:hover': {
                                                            transform: 'scale(1.2)',
                                                        },
                                                        '&:active': {
                                                            transform: 'scale(0.9)',
                                                        }
                                                    }}
                                                >
                                                    {commentLikes[comment._id] ? (
                                                        <FavoriteIcon sx={{ fontSize: '0.75rem', color: '#ed4956' }} />
                                                    ) : (
                                                        <FavoriteBorderIcon sx={{ fontSize: '0.75rem', color: '#262626' }} />
                                                    )}
                                                </IconButton>
                                            )}
                                        </Box>
                                    </Box>
                                );
                            })
                        ) : (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                <Typography variant="body2" sx={{ color: '#737373' }}>
                                    No comments yet
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#737373', mt: 0.5 }}>
                                    Be the first to comment
                                </Typography>
                            </Box>
                        )}

                        {/* Loading indicator while refetching */}
                        {loadingComments && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                <CircularProgress size={24} sx={{ color: '#0095f6' }} />
                            </Box>
                        )}
                    </Box>

                    {/* Post actions (like, comment, share, save) */}
                    <Box sx={{ borderTop: '1px solid #efefef' }}>
                        {/* Action buttons */}
                        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1 }}>
                            <Box sx={{ display: 'flex', gap: 1, flex: 1 }}>
                                <IconButton
                                    onClick={handleLikePost}
                                    sx={{
                                        color: liked ? '#ed4956' : '#262626',
                                        padding: '8px',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            transform: 'scale(1.05)',
                                        },
                                    }}
                                >
                                    {liked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                                </IconButton>
                                <IconButton
                                    sx={{
                                        color: '#262626',
                                        padding: '8px',
                                    }}
                                >
                                    <ChatBubbleOutlineIcon />
                                </IconButton>
                            </Box>
                            <IconButton
                                sx={{
                                    color: '#262626',
                                    padding: '8px',
                                }}
                            >
                                <BookmarkBorderIcon />
                            </IconButton>
                        </Box>

                        {/* Like count */}
                        <Box sx={{ px: 2, pb: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#000' }}>
                                {likeCount.toLocaleString()} likes
                            </Typography>
                        </Box>

                        {/* Post timestamp */}
                        <Box sx={{ px: 2, pb: 2 }}>
                            <Typography variant="caption" sx={{ color: '#737373', fontSize: '0.625rem', textTransform: 'uppercase' }}>
                                {formatPostTimestamp(post.timestamp)}
                            </Typography>
                        </Box>
                    </Box>

                    <Divider />

                    {/* Comment input */}
                    <Box
                        sx={{
                            p: 2,
                            display: 'flex',
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
                            InputProps={{
                                disableUnderline: true,
                                sx: {
                                    fontSize: '0.9375rem',
                                    color: '#000',
                                },
                            }}
                            sx={{
                                '& .MuiInputBase-input': {
                                    padding: 0,
                                },
                                '& .MuiInputBase-input::placeholder': {
                                    color: '#8e8e8e',
                                    opacity: 1,
                                },
                            }}
                        />
                        <Button
                            onClick={handleCommentSubmit}
                            disabled={!commentText.trim()}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.9375rem',
                                color: commentText.trim() ? '#0095f6' : '#b3d8f5',
                                padding: 0,
                                minWidth: 'auto',
                                '&:hover': {
                                    bgcolor: 'transparent',
                                    color: commentText.trim() ? '#00376b' : '#b3d8f5',
                                },
                                '&.Mui-disabled': {
                                    color: '#b3d8f5',
                                },
                            }}
                        >
                            Post
                        </Button>
                    </Box>
                </Box>
            </Box>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={handleCancelDelete}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 600, color: '#000' }}>
                    Delete Comment?
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: '#737373' }}>
                        Are you sure you want to delete this comment? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button
                        onClick={handleCancelDelete}
                        sx={{
                            textTransform: 'none',
                            color: '#262626',
                            fontWeight: 600,
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmDelete}
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
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
}

