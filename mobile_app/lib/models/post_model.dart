class PostModel {
  final String id;
  final String userId;
  final String userName;
  final dynamic userAvatar; // Can be String or Map from backend
  final String caption;
  final int difficulty;
  final int rating;
  final List<PostImage> images;
  final String? location;
  final DateTime timestamp;
  final int likeCount;
  final int commentCount;
  final bool isLiked;

  PostModel({
    required this.id,
    required this.userId,
    required this.userName,
    this.userAvatar,
    required this.caption,
    required this.difficulty,
    required this.rating,
    required this.images,
    this.location,
    required this.timestamp,
    this.likeCount = 0,
    this.commentCount = 0,
    this.isLiked = false,
  });

  factory PostModel.fromJson(Map<String, dynamic> json) {
    return PostModel(
      id: json['_id'] ?? json['id'] ?? '',
      userId: json['userId'] ?? '',
      userName: json['username'] ?? json['userName'] ?? 'Unknown',  // Backend now uses lowercase 'username'
      userAvatar: json['userProfilePic'] ?? json['userAvatar'],
      caption: json['caption'] ?? '',
      difficulty: (json['difficulty'] is int) ? json['difficulty'] : (json['difficulty'] as num?)?.toInt() ?? 0,
      rating: (json['rating'] is int) ? json['rating'] : (json['rating'] as num?)?.toInt() ?? 0,
      images: (json['images'] as List<dynamic>?)
              ?.map((img) => PostImage.fromJson(img as Map<String, dynamic>))
              .toList() ??
          [],
      location: json['location'],
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp'])
          : DateTime.now(),
      likeCount: (json['likeCount'] is int) ? json['likeCount'] : (json['likeCount'] as num?)?.toInt() ?? 0,
      commentCount: (json['commentCount'] is int) ? json['commentCount'] : (json['commentCount'] as num?)?.toInt() ?? (json['comments']?.length ?? 0),
      isLiked: json['isLiked'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'userId': userId,
      'userName': userName,
      'userAvatar': userAvatar,
      'caption': caption,
      'difficulty': difficulty,
      'rating': rating,
      'images': images.map((img) => img.toJson()).toList(),
      'location': location,
      'timestamp': timestamp.toIso8601String(),
      'likeCount': likeCount,
      'commentCount': commentCount,
      'isLiked': isLiked,
    };
  }

  PostModel copyWith({
    int? likeCount,
    bool? isLiked,
    int? commentCount,
  }) {
    return PostModel(
      id: id,
      userId: userId,
      userName: userName,
      userAvatar: userAvatar,
      caption: caption,
      difficulty: difficulty,
      rating: rating,
      images: images,
      location: location,
      timestamp: timestamp,
      likeCount: likeCount ?? this.likeCount,
      commentCount: commentCount ?? this.commentCount,
      isLiked: isLiked ?? this.isLiked,
    );
  }
}

class PostImage {
  final String provider; // 's3'
  final String key; // S3 key
  final String type; // 'image' or 'video'

  PostImage({
    required this.provider,
    required this.key,
    required this.type,
  });

  factory PostImage.fromJson(Map<String, dynamic> json) {
    return PostImage(
      provider: json['provider'] ?? 's3',
      key: json['key'] ?? '',
      type: json['type'] ?? 'image',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'provider': provider,
      'key': key,
      'type': type,
    };
  }
}
