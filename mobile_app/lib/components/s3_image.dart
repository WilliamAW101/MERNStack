import 'package:flutter/material.dart';
import 'package:crag_tag/services/s3_image_service.dart';

/// Widget to display an image from S3 using a presigned URL
/// Handles URL caching and expiration automatically
class S3Image extends StatefulWidget {
  final String? s3Key;
  final BoxFit? fit;
  final double? width;
  final double? height;
  final Widget? placeholder;
  final Widget? errorWidget;

  const S3Image({
    super.key,
    required this.s3Key,
    this.fit,
    this.width,
    this.height,
    this.placeholder,
    this.errorWidget,
  });

  @override
  State<S3Image> createState() => _S3ImageState();
}

class _S3ImageState extends State<S3Image> {
  String? _imageUrl;
  bool _isLoading = true;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _loadImage();
  }

  @override
  void didUpdateWidget(S3Image oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.s3Key != widget.s3Key) {
      _loadImage();
    }
  }

  Future<void> _loadImage() async {
    if (widget.s3Key == null || widget.s3Key!.isEmpty) {
      setState(() {
        _isLoading = false;
        _hasError = true;
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _hasError = false;
    });

    try {
      final url = await S3ImageService.getImageUrl(widget.s3Key!);
      
      if (!mounted) return;
      
      if (url != null) {
        setState(() {
          _imageUrl = url;
          _isLoading = false;
        });
      } else {
        setState(() {
          _isLoading = false;
          _hasError = true;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _hasError = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return widget.placeholder ?? 
        Container(
          width: widget.width,
          height: widget.height,
          color: Colors.grey[300],
          child: const Center(
            child: CircularProgressIndicator(),
          ),
        );
    }

    if (_hasError || _imageUrl == null) {
      return widget.errorWidget ??
        Container(
          width: widget.width,
          height: widget.height,
          color: Colors.grey[300],
          child: const Icon(Icons.error, color: Colors.grey),
        );
    }

    return Image.network(
      _imageUrl!,
      fit: widget.fit,
      width: widget.width,
      height: widget.height,
      loadingBuilder: (context, child, loadingProgress) {
        if (loadingProgress == null) return child;
        return widget.placeholder ?? 
          Container(
            width: widget.width,
            height: widget.height,
            color: Colors.grey[300],
            child: Center(
              child: CircularProgressIndicator(
                value: loadingProgress.expectedTotalBytes != null
                    ? loadingProgress.cumulativeBytesLoaded / loadingProgress.expectedTotalBytes!
                    : null,
              ),
            ),
          );
      },
      errorBuilder: (context, error, stackTrace) {
        return widget.errorWidget ??
          Container(
            width: widget.width,
            height: widget.height,
            color: Colors.grey[300],
            child: const Icon(Icons.error, color: Colors.grey),
          );
      },
    );
  }
}
