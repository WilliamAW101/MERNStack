// ignore_for_file: unused_element_parameter, deprecated_member_use

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'sign_up.dart'; // ← for SignUpForm
import 'forgot_password.dart';
import '../home.dart';
import 'package:crag_tag/services/api.dart';


class SignInPage extends StatefulWidget {
  const SignInPage({super.key});

  @override
  State<SignInPage> createState() => _SignInPageState();
}

class _SignInPageState extends State<SignInPage> {
  bool _loginObscure = true;
  final PageController _pageController = PageController(initialPage: 0);
  int _tab = 0; // 0 = Login, 1 = Register
  
  // put near top of your State
  static const double _loginFormHeight = 300;    // was 360
  static const double _registerFormHeight = 520; // increased to show all fields
  static const _anim = Duration(milliseconds: 250);
  static const Curve _curve = Curves.easeOutCubic;


  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void switchToLogin() {
    setState(() => _tab = 0);
    _pageController.animateToPage(
      0,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final topH = size.height * 0.36;

    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // ----- hero -----
          Container(
            height: topH,
            width: double.infinity,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color.fromARGB(255, 9, 85, 74), Color(0xFF171B22)],
              ),
            ),
          ),

          // ----- title/subtitle -----
          SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Image.asset('assets/images/icon.png',
                      width: 60, height: 60, color: Colors.white, colorBlendMode: BlendMode.srcIn),
                  const SizedBox(height: 0),
                  Padding(
                    padding: const EdgeInsets.only(left: 5),
                    child: RichText(
                      text: const TextSpan(
                        style: TextStyle(
                          fontFamily: 'sans-serif',
                          color: Colors.white,
                          height: 1.2,
                          shadows: [Shadow(offset: Offset(0.5, 0.5), blurRadius: 6, color: Colors.black45)],
                        ),
                        children: [
                          TextSpan(text: 'C', style: TextStyle(fontSize: 35, fontWeight: FontWeight.w500)),
                          TextSpan(text: 'rag\n', style: TextStyle(fontSize: 25, fontWeight: FontWeight.w400)),
                          TextSpan(text: 'T', style: TextStyle(fontSize: 35, fontWeight: FontWeight.w500)),
                          TextSpan(text: 'ag', style: TextStyle(fontSize: 25, fontWeight: FontWeight.w400)),
                        ],
                      ),
                    ),
                  ),
                  const Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: Text(
                      'Snap it, Tag it, Rate it... Conquer the Climb!',
                      style: TextStyle(color: Colors.white, fontSize: 13, fontFamily: 'sans-serif'),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ----- white sheet -----
          Positioned(
            top: topH - 75,
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: const BorderRadius.only(topLeft: Radius.circular(32), topRight: Radius.circular(32)),
                border: const Border(top: BorderSide(color: Colors.white, width: 1)),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.10), blurRadius: 24, offset: const Offset(0, -6))],
              ),
              child: SafeArea(
                top: false,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
                  children: [
                    // segmented control
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: Colors.transparent),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              borderRadius: BorderRadius.circular(20),
                              splashFactory: NoSplash.splashFactory,
                              onTap: () {
                                setState(() => _tab = 0);
                                _pageController.animateToPage(
                                  0,
                                  duration: const Duration(milliseconds: 400),
                                  curve: Curves.easeOutCubic,
                                );
                              },
                              child: _SegmentChip(label: 'Login', selected: _tab == 0),
                            ),
                          ),
                          Expanded(
                            child: InkWell(
                              borderRadius: BorderRadius.circular(20),
                              splashFactory: NoSplash.splashFactory,
                              onTap: () {
                                setState(() => _tab = 1);
                                _pageController.animateToPage(
                                  1,
                                  duration: const Duration(milliseconds: 400),
                                  curve: Curves.easeOutCubic,
                                );
                              },
                              child: _SegmentChip(label: 'Register', selected: _tab == 1),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 25),

                    // sliding forms
                    AnimatedSize(
                      duration: _anim,
                      curve: _curve,
                      child: SizedBox(
                        height: _tab == 0 ? _loginFormHeight : _registerFormHeight,
                        child: PageView(
                          controller: _pageController,
                          physics: const BouncingScrollPhysics(),
                          onPageChanged: (i) => setState(() => _tab = i),
                          children: [
                            _LoginForm(
                              obscure: _loginObscure,
                              onToggleObscure: () => setState(() => _loginObscure = !_loginObscure),
                            ),
                            SignUpForm(
                              onSwitchToLogin: switchToLogin,
                            ),
                          ],
                        ),
                      ),
                    ),


                    const SizedBox(height: 0),

                    // footer switch - only show for login tab
                    if (_tab == 0)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text(
                            "Don't have an account? ",
                            style: TextStyle(color: Colors.black, fontSize: 15),
                          ),
                          GestureDetector(
                            onTap: () {
                              setState(() => _tab = 1);
                              _pageController.animateToPage(
                                1,
                                duration: const Duration(milliseconds: 300),
                                curve: Curves.easeOutCubic,
                              );
                            },
                            child: const Text(
                              'Sign up',
                              style: TextStyle(
                                color: Color(0xFF178E79),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),

                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ---------- subwidgets & helpers ----------
  static InputDecoration _inputDecoration(String label, IconData icon) {
    return InputDecoration(
      labelText: label,
      prefixIcon: Icon(icon, color: Colors.black),
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(vertical: 16, horizontal: 14),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFFE8EDF2), width: 1),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color.fromARGB(255, 62, 116, 108), width: 1.4),
      ),
    );
  }
}

class _SegmentChip extends StatelessWidget {
  final String label;
  final bool selected;
  const _SegmentChip({required this.label, this.selected = false, super.key});

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      padding: const EdgeInsets.symmetric(vertical: 10),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: selected
            ? [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 10, offset: const Offset(0, 2))]
            : [],
      ),
      child: Text(label, style: TextStyle(fontWeight: FontWeight.w600, color: selected ? Colors.black : Colors.grey[600])),
    );
  }
}

class _LoginForm extends StatefulWidget {
  final bool obscure;
  final VoidCallback onToggleObscure;
  const _LoginForm({required this.obscure, required this.onToggleObscure, super.key});

  @override
  State<_LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<_LoginForm> {
  final TextEditingController _userCtrl = TextEditingController();
  final TextEditingController _passCtrl = TextEditingController();
  bool _submitting = false;
  bool _rememberMe = false;

  @override
  void initState() {
    super.initState();
    _loadSavedCredentials();
  }

  @override
  void dispose() {
    _userCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadSavedCredentials() async {
    final sp = await SharedPreferences.getInstance();
    final savedUsername = sp.getString('saved_username');
    final savedPassword = sp.getString('saved_password');
    final rememberMe = sp.getBool('remember_me') ?? false;

    if (rememberMe && savedUsername != null && savedPassword != null) {
      setState(() {
        _userCtrl.text = savedUsername;
        _passCtrl.text = savedPassword;
        _rememberMe = true;
      });
    }
  }

  Future<void> _saveCredentials(String username, String password) async {
    final sp = await SharedPreferences.getInstance();
    if (_rememberMe) {
      await sp.setString('saved_username', username);
      await sp.setString('saved_password', password);
      await sp.setBool('remember_me', true);
    } else {
      await sp.remove('saved_username');
      await sp.remove('saved_password');
      await sp.setBool('remember_me', false);
    }
  }

  Future<void> _handleLogin() async {
    final u = _userCtrl.text.trim();
    final p = _passCtrl.text;
    if (u.isEmpty || p.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter username and password')),
      );
      return;
    }
    setState(() => _submitting = true);
    try {
      final resp = await Api.login(userName: u, password: p);
      final status = resp['status'] as int;
      final data = resp['data'] as Map;

      if (status == 200) {
        // Save credentials if remember me is checked
        await _saveCredentials(u, p);
        
        if (!mounted) return;
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const HomePage()),
          (r) => false,
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(data['error']?.toString() ?? 'Login failed')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    InputDecoration deco(String l, IconData i) => _SignInPageState._inputDecoration(l, i);
    return ListView(
      padding: EdgeInsets.zero,
      children: [
        TextField(
          controller: _userCtrl,
          keyboardType: TextInputType.text,
          style: const TextStyle(color: Colors.black, fontSize: 15),
          decoration: deco('Username', Icons.person_outline),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _passCtrl,
          obscureText: widget.obscure,
          style: const TextStyle(color: Colors.black, fontSize: 15),
          decoration: deco('Password', Icons.lock_outline).copyWith(
            suffixIcon: IconButton(
              icon: Icon(
                widget.obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                color: Colors.grey[700],
              ),
              onPressed: widget.onToggleObscure,
            ),
          ),
        ),
        const SizedBox(height: 10),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(children: [
              Checkbox(
                value: _rememberMe,
                onChanged: (value) {
                  setState(() {
                    _rememberMe = value ?? false;
                  });
                },
                activeColor: const Color(0xFF09554A),
              ),
              const Text('Remember me', style: TextStyle(color: Colors.black, fontSize: 15)),
            ]),
            TextButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const ForgotPasswordPage()),
                );
              },
              child: const Text('Forgot password?', style: TextStyle(color: Colors.black, fontSize: 15)),
            ),
          ],
        ),
        const SizedBox(height: 16),
        ElevatedButton(
          onPressed: _submitting ? null : _handleLogin,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF178E79),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            elevation: 0,
          ),
          child: _submitting
              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Sign in', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        ),
      ],
    );
  }
}


