// ignore_for_file: deprecated_member_use

import 'package:flutter/material.dart';
import 'sign_in.dart';

class WelcomePage extends StatelessWidget {
  const WelcomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Background photo
          Image.asset('assets/images/Crag_Tag.jpg', fit: BoxFit.cover),

          // Gentle brighten (top) and darken (bottom) to improve legibility
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                stops: const [0.0, 0.40, 1.0],
                colors: [
                  Colors.white.withOpacity(0.35), // brighten sky
                  Colors.transparent,             // natural mid
                  Colors.black.withOpacity(0.32), // darken near text/button
                ],
              ),
            ),
          ),

          // White bottom card with content
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            top: MediaQuery.of(context).size.height * 0.60, // pushes it up (smaller value = higher)
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(28),
                  topRight: Radius.circular(28),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.12),
                    blurRadius: 24,
                    offset: const Offset(0, -8),
                  ),
                ],
              ),
              child: const Padding(
                padding: EdgeInsets.fromLTRB(24, 20, 24, 20),
                child: _BottomCardContent(),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BottomCardContent extends StatelessWidget {
  const _BottomCardContent();

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        // Small drag handle (optional)
        Container(
          width: 44,
          height: 5,
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: const Color(0xFFE5E8ED),
            borderRadius: BorderRadius.circular(3),
          ),
        ),

        // Title
        const Text(
          'Your Adventure Starts Here',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.black,
            fontSize: 28,
            fontWeight: FontWeight.w500,
            height: 1.2,
            letterSpacing: 0.2,
          ),
        ),
        const SizedBox(height: 20),

        // Subtitle
        Text(
          'Post your favorite climbs, explore top-rated trails, and connect with a global community of adventurers sharing their best hiking and climbing locations.',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.grey.shade700,
            fontSize: 14.5,
            height: 1.5,
          ),
        ),

        const SizedBox(height: 20),

        // Progress dots (optional)
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            _Dot(active: true),
            SizedBox(width: 0),
          ],
        ),

        const SizedBox(height: 60),

        // Get Started
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(builder: (_) => const SignInPage()),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF178E79),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              elevation: 0,
            ),
            child: const Text(
              'Start Exploring',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
                letterSpacing: 0.2,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _Dot extends StatelessWidget {
  final bool active;
  const _Dot({required this.active});

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      width: active ? 100 : 6,
      height: 3,
      decoration: BoxDecoration(
        color: active ? const Color(0xFF178E79) : const Color(0xFFDADFE5),
        borderRadius: BorderRadius.circular(8),
      ),
    );
  }
}
