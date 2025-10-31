"use client";
import Header from "@/components/Header";
import { Button, Box, Typography, Container, Stack } from '@mui/material';

import backgroundImage from '../asset/yang-song-gsh-RsCnLKQ-unsplash.jpg';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/user/UserContext';
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const { user, getToken } = useUser();


  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'auto',
        backgroundImage: `url(${backgroundImage.src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      <Header />
      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          py: 4,
        }}
      >
        <Container maxWidth="xl">
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Box
              sx={{
                flex: 1,
                color: 'white',
                pr: { md: 4 },
              }}
            >
              <Typography
                variant="h2"
                component="h1"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '2.5rem', sm: '3rem', md: '3.5rem' },
                  mb: 3,
                  textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
                }}
              >
                Your adventure start here
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                  lineHeight: 1.6,
                  textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)',
                }}
              >
                Post your favorite climbs, explore top-rated rails and connect with a global community of adventurers sharing their best hiking and climbing locations
              </Typography>
            </Box>

          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, width: '100%' }}>
            <Button
              variant="contained"
              sx={{
                backgroundColor: 'white',
                px: 4,
                py: 1.5,
                fontSize: { xs: '0.95rem', md: '1.05rem' },
                fontWeight: 700,
                borderRadius: 8,
                minWidth: { xs: 220, md: 260 },
                minHeight: { xs: 48, md: 56 },
                boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                color: "black",
                '&:hover': {
                  backgroundColor: '#f0f0f0',
                  color: 'black',
                },
                '&:active': {
                  backgroundColor: '#e0e0e0',
                  color: 'black',
                },
              }}
              onClick={() => router.push('/login')}
            >
              Start exploring
            </Button>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
