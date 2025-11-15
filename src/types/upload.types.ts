/**
 * Upload and S3-related type definitions
 */

export type ContentType =
    | 'image/jpeg'
    | 'image/png'
    | 'image/webp'
    | 'video/mp4'
    | 'video/mov'
    | 'image/heic';

export type FileExtension = 'jpg' | 'jpeg' | 'png' | 'webp' | 'mp4' | 'mov' | 'heic';

export interface GetUploadUrlRequest {
    contentType: ContentType;
    ext: FileExtension;
}

export interface GetUploadUrlResponse {
    uploadUrl: string;
    key: string;
    success?: boolean; // Optional for compatibility
}

export interface GetDownloadUrlRequest {
    key: string;
}

export interface GetDownloadUrlResponse {
    url: string;
}

export interface CreatePostRequest {
    caption: string;
    difficulty: number;
    rating: number;
    images: Array<{
        key: string;
        type: 'image' | 'video';
    }>;
    location?: string;
}

