/**
 * Utility functions for working with posts
 */

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
 * Get difficulty emoji indicator
 * @param difficulty - Difficulty level (1-5)
 * @returns Emoji string
 */
export function getDifficultyEmoji(difficulty: number): string {
    return '⛰️'.repeat(Math.min(Math.max(difficulty, 1), 5));
}

