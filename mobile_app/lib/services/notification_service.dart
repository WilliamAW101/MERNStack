import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/notification_model.dart';

class NotificationService extends ChangeNotifier {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  IO.Socket? _socket;
  List<NotificationModel> _notifications = [];
  int _unreadCount = 0;
  bool _isConnected = false;

  List<NotificationModel> get notifications => _notifications;
  int get unreadCount => _unreadCount;
  bool get isConnected => _isConnected;

  Future<void> connect() async {
    if (_isConnected) return;

    try {
      final sp = await SharedPreferences.getInstance();
      final userId = sp.getString('userId');
      final userName = sp.getString('userName');
      final token = sp.getString('token');
      
      debugPrint('🔍 Attempting to connect to notification service...');
      debugPrint('🔍 userId: $userId');
      debugPrint('🔍 userName: $userName');
      debugPrint('🔍 token exists: ${token != null}');
      
      if (userId == null) {
        debugPrint('❌ Cannot connect to notifications: No userId found');
        return;
      }

      // Connect to Socket.IO server - use same base as API
      // For localhost, Socket.IO connects to base URL without /api prefix
      // const socketUrl = 'http://10.0.2.2:5000'; // For localhost (if backend has Socket.IO)
      const socketUrl = 'https://mangocodehive.xyz'; // For deployed server with Socket.IO
      
      debugPrint('🔌 Connecting to Socket.IO at: $socketUrl');
      
      _socket = IO.io(
        socketUrl,
        IO.OptionBuilder()
            .setTransports(['websocket'])
            .disableAutoConnect()
            .setExtraHeaders({'authorization': 'Bearer $token'})
            .build(),
      );

      _socket?.onConnect((_) {
        debugPrint('✅ Connected to notification server with ID: ${_socket?.id}');
        debugPrint('✅ Emitting register event with userId: $userId');
        _isConnected = true;
        
        // Register user with socket server - join room using format: user-{userId}
        final roomName = 'user-$userId';
        debugPrint('✅ Joining room: $roomName');
        _socket?.emit('register', userId);
        notifyListeners();
      });

      _socket?.on('registered', (data) {
        debugPrint('✅ User registered: $data');
      });

      // Listen for ALL incoming events for debugging
      _socket?.onAny((event, data) {
        debugPrint('📡 Socket event received: $event with data: $data');
      });

      // Listen for incoming notifications (try multiple event names)
      _socket?.on('notification', (data) {
        debugPrint('🔔 New notification received (notification event): $data');
        try {
          final notification = NotificationModel.fromJson(data as Map<String, dynamic>);
          _notifications.insert(0, notification);
          _unreadCount++;
          notifyListeners();
        } catch (e) {
          debugPrint('❌ Error parsing notification: $e');
        }
      });

      // Also listen for 'newNotification' event (common alternative)
      _socket?.on('newNotification', (data) {
        debugPrint('🔔 New notification received (newNotification event): $data');
        try {
          final notification = NotificationModel.fromJson(data as Map<String, dynamic>);
          _notifications.insert(0, notification);
          _unreadCount++;
          notifyListeners();
        } catch (e) {
          debugPrint('❌ Error parsing notification: $e');
        }
      });

      _socket?.onDisconnect((_) {
        debugPrint('❌ Disconnected from notification server');
        _isConnected = false;
        notifyListeners();
      });

      _socket?.onError((error) {
        debugPrint('❌ Socket error: $error');
        debugPrint('ℹ️  If testing localhost without Socket.IO, this is expected');
      });

      _socket?.connect();
    } catch (e) {
      debugPrint('❌ Error connecting to notification service: $e');
    }
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
    notifyListeners();
  }

  void markAsRead(String notificationId) {
    final index = _notifications.indexWhere((n) => n.id == notificationId);
    if (index != -1 && !_notifications[index].read) {
      _notifications[index] = _notifications[index].copyWith(read: true);
      _unreadCount = _unreadCount > 0 ? _unreadCount - 1 : 0;
      notifyListeners();
    }
  }

  void markAllAsRead() {
    for (int i = 0; i < _notifications.length; i++) {
      if (!_notifications[i].read) {
        _notifications[i] = _notifications[i].copyWith(read: true);
      }
    }
    _unreadCount = 0;
    notifyListeners();
  }

  void clearAll() {
    _notifications.clear();
    _unreadCount = 0;
    notifyListeners();
  }

  @override
  void dispose() {
    disconnect();
    super.dispose();
  }
}
