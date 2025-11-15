/**
 * User-related type definitions for the application
 */

export interface User {
    _id: string;
    username: string;
    email: string;
    avatar?: string;
    fullName?: string;
    bio?: string;
    followers?: string[]; // Array of user IDs
    following?: string[]; // Array of user IDs
    postsCount?: number;
    createdAt?: string;
}

export interface UserProfile extends User {
    followersCount: number;
    followingCount: number;
    postsCount: number;
}

/**
 * Props for user-related components
 */
export interface UserAvatarProps {
    user: Pick<User, '_id' | 'username' | 'avatar'>;
    size?: 'small' | 'medium' | 'large';
}


