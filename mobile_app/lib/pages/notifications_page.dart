import 'package:flutter/material.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../services/notification_service.dart';
import '../models/notification_model.dart';
import '../home.dart';

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key});

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  final NotificationService _notificationService = NotificationService();
  final ThemeController _theme = ThemeController();

  @override
  void initState() {
    super.initState();
    // Mark all as read when page is opened
    Future.delayed(const Duration(milliseconds: 500), () {
      _notificationService.markAllAsRead();
    });
  }

  IconData _getNotificationIcon(String type) {
    switch (type) {
      case 'like':
        return Icons.favorite;
      case 'comment':
        return Icons.comment;
      case 'follow':
        return Icons.person_add;
      default:
        return Icons.notifications;
    }
  }

  Color _getNotificationColor(String type) {
    switch (type) {
      case 'like':
        return Colors.red;
      case 'comment':
        return const Color(0xFF2DBE7A);
      case 'follow':
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _theme,
      builder: (context, _) {
        final theme = _buildTheme();
        final isDark = _theme.isDark;

        return Theme(
          data: theme,
          child: Scaffold(
            backgroundColor: theme.scaffoldBackgroundColor,
            appBar: AppBar(
              backgroundColor: theme.scaffoldBackgroundColor,
              elevation: 0,
              leading: IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => Navigator.pop(context),
              ),
              title: Text(
                'Notifications',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: theme.colorScheme.onSurface,
                ),
              ),
              actions: [
                // Connection status indicator
                Padding(
                  padding: const EdgeInsets.only(right: 16),
                  child: Center(
                    child: AnimatedBuilder(
                      animation: _notificationService,
                      builder: (context, _) {
                        return Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _notificationService.isConnected
                                ? const Color(0xFF2DBE7A)
                                : Colors.grey,
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ],
            ),
            body: AnimatedBuilder(
              animation: _notificationService,
              builder: (context, _) {
                final notifications = _notificationService.notifications;

                if (notifications.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.notifications_none,
                          size: 80,
                          color: theme.colorScheme.onSurface.withOpacity(0.3),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'No notifications yet',
                          style: TextStyle(
                            fontSize: 18,
                            color: theme.colorScheme.onSurface.withOpacity(0.6),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _notificationService.isConnected
                              ? 'Connected and waiting for updates...'
                              : 'Connecting to notification server...',
                          style: TextStyle(
                            fontSize: 14,
                            color: theme.colorScheme.onSurface.withOpacity(0.4),
                          ),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  itemCount: notifications.length,
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  itemBuilder: (context, index) {
                    final notification = notifications[index];
                    return _buildNotificationItem(notification, isDark, theme);
                  },
                );
              },
            ),
          ),
        );
      },
    );
  }

  Widget _buildNotificationItem(
    NotificationModel notification,
    bool isDark,
    ThemeData theme,
  ) {
    final iconColor = _getNotificationColor(notification.type);
    final icon = _getNotificationIcon(notification.type);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: notification.read
            ? (isDark ? const Color(0xFF1E1E1E) : Colors.white)
            : (isDark ? const Color(0xFF2A2A2A) : const Color(0xFFF0F9F5)),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: notification.read
              ? (isDark ? Colors.grey[800]! : Colors.grey[200]!)
              : const Color(0xFF2DBE7A).withOpacity(0.3),
        ),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Stack(
          children: [
            // Profile picture or icon
            notification.fromUserProfilePic != null &&
                    notification.fromUserProfilePic!.isNotEmpty
                ? CircleAvatar(
                    radius: 24,
                    backgroundImage:
                        NetworkImage(notification.fromUserProfilePic!),
                  )
                : CircleAvatar(
                    radius: 24,
                    backgroundColor: iconColor.withOpacity(0.2),
                    child: Icon(icon, color: iconColor, size: 20),
                  ),
            // Notification type badge
            Positioned(
              bottom: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: iconColor,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: theme.scaffoldBackgroundColor,
                    width: 2,
                  ),
                ),
                child: Icon(icon, color: Colors.white, size: 12),
              ),
            ),
          ],
        ),
        title: Text(
          notification.message,
          style: TextStyle(
            fontSize: 14,
            fontWeight: notification.read ? FontWeight.normal : FontWeight.w600,
            color: theme.colorScheme.onSurface,
          ),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(
            timeago.format(notification.timestamp),
            style: TextStyle(
              fontSize: 12,
              color: theme.colorScheme.onSurface.withOpacity(0.6),
            ),
          ),
        ),
        trailing: !notification.read
            ? Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Color(0xFF2DBE7A),
                ),
              )
            : null,
        onTap: () {
          // Mark as read
          _notificationService.markAsRead(notification.id);
          
          // Navigate to post if postId exists
          if (notification.postId != null) {
            // TODO: Navigate to post detail page
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Navigate to post ${notification.postId}')),
            );
          }
        },
      ),
    );
  }

  ThemeData _buildTheme() {
    return ThemeData(
      useMaterial3: true,
      brightness: _theme.isDark ? Brightness.dark : Brightness.light,
      scaffoldBackgroundColor: _theme.isDark ? Colors.black : Colors.white,
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFF2DBE7A),
        brightness: _theme.isDark ? Brightness.dark : Brightness.light,
      ),
    );
  }
}
