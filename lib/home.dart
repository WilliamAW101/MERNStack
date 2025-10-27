import 'package:flutter/material.dart';
import 'home_components/navbar.dart';
import 'home_components/switch.dart';
import 'home_components/feed.dart';
import 'profile.dart';


// ---------- Shared theme controller ----------
class ThemeController extends ChangeNotifier {
  static final ThemeController _singleton = ThemeController._internal();
  factory ThemeController() => _singleton;
  ThemeController._internal();

  bool _isDark = false;
  bool get isDark => _isDark;

  void toggle(bool value) {
    if (_isDark == value) return;
    _isDark = value;
    notifyListeners();
  }
}


// ---------- Entry (demo) ----------
void main() => runApp(const MaterialApp(home: HomePage(), debugShowCheckedModeBanner: false));

// Brand color used for selection / indicator / FAB
const kCragGreen = Color.fromARGB(255, 0, 0, 0);

// ---------- Home ----------
class HomePage extends StatefulWidget {
  const HomePage({super.key});
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final ThemeController _theme = ThemeController();
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    // ignore: unused_local_variable
    final theme = ThemeData(
      useMaterial3: true,
      brightness: _theme.isDark ? Brightness.dark : Brightness.light,
      colorSchemeSeed: const Color.fromARGB(255, 94, 116, 201),
    );

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
        extendBody: true, // helps draw over the gesture area (no bottom gap)
        // ----- Header (fixed) -----
        appBar: AppBar(
          automaticallyImplyLeading: false,
          centerTitle: false,
          elevation: 0,
          titleSpacing: 16,
          title: Row(
            children: [
              Image.asset(
                'assets/images/icon.png',
                width: 60,
                height: 60,
                color: theme.colorScheme.onSurface,
                colorBlendMode: BlendMode.srcIn,
              ),
              const SizedBox(width: 8),
              Text(
                'Crag Tag',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: theme.colorScheme.onSurface,
                ),
              ),
            ],
          ),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 30),
              child: LightDarkToggle(
                value: _theme.isDark,
                onChanged: (v) => _theme.toggle(v),
              ),
            ),
          ],

        ),

        // ----- Feed (scrollable) -----
        body: ListView.separated(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 100), // bottom padding so it won't be hidden by navbar
          itemCount: demoPosts.length,
          separatorBuilder: (_, __) => const SizedBox(height: 16),
          itemBuilder: (context, i) => PostCard(post: demoPosts[i]),
        ),

    // ----- Bottom Nav (fixed) -----
     bottomNavigationBar: FbBottomBar(
    currentIndex: _tab,
    // inside HomePage where you wire the bottom nav:
    onTap: (i) {
      if (i == 4) {
        // go to Profile without stacking another route
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const ProfilePage()),
        );
        return;
      }
      setState(() => _tab = i);
    },
    items: const [
      FbItemData('assets/images/hiking.png', 'Home'),
      FbItemData('assets/images/stars.png', 'Top'),
      FbItemData('assets/images/plus.png', 'Add', isAdd: true), // center black circle
      FbItemData('assets/images/notification.png', 'Notifications'),
      FbItemData('assets/images/user.png', 'Profile'),
    ],
      ),
      ),
    );
  },
);  }
}