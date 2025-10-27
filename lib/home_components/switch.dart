import 'package:flutter/material.dart';

/* =========================
 * LIGHT/DARK TOGGLE SWITCH
 * ========================= */
/// A compact day/night toggle with animated background + scenes.
/// `value == true` => DARK (moon + tent). `false` => LIGHT (sun + hiker).
class LightDarkToggle extends StatelessWidget {
  const LightDarkToggle({
    super.key,
    required this.value,
    required this.onChanged,
    this.width = 100,
    this.height = 44,
    this.duration = const Duration(milliseconds: 280),
    this.lightGradient = const LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [Color.fromARGB(255, 189, 231, 255), Color.fromARGB(255, 210, 233, 255)], // sky blue -> light green
    ),
    this.darkGradient = const LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [Color(0xFF1E2A44), Color(0xFF2E4A7E)], // navy -> blue glow
    ),
  });

  /// true = dark, false = light
  final bool value;
  final ValueChanged<bool> onChanged;

  /// Size
  final double width;
  final double height;

  /// Animation timing
  final Duration duration;

  /// Track backgrounds for light/dark
  final Gradient lightGradient;
  final Gradient darkGradient;

  @override
  Widget build(BuildContext context) {
    final knobSize = height - 8; // 4px padding on each side

    return GestureDetector(
      onTap: () => onChanged(!value),
      child: AnimatedContainer(
        duration: duration,
        curve: Curves.easeOutCubic,
        width: width,
        height: height,
        decoration: BoxDecoration(
          gradient: value ? darkGradient : lightGradient,
          borderRadius: BorderRadius.circular(height / 2),
        ),
        child: Stack(
          children: [
            // ---- Scenes (fade between them) ----
            Positioned.fill(
              child: AnimatedOpacity(
                opacity: value ? 0 : 1, // show DAY when !value
                duration: duration,
                child: _DayScene(isDark: value),
              ),
            ),
            Positioned.fill(
              child: AnimatedOpacity(
                opacity: value ? 1 : 0, // show NIGHT when value
                duration: duration,
                child: const _NightScene(),
              ),
            ),

            // ---- Knob (white circle) ----
            AnimatedAlign(
              duration: duration,
              curve: Curves.easeOutCubic,
              alignment:
                  value ? Alignment.centerRight : Alignment.centerLeft,
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: Container(
                  width: knobSize,
                  height: knobSize,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(.18),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/* =========================
 * DAY SCENE (sun + hiker)
 * ========================= */

class _DayScene extends StatelessWidget {
  const _DayScene({required this.isDark});
  final bool isDark; // true when night

  @override
  Widget build(BuildContext context) {
    // Nudge to the right in day so the knob on the left doesn’t cover it.
    final double shift = isDark ? 0 : 10;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 6),
      child: Transform.translate(
        offset: Offset(shift, 0),
        child: Stack(
          children: const [
            // Sun (top-right)
            Positioned(
              right: 10,
              top: 6,
              child: Icon(Icons.wb_sunny_rounded, size: 18, color: Color(0xFFFFEB69)),
            ),

            // Ground (day color)
            Positioned(
              left: 8,
              right: 8,
              bottom: 6,
              child: _DayGround(),
            ),

            // Hiker (right)
            Positioned(
              right: 24,
              bottom: 8,
              child: Icon(Icons.hiking, size: 18, color: Colors.black87),
            ),
          ],
        ),
      ),
    );
  }
}

class _DayGround extends StatelessWidget {
  const _DayGround();
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 8,
      decoration: BoxDecoration(
        color: const Color(0xFF55C2A7), // lighter green for day
        borderRadius: BorderRadius.circular(6),
      ),
    );
  }
}

/* =========================
 * NIGHT SCENE (moon + tent)
 * ========================= */

class _NightScene extends StatelessWidget {
  const _NightScene();

  // Positions
  static const double _moonLeft = 8;
  static const double _moonTop = 6;

  static const double _star1Top = 6;
  static const double _star1Left = 34;
  static const double _star2Top = 12;
  static const double _star2Left = 26;
  static const double _star3Top = 16;
  static const double _star3Left = 42;

  static const double _groundLeft = 8;
  static const double _groundRight = 8;
  static const double _groundBottom = 6;

  static const double _tentLeft = 16;
  static const double _tentBottom = 8;

  @override
  Widget build(BuildContext context) {
    final star = Icon(
      Icons.star_rounded,
      size: 6,
      color: Colors.white.withOpacity(.9),
    );

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 6),
      child: Stack(
        children: [
          const Positioned(
            left: _moonLeft,
            top: _moonTop,
            child: Icon(Icons.nightlight_round, size: 18, color: Colors.white),
          ),
          Positioned(top: _star1Top, left: _star1Left, child: star),
          Positioned(top: _star2Top, left: _star2Left, child: star),
          Positioned(top: _star3Top, left: _star3Left, child: star),

          // Ground stripe (night color)
          Positioned(
            left: _groundLeft,
            right: _groundRight,
            bottom: _groundBottom,
            child: Container(
              height: 8,
              decoration: BoxDecoration(
                color: const Color(0xFF2E5B4C),
                borderRadius: BorderRadius.circular(6),
              ),
            ),
          ),

          // Tent
          const Positioned(
            left: _tentLeft,
            bottom: _tentBottom,
            child: _Tent(size: 22),
          ),
        ],
      ),
    );
  }
}

/* =========================
 * Tent painter
 * ========================= */

class _Tent extends StatelessWidget {
  const _Tent({required this.size});
  final double size;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: Size(size, size * .65),
      painter: _TentPainter(),
    );
  }
}

class _TentPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final base = Paint()..color = const Color(0xFF3FA3A3);
    final flap = Paint()..color = const Color(0xFF255B5B);
    final stroke = Paint()
      ..color = Colors.white.withOpacity(.85)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;

    // Triangle body
    final p = Path()
      ..moveTo(0, size.height)
      ..lineTo(size.width * .5, 0)
      ..lineTo(size.width, size.height)
      ..close();
    canvas.drawPath(p, base);

    // Front flap
    final flapPath = Path()
      ..moveTo(size.width * .5, 0)
      ..lineTo(size.width * .5, size.height)
      ..lineTo(size.width * .65, size.height)
      ..close();
    canvas.drawPath(flapPath, flap);

    // Outline
    canvas.drawPath(p, stroke);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
