import 'package:flutter/material.dart';
import 'home_components/navbar.dart';
import 'home.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final ThemeController _theme = ThemeController();  // ← shared controller
  int _tab = 4;        // start on Profile tab
  int _filter = 0;     // 0=Feed, 1=Favorites

  @override
  Widget build(BuildContext context) {
    final theme = ThemeData(
      useMaterial3: true,
      brightness: _theme.isDark ? Brightness.dark : Brightness.light,
      colorSchemeSeed: const Color.fromARGB(255, 94, 116, 201), // lime accent like mock
    );

    final cs = theme.colorScheme;

    return AnimatedBuilder(
  animation: _theme,
  builder: (context, _) {
    final theme = ThemeData(
      useMaterial3: true,
      brightness: _theme.isDark ? Brightness.dark : Brightness.light,
      colorSchemeSeed: const Color.fromARGB(255, 94, 116, 201),
    );
    return Theme(
      data: theme,
      child: Scaffold(
        extendBody: true,

        // ---------- Header (keep your logo + toggle) ----------
        appBar: AppBar(
        automaticallyImplyLeading: false,
        titleSpacing: 20,
        title: const Text(
          'My profile',
          style: TextStyle(
            fontWeight: FontWeight.w600,
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 20),
            child: IconButton(
              icon: const Icon(Icons.settings, size: 26),
              onPressed: () {
                showModalBottomSheet(
                  context: context,
                  showDragHandle: true,
                  backgroundColor: Colors.white,
                  builder: (_) => const SizedBox(
                    height: 250,
                    child: Center(
                      child: Text('Settings page (coming soon)'),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),


        // ---------- Body ----------
        body: ListView(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 120),
          children: [
            // top row (title + counters)
            const SizedBox(height: 0),

            // avatar + name + verified
            Center(
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 44,
                    backgroundImage: const NetworkImage(
                      'https://images.oxu.az/2024/10/14/Kp3SfhJel8KI2cFRbgg7rAM3vduIkZl0IPkW6ihu:1200.webp',
                    ),
                    backgroundColor: cs.surfaceVariant,
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text('Ronadal C.',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                          )),
                      const SizedBox(width: 6),
                      Icon(Icons.verified_rounded,
                          size: 18, color: cs.primary),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text('10.2k followers · 142 following',
                      style: TextStyle(
                        color: cs.onSurfaceVariant,
                        fontSize: 13.5,
                      )),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // pills (feed, favorites)
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _FilterChipPill(
                  label: 'Feed',
                  selected: _filter == 0,
                  onTap: () => setState(() => _filter = 0),
                  selectedColor: cs.primary,
                ),
                const SizedBox(width: 10),
                _FilterChipPill(
                  label: 'Favorites',
                  selected: _filter == 1,
                  onTap: () => setState(() => _filter = 1),
                  selectedColor: cs.primary,
                ),
                const SizedBox(width: 10),
              ],
            ),

            const SizedBox(height: 18),

            // sample post card (matches mock vibe)
            _PostCard(
              name: 'Budiarti R.',
              time: '3h ago',
              text: 'Beautiful landscape 🌞🌱',
              image:
                  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1200',
              likes: 12,
              comments: 40,
            ),
          ],
        ),

        // ---------- Bottom Nav (keep yours) ----------
        bottomNavigationBar: FbBottomBar(
          currentIndex: _tab,
          // inside ProfilePage where you wire the bottom nav:
          onTap: (i) {
            if (i == 0) {
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const HomePage()),
                (route) => false,
              );
              return;
            }
            setState(() => _tab = i);
          },
          items: const [
            FbItemData('assets/images/hiking.png', 'Home'),
            FbItemData('assets/images/stars.png', 'Top'),
            FbItemData('assets/images/plus.png', 'Add', isAdd: true),
            FbItemData('assets/images/notification.png', 'Notifications'),
            FbItemData('assets/images/user.png', 'Profile'),
          ],
        ),
      ),
    );
  }
    );
  }
}


class _FilterChipPill extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final Color selectedColor;
  const _FilterChipPill({
    required this.label,
    required this.selected,
    required this.onTap,
    required this.selectedColor,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final bg = selected ? selectedColor : cs.surfaceVariant.withOpacity(.18);
    final fg = selected ? Colors.black : cs.onSurface;

    return Material(
      color: bg,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Row(
            children: [
              if (label == 'Feed')
                Icon(Icons.landscape_outlined, size: 16, color: fg)
              else if (label == 'Favorites')
                Icon(Icons.favorite, size: 16, color: fg),
              const SizedBox(width: 6),
              Text(label,
                  style:
                      TextStyle(fontWeight: FontWeight.w700, color: fg)),
            ],
          ),
        ),
      ),
    );
  }
}

class _PostCard extends StatelessWidget {
  final String name, time, text, image;
  final int likes, comments;
  const _PostCard({
    required this.name,
    required this.time,
    required this.text,
    required this.image,
    required this.likes,
    required this.comments,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Card(
      color: cs.surfaceVariant.withOpacity(.15),
      shadowColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // header
            Row(
              children: [
                const CircleAvatar(
                  radius: 16,
                  backgroundImage: NetworkImage(
                    'https://images.oxu.az/2024/10/14/Kp3SfhJel8KI2cFRbgg7rAM3vduIkZl0IPkW6ihu:1200.webp',
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name,
                          style: const TextStyle(
                              fontWeight: FontWeight.w700, fontSize: 14)),
                      Text(time,
                          style: TextStyle(
                              color: cs.onSurfaceVariant, fontSize: 12)),
                    ],
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.more_horiz, color: cs.onSurfaceVariant),
                  onPressed: () {},
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(text),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: AspectRatio(
                aspectRatio: 16 / 10,
                child: Image.network(image, fit: BoxFit.cover),
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                _stat(Icons.favorite_border, likes),
                const SizedBox(width: 14),
                _stat(Icons.mode_comment_outlined, comments),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _stat(IconData icon, int v) => Row(
        children: [
          Icon(icon, size: 18),
          const SizedBox(width: 6),
          Text('$v'),
        ],
      );
}
