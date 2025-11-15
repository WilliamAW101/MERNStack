/**
 * Instagram-style image carousel component for posts
 * Handles S3 image loading with proper mount/unmount lifecycle
 */

import React, { useState } from 'react';
import { Box, IconButton, CircularProgress } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { PostImage } from '@/types/post.types';
import { useS3Image } from '@/hooks/useS3Image';
import { PLACEHOLDER_IMAGE } from '@/constants/images';

interface PostImageCarouselProps {
    images: PostImage[] | null;
    caption: string;
}

/**
 * Single image component with S3 URL fetching
 */
function S3PostImage({ s3Key, alt }: { s3Key: string; alt: string }) {
    // 🔄 Hook manages entire lifecycle
    const { url, loading, error } = useS3Image(s3Key);

    if (loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 400,
                    bgcolor: '#f0f0f0',
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    if (error || !url) {
        return (
            <Box
                component="img"
                src={PLACEHOLDER_IMAGE}
                alt={alt}
                sx={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: 600,
                    objectFit: 'cover',
                }}
            />
        );
    }

    return (
        <Box
            component="img"
            src={url}
            alt={alt}
            sx={{
                width: '100%',
                height: 'auto',
                maxHeight: 600,
                objectFit: 'cover',
                display: 'block',
            }}
        />
    );
}

/**
 * Main carousel component
 */
export default function PostImageCarousel({ images, caption }: PostImageCarouselProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Filter to only show images (not videos)
    const imageArray = images?.filter((img) => img.type === 'image') || [];
    const hasMultipleImages = imageArray.length > 1;
    const isFirstImage = currentImageIndex === 0;
    const isLastImage = currentImageIndex === imageArray.length - 1;

    // No images - show placeholder
    if (imageArray.length === 0) {
        return (
            <Box
                component="img"
                src={PLACEHOLDER_IMAGE}
                alt={caption}
                sx={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: 600,
                    objectFit: 'cover',
                }}
            />
        );
    }

    const currentImage = imageArray[currentImageIndex];

    const handleNextImage = () => {
        if (currentImageIndex < imageArray.length - 1) {
            setCurrentImageIndex((prev) => prev + 1);
        }
    };

    const handlePreviousImage = () => {
        if (currentImageIndex > 0) {
            setCurrentImageIndex((prev) => prev - 1);
        }
    };

    return (
        <Box sx={{ position: 'relative' }}>
            {/* Current Image - useS3Image handles mount/unmount */}
            <S3PostImage s3Key={currentImage.key} alt={caption} />

            {/* Previous Button (only if not first image) */}
            {hasMultipleImages && !isFirstImage && (
                <IconButton
                    onClick={handlePreviousImage}
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

            {/* Next Button (only if not last image) */}
            {hasMultipleImages && !isLastImage && (
                <IconButton
                    onClick={handleNextImage}
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
                    sx={{
                        position: 'absolute',
                        bottom: 12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: 0.5,
                        bgcolor: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: 2,
                        px: 1,
                        py: 0.5,
                    }}
                >
                    {imageArray.map((_, index) => (
                        <Box
                            key={index}
                            sx={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                bgcolor:
                                    index === currentImageIndex
                                        ? '#fff'
                                        : 'rgba(255, 255, 255, 0.5)',
                                transition: 'all 0.3s',
                                cursor: 'pointer',
                            }}
                            onClick={() => setCurrentImageIndex(index)}
                        />
                    ))}
                </Box>
            )}

            {/* Image Counter Text (optional) */}
            {hasMultipleImages && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        bgcolor: 'rgba(0, 0, 0, 0.6)',
                        color: '#fff',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 2,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                    }}
                >
                    {currentImageIndex + 1} / {imageArray.length}
                </Box>
            )}
        </Box>
    );
}




