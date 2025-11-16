"use client"

import * as React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import Stack from '@mui/material/Stack';
import MuiCard from '@mui/material/Card';
import { styled } from '@mui/material/styles';
import AppTheme from '../../theme/AppTheme';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/context/toast';
import ResetPassword from '@/components/auth/ResetPassword';

const Card = styled(MuiCard)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'center',
    width: '100%',
    padding: theme.spacing(2),
    gap: theme.spacing(2),
    margin: 'auto',
    [theme.breakpoints.up('sm')]: {
        padding: theme.spacing(3),
        maxWidth: '450px',
    },
    [theme.breakpoints.up('md')]: {
        padding: theme.spacing(4),
    },
    boxShadow:
        'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px',
    ...theme.applyStyles('dark', {
        boxShadow:
            'hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px',
    }),
}));

const ResetPasswordContainer = styled(Stack)(({ theme }) => ({
    height: 'calc((1 - var(--template-frame-height, 0)) * 100dvh)',
    minHeight: '100vh',
    padding: theme.spacing(1),
    background: '#E9EDE8',
    [theme.breakpoints.up('sm')]: {
        padding: theme.spacing(2),
    },
    [theme.breakpoints.up('md')]: {
        padding: theme.spacing(4),
    },
    ...theme.applyStyles('dark', {
        background: '#E9EDE8',
    }),
}));

export default function ResetPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const toast = useToast();

    React.useEffect(() => {
        // If no email is provided, redirect to forgot password page
        if (!id) {
            toast.error("Session expired. Please start over.");
            router.push('/forgot-password');
        }
    }, [id, router, toast]);

    if (!id) {
        return null; // Will redirect in useEffect
    }

    return (
        <AppTheme>
            <CssBaseline enableColorScheme />
            <ResetPasswordContainer direction="column" justifyContent="space-between">
                <Card variant="outlined">
                    <ResetPassword id={id} />
                </Card>
            </ResetPasswordContainer>
        </AppTheme>
    );
}

