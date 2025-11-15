/**
 * Component for displaying S3 images with automatic URL fetching
 */

import React from 'react';
import { Box, CircularProgress, BoxProps } from '@mui/material';
import { useS3Image } from '@/hooks/useS3Image';
import { PLACEHOLDER_IMAGE } from '@/constants/images';

interface S3ImageProps extends Omit<BoxProps, 'component'> {
    s3Key: string | null | undefined;
    alt?: string;
    fallbackUrl?: string;
}

export default function S3Image({ s3Key, alt = '', fallbackUrl = PLACEHOLDER_IMAGE, sx, ...boxProps }: S3ImageProps) {
    const { url, loading, error } = useS3Image(s3Key);

    if (loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#f0f0f0',
                    ...sx,
                }}
                {...boxProps}
            >
                <CircularProgress size={40} />
            </Box>
        );
    }

    if (error || !url) {
        return (
            <Box
                component="img"
                src={fallbackUrl}
                alt={alt}
                sx={sx}
                {...boxProps}
            />
        );
    }

    return (
        <Box
            component="img"
            src={url}
            alt={alt}
            sx={sx}
            {...boxProps}
        />
    );
}

/**
 * Component for displaying images with fallback to placeholder
 */
interface ImageWithFallbackProps extends Omit<BoxProps, 'component'> {
    src: string | null | undefined;
    alt?: string;
    fallbackUrl?: string;
}

export function ImageWithFallback({ src, alt = '', fallbackUrl = PLACEHOLDER_IMAGE, sx, ...boxProps }: ImageWithFallbackProps) {
    const [imgSrc, setImgSrc] = React.useState(src || fallbackUrl);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        setImgSrc(src || fallbackUrl);
        setLoading(true);
    }, [src, fallbackUrl]);

    if (loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#f0f0f0',
                    ...sx,
                }}
                {...boxProps}
            >
                <CircularProgress size={40} />
            </Box>
        );
    }

    return (
        <Box
            component="img"
            src={imgSrc}
            alt={alt}
            onLoad={() => setLoading(false)}
            onError={() => {
                setImgSrc(fallbackUrl);
                setLoading(false);
            }}
            sx={sx}
            {...boxProps}
        />
    );
}

