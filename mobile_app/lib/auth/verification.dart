import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'sign_in.dart';

class VerificationPage extends StatefulWidget {
  final String destination;   // “We sent a code to …”
  final String expectedCode;  // server code to validate against

  const VerificationPage({
    super.key,
    required this.destination,
    required this.expectedCode,
  });

  static String generateCode([int len = 6]) {
    final r = Random();
    return List.generate(len, (_) => r.nextInt(10)).join();
  }

  @override
  State<VerificationPage> createState() => _VerificationPageState();
}

class _VerificationPageState extends State<VerificationPage> {
  static const _len = 6;

  final _nodes = List.generate(_len, (_) => FocusNode());
  final _ctrs  = List.generate(_len, (_) => TextEditingController());

  Timer? _timer;
  int _seconds = 60;
  String? _status; // "success" | "error" | null

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    for (final n in _nodes) n.dispose();
    for (final c in _ctrs) c.dispose();
    super.dispose();
  }

  void _startTimer() {
    _timer?.cancel();
    setState(() => _seconds = 60);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_seconds <= 1) t.cancel();
      setState(() => _seconds = (_seconds - 1).clamp(0, 60));
    });
  }

  String get _entered => _ctrs.map((c) => c.text).join();

  void _verify() {
    final ok = _entered.length == _len && _entered == widget.expectedCode;
    setState(() => _status = ok ? "success" : "error");
    if (ok) {
      Future.delayed(const Duration(milliseconds: 450), () {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Verified! Please sign in.')),
        );
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const SignInPage()),
          (route) => false,
        );
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    // Force neutral Material colors so no grey press overlays hide content
    Theme.of(context).copyWith(
      splashFactory: NoSplash.splashFactory,
      splashColor: Colors.transparent,
      highlightColor: Colors.transparent,
      hoverColor: Colors.transparent,
      focusColor: Colors.transparent,
      textTheme: Theme.of(context).textTheme.apply(
            bodyColor: Colors.black,
            displayColor: Colors.black,
          ),
    );

    const dark = Colors.black;
    const accent = Color(0xFF178E79);
    const success = Color(0xFF2DBE7A);
    const error = Color(0xFFE44D4D);
    const border = Color(0xFFE8EDF2);

    final isError = _status == 'error';
    final isSuccess = _status == 'success';

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
            top: topH - 75,
            left: 0,
            right: 0,
            bottom: 0,
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(32), topRight: Radius.circular(32),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.10),
                      blurRadius: 24,
                      offset: const Offset(0, -6),
                    ),
                  ],
                ),
                child: SafeArea(
                  top: false,
                  child: ListView(
                    padding: EdgeInsets.fromLTRB(20, 24, 20, 24 + MediaQuery.of(context).viewInsets.bottom),
                    children: [
                      const SizedBox(height: 6),
                      const Text(
                        'Enter the Verification Code',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w600,
                          color: dark,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        "We've sent a 6-digit code to ${widget.destination}. Enter it below to continue.",
                        style: TextStyle(color: Colors.grey.shade700, fontSize: 14.5),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 24),

                      // OTP boxes
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: List.generate(_len, (i) {
                          final boxBorder = isSuccess
                              ? success
                              : (isError ? error : border);
                          return _OtpBox(
                            controller: _ctrs[i],
                            node: _nodes[i],
                            borderColor: boxBorder,
                            onChanged: (v) {
                              setState(() => _status = null);
                              if (v.isNotEmpty) {
                                if (i < _len - 1) _nodes[i + 1].requestFocus();
                              } else {
                                if (i > 0) _nodes[i - 1].requestFocus();
                              }
                            },
                            onSubmitted: (v) {
                              if (i == _len - 1) _verify();
                            },
                          );
                        }),
                      ),

                      const SizedBox(height: 12),

                      if (isError || isSuccess)
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(isSuccess ? Icons.check_circle : Icons.error_outline,
                                color: isSuccess ? success : error, size: 18),
                            const SizedBox(width: 6),
                            Text(
                              isSuccess ? 'Code verified' : 'Incorrect code. Try again.',
                              style: TextStyle(
                                color: isSuccess ? success : error,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),

                      const SizedBox(height: 12),

                      // resend
                      Center(
                        child: TextButton(
                          onPressed: null, // wire to your resend endpoint if needed
                          child: const Text('Send code again',
                              style: TextStyle(color: accent, fontWeight: FontWeight.w600)),
                        ),
                      ),

                      const SizedBox(height: 12),

                      // Verify button
                      ElevatedButton(
                        onPressed: _verify,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: accent,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                          elevation: 0,
                        ),
                        child: const Text('Verify',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
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
}

class _OtpBox extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode node;
  final ValueChanged<String> onChanged;
  final ValueChanged<String>? onSubmitted;
  final Color borderColor;

  const _OtpBox({
    required this.controller,
    required this.node,
    required this.onChanged,
    required this.borderColor,
    this.onSubmitted,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 44,
      child: TextField(
        controller: controller,
        focusNode: node,
        textAlign: TextAlign.center,
        style: const TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: Colors.black, // force visible text
        ),
        keyboardType: TextInputType.number,
        inputFormatters: [
          FilteringTextInputFormatter.digitsOnly,
          LengthLimitingTextInputFormatter(1),
        ],
        decoration: InputDecoration(
          isDense: true,
          contentPadding: const EdgeInsets.symmetric(vertical: 12),
          filled: true,
          fillColor: Colors.white,
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: BorderSide(color: borderColor, width: 1),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: BorderSide(color: borderColor, width: 1.4),
          ),
        ),
        onChanged: onChanged,
        onSubmitted: onSubmitted,
      ),
    );
  }
}
