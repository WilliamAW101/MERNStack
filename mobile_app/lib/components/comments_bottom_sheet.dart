import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/post_model.dart';
import '../models/comment_model.dart';
import '../services/api.dart';
import 'package:timeago/timeago.dart' as timeago;

class CommentsBottomSheet extends StatefulWidget {
  final PostModel post;
  final VoidCallback? onCommentAdded;
  final VoidCallback? onCommentDeleted;
  final VoidCallback? onCommentUpdated;

  const CommentsBottomSheet({
    super.key,
    required this.post,
    this.onCommentAdded,
    this.onCommentDeleted,
    this.onCommentUpdated,
  });

  @override
  State<CommentsBottomSheet> createState() => _CommentsBottomSheetState();
}

class _CommentsBottomSheetState extends State<CommentsBottomSheet> {
  final TextEditingController _commentController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _commentFocusNode = FocusNode();
  
  List<CommentModel> _comments = [];
  bool _isLoading = true;
  bool _isSubmitting = false;
  bool _hasMore = true;
  String? _lastTimestamp;
  
  // Edit mode state
  String? _editingCommentId;
  final Map<String, TextEditingController> _editControllers = {};
  String _currentUserName = '';

  @override
  void initState() {
    super.initState();
    print('🚀 [DEBUG] ========================================');
    print('🚀 [DEBUG] CommentsBottomSheet opened for post: ${widget.post.id}');
    print('🚀 [DEBUG] Post metadata shows: ${widget.post.commentCount} comments');
    print('🚀 [DEBUG] ========================================');
    _loadCurrentUser();
    _loadComments();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _commentController.dispose();
    _scrollController.dispose();
    _commentFocusNode.dispose();
    for (var controller in _editControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _loadCurrentUser() async {
    final sp = await SharedPreferences.getInstance();
    _currentUserName = sp.getString('userName') ?? '';
  }

  Future<void> _deleteComment(String commentId) async {
    try {
      final resp = await Api.deleteComment(commentId: commentId);
      
      if (!mounted) return;
      
      if (resp['status'] == 200 || resp['status'] == 201) {
        setState(() {
          _comments.removeWhere((c) => c.id == commentId);
        });
        
        // Notify parent to update post data
        widget.onCommentDeleted?.call();
        
        // Refresh comments to get updated count from server
        await _loadComments();
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Comment deleted')),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error deleting comment: $e')),
      );
    }
  }

  Future<void> _saveEditComment(String commentId) async {
    final controller = _editControllers[commentId];
    if (controller == null || controller.text.trim().isEmpty) return;

    try {
      final resp = await Api.updateComment(
        commentId: commentId,
        text: controller.text.trim(),
      );
      
      if (!mounted) return;
      
      if (resp['status'] == 200 || resp['status'] == 201) {
        setState(() {
          final index = _comments.indexWhere((c) => c.id == commentId);
          if (index != -1) {
            _comments[index] = _comments[index].copyWith(
              commentText: controller.text.trim(),
            );
          }
          _editingCommentId = null;
        });
        
        // Notify parent that comment was updated
        widget.onCommentUpdated?.call();
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Comment updated')),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error updating comment: $e')),
      );
    }
  }

  void _startEditComment(CommentModel comment) {
    setState(() {
      _editingCommentId = comment.id;
      _editControllers[comment.id] = TextEditingController(text: comment.commentText);
    });
  }

  void _cancelEditComment() {
    setState(() {
      if (_editingCommentId != null) {
        _editControllers[_editingCommentId]?.dispose();
        _editControllers.remove(_editingCommentId);
      }
      _editingCommentId = null;
    });
  }

  void _onScroll() {
    final scrollPosition = _scrollController.position.pixels;
    final maxScroll = _scrollController.position.maxScrollExtent;
    
    if (scrollPosition >= maxScroll - 200) {
      if (!_isLoading && _hasMore) {
        print('📜 [DEBUG] User scrolled near bottom, loading more comments...');
        print('📜 [DEBUG] Scroll position: $scrollPosition / $maxScroll');
        _loadComments(loadMore: true);
      } else if (!_hasMore) {
        print('📜 [DEBUG] At bottom but no more comments to load (hasMore=false)');
      }
    }
  }

  Future<void> _loadComments({bool loadMore = false}) async {
    if (!loadMore) {
      setState(() {
        _isLoading = true;
        _lastTimestamp = null;
      });
    }

    try {
      print('🔍 [DEBUG] Loading comments for post ${widget.post.id}...');
      print('🔍 [DEBUG] Post shows comment count: ${widget.post.commentCount}');
      print('🔍 [DEBUG] Load more: $loadMore, Current comments loaded: ${_comments.length}');
      
      final resp = await Api.getComments(
        postId: widget.post.id,
        lastTimestamp: _lastTimestamp,
      );

      if (!mounted) return;

      if ((resp['status'] == 200 || resp['status'] == 201) && resp['data']['success'] == true) {
        final data = resp['data']['data'];
        final commentsData = data['comments'] as List?;
        final nextCursor = data['nextCursor'] as String?;

        print('🔍 [DEBUG] API Response: status=${resp['status']}');
        print('🔍 [DEBUG] Comments received in this batch: ${commentsData?.length ?? 0}');
        print('🔍 [DEBUG] Next cursor exists: ${nextCursor != null && nextCursor.isNotEmpty}');

        if (commentsData != null) {
          final newComments = commentsData
              .map((json) => CommentModel.fromJson(json as Map<String, dynamic>))
              .toList();

          setState(() {
            if (loadMore) {
              _comments.addAll(newComments);
            } else {
              _comments = newComments;
            }
            _lastTimestamp = nextCursor;
            // Only hasMore if we got a full page of comments (10) AND nextCursor exists
            _hasMore = nextCursor != null && nextCursor.isNotEmpty && newComments.length >= 10;
            _isLoading = false;
          });
          
          print('✅ [DEBUG] Total comments now loaded: ${_comments.length}');
          print('✅ [DEBUG] Has more comments to load: $_hasMore');
          print('✅ [DEBUG] Difference: Post says ${widget.post.commentCount}, but loaded ${_comments.length}');
        } else {
          setState(() {
            _isLoading = false;
            _hasMore = false;
          });
          print('⚠️ [DEBUG] No comments data received from API');
        }
      } else {
        setState(() {
          _isLoading = false;
          _hasMore = false;
        });
        print('❌ [DEBUG] API error: status=${resp['status']}, data=${resp['data']}');
      }
    } catch (e) {
      print('❌ [DEBUG] Exception loading comments: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
          _hasMore = false;
        });
      }
    }
  }

  Future<void> _submitComment() async {
    final text = _commentController.text.trim();
    if (text.isEmpty || _isSubmitting) return;

    setState(() => _isSubmitting = true);

    try {
      final resp = await Api.addComment(
        postId: widget.post.id,
        commentText: text,
      );

      if (!mounted) return;

      print('Comment response status: ${resp['status']}');
      print('Comment response data: ${resp['data']}');

      // Check if the request was successful (200 or 201)
      if (resp['status'] == 200 || resp['status'] == 201) {
        // Comment was posted successfully to backend
        // Clear input and notify parent
        setState(() {
          _commentController.clear();
        });
        
        _commentFocusNode.unfocus();
        
        // Notify parent widget to update the comment count
        widget.onCommentAdded?.call();
        
        // Reload comments to get the actual comment from server with correct data
        await _loadComments();
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Comment posted!'),
            duration: Duration(seconds: 1),
          ),
        );
      } else {
        // Show error message if API returns failure
        final errorMsg = resp['data']?['message']?.toString() ?? 'Failed to post comment';
        print('Comment post failed: $errorMsg');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(errorMsg)),
        );
      }
    } catch (e) {
      print('Comment post error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error posting comment: $e')),
        );
      }
    } finally {
      // Always reset _isSubmitting, even on error
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return DraggableScrollableSheet(
      initialChildSize: 0.65,  // <- Adjust this (0.0 to 1.0) - starting height when modal opens
      minChildSize: 0.3,      // <- Minimum height when dragged down
      maxChildSize: 0.95,     // <- Maximum height when dragged up
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: isDark ? theme.scaffoldBackgroundColor : Colors.grey[50],
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Handle bar
              Container(
                margin: const EdgeInsets.symmetric(vertical: 8),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? Colors.grey[700] : Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              // Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  children: [
                    const SizedBox(width: 40), // Spacer for centering
                    Expanded(
                      child: Column(
                        children: [
                          Text(
                            'Comments',
                            textAlign: TextAlign.center,
                            style: theme.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          // Debug info showing loaded vs total
                          if (!_isLoading && _comments.isNotEmpty)
                            Text(
                              'Loaded: ${_comments.length} / Expected: ${widget.post.commentCount}',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 12,
                                color: _comments.length != widget.post.commentCount 
                                    ? Colors.orange 
                                    : Colors.green,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),

              const Divider(height: 1),

              // Comments list
              Expanded(
                child: _isLoading && _comments.isEmpty
                    ? const Center(child: CircularProgressIndicator())
                    : _comments.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.comment_outlined,
                                  size: 64,
                                  color: isDark ? Colors.grey[700] : Colors.grey[300],
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'No comments yet',
                                  style: TextStyle(
                                    color: isDark ? Colors.grey[500] : Colors.grey[600],
                                    fontSize: 16,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Be the first to comment!',
                                  style: TextStyle(
                                    color: isDark ? Colors.grey[600] : Colors.grey[500],
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            controller: _scrollController,
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            itemCount: _comments.length + (_hasMore || !_isLoading ? 1 : 0),
                            itemBuilder: (context, index) {
                              if (index == _comments.length) {
                                // Show loading indicator if more comments are available
                                if (_hasMore) {
                                  return const Padding(
                                    padding: EdgeInsets.all(16),
                                    child: Center(
                                      child: CircularProgressIndicator(),
                                    ),
                                  );
                                }
                                // Show "end of comments" message
                                return Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Center(
                                    child: Text(
                                      _comments.length == widget.post.commentCount
                                          ? '✓ All ${_comments.length} comments loaded'
                                          : '⚠️ ${_comments.length} of ${widget.post.commentCount} comments loaded',
                                      style: TextStyle(
                                        color: _comments.length == widget.post.commentCount 
                                            ? Colors.green 
                                            : Colors.orange,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                );
                              }

                              final comment = _comments[index];
                              return _buildCommentItem(comment, isDark);
                            },
                          ),
              ),

              // Comment input
              const Divider(height: 1),
              Container(
                padding: EdgeInsets.only(
                  left: 16,
                  right: 16,
                  top: 8,
                  bottom: MediaQuery.of(context).viewInsets.bottom + 8,
                ),
                decoration: BoxDecoration(
                  color: theme.scaffoldBackgroundColor,
                ),
                child: SafeArea(
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 16,
                        backgroundColor: theme.colorScheme.primary,
                        child: const Icon(
                          Icons.person,
                          size: 18,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: _commentController,
                          focusNode: _commentFocusNode,
                          decoration: InputDecoration(
                            hintText: 'Add a comment...',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(24),
                              borderSide: BorderSide.none,
                            ),
                            filled: true,
                            fillColor: isDark ? Colors.grey[800] : Colors.grey[200],
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 10,
                            ),
                          ),
                          textInputAction: TextInputAction.send,
                          onSubmitted: (_) => _submitComment(),
                          enabled: !_isSubmitting,
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        onPressed: _isSubmitting ? null : _submitComment,
                        icon: _isSubmitting
                            ? const SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : Icon(
                                Icons.send,
                                color: theme.colorScheme.primary,
                              ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildCommentItem(CommentModel comment, bool isDark) {
    final isOwnComment = comment.userName == _currentUserName;
    final isEditing = _editingCommentId == comment.id;
    
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 18,
            backgroundColor: Theme.of(context).colorScheme.primary,
            child: Text(
              comment.userName.isNotEmpty
                  ? comment.userName[0].toUpperCase()
                  : 'U',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.grey[800] : Colors.grey[200],
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              comment.userName,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                          ),
                          if (isOwnComment && !isEditing)
                            PopupMenuButton<String>(
                              padding: EdgeInsets.zero,
                              iconSize: 18,
                              onSelected: (value) {
                                if (value == 'edit') {
                                  _startEditComment(comment);
                                } else if (value == 'delete') {
                                  _showDeleteConfirmation(comment);
                                }
                              },
                              itemBuilder: (context) => [
                                const PopupMenuItem(
                                  value: 'edit',
                                  child: Row(
                                    children: [
                                      Icon(Icons.edit, size: 18),
                                      SizedBox(width: 8),
                                      Text('Edit'),
                                    ],
                                  ),
                                ),
                                const PopupMenuItem(
                                  value: 'delete',
                                  child: Row(
                                    children: [
                                      Icon(Icons.delete, size: 18),
                                      SizedBox(width: 8),
                                      Text('Delete'),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      if (isEditing)
                        Column(
                          children: [
                            TextField(
                              controller: _editControllers[comment.id],
                              maxLines: null,
                              autofocus: true,
                              style: const TextStyle(fontSize: 14),
                              decoration: const InputDecoration(
                                border: InputBorder.none,
                                isDense: true,
                                contentPadding: EdgeInsets.zero,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                TextButton(
                                  onPressed: _cancelEditComment,
                                  child: const Text('Cancel'),
                                ),
                                const SizedBox(width: 8),
                                ElevatedButton(
                                  onPressed: () => _saveEditComment(comment.id),
                                  style: ElevatedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                  ),
                                  child: const Text('Save'),
                                ),
                              ],
                            ),
                          ],
                        )
                      else
                        Text(
                          comment.commentText,
                          style: const TextStyle(fontSize: 14),
                        ),
                    ],
                  ),
                ),
                if (!isEditing) ...[
                  const SizedBox(height: 4),
                  Padding(
                    padding: const EdgeInsets.only(left: 12),
                    child: Text(
                      timeago.format(comment.timestamp),
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.grey[500] : Colors.grey[600],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showDeleteConfirmation(CommentModel comment) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Comment'),
        content: const Text('Are you sure you want to delete this comment?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _deleteComment(comment.id);
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}
