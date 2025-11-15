/**
 * Post-related type definitions for the application
 */

export interface PostImage {
    provider: string;
    key: string;
    type: string;
}

export interface PostComment {
    _id: string;
    userId: string;
    userName: string;
    commentText: string;
    timestamp: string;
    userProfilePic?: string | null;
}

export interface Post {
    _id: string;
    userId: string;
    caption: string;
    difficulty: number;
    rating: number;
    images: PostImage[] | null;
    imageURLs: string[] | null; // Direct image URLs from backend
    location: string | null;
    timestamp: string;
    likeCount?: number;
    likes?: string[]; // Array of user IDs who liked the post
    commentCount?: number;
    comments?: PostComment[];
    isLiked?: boolean;
    username: string;
    userProfilePic: string;
}

/**
 * Extended Post type with user information populated
 * (for when the API returns user details with the post)
 */


/**
 * Props type for the Post component
 */
export interface PostProps {
    post: Post;
}

/**
 * API Response type for fetching posts from homepage
 */
export interface HomePageApiResponse {
    success: boolean;
    data: {
        posts: Post[];
        nextCursor: string;
        refreshedToken: string;
    };
    message: string;
}

/**
 * Simplified response type for internal use
 */
export interface FetchPostsResponse {
    posts: Post[];
    nextCursor: string;
    refreshedToken?: string;
}

