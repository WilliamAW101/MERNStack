// ignore_for_file: avoid_print

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class Api {
  static const String kBase = 'http://167.71.110.136:5000';
  static const String kAuthPrefix = '/api'; // <— this is the correct mount

  static Uri _u(String path) => Uri.parse('$kBase$kAuthPrefix$path');

  static Future<Map<String, dynamic>> login({
    required String userName,
    required String password,
  }) async {
    print('LOGIN URL => ${_u('/login')}');  // <-- paste this here
    print('LOGIN BODY => ${jsonEncode({'userName': userName, 'password': password})}'); // optional
    final res = await http.post(
      _u('/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'userName': userName, 'password': password}),
    );
    final data = _safeJson(res.body);
    if (res.statusCode == 200 && data['token'] != null) {
      final sp = await SharedPreferences.getInstance();
      await sp.setString('token', data['token']);
    }
    print('LOGIN RES => ${res.statusCode} ${res.body}');
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

    print('SIGNUP URL => ${_u('/signup')}'); // <-- paste this here
    print('SIGNUP BODY => ${jsonEncode(body)}'); // optional
    final res = await http.post(
      _u('/signup'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    print('SIGNUP RES => ${res.statusCode} ${res.body}');
    return {'status': res.statusCode, 'data': _safeJson(res.body)};
  }

  static Map<String, dynamic> _safeJson(String s) {
    try { return jsonDecode(s) as Map<String, dynamic>; }
    catch (_) { return {'error': s}; }
  }
}
