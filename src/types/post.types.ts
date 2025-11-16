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

export interface PostLike {
    _id: string;
    user_id: string;
    post_id: string;
    likedAt: string;
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
    likes?: PostLike[]; // Array of like objects from the backend
    commentCount?: number;
    comments?: PostComment[];
    isLiked?: boolean;
    username: string;
    userProfilePic: string;
    profileImageURL?: string; // Profile image URL from backend
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

