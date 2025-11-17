class CommentModel {
  final String id;
  final String postId;
  final String userId;
  final String userName;
  final String commentText;
  final DateTime timestamp;
  final String? userProfilePic;

  CommentModel({
    required this.id,
    required this.postId,
    required this.userId,
    required this.userName,
    required this.commentText,
    required this.timestamp,
    this.userProfilePic,
  });

  factory CommentModel.fromJson(Map<String, dynamic> json) {
    return CommentModel(
      id: json['_id'] ?? json['id'] ?? '',
      postId: json['postId'] ?? '',
      userId: json['userId'] ?? '',
      userName: json['userName'] ?? 'Unknown',
      commentText: json['commentText'] ?? '',
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp'])
          : DateTime.now(),
      userProfilePic: json['userProfilePic'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'postId': postId,
      'userId': userId,
      'userName': userName,
      'commentText': commentText,
      'timestamp': timestamp.toIso8601String(),
      'userProfilePic': userProfilePic,
    };
  }

  CommentModel copyWith({
    String? id,
    String? postId,
    String? userId,
    String? userName,
    String? commentText,
    DateTime? timestamp,
    String? userProfilePic,
  }) {
    return CommentModel(
      id: id ?? this.id,
      postId: postId ?? this.postId,
      userId: userId ?? this.userId,
      userName: userName ?? this.userName,
      commentText: commentText ?? this.commentText,
      timestamp: timestamp ?? this.timestamp,
      userProfilePic: userProfilePic ?? this.userProfilePic,
    );
  }
}
