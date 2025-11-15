import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'home_components/navbar.dart';
import 'home_components/switch.dart';
import 'home_components/create_post.dart';
import 'models/post_model.dart';
import 'components/post_card.dart';
import 'components/s3_image.dart';
import 'services/api.dart';
import 'profile.dart';
import 'auth/sign_in.dart';


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
  final ScrollController _scrollController = ScrollController();
  int _tab = 0;
  
  List<PostModel> _posts = [];
  bool _isLoading = true;
  bool _hasMore = true;
  String? _lastTimestamp;
  
  // User profile data for navbar avatar
  Map<String, dynamic>? _userInfo;
  
  // Auto-hide header/footer
  bool _isHeaderVisible = true;
  double _lastScrollOffset = 0;
  


  @override
  void initState() {
    super.initState();
    _loadUserInfo();
    _loadPosts();
    _scrollController.addListener(_onScroll);
  }

  Future<void> _loadUserInfo() async {
    try {
      final sp = await SharedPreferences.getInstance();
      final userName = sp.getString('userName') ?? '';
      
      if (userName.isEmpty) {
        return;
      }

      final resp = await Api.getProfileInfo(userName: userName);
      
      if (resp['status'] == 200 && resp['data']['success'] == true) {
        if (mounted) {
          setState(() {
            _userInfo = resp['data']['data']['userInfo'];
          });
        }
      }
    } catch (e) {
      // Error loading user info - avatar will show default icon
    }
  }

  Widget _buildProfileIcon() {
    final cs = Theme.of(context).colorScheme;
    final color = _tab == 2 ? cs.primary : cs.onSurfaceVariant;
    
    // Handle profile picture: can be a presigned URL string, S3 key string, or object
    final userAvatarData = _userInfo?['profilePicture'];
    
    // If we have avatar data, show it
    if (userAvatarData != null) {
      if (userAvatarData is String && userAvatarData.isNotEmpty) {
        if (userAvatarData.startsWith('http://') || userAvatarData.startsWith('https://')) {
          // Presigned URL
          return Center(
            child: ClipOval(
              child: Image.network(
                userAvatarData,
                width: 28,
                height: 28,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Icon(Icons.person, color: color, size: 24);
                },
              ),
            ),
          );
        } else {
          // S3 key
          return Center(
            child: ClipOval(
              child: S3Image(
                s3Key: userAvatarData,
                width: 28,
                height: 28,
                fit: BoxFit.cover,
                errorWidget: Icon(Icons.person, color: color, size: 24),
              ),
            ),
          );
        }
      } else if (userAvatarData is Map) {
        final key = userAvatarData['key'];
        if (key is String && key.isNotEmpty) {
          return Center(
            child: ClipOval(
              child: S3Image(
                s3Key: key,
                width: 28,
                height: 28,
                fit: BoxFit.cover,
                errorWidget: Icon(Icons.person, color: color, size: 24),
              ),
            ),
          );
        }
      }
    }
    
    // Fallback to default profile icon
    return Image.asset(
      'assets/images/profile.png',
      fit: BoxFit.contain,
      color: color,
      colorBlendMode: BlendMode.srcIn,
    );
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    _handleInfiniteScroll();
    _handleAutoHideUI();
  }

  void _handleInfiniteScroll() {
    if (_scrollController.position.pixels >= 
        _scrollController.position.maxScrollExtent - 200) {
      if (!_isLoading && _hasMore) {
        _loadPosts(loadMore: true);
      }
    }
  }

  void _handleAutoHideUI() {
    final currentOffset = _scrollController.offset;
    const scrollThreshold = 10.0;
    
    if (currentOffset > _lastScrollOffset && currentOffset > scrollThreshold) {
      if (_isHeaderVisible) {
        setState(() => _isHeaderVisible = false);
      }
    } else if (currentOffset < _lastScrollOffset) {
      if (!_isHeaderVisible) {
        setState(() => _isHeaderVisible = true);
      }
    }
    
    _lastScrollOffset = currentOffset;
  }
  
  Future<void> _loadPosts({bool loadMore = false}) async {
    if (!loadMore) {
      setState(() {
        _isLoading = true;
        _lastTimestamp = null;
      });
    }

    try {
      final sp = await SharedPreferences.getInstance();
      final token = sp.getString('token');
      
      if (token == null) {
        // Not logged in, redirect to sign in
        if (!mounted) return;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const SignInPage()),
        );
        return;
      }

      final resp = await Api.getHomePage(lastTimestamp: _lastTimestamp);
      
      if (!mounted) return;

      if ((resp['status'] == 200 || resp['status'] == 201) && resp['data']['success'] == true) {
        final data = resp['data']['data'];
        final postsData = data['posts'] as List?;
        final nextCursor = data['nextCursor'] as String?;

        if (postsData != null) {
          try {
            final newPosts = postsData
                .map((json) {
                  return PostModel.fromJson(json as Map<String, dynamic>);
                })
                .toList();

            setState(() {
              if (loadMore) {
                _posts.addAll(newPosts);
              } else {
                _posts = newPosts;
              }
              _lastTimestamp = nextCursor;
              _hasMore = nextCursor != null;
              _isLoading = false;
            });
          } catch (parseError) {
            setState(() => _isLoading = false);
          }
        } else {
          setState(() {
            _isLoading = false;
            _hasMore = false;
          });
        }
      } else {
        setState(() => _isLoading = false);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading posts: $e')),
      );
    }
  }

  void _handleAddPost() {
    showCreatePostSheet(context).then((created) {
      if (created == true) {
        _loadPosts(); // Reload feed after creating post
      }
    });
  }

  ThemeData _buildTheme() {
    return ThemeData(
      useMaterial3: true,
      brightness: _theme.isDark ? Brightness.dark : Brightness.light,
      scaffoldBackgroundColor: _theme.isDark ? Colors.black : Colors.white,
      cardColor: _theme.isDark ? const Color(0xFF242526) : Colors.white,
      appBarTheme: AppBarTheme(
        backgroundColor: _theme.isDark ? Colors.black : Colors.white,
        surfaceTintColor: Colors.transparent,
      ),
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFF178E79),
        brightness: _theme.isDark ? Brightness.dark : Brightness.light,
        primary: const Color(0xFF178E79),
        surface: _theme.isDark ? Colors.black : Colors.white,
        background: _theme.isDark ? Colors.black : Colors.white,
        onSurface: _theme.isDark ? Colors.white : Colors.black,
        onBackground: _theme.isDark ? Colors.white : Colors.black,
      ),
    );
  }

  void _configureSystemUI() {
    SystemChrome.setSystemUIOverlayStyle(
      SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: _theme.isDark ? Brightness.light : Brightness.dark,
        systemNavigationBarColor: Colors.white,
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _theme,
      builder: (context, _) {
        _configureSystemUI();
        final theme = _buildTheme();
    return Theme(
      data: theme,
      child: Container(
        color: _theme.isDark ? Colors.black : Colors.white,
        child: Scaffold(
          backgroundColor: Colors.transparent,
          extendBodyBehindAppBar: true,
          extendBody: true, // helps draw over the gesture area (no bottom gap)
          // ----- Header (fixed with animation) -----
          appBar: PreferredSize(
            preferredSize: const Size.fromHeight(kToolbarHeight),
            child: AnimatedSlide(
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeInOut,
              offset: _isHeaderVisible ? Offset.zero : const Offset(0, -1),
              child: AppBar(
                automaticallyImplyLeading: false,
                centerTitle: false,
                elevation: 0,
                backgroundColor: _theme.isDark ? Colors.black : Colors.white,
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
          ),
        ),

        // ----- Feed (scrollable) -----
        body: _isLoading && _posts.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : _posts.isEmpty
                ? const Center(child: Text('No posts yet. Create the first one!'))
                : RefreshIndicator(
                    onRefresh: () => _loadPosts(),
                    child: ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.fromLTRB(0, kToolbarHeight + 16, 0, 100),
                      itemCount: _posts.length + (_hasMore ? 1 : 0),
                      itemBuilder: (context, i) {
                        if (i == _posts.length) {
                          return const Center(
                            child: Padding(
                              padding: EdgeInsets.all(16.0),
                              child: CircularProgressIndicator(),
                            ),
                          );
                        }
                        return PostCard(
                          post: _posts[i],
                          onPostDeleted: () {
                            // Remove the post from the list immediately
                            setState(() {
                              _posts.removeAt(i);
                            });
                          },
                          onPostUpdated: (updatedPost) {
                            // Update the post in the list immediately
                            setState(() {
                              _posts[i] = updatedPost;
                            });
                          },
                        );
                      },
                    ),
                  ),

    // ----- Bottom Nav (fixed with animation) -----
     bottomNavigationBar: AnimatedSlide(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
      offset: _isHeaderVisible ? Offset.zero : const Offset(0, 1),
      child: FbBottomBar(
        currentIndex: _tab,
        // inside HomePage where you wire the bottom nav:
        onTap: (i) {
          if (i == 1) {
            // Add button (middle button)
            _handleAddPost();
            return;
          }
          if (i == 2) {
            // go to Profile with slide right transition
            // When returning, HomePage will be recreated and reload user info including avatar
            Navigator.of(context).pushReplacement(
              PageRouteBuilder(
                pageBuilder: (context, animation, secondaryAnimation) => const ProfilePage(),
                transitionsBuilder: (context, animation, secondaryAnimation, child) {
                  const begin = Offset(1.0, 0.0); // Slide from right
                  const end = Offset.zero;
                  const curve = Curves.easeInOut;

                  var tween = Tween(begin: begin, end: end).chain(CurveTween(curve: curve));
                  var offsetAnimation = animation.drive(tween);

                  return SlideTransition(
                    position: offsetAnimation,
                    child: child,
                  );
                },
                transitionDuration: const Duration(milliseconds: 200),
              ),
            );
            return;
          }
          setState(() => _tab = i);
        },
        items: [
          const FbItemData('assets/images/squares.png', 'Home'),
          const FbItemData('assets/images/plus.png', 'Add', isAdd: true),
          FbItemData(
            'assets/images/profile.png',
            'Profile',
            customIcon: _buildProfileIcon(),
          ),
        ],
      ),
    ), // bottomNavigationBar AnimatedSlide
        ), // Scaffold
      ), // Container
    ); // Theme
  }, // builder
    ); // AnimatedBuilder
  }
}