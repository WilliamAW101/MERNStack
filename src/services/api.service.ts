/**
 * API service for making HTTP requests
 */

import { Post, FetchPostsResponse, HomePageApiResponse } from '@/types/post.types';
import { User, UserProfile } from '@/types/user.types';
import {
    GetUploadUrlRequest,
    GetUploadUrlResponse,
    GetDownloadUrlRequest,
    GetDownloadUrlResponse,
    CreatePostRequest
} from '@/types/upload.types';
import { Comment } from '@/types/comment.types';

const BASE_URL = 'http://localhost:5000';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Merge with any headers from options
    if (options.headers) {
        Object.assign(headers, options.headers);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Fetch posts for the home page feed
 */
export async function fetchHomePosts(lastTimestamp?: string): Promise<FetchPostsResponse> {
    const timestamp = lastTimestamp || new Date().toISOString();
    const response = await fetchAPI<HomePageApiResponse>(
        `/api/homePage?lastTimestamp=${encodeURIComponent(timestamp)}`
    );

    // Store the refreshed token if provided
    if (response.data.refreshedToken && typeof window !== 'undefined') {
        localStorage.setItem('token', response.data.refreshedToken);
    }

    return {
        posts: response.data.posts,
        nextCursor: response.data.nextCursor,
        refreshedToken: response.data.refreshedToken,
    };
}

/**
 * Fetch a single post by ID
 */
export async function fetchPostById(postId: string): Promise<Post> {
    const response = await fetchAPI<any>(`/api/getPost?postId=${postId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    }
    );

    // Backend returns { data: { post: {...}, comments: [...], likes: [...] } }
    // Transform to match Post interface
    const { post, comments, likes } = response.data;

    // Generate presigned URLs for all images
    let imageURLs: string[] = [];
    if (post.images && post.images.length > 0) {
        try {
            // Fetch presigned URLs for all images in parallel
            const urlPromises = post.images.map((img: any) =>
                getDownloadUrl({ key: img.key })
            );
            const urlResponses = await Promise.all(urlPromises);
            imageURLs = urlResponses.map(res => res.url);
        } catch (error) {
            console.error('Error fetching image URLs:', error);
            // Fallback to empty array if fetching fails
            imageURLs = [];
        }
    }

    // Check if current user liked the post
    const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    const isLiked = likes?.some((like: any) => like.user_id === currentUserId) || false;

    // Get username from comments if available, otherwise try to extract from first comment
    let username = 'Unknown';
    if (comments && comments.length > 0) {
        // Try to find a comment from the post owner
        const ownerComment = comments.find((c: any) => c.userId === post.userId);
        username = ownerComment?.userName || comments[0]?.userName || 'Unknown';
    }

    return {
        _id: post._id,
        userId: post.userId,
        caption: post.caption,
        difficulty: post.difficulty,
        rating: post.rating,
        images: post.images,
        imageURLs: imageURLs,
        location: post.location,
        timestamp: post.timestamp,
        likeCount: post.likeCount,
        likes: likes?.map((like: any) => like.user_id) || [],
        commentCount: post.commentCount,
        comments: comments || [],
        isLiked: isLiked,
        username: username,
        userProfilePic: post.userProfilePic || response.data.profileImageURL,
    };
}

/**
 * Get presigned upload URL for S3
 */
export async function getUploadUrl(request: GetUploadUrlRequest): Promise<GetUploadUrlResponse> {

    return fetchAPI<GetUploadUrlResponse>('/api/uploads/url', {
        method: 'POST',
        body: JSON.stringify(request),
    });
}

/**
 * Upload file to S3 using presigned URL
 */
export async function uploadFileToS3(uploadUrl: string, file: File): Promise<void> {
    const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
            'Content-Type': file.type,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to upload file to S3');
    }
}

/**
 * Get presigned download URL for S3
 */
export async function getDownloadUrl(request: GetDownloadUrlRequest): Promise<GetDownloadUrlResponse> {
    return fetchAPI<GetDownloadUrlResponse>('/api/downloads/url', {
        method: 'POST',
        body: JSON.stringify(request),
    });
}

/**
 * Create a new post
 */
export async function createPost(postData: CreatePostRequest): Promise<Post> {
    return fetchAPI<Post>('/api/addPost', {
        method: 'POST',
        body: JSON.stringify(postData),
    });
}

/**
 * Like a post
 */
export async function likePost(postId: string): Promise<{ isLiked: boolean; likeCount: number }> {
    return fetchAPI(`/api/likePost`, {
        method: 'POST',
        body: JSON.stringify({ postId }),
    });
}

/**
 * Unlike a post
 */


/**
 * Add a comment to a post
 */
export async function addComment(
    postId: string,
    commentText: string
): Promise<Comment> {
    const response = await fetchAPI<any>('/api/addComment', {
        method: 'POST',
        body: JSON.stringify({ postId, commentText }),
    });

    return response;
}

/**
 * Fetch comments for a post
 */
export async function fetchComments(postId: string, lastTimestamp?: string): Promise<{
    comments: any[];
    nextCursor: string | null;
    refreshedToken?: string;
}> {
    const params = new URLSearchParams({ postID: postId });
    if (lastTimestamp) {
        params.append('lastTimestamp', lastTimestamp);
    }

    const response = await fetchAPI<any>(`/api/getComments?${params.toString()}`);

    // Store refreshed token
    if (response.data?.refreshedToken && typeof window !== 'undefined') {
        localStorage.setItem('token', response.data.refreshedToken);
    }

    return {
        comments: response.data.comments || [],
        nextCursor: response.data.nextCursor || null,
        refreshedToken: response.data.refreshedToken,
    };
}

/**
 * Update/edit a comment
 */
export async function updateComment(commentId: string, text: string): Promise<{
    success: boolean;
    refreshedToken?: string;
}> {
    const response = await fetchAPI<any>('/api/changeComment', {
        method: 'POST',
        body: JSON.stringify({ commentID: commentId, text }),
    });

    // Store refreshed token
    if (response.data?.refreshedToken && typeof window !== 'undefined') {
        localStorage.setItem('token', response.data.refreshedToken);
    }

    return {
        success: response.success,
        refreshedToken: response.data?.refreshedToken,
    };
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string): Promise<{
    success: boolean;
    refreshedToken?: string;
}> {
    const response = await fetchAPI<any>('/api/deleteComment', {
        method: 'DELETE',
        body: JSON.stringify({ commentID: commentId }),
    });

    // Store refreshed token
    if (response.data?.refreshedToken && typeof window !== 'undefined') {
        localStorage.setItem('token', response.data.refreshedToken);
    }

    return {
        success: response.success,
        refreshedToken: response.data?.refreshedToken,
    };
}

/**
 * Update a post
 */
export async function updatePost(postId: string, postData: {
    caption?: string;
    difficulty?: number;
    rating?: number;
    location?: string;
    images?: Array<{ key: string; type: 'image' | 'video' }>;
}): Promise<{
    success: boolean;
    post?: any;
    message: string;
}> {
    const response = await fetchAPI<any>('/api/updatePost', {
        method: 'PUT',
        body: JSON.stringify({ postId, ...postData }),
    });

    return {
        success: response.success,
        post: response.data?.post,
        message: response.message,
    };
}

/**
 * Delete a post
 */
export async function deletePost(postId: string): Promise<{
    success: boolean;
    deletedCount?: number;
    message: string;
}> {
    const response = await fetchAPI<any>('/api/deletePost', {
        method: 'DELETE',
        body: JSON.stringify({ postId }),
    });

    return {
        success: response.success,
        deletedCount: response.data?.deletedCount,
        message: response.message,
    };
}

/**
 * Fetch user profile
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile> {
    return fetchAPI<UserProfile>(`/api/users/${userId}`);
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId: string, data: Partial<User>): Promise<User> {
    return fetchAPI<User>(`/api/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

/**
 * Get current user's profile info
 */
export async function getProfileInfo(userName: string): Promise<{
    success: boolean;
    data: {
        userInfo: {
            _id: string;
            userName: string;
            email: string;
            phone: string;
            firstName: string;
            lastName: string;
            profileDescription: string;
            profilePicture: string | null;
            userProfilePic: string | null;
            createdAt: string;
            updatedAt: string;
            verified: boolean;
        };
        refreshedToken: string;
    };
    message: string;
}> {
    const response = await fetchAPI<any>(`/api/getProfileInfo/?userName=${userName}`);

    // Store refreshed token
    if (response.data?.refreshedToken && typeof window !== 'undefined') {
        localStorage.setItem('token', response.data.refreshedToken);
    }

    return response;
}

/**
 * Change/update profile info
 */
export async function changeProfileInfo(data: {
    phone?: string;
    firstName?: string;
    lastName?: string;
    profileDescription?: string;
}): Promise<{
    success: boolean;
    data: {
        updatedUser: any;
        refreshedToken: string;
    };
    message: string;
}> {
    const response = await fetchAPI<any>('/api/changeProfileInfo', {
        method: 'POST',
        body: JSON.stringify(data),
    });

    // Store refreshed token
    if (response.data?.refreshedToken && typeof window !== 'undefined') {
        localStorage.setItem('token', response.data.refreshedToken);
    }

    return response;
}

/**
 * Fetch user's posts for profile page
 */
export async function fetchProfilePosts(userName: string, lastTimestamp?: string): Promise<{
    posts: any[];
    nextCursor: string;
    refreshedToken?: string;
}> {
    const timestamp = lastTimestamp || new Date().toISOString();
    const response = await fetchAPI<any>(
        `/api/personalPosts?userName=${encodeURIComponent(userName)}&lastTimestamp=${encodeURIComponent(timestamp)}`
    );

    // Store refreshed token
    if (response.data?.refreshedToken && typeof window !== 'undefined') {
        localStorage.setItem('token', response.data.refreshedToken);
    }

    return {
        posts: response.data.posts,
        nextCursor: response.data.nextCursor,
        refreshedToken: response.data.refreshedToken,
    };
}

/**
 * Upload profile picture key to update user's profile picture
 */
export async function uploadProfilePictureKey(key: string): Promise<{
    success: boolean;
    data?: {
        refreshedToken: string;
    };
    message: string;
}> {
    const response = await fetchAPI<any>('/api/uploadProfilePictureKey', {
        method: 'POST',
        body: JSON.stringify({ key }),
    });

    // Store refreshed token
    if (response.data?.refreshedToken && typeof window !== 'undefined') {
        localStorage.setItem('token', response.data.refreshedToken);
    }

    return response;
}

