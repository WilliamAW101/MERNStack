import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../home.dart'; // Import to access ThemeController
import '../services/api.dart';
import '../models/post_model.dart';
import '../components/s3_image.dart';

/// Shows a full-screen modal for editing an existing post
Future<bool?> showEditPostSheet(BuildContext context, PostModel post) {
  return Navigator.of(context).push<bool>(
    MaterialPageRoute(
      builder: (context) => EditPostSheet(post: post),
      fullscreenDialog: true,
    ),
  );
}

class EditPostSheet extends StatefulWidget {
  final PostModel post;
  
  const EditPostSheet({super.key, required this.post});

  @override
  State<EditPostSheet> createState() => _EditPostSheetState();
}

class _EditPostSheetState extends State<EditPostSheet> {
  final ThemeController _themeController = ThemeController();
  late final TextEditingController _textCtrl;
  late final TextEditingController _locationCtrl;
  final ImagePicker _picker = ImagePicker();
  
  bool _submitting = false;
  late int _difficulty;
  late int _rating;
  List<XFile> _newImages = []; // New images to upload
  List<Map<String, dynamic>> _existingImages = []; // Images already on S3
  List<String> _uploadedS3Keys = [];

  @override
  void initState() {
    super.initState();
    // Pre-fill with existing data
    _textCtrl = TextEditingController(text: widget.post.caption);
    _locationCtrl = TextEditingController(text: widget.post.location ?? '');
    _difficulty = widget.post.difficulty;
    _rating = widget.post.rating;
    
    // Load existing images - convert PostImage objects to Map
    _existingImages = widget.post.images.map((img) => img.toJson()).toList();
  }

  @override
  void dispose() {
    _textCtrl.dispose();
    _locationCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickImages() async {
    try {
      final images = await _picker.pickMultiImage();
      setState(() {
        _newImages = images;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error picking images: $e')),
      );
    }
  }

  Future<bool> _uploadImagesToS3() async {
    _uploadedS3Keys.clear();

    for (final image in _newImages) {
      try {
        // Get file extension
        final ext = image.path.split('.').last.toLowerCase();
        
        // Determine content type
        String contentType;
        if (ext == 'jpg' || ext == 'jpeg') {
          contentType = 'image/jpeg';
        } else if (ext == 'png') {
          contentType = 'image/png';
        } else if (ext == 'webp') {
          contentType = 'image/webp';
        } else if (ext == 'heic') {
          contentType = 'image/heic';
        } else {
          contentType = 'image/jpeg'; // Default
        }

        // Step 1: Get presigned upload URL
        final urlResp = await Api.getUploadUrl(
          fileType: ext,
        );

        if (urlResp['status'] != 200 || urlResp['data']['uploadUrl'] == null) {
          throw Exception('Failed to get upload URL');
        }

        final uploadUrl = urlResp['data']['uploadUrl'] as String;
        final s3Key = urlResp['data']['key'] as String;

        // Step 2: Upload file to S3
        final file = File(image.path);
        final bytes = await file.readAsBytes();

        final uploadSuccess = await Api.uploadToS3(
          presignedUrl: uploadUrl,
          fileBytes: bytes,
          contentType: contentType,
        );

        if (!uploadSuccess) {
          throw Exception('Failed to upload to S3');
        }

        _uploadedS3Keys.add(s3Key);
        
      } catch (e) {
        if (!mounted) return false;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error uploading image: $e')),
        );
        return false;
      }
    }

    return true;
  }

  Future<void> _handleUpdate() async {
    final caption = _textCtrl.text.trim();
    
    if (caption.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a caption')),
      );
      return;
    }

    setState(() => _submitting = true);

    try {
      // Upload new images if any selected
      if (_newImages.isNotEmpty) {
        final uploaded = await _uploadImagesToS3();
        if (!uploaded) {
          setState(() => _submitting = false);
          return;
        }
      }

      // Combine existing images with new uploads
      final newImageMaps = _uploadedS3Keys.map((key) => {
        'provider': 's3',
        'key': key,
        'type': 'image',
      }).toList();

      final allImages = [..._existingImages, ...newImageMaps];

      // Call the backend API to update the post
      final resp = await Api.updatePost(
        postId: widget.post.id,
        caption: caption,
        difficulty: _difficulty,
        rating: _rating,
        images: allImages,
        location: _locationCtrl.text.trim().isEmpty ? null : _locationCtrl.text.trim(),
      );

      if (!mounted) return;

      // Check if the API call was successful
      if (resp['status'] == 200 || resp['status'] == 201) {
        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Post updated successfully!'),
            backgroundColor: Color(0xFF2DBE7A),
          ),
        );

        // Close the sheet
        Navigator.of(context).pop(true); // Return true to indicate post updated
      } else if (resp['status'] == 403) {
        // Token expired - show message to log in again
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Your session has expired. Please log in again.'),
            backgroundColor: Colors.red,
            duration: Duration(seconds: 4),
          ),
        );
      } else {
        // Handle error response from API
        final errorMsg = resp['data']['message'] ?? resp['data']['error'] ?? 'Failed to update post';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMsg),
            backgroundColor: Colors.red,
          ),
        );
      }

    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    };
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
            width: 40,
            height: 40,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) {
              return CircleAvatar(
                radius: 20,
                backgroundColor: const Color(0xFF3E7669),
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
                radius: 20,
                backgroundColor: const Color(0xFF3E7669),
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
            width: 40,
            height: 40,
            fit: BoxFit.cover,
            placeholder: CircleAvatar(
              radius: 20,
              backgroundColor: const Color(0xFF3E7669),
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
              radius: 20,
              backgroundColor: const Color(0xFF3E7669),
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
            width: 40,
            height: 40,
            fit: BoxFit.cover,
            placeholder: CircleAvatar(
              radius: 20,
              backgroundColor: const Color(0xFF3E7669),
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
              radius: 20,
              backgroundColor: const Color(0xFF3E7669),
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
      radius: 20,
      backgroundColor: const Color(0xFF3E7669),
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

  void _showLocationDialog(BuildContext context, Color textColor, bool isDark) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Edit Location', style: TextStyle(color: textColor)),
        content: TextField(
          controller: _locationCtrl,
          decoration: const InputDecoration(
            hintText: 'Enter location',
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              setState(() {});
              Navigator.pop(context);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _themeController,
      builder: (context, _) {
        final isDark = _themeController.isDark;
        
        // Define colors based on theme controller
        final backgroundColor = isDark ? const Color(0xFF1A1A1A) : Colors.white;
        final textColor = isDark ? Colors.white : Colors.black;
        final borderColor = isDark ? Colors.grey[800]! : Colors.grey[300]!;

        final theme = ThemeData(
          useMaterial3: true,
          brightness: isDark ? Brightness.dark : Brightness.light,
          colorSchemeSeed: const Color.fromARGB(255, 94, 116, 201),
        );

        return Theme(
          data: theme,
          child: Scaffold(
      backgroundColor: backgroundColor,
      appBar: AppBar(
        backgroundColor: backgroundColor,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.close, color: textColor),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Edit Post',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: textColor,
          ),
        ),
        centerTitle: true,
        actions: [
          TextButton(
            onPressed: _submitting ? null : _handleUpdate,
            child: _submitting
                ? SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: textColor,
                    ),
                  )
                : Text(
                    'Save',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: textColor.withOpacity(_submitting ? 0.5 : 1.0),
                    ),
                  ),
          ),
        ],
      ),
      body: Column(
        children: [
          
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [

                  // User info row
                  Row(
                    children: [
                      _buildUserAvatar(),
                      const SizedBox(width: 12),
                      Text(
                        widget.post.userName, // Show post author
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: textColor,
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 20),

                  // Text input
                  TextField(
                    controller: _textCtrl,
                    maxLines: 8,
                    autofocus: true,
                    style: TextStyle(
                      fontSize: 16,
                      color: textColor,
                    ),
                    decoration: InputDecoration(
                      hintText: "What's on your mind?",
                      hintStyle: TextStyle(
                        color: isDark ? Colors.grey[500] : Colors.grey[600],
                      ),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Difficulty selector
                  _DifficultySelector(
                    difficulty: _difficulty,
                    onChanged: (level) => setState(() => _difficulty = level),
                    textColor: textColor,
                    borderColor: borderColor,
                    isDark: isDark,
                  ),

                  const SizedBox(height: 16),

                  // Rating selector
                  _RatingSelector(
                    rating: _rating,
                    onChanged: (value) => setState(() => _rating = value),
                    textColor: textColor,
                    borderColor: borderColor,
                  ),

                  const SizedBox(height: 16),

                  // Existing images preview
                  if (_existingImages.isNotEmpty) ...[
                    Text(
                      'Current Images',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: textColor,
                      ),
                    ),
                    const SizedBox(height: 8),
                    _ExistingImagePreviewList(
                      images: _existingImages,
                      onRemove: (index) {
                        setState(() {
                          _existingImages.removeAt(index);
                        });
                      },
                    ),
                    const SizedBox(height: 16),
                  ],

                  // New images preview
                  if (_newImages.isNotEmpty) ...[
                    Text(
                      'New Images to Add',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: textColor,
                      ),
                    ),
                    const SizedBox(height: 8),
                    _NewImagePreviewList(
                      images: _newImages,
                      onRemove: (index) {
                        setState(() {
                          _newImages.removeAt(index);
                        });
                      },
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Action buttons row
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
                    decoration: BoxDecoration(
                      border: Border.all(color: borderColor),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Text(
                          'Edit your post',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w500,
                            color: textColor,
                          ),
                        ),
                        const Spacer(),
                        _AddOptionButton(
                          icon: Icons.photo_library,
                          color: const Color(0xFF45BD62),
                          label: 'Add Photo',
                          onTap: _pickImages,
                        ),
                        const SizedBox(width: 4),
                        _AddOptionButton(
                          icon: Icons.location_on,
                          color: const Color(0xFFE7513B),
                          label: 'Location',
                          onTap: () {
                            // Show location dialog
                            _showLocationDialog(context, textColor, isDark);
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
            ),
          ),
        );
      },
    );
  }
}

// Helper widget for add option buttons
class _AddOptionButton extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String? label;
  final VoidCallback onTap;

  const _AddOptionButton({
    required this.icon,
    required this.color,
    required this.onTap,
    this.label,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
        child: Icon(
          icon,
          size: 26,
          color: color,
        ),
      ),
    );
  }
}

// ============================================================================
// Extracted Widget Components
// ============================================================================

/// Difficulty selector widget with 1-5 scale
class _DifficultySelector extends StatelessWidget {
  final int difficulty;
  final ValueChanged<int> onChanged;
  final Color textColor;
  final Color borderColor;
  final bool isDark;

  const _DifficultySelector({
    required this.difficulty,
    required this.onChanged,
    required this.textColor,
    required this.borderColor,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border.all(color: borderColor),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.trending_up, color: Color(0xFFE7513B), size: 20),
              const SizedBox(width: 8),
              Text(
                'Difficulty',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: textColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: List.generate(5, (index) {
              final level = index + 1;
              return Expanded(
                child: GestureDetector(
                  onTap: () => onChanged(level),
                  child: Container(
                    margin: EdgeInsets.only(right: index < 4 ? 8 : 0),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: difficulty >= level
                          ? const Color(0xFFE7513B)
                          : (isDark ? Colors.grey[800] : Colors.grey[200]),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Center(
                      child: Text(
                        '$level',
                        style: TextStyle(
                          color: difficulty >= level
                              ? Colors.white
                              : textColor.withOpacity(0.6),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}

/// Rating selector widget with 1-5 stars
class _RatingSelector extends StatelessWidget {
  final int rating;
  final ValueChanged<int> onChanged;
  final Color textColor;
  final Color borderColor;

  const _RatingSelector({
    required this.rating,
    required this.onChanged,
    required this.textColor,
    required this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border.all(color: borderColor),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.star, color: Color(0xFFF7B928), size: 20),
              const SizedBox(width: 8),
              Text(
                'Rating',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: textColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (index) {
              return GestureDetector(
                onTap: () => onChanged(index + 1),
                child: Icon(
                  index < rating ? Icons.star : Icons.star_border,
                  color: const Color(0xFFF7B928),
                  size: 40,
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}

/// Existing S3 images preview with remove functionality
class _ExistingImagePreviewList extends StatelessWidget {
  final List<Map<String, dynamic>> images;
  final ValueChanged<int> onRemove;

  const _ExistingImagePreviewList({
    required this.images,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    if (images.isEmpty) return const SizedBox.shrink();

    return SizedBox(
      height: 120,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: images.length,
        itemBuilder: (context, index) {
          final image = images[index];
          final key = image['key'] as String?;
          
          return Stack(
            children: [
              Container(
                width: 120,
                height: 120,
                margin: const EdgeInsets.only(right: 8),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  color: Colors.grey[300],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: key != null && key.isNotEmpty
                      ? S3Image(
                          s3Key: key,
                          width: 120,
                          height: 120,
                          fit: BoxFit.cover,
                          errorWidget: const Center(
                            child: Icon(Icons.image, size: 40, color: Colors.grey),
                          ),
                        )
                      : const Center(
                          child: Icon(Icons.image, size: 40, color: Colors.grey),
                        ),
                ),
              ),
              Positioned(
                top: 4,
                right: 12,
                child: GestureDetector(
                  onTap: () => onRemove(index),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Colors.black54,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.close,
                      color: Colors.white,
                      size: 16,
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// New local images preview with remove functionality
class _NewImagePreviewList extends StatelessWidget {
  final List<XFile> images;
  final ValueChanged<int> onRemove;

  const _NewImagePreviewList({
    required this.images,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    if (images.isEmpty) return const SizedBox.shrink();

    return SizedBox(
      height: 120,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: images.length,
        itemBuilder: (context, index) {
          return Stack(
            children: [
              Container(
                width: 120,
                height: 120,
                margin: const EdgeInsets.only(right: 8),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  image: DecorationImage(
                    image: FileImage(File(images[index].path)),
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              Positioned(
                top: 4,
                right: 12,
                child: GestureDetector(
                  onTap: () => onRemove(index),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Colors.black54,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.close,
                      color: Colors.white,
                      size: 16,
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
