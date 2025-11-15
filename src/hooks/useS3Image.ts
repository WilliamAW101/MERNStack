/**
 * Custom hook for loading S3 images with presigned URLs
 */

import { useState, useEffect } from 'react';
import { getDownloadUrl } from '@/services/api.service';

/**
 * Hook to fetch and cache S3 image URLs
 * @param s3Key - The S3 key for the image
 * @returns Object with url, loading state, and error
 */
export function useS3Image(s3Key: string | null | undefined) {
    const [url, setUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!s3Key) {
            setUrl(null);
            setLoading(false);
            return;
        }

        let isMounted = true;

        const fetchUrl = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await getDownloadUrl({ key: s3Key });

                if (isMounted) {
                    setUrl(response.url);
                }
            } catch (err) {
                if (isMounted) {
                    setError('Failed to load image');
                    console.error('Error fetching S3 URL:', err);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchUrl();

        return () => {
            isMounted = false;
        };
    }, [s3Key]);

    return { url, loading, error };
}

/**
 * Cache for S3 URLs to avoid repeated API calls
 * URLs expire after 50 seconds (10 seconds before the 60 second expiration)
 */
const urlCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_DURATION = 50 * 1000; // 50 seconds

/**
 * Get S3 URL with caching
 * @param s3Key - The S3 key for the image
 * @returns Promise with the presigned URL
 */
export async function getCachedS3Url(s3Key: string): Promise<string> {
    const now = Date.now();
    const cached = urlCache.get(s3Key);

    // Return cached URL if still valid
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        return cached.url;
    }

    // Fetch new URL
    const response = await getDownloadUrl({ key: s3Key });

    // Cache the new URL
    urlCache.set(s3Key, {
        url: response.url,
        timestamp: now,
    });

    return response.url;
}

/**
 * Clear the URL cache (useful for testing or when needed)
 */
export function clearS3UrlCache() {
    urlCache.clear();
}

