// ignore_for_file: avoid_print

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class Api {
  // Backend URL - change this to switch between localhost and deployed
  // static const String kBase = 'http://10.0.2.2:5000'; // Use 10.0.2.2 for Android emulator localhost
  static const String kBase = 'https://mangocodehive.xyz'; // Deployed server
  static const String kAuthPrefix = '/api'; // <— this is the correct mount

  static Uri _u(String path) => Uri.parse('$kBase$kAuthPrefix$path');

  static Future<Map<String, dynamic>> login({
    required String userName,
    required String password,
  }) async {
    final res = await http.post(
      _u('/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'userName': userName, 'password': password}),
    );
    final data = _safeJson(res.body);
    
    // The token is nested in data.data.token (backend wraps response)
    if (res.statusCode == 200 && data['data'] != null && data['data']['token'] != null) {
      final sp = await SharedPreferences.getInstance();
      await sp.setString('token', data['data']['token']);
      await sp.setString('userName', userName); // Store username for profile access
      
      // Fetch user profile to get profile picture
      try {
        final profileResp = await getProfileInfo(userName: userName);
        if (profileResp['status'] == 200 && profileResp['data']['data'] != null) {
          final profileData = profileResp['data']['data'];
          final userInfo = profileData['userInfo'];
          final profilePicUrl = userInfo?['userProfilePic'];
          if (profilePicUrl != null && profilePicUrl.isNotEmpty) {
            await sp.setString('profilePicture', profilePicUrl);
          } else {
            await sp.remove('profilePicture');
          }
        }
      } catch (e) {
        // If profile fetch fails, continue with login - profile picture is not critical
      }
    }
    return {'status': res.statusCode, 'data': data};
  }

  static Future<Map<String, dynamic>> signup({
    required String firstName,
    required String lastName,
    required String userName,
    required String email,
    required String password,
    String? phone,
  }) async {
    final body = {
      'firstName': firstName,
      'lastName': lastName,
      'userName': userName,
      'email': email,
      'password': password,
      'phone': phone ?? ''
    };

    final res = await http.post(
      _u('/signup'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    
    final data = _safeJson(res.body);
    
    // Store username after successful signup
    if (res.statusCode == 200 || res.statusCode == 201) {
      final sp = await SharedPreferences.getInstance();
      await sp.setString('userName', userName);
    }
    return {'status': res.statusCode, 'data': data};
  }

  static Map<String, dynamic> _safeJson(String s) {
    try { return jsonDecode(s) as Map<String, dynamic>; }
    catch (_) { return {'error': s}; }
  }

  // Homepage feed
  static Future<Map<String, dynamic>> getHomePage({String? lastTimestamp}) async {
    final sp = await SharedPreferences.getInstance();
    final token = sp.getString('token') ?? '';
    
    String url = '/homePage';
    if (lastTimestamp != null) {
      url += '?lastTimestamp=$lastTimestamp';
    }
    
    final res = await http.get(
      _u(url),
      headers: {'Authorization': 'Bearer $token'},
    );
    
    return {'status': res.statusCode, 'data': _safeJson(res.body)};
  }

  // Password reset
  static Future<Map<String, dynamic>> sendCode({required String email}) async {
    final res = await http.get(_u('/sendCode?email=$email'));
    return {'status': res.statusCode, 'data': _safeJson(res.body)};
  }

  static Future<Map<String, dynamic>> checkCode({required String code}) async {
    final res = await http.post(
      _u('/checkCode'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'code': code}),
    );
    return {'status': res.statusCode, 'data': _safeJson(res.body)};
  }

  static Future<Map<String, dynamic>> changePassword({
    required String id,
    required String newPassword,
    required String samePassword,
  }) async {
    final res = await http.post(
      _u('/changePassword'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'id': id,
        'newPassword': newPassword,
        'samePassword': samePassword,
      }),
    );
    return {'status': res.statusCode, 'data': _safeJson(res.body)};
  }

  // Posts
  static Future<Map<String, dynamic>> addPost({
    required String caption,
    required int difficulty,
    required int rating,
    required List<Map<String, String>> images,
    String? location,
  }) async {
    final sp = await SharedPreferences.getInstance();
    final token = sp.getString('token') ?? '';
    
    final res = await http.post(
      _u('/addPost'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'caption': caption,
        'difficulty': difficulty,
        'rating': rating,
        'images': images,
        'location': location,
      }),
    );
    
    return {'status': res.statusCode, 'data': _safeJson(res.body)};
  }

  static Future<Map<String, dynamic>> likePost({required String postId}) async {
    final sp = await SharedPreferences.getInstance();
    final token = sp.getString('token') ?? '';
    
    final res = await http.post(
      _u('/likePost'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'postId': postId}),
    );
    return {'status': res.statusCode, 'data': _safeJson(res.body)};
  }

  static Future<Map<String, dynamic>> unlikePost({required String postId}) async {
    final sp = await SharedPreferences.getInstance();
    final token = sp.getString('token') ?? '';
    
    final res = await http.post(
      _u('/unlikePost'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'postId': postId}),
    );
    return {'status': res.statusCode, 'data': _safeJson(res.body)};
  }

  static Future<Map<String, dynamic>> deletePost({required String postId}) async {
    final sp = await SharedPreferences.getInstance();
    final token = sp.getString('token') ?? '';
    
    final res = await http.delete(
      _u('/deletePost'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'postId': postId}),
    );
    return {'status': res.statusCode, 'data': _safeJson(res.body)};
  }

  static Future<Map<String, dynamic>> updatePost({
    required String postId,
    String? caption,
    List<Map<String, dynamic>>? images,
    int? difficulty,
    int? rating,
    String? location,
  }) async {
    final sp = await SharedPreferences.getInstance();
    final token = sp.getString('token') ?? '';
    
    final Map<String, dynamic> body = {'postId': postId};
    if (caption != null) body['caption'] = caption;
    if (images != null) body['images'] = images;
    if (difficulty != null) body['difficulty'] = difficulty;
    if (rating != null) body['rating'] = rating;
    if (location != null) body['location'] = location;
    
    final res = await http.put(
      _u('/updatePost'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(body),
    );
    final data = _safeJson(res.body);
    
    // Update token if provided
    if (res.statusCode == 200 && data['data'] != null && data['data']['refreshedToken'] != null) {
      await sp.setString('token', data['data']['refreshedToken']);
    }
    
    return {'status': res.statusCode, 'data': data};
  }

  // Comments
  static Future<Map<String, dynamic>> addComment({
    required String postId,
    required String commentText,
  }) async {
    final sp = await SharedPreferences.getInstance();
    final token = sp.getString('token') ?? '';
    
    final res = await http.post(
      _u('/addComment'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'postId': postId, 'commentText': commentText}),
    );
    
    final data = _safeJson(res.body);

    
    return {'status': res.statusCode, 'data': data};
  }

  static Future<Map<String, dynamic>> getComments({
    required String postId,
    String? lastTimestamp,
  }) async {
    final sp = await SharedPreferences.getInstance();
    final token = sp.getString('token') ?? '';
    
    String url = '/getComments?postID=$postId';
    if (lastTimestamp != null) {
      url += '&lastTimestamp=$lastTimestamp';
    }
    
    final res = await http.get(
      _u(url),
      headers: {'Authorization': 'Bearer $token'},
    );
    return {'status': res.statusCode, 'data': _safeJson(res.body)};
  }

  static Future<Map<String, dynamic>> deleteComment({
    required String commentId,
  }) async {
    final sp = await SharedPreferences.getInstance();
    final token = sp.getString('token') ?? '';
    
    final res = await http.delete(
      _u('/deleteComment'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'commentID': commentId}),
    );
    
    final data = _safeJson(res.body);
    
    // Save refreshed token if provided
    if (data['refreshedToken'] != null) {
      await sp.setString('token', data['refreshedToken']);
    }
    
    return {'status': res.statusCode, 'data': data};
  }

  static Future<Map<String, dynamic>> updateComment({
    required String commentId,
    required String text,
  }) async {
    final sp = await SharedPreferences.getInstance();
    final token = sp.getString('token') ?? '';
    
    final res = await http.post(
      _u('/changeComment'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'commentID': commentId, 'text': text}),
    );
    
    final data = _safeJson(res.body);
    
    // Save refreshed token if provided
    if (data['refreshedToken'] != null) {
      await sp.setString('token', data['refreshedToken']);
    }
    
    return {'status': res.statusCode, 'data': data};
  }

  // New: Get likes for a post
  static Future<Map<String, dynamic>> getLikes({
    required String postId,
    String? lastTimestamp,
  }) async {
    final sp = await SharedPreferences.getInstance();
    final token = sp.getString('token') ?? '';
    
    String url = '/getLikes?postID=$postId';
    if (lastTimestamp != null) {
      url += '&lastTimestamp=$lastTimestamp';
    }
    
    final res = await http.get(
      _u(url),
      headers: {'Authorization': 'Bearer $token'},
    );
    return {'status': res.statusCode, 'data': _safeJson(res.body)};
  }

  // S3 Image handling
  static Future<Map<String, dynamic>> getUploadUrl({
    required String fileType,
    String type = 'post', // 'post' or 'profile'
  }) async {
    final sp = await SharedPreferences.getInstance();
    final token = sp.getString('token') ?? '';
    
    // Map file extension to MIME type
    String contentType;
    String ext;
    
    switch (fileType.toLowerCase()) {
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        ext = 'jpg';
        break;
      case 'png':
        contentType = 'image/png';
        ext = 'png';
        break;
      case 'webp':
        contentType = 'image/webp';
        ext = 'webp';
        break;
      case 'heic':
        contentType = 'image/heic';
        ext = 'heic';
        break;
      default:
        contentType = 'image/jpeg';
        ext = 'jpg';
    }
    
    final res = await http.post(
      _u('/uploads/url'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'contentType': contentType, 'ext': ext, 'type': type}),
    );
    return {'status': res.statusCode, 'data': _safeJson(res.body)};
  }

  static Future<Map<String, dynamic>> getDownloadUrl({
    required String key,
  }) async {
    final sp = await SharedPreferences.getInstance();
    final token = sp.getString('token') ?? '';
    
    final res = await http.post(
      _u('/downloads/url'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'key': key}),
    );
    
    return {'status': res.statusCode, 'data': _safeJson(res.body)};
  }

  static Future<bool> uploadToS3({
    required String presignedUrl,
    required List<int> fileBytes,
    required String contentType,
  }) async {
    try {
      final res = await http.put(
        Uri.parse(presignedUrl),
        headers: {'Content-Type': contentType},
        body: fileBytes,
      );
      return res.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // ============================================================================
  // Profile Endpoints
  // ============================================================================

  static Future<Map<String, dynamic>> getPersonalPosts({
    required String userName,
    String? lastTimestamp,
  }) async {
    final sp = await SharedPreferences.getInstance();
    final token = sp.getString('token') ?? '';
    
    String url = '/personalPosts?userName=$userName';
    if (lastTimestamp != null) {
      url += '&lastTimestamp=$lastTimestamp';
    }
    
    final res = await http.get(
      _u(url),
      headers: {'Authorization': 'Bearer $token'},
    );
    final data = _safeJson(res.body);
    
    // Update token if provided
    if (res.statusCode == 200 && data['data'] != null && data['data']['refreshedToken'] != null) {
      await sp.setString('token', data['data']['refreshedToken']);
    }
    
    return {'status': res.statusCode, 'data': data};
  }

  static Future<Map<String, dynamic>> getProfileInfo({required String userName}) async {
    final sp = await SharedPreferences.getInstance();
    final token = sp.getString('token') ?? '';
    
    final res = await http.get(
      _u('/getProfileInfo?userName=$userName'),
      headers: {'Authorization': 'Bearer $token'},
    );
    final data = _safeJson(res.body);
    
    // Update token if provided
    if (res.statusCode == 200 && data['data'] != null && data['data']['refreshedToken'] != null) {
      await sp.setString('token', data['data']['refreshedToken']);
    }
    
    return {'status': res.statusCode, 'data': data};
  }

  static Future<Map<String, dynamic>> updateProfileInfo({
    required String userName,
    String? phone,
    String? firstName,
    String? lastName,
    String? profileDescription,
    String? profilePicture,
  }) async {
    final sp = await SharedPreferences.getInstance();
    final token = sp.getString('token') ?? '';
    
    // Build body - send values as provided (including empty strings)
    final body = <String, dynamic>{};
    if (phone != null) body['phone'] = phone;
    if (firstName != null) body['firstName'] = firstName;
    if (lastName != null) body['lastName'] = lastName;
    if (profileDescription != null) body['profileDescription'] = profileDescription;
    
    final res = await http.post(
      _u('/changeProfileInfo'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(body),
    );
    final data = _safeJson(res.body);
    
    // Update token if provided
    if (res.statusCode == 200 && data['data'] != null && data['data']['refreshedToken'] != null) {
      await sp.setString('token', data['data']['refreshedToken']);
    }
    
    return {'status': res.statusCode, 'data': data};
  }

  // New endpoint from Angelo - upload profile picture key after S3 upload
  static Future<Map<String, dynamic>> uploadProfilePictureKey({
    required String key,
  }) async {
    final sp = await SharedPreferences.getInstance();
    final token = sp.getString('token') ?? '';
    
    final res = await http.post(
      _u('/uploadProfilePictureKey'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'key': key}),
    );
    final data = _safeJson(res.body);
    
    // Update token if provided
    if (res.statusCode == 200 && data['data'] != null && data['data']['refreshedToken'] != null) {
      await sp.setString('token', data['data']['refreshedToken']);
    }
    
    return {'status': res.statusCode, 'data': data};
  }
}

