import 'dart:async';
import 'package:crag_tag/services/api.dart';

/// Service to handle S3 image URLs with caching
/// Since presigned URLs expire in 60 seconds, we cache them and refresh when needed
class S3ImageService {
  // Cache of S3 keys to their presigned URLs and expiration time
  static final Map<String, _CachedUrl> _urlCache = {};
  
  // Get download URL for an S3 key (with caching)
  static Future<String?> getImageUrl(String key) async {
    if (key.isEmpty) return null;
    
    // Check if we have a valid cached URL (expires in 50 seconds to be safe)
    if (_urlCache.containsKey(key)) {
      final cached = _urlCache[key]!;
      final now = DateTime.now();
      
      // If URL is still valid (less than 50 seconds old), return it
      if (now.difference(cached.fetchedAt).inSeconds < 50) {
        return cached.url;
      }
    }
    
    // Fetch new presigned URL from backend
    try {
      final resp = await Api.getDownloadUrl(key: key);
      
      // Backend returns { url } directly in the response
      if (resp['status'] == 200 && resp['data']['url'] != null) {
        final url = resp['data']['url'] as String;
        
        // Cache the URL
        _urlCache[key] = _CachedUrl(
          url: url,
          fetchedAt: DateTime.now(),
        );
        
        return url;
      }
    } catch (e) {
      // Error fetching URL
    }
    
    return null;
  }
  
  // Clear cache for a specific key
  static void clearCache(String key) {
    _urlCache.remove(key);
  }
  
  // Clear all cached URLs
  static void clearAllCache() {
    _urlCache.clear();
  }
  
  // Pre-fetch URLs for multiple keys (useful for feed)
  static Future<void> prefetchUrls(List<String> keys) async {
    final futures = keys.map((key) => getImageUrl(key)).toList();
    await Future.wait(futures);
  }
}

class _CachedUrl {
  final String url;
  final DateTime fetchedAt;
  
  _CachedUrl({
    required this.url,
    required this.fetchedAt,
  });
}
