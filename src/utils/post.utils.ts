/**
 * Utility functions for working with posts
 */

import { Post, PostImage } from '@/types/post.types';
import { PLACEHOLDER_IMAGE } from '@/constants/images';

/**
 * Get the primary image URL from a post
 * @param images - Array of post images (can be null)
 * @param baseUrl - Optional base URL for S3 images
 * @returns The image URL or placeholder
 */
export function getPostImageUrl(images: PostImage[] | null, baseUrl?: string): string {
    if (!images || images.length === 0) {
        return PLACEHOLDER_IMAGE;
    }

    const primaryImage = images[0];

    // Only show images, not videos (videos need different handling)
    if (primaryImage.type !== 'image') {
        return PLACEHOLDER_IMAGE;
    }

    if (primaryImage.provider === 's3' && baseUrl) {
        // Construct full S3 URL if base URL is provided
        return `${baseUrl}/${primaryImage.key}`;
    }

    // Return the key as-is or placeholder
    return primaryImage.key || PLACEHOLDER_IMAGE;
}

/**
 * Format a timestamp to a human-readable relative time
 * @param timestamp - ISO timestamp string
 * @returns Formatted time string (e.g., "2m", "3h", "5d")
 */
export function formatPostTimestamp(timestamp: string): string {
    const now = new Date();
    const postDate = new Date(timestamp);
    const diffInMs = now.getTime() - postDate.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInWeeks = Math.floor(diffInDays / 7);

    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInDays < 7) return `${diffInDays}d`;
    if (diffInWeeks < 4) return `${diffInWeeks}w`;

    return postDate.toLocaleDateString();
}

/**
 * Extract hashtags from a caption text
 * @param caption - Post caption text
 * @returns Array of hashtags
 */
export function extractHashtags(caption: string): string[] {
    const hashtagRegex = /#[\w]+/g;
    const matches = caption.match(hashtagRegex);
    return matches ? matches : [];
}

/**
 * Get difficulty display text
 * @param difficulty - Difficulty level (1-5)
 * @returns Difficulty description
 */
export function getDifficultyText(difficulty: number): string {
    const levels = ['Easy', 'Moderate', 'Challenging', 'Hard', 'Expert'];
    return levels[difficulty - 1] || 'Unknown';
}

/**
 * Get difficulty emoji indicator
 * @param difficulty - Difficulty level (1-5)
 * @returns Emoji string
 */
export function getDifficultyEmoji(difficulty: number): string {
    return '⛰️'.repeat(Math.min(Math.max(difficulty, 1), 5));
}

