"use client";

import React from 'react';
import { Box, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { MountainIcon } from '@/asset/icons/CustomIcons';

interface SignatureLogoProps {
    size?: 'small' | 'medium' | 'large';
    color?: string;
    onClick?: () => void;
}

export default function SignatureLogo({ size = 'medium', color = '#000', onClick }: SignatureLogoProps) {
    const router = useRouter();

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else {
            router.push('/');
        }
    };

    // Size configurations
    const sizeConfig = {
        small: {
            iconSize: { md: 40, lg: 44 },
            fontSize: { md: '1.8rem', lg: '2rem' },
        },
        medium: {
            iconSize: { md: 45, lg: 50 },
            fontSize: { md: '2.2rem', lg: '2.5rem' },
        },
        large: {
            iconSize: { md: 60, lg: 70 },
            fontSize: { md: '3rem', lg: '3.5rem' },
        },
    };

    const config = sizeConfig[size];

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
            }}
            onClick={handleClick}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    width: config.iconSize,
                    height: config.iconSize,
                    flexShrink: 0,
                }}
            >
                <MountainIcon />
            </Box>
            <Typography
                variant="h5"
                sx={{
                    fontFamily: '"Brush Script MT", "Segoe Script", "Comic Sans MS", cursive',
                    fontWeight: 400,
                    fontSize: config.fontSize,
                    fontStyle: 'italic',
                    color: color,
                    position: 'relative',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    animation: 'signatureReveal 1.2s ease-out',
                    '@keyframes signatureReveal': {
                        '0%': {
                            clipPath: 'inset(0 100% 0 0)',
                            opacity: 0,
                        },
                        '100%': {
                            clipPath: 'inset(0 0 0 0)',
                            opacity: 1,
                        },
                    },
                }}
            >
                CragTag
            </Typography>
        </Box>
    );
}

