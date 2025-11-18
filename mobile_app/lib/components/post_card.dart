import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:crag_tag/models/post_model.dart';
import 'package:crag_tag/components/s3_image.dart';
import 'package:crag_tag/services/api.dart';
import 'package:crag_tag/components/comments_bottom_sheet.dart';
import 'package:crag_tag/home_components/edit_post.dart';
import 'package:timeago/timeago.dart' as timeago;

// Constants
class _PostCardConstants {
  static const double cardHorizontalMargin = 12.0;
  static const double cardVerticalMargin = 6.0;
  static const double cardBorderRadius = 12.0;
  static const double avatarRadius = 20.0;
  static const double imageHeight = 300.0;
  static const double iconSize = 20.0;
  static const double starIconSize = 18.0;
  static const Color primaryColor = Color(0xFF178E79);
}

class PostCard extends StatefulWidget {
  final PostModel post;
  final VoidCallback? onLikeChanged;
  final VoidCallback? onCommentTap;
  final VoidCallback? onPostDeleted;
  final Function(PostModel)? onPostUpdated;

  const PostCard({
    super.key,
    required this.post,
    this.onLikeChanged,
    this.onCommentTap,
    this.onPostDeleted,
    this.onPostUpdated,
  });

  @override
  State<PostCard> createState() => _PostCardState();
}

class _PostCardState extends State<PostCard> {
  late bool _isLiked;
  late int _likeCount;
  int _commentCount = 0;
  bool _isLiking = false;
  String _currentUserName = '';

  @override
  void initState() {
    super.initState();
    _isLiked = widget.post.isLiked;
    _likeCount = widget.post.likeCount;
    _commentCount = widget.post.commentCount;
    _loadCurrentUser();
  }

  Future<void> _loadCurrentUser() async {
    final sp = await SharedPreferences.getInstance();
    setState(() {
      _currentUserName = sp.getString('userName') ?? '';
    });
  }

  Widget _buildUserAvatar() {
    // Handle profile picture: can be a presigned URL string, S3 key string, or object { provider, key, type }
    final userAvatarData = widget.post.userAvatar;
    
    // Check if it's a presigned URL (starts with http/https)
    if (userAvatarData is String && userAvatarData.isNotEmpty) {
      if (userAvatarData.startsWith('http://') || userAvatarData.startsWith('https://')) {
        // It's a presigned URL, display it directly
        return ClipOval(
          child: Image.network(
            userAvatarData,
            width: _PostCardConstants.avatarRadius * 2,
            height: _PostCardConstants.avatarRadius * 2,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) {
              return CircleAvatar(
                radius: _PostCardConstants.avatarRadius,
                backgroundColor: _PostCardConstants.primaryColor,
                child: Text(
                  widget.post.userName.isNotEmpty
                      ? widget.post.userName[0].toUpperCase()
                      : '?',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              );
            },
            loadingBuilder: (context, child, loadingProgress) {
              if (loadingProgress == null) return child;
              return CircleAvatar(
                radius: _PostCardConstants.avatarRadius,
                backgroundColor: _PostCardConstants.primaryColor,
                child: Text(
                  widget.post.userName.isNotEmpty
                      ? widget.post.userName[0].toUpperCase()
                      : '?',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              );
            },
          ),
        );
      } else {
        // It's an S3 key
        return ClipOval(
          child: S3Image(
            s3Key: userAvatarData,
            width: _PostCardConstants.avatarRadius * 2,
            height: _PostCardConstants.avatarRadius * 2,
            fit: BoxFit.cover,
            placeholder: CircleAvatar(
              radius: _PostCardConstants.avatarRadius,
              backgroundColor: _PostCardConstants.primaryColor,
              child: Text(
                widget.post.userName.isNotEmpty
                    ? widget.post.userName[0].toUpperCase()
                    : '?',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            errorWidget: CircleAvatar(
              radius: _PostCardConstants.avatarRadius,
              backgroundColor: _PostCardConstants.primaryColor,
              child: Text(
                widget.post.userName.isNotEmpty
                    ? widget.post.userName[0].toUpperCase()
                    : '?',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        );
      }
    } else if (userAvatarData is Map) {
      // It's an object with key
      final keyValue = userAvatarData['key'];
      if (keyValue is String && keyValue.isNotEmpty) {
        return ClipOval(
          child: S3Image(
            s3Key: keyValue,
            width: _PostCardConstants.avatarRadius * 2,
            height: _PostCardConstants.avatarRadius * 2,
            fit: BoxFit.cover,
            placeholder: CircleAvatar(
              radius: _PostCardConstants.avatarRadius,
              backgroundColor: _PostCardConstants.primaryColor,
              child: Text(
                widget.post.userName.isNotEmpty
                    ? widget.post.userName[0].toUpperCase()
                    : '?',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            errorWidget: CircleAvatar(
              radius: _PostCardConstants.avatarRadius,
              backgroundColor: _PostCardConstants.primaryColor,
              child: Text(
                widget.post.userName.isNotEmpty
                    ? widget.post.userName[0].toUpperCase()
                    : '?',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        );
      }
    }
    
    // Fallback to initial letter avatar
    return CircleAvatar(
      radius: _PostCardConstants.avatarRadius,
      backgroundColor: _PostCardConstants.primaryColor,
      child: Text(
        widget.post.userName.isNotEmpty
            ? widget.post.userName[0].toUpperCase()
            : '?',
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  @override
  void didUpdateWidget(PostCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.post.id != widget.post.id) {
      _isLiked = widget.post.isLiked;
      _likeCount = widget.post.likeCount;
      _commentCount = widget.post.commentCount;
    }
  }

  Future<void> _toggleLike() async {
    if (_isLiking) return;

    // Optimistically update UI immediately (like the JSX: setLiked(!liked))
    setState(() {
      _isLiked = !_isLiked;
      _likeCount = _isLiked ? _likeCount + 1 : _likeCount - 1;
    });

    setState(() => _isLiking = true);

    try {
      // Call the single likePost endpoint (backend toggles automatically)
      final resp = await Api.likePost(postId: widget.post.id);
      
      if ((resp['status'] == 200 || resp['status'] == 201) && resp['data']['success'] == true) {
        // Update with actual count from server (like the JSX: setLikes(response.likeCount))
        final data = resp['data']['data'];
        if (data != null) {
          final serverLikeCount = data['likeCount'] as int?;
          final serverIsLiked = data['isLiked'] as bool?;
          
          setState(() {
            if (serverLikeCount != null) {
              _likeCount = serverLikeCount;
            }
            if (serverIsLiked != null) {
              _isLiked = serverIsLiked;
            }
          });
          
          // Notify parent with updated post
          widget.onPostUpdated?.call(
            widget.post.copyWith(
              likeCount: serverLikeCount ?? _likeCount,
              isLiked: serverIsLiked ?? _isLiked,
            ),
          );
        }
        widget.onLikeChanged?.call();
      } else {
        // Revert on failure (like the JSX catch block)
        setState(() {
          _isLiked = !_isLiked;
          _likeCount = _isLiked ? _likeCount + 1 : _likeCount - 1;
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Failed to update like')),
          );
        }
      }
    } catch (e) {
      // Revert on error (like the JSX catch block with toast.error)
      setState(() {
        _isLiked = !_isLiked;
        _likeCount = _isLiked ? _likeCount + 1 : _likeCount - 1;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update like')),
        );
      }
    } finally {
      setState(() => _isLiking = false);
    }
  }

  Future<void> _deletePost() async {
    try {
      final resp = await Api.deletePost(postId: widget.post.id);
      
      if (!mounted) return;
      
      if (resp['status'] == 200 || resp['status'] == 201) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Post deleted successfully')),
        );
        // Immediately remove the post from the feed
        widget.onPostDeleted?.call();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to delete post: ${resp['data']['message']}')),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error deleting post: $e')),
      );
    }
  }

  void _showDeleteConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Post'),
        content: const Text('Are you sure you want to delete this post? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _deletePost();
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _editPost() async {
    final edited = await showEditPostSheet(context, widget.post);
    if (edited == true) {
      // Fetch the updated post data from server
      try {
        final resp = await Api.getHomePage();
        if (resp['status'] == 200 && resp['data']['success'] == true) {
          final postsData = resp['data']['data']['posts'] as List?;
          if (postsData != null) {
            // Find the updated post
            final updatedPostJson = postsData.firstWhere(
              (p) => p['_id'] == widget.post.id,
              orElse: () => null,
            );
            
            if (updatedPostJson != null) {
              final updatedPost = PostModel.fromJson(updatedPostJson);
              // Update the post in the feed
              widget.onPostUpdated?.call(updatedPost);
            }
          }
        }
      } catch (e) {
        // Silently fail and fallback: just refresh the entire feed
        widget.onLikeChanged?.call();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    return Card(
      margin: const EdgeInsets.symmetric(
        horizontal: _PostCardConstants.cardHorizontalMargin,
        vertical: _PostCardConstants.cardVerticalMargin,
      ),
      elevation: isDark ? 4 : 1,
      shadowColor: isDark ? Colors.black.withOpacity(0.5) : null,
      color: isDark ? const Color(0x121212) : theme.cardColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(_PostCardConstants.cardBorderRadius),
        side: isDark 
          ? BorderSide(color: const Color.fromARGB(255, 44, 51, 49), width: 1)
          : BorderSide.none,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // User header
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                // User avatar
                _buildUserAvatar(),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.post.userName,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 15,
                        ),
                      ),
                      Text(
                        timeago.format(widget.post.timestamp),
                        style: TextStyle(
                          color: isDark ? const Color.fromARGB(255, 213, 218, 216) : Colors.grey[600],
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                // Menu button for own posts
                if (widget.post.userName == _currentUserName)
                  PopupMenuButton<String>(
                    padding: EdgeInsets.zero,
                    icon: Icon(Icons.more_vert, color: isDark ? Color.fromARGB(255, 213, 218, 216) : Colors.grey[700]),
                    onSelected: (value) {
                      if (value == 'edit') {
                        _editPost();
                      } else if (value == 'delete') {
                        _showDeleteConfirmation();
                      }
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'edit',
                        child: Row(
                          children: [
                            Icon(Icons.edit, size: 18),
                            SizedBox(width: 8),
                            Text('Edit Post'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'delete',
                        child: Row(
                          children: [
                            Icon(Icons.delete, size: 18, color: Colors.red),
                            SizedBox(width: 8),
                            Text('Delete Post', style: TextStyle(color: Colors.red)),
                          ],
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),

          // Images - only show if there are actual images with keys
          if (widget.post.images.isNotEmpty && 
              widget.post.images.any((img) => img.key.isNotEmpty))
            ClipRRect(
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(0),
                topRight: Radius.circular(0),
              ),
              child: SizedBox(
                height: _PostCardConstants.imageHeight,
                child: widget.post.images.length == 1
                    ? S3Image(
                        s3Key: widget.post.images[0].key,
                        width: double.infinity,
                        height: _PostCardConstants.imageHeight,
                        fit: BoxFit.cover,
                      )
                    : PageView.builder(
                        itemCount: widget.post.images.length,
                        itemBuilder: (context, index) {
                          return S3Image(
                            s3Key: widget.post.images[index].key,
                            width: double.infinity,
                            height: _PostCardConstants.imageHeight,
                            fit: BoxFit.cover,
                          );
                        },
                      ),
              ),
            ),

          // Caption below image
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              widget.post.caption,
              style: const TextStyle(fontSize: 14),
            ),
          ),

          // Like, Comment counts on left and Rating stars on right
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Left column: Like, Comment, Location
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Like and Comment row
                    Row(
                      children: [
                        // Like button (toggleable - click to like, click again to unlike)
                        GestureDetector(
                          onTap: _toggleLike,
                          child: Row(
                            children: [
                              Icon(
                                _isLiked ? Icons.favorite : Icons.favorite_border,
                                color: _isLiked 
                                  ? _PostCardConstants.primaryColor 
                                  : (isDark ? Color.fromARGB(255, 213, 218, 216) : Colors.grey[600]),
                                size: _PostCardConstants.iconSize,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '$_likeCount',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 14,
                                  color: isDark ? Color.fromARGB(255, 213, 218, 216) : Colors.grey[700],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 16),
                        // Comment button (clickable)
                        GestureDetector(
                          onTap: () async {
                            await showModalBottomSheet(
                              context: context,
                              isScrollControlled: true,
                              backgroundColor: Colors.transparent,
                              builder: (context) => CommentsBottomSheet(
                                post: widget.post,
                                onCommentAdded: () {
                                  // Increment comment count optimistically
                                  if (mounted) {
                                    setState(() {
                                      _commentCount++;
                                    });
                                  }
                                },
                                onCommentDeleted: () {
                                  // Decrement comment count optimistically
                                  if (mounted) {
                                    setState(() {
                                      _commentCount--;
                                    });
                                  }
                                },
                                onCommentUpdated: () {
                                  // Comment edited - count stays the same but we could refresh if needed
                                },
                              ),
                            );
                          },
                          child: Row(
                            children: [
                              Icon(
                                Icons.mode_comment_outlined,
                                color: isDark ? Color.fromARGB(255, 213, 218, 216) : Colors.grey[600],
                                size: _PostCardConstants.iconSize,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '$_commentCount',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 14,
                                  color: isDark ? Color.fromARGB(255, 213, 218, 216) : Colors.grey[700],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    // Location below
                    Row(
                      children: [
                        Icon(Icons.location_on, size: 14, color: isDark ? Color.fromARGB(255, 213, 218, 216) : Colors.grey[600]),
                        const SizedBox(width: 4),
                        Text(
                          widget.post.location ?? 'Fantasy',
                          style: TextStyle(
                            color: isDark ? Color.fromARGB(255, 213, 218, 216) : Colors.grey[600],
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const Spacer(),
                // Rating stars and difficulty on the right
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    // Rating stars
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: List.generate(5, (index) {
                        return Icon(
                          index < widget.post.rating ? Icons.star : Icons.star_border,
                          color: Colors.amber,
                          size: _PostCardConstants.starIconSize,
                        );
                      }),
                    ),
                    const SizedBox(height: 4),
                    // Difficulty below stars
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.terrain, size: 14, color: Colors.orange),
                        const SizedBox(width: 4),
                        Text(
                          'Difficulty: ${widget.post.difficulty}',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Colors.orange,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
