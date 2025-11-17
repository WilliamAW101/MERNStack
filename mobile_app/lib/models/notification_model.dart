class NotificationModel {
  final String id;
  final String userId;
  final String type; // 'like', 'comment', 'follow', etc.
  final String message;
  final String? postId;
  final String? fromUser;
  final String? fromUserName;
  final String? fromUserProfilePic;
  final DateTime timestamp;
  final bool read;

  NotificationModel({
    required this.id,
    required this.userId,
    required this.type,
    required this.message,
    this.postId,
    this.fromUser,
    this.fromUserName,
    this.fromUserProfilePic,
    required this.timestamp,
    this.read = false,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['_id'] ?? json['id'] ?? '',
      userId: json['userId'] ?? '',
      type: json['type'] ?? 'general',
      message: json['message'] ?? '',
      postId: json['postId'],
      fromUser: json['fromUser'],
      fromUserName: json['fromUserName'],
      fromUserProfilePic: json['fromUserProfilePic'],
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp'])
          : DateTime.now(),
      read: json['read'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'userId': userId,
      'type': type,
      'message': message,
      'postId': postId,
      'fromUser': fromUser,
      'fromUserName': fromUserName,
      'fromUserProfilePic': fromUserProfilePic,
      'timestamp': timestamp.toIso8601String(),
      'read': read,
    };
  }

  NotificationModel copyWith({
    String? id,
    String? userId,
    String? type,
    String? message,
    String? postId,
    String? fromUser,
    String? fromUserName,
    String? fromUserProfilePic,
    DateTime? timestamp,
    bool? read,
  }) {
    return NotificationModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      type: type ?? this.type,
      message: message ?? this.message,
      postId: postId ?? this.postId,
      fromUser: fromUser ?? this.fromUser,
      fromUserName: fromUserName ?? this.fromUserName,
      fromUserProfilePic: fromUserProfilePic ?? this.fromUserProfilePic,
      timestamp: timestamp ?? this.timestamp,
      read: read ?? this.read,
    );
  }
}
