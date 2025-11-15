// ignore_for_file: unused_element_parameter, use_build_context_synchronously

import 'package:flutter/material.dart';
import 'verification.dart';
import 'package:crag_tag/services/api.dart';

// ---------- Reusable Register form (for SignIn's PageView) ----------
class SignUpForm extends StatefulWidget {
  final VoidCallback? onSwitchToLogin;
  const SignUpForm({super.key, this.onSwitchToLogin});
  @override
  State<SignUpForm> createState() => _SignUpFormState();
}

class _SignUpFormState extends State<SignUpForm> {
  final _fnameCtrl = TextEditingController();
  final _lnameCtrl = TextEditingController();
  final _userCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  bool _obscure = true;
  bool _submitting = false;

  @override
  void dispose() {
    _fnameCtrl.dispose();
    _lnameCtrl.dispose();
    _userCtrl.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleSignup() async {
    final first = _fnameCtrl.text.trim();
    final last = _lnameCtrl.text.trim();
    final user  = _userCtrl.text.trim();
    final email = _emailCtrl.text.trim();
    final pass  = _passCtrl.text;
    final phone = _phoneCtrl.text.trim();

    if (first.isEmpty && last.isEmpty || user.isEmpty || email.isEmpty || pass.isEmpty || phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill in name, username, email and password')),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      final resp = await Api.signup(
        firstName: first,
        lastName: last,
        userName: user,
        email: email,
        password: pass,
        phone: phone,
      );
      final status = resp['status'] as int;
      final data = resp['data'] as Map;

      if (status >= 200 && status < 300) {
        if (!mounted) return;
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => VerificationPage(destination: email)),
        );
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Account created! Verification code sent to $email')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(data['error']?.toString() ?? 'Sign up failed')),
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
    return ListView(
      padding: EdgeInsets.zero,
      children: [
        TextField(
          controller: _fnameCtrl,
          keyboardType: TextInputType.name,
          style: const TextStyle(color: Colors.black, fontSize: 15),
          decoration: _inputDecoration('First Name', Icons.person_outline),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _lnameCtrl,
          keyboardType: TextInputType.name,
          style: const TextStyle(color: Colors.black, fontSize: 15),
          decoration: _inputDecoration('Last Name', Icons.person_outline),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _userCtrl,
          keyboardType: TextInputType.text,
          style: const TextStyle(color: Colors.black, fontSize: 15),
          decoration: _inputDecoration('Username', Icons.person),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _passCtrl,
          obscureText: _obscure,
          style: const TextStyle(color: Colors.black, fontSize: 15),
          decoration: _inputDecoration('Password', Icons.lock_outline).copyWith(
            suffixIcon: IconButton(
              icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined, color: Colors.grey[700]),
              onPressed: () => setState(() => _obscure = !_obscure),
            ),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _emailCtrl,
          keyboardType: TextInputType.emailAddress,
          style: const TextStyle(color: Colors.black, fontSize: 15),
          decoration: _inputDecoration('Email', Icons.email_outlined),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _phoneCtrl,
          keyboardType: TextInputType.phone,
          style: const TextStyle(color: Colors.black, fontSize: 15),
          decoration: _inputDecoration('Phone', Icons.phone),
        ),
        const SizedBox(height: 16),
        ElevatedButton(
          onPressed: _submitting ? null : _handleSignup,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF178E79),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            elevation: 0,
          ),
          child: _submitting
              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Create account', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        ),
        const SizedBox(height: 36),
        // Footer for register form
        _SignUpFooter(onSwitchToLogin: widget.onSwitchToLogin),
      ],
    );
  }
}

class _SignUpFooter extends StatelessWidget {
  final VoidCallback? onSwitchToLogin;
  const _SignUpFooter({super.key, this.onSwitchToLogin});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Text(
          "Already have an account? ",
          style: TextStyle(color: Colors.black, fontSize: 15),
        ),
        GestureDetector(
          onTap: onSwitchToLogin,
          child: const Text(
            'Sign in',
            style: TextStyle(
              color: Color(0xFF178E79),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}

// ---------- Optional: keep your full-screen SignUpPage route ----------
class SignUpPage extends StatefulWidget {
  const SignUpPage({super.key});
  @override
  State<SignUpPage> createState() => _SignUpPageState();
}

class _SignUpPageState extends State<SignUpPage> {
  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final topH = size.height * 0.36;

    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // hero
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
          // title
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
                    child: Text('Snap it, Tag it, Rate it... Conquer the Climb!',
                        style: TextStyle(color: Colors.white, fontSize: 13, fontFamily: 'sans-serif')),
                  ),
                ],
              ),
            ),
          ),
          // sheet
          Positioned(
            top: topH - 100,
            left: 0,
            right: 0,
            bottom: 0,
            child: SafeArea(
              top: false,
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: const BorderRadius.only(topLeft: Radius.circular(32), topRight: Radius.circular(32)),
                  border: const Border(top: BorderSide(color: Colors.white, width: 1)),
                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.10), blurRadius: 24, offset: const Offset(0, -6))],
                ),
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
                  children: [
                    // segmented control (back to previous route)
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF7F9FC),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: const Color(0xFFE8EDF2)),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Material(
                              color: Colors.transparent,
                              child: InkWell(
                                borderRadius: BorderRadius.circular(20),
                                onTap: () => Navigator.pop(context), // ← no circular import
                                child: const _SegmentChip(label: 'Login', selected: false),
                              ),
                            ),
                          ),
                          const Expanded(child: _SegmentChip(label: 'Register', selected: true)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // the same form as reusable widget
                    const SignUpForm(),

                    const SizedBox(height: 45),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---- shared look for sign_up.dart ----
InputDecoration _inputDecoration(String label, IconData icon) {
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

class _SegmentChip extends StatelessWidget {
  final String label;
  final bool selected;
  const _SegmentChip({required this.label, this.selected = false, super.key});

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 500),
      padding: const EdgeInsets.symmetric(vertical: 10),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: selected ? Colors.white : Colors.transparent,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(label, style: TextStyle(fontWeight: FontWeight.w600, color: selected ? Colors.black : Colors.grey[600])),
    );
  }
}
