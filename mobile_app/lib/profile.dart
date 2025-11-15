import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'home_components/navbar.dart';
import 'home_components/create_post.dart';
import 'home.dart';
import 'services/api.dart';
import 'models/post_model.dart';
import 'components/s3_image.dart';
import 'components/post_card.dart';
import 'pages/edit_profile_page.dart';
import 'auth/welcome.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final ThemeController _theme = ThemeController();
  int _tab = 2;
  int _filter = 0;
  
  // Profile data
  Map<String, dynamic>? _userInfo;
  List<PostModel> _posts = [];
  int _totalPostsCount = 0; // Total posts from backend
  bool _loading = true;
  bool _loadingMore = false;
  String? _nextCursor;
  bool _hasMore = true;
  bool _uploadingProfilePic = false;
  
  final ScrollController _scrollController = ScrollController();
  final ImagePicker _imagePicker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _loadProfileData();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      if (!_loadingMore && _hasMore && _filter == 0) {
        _loadMorePosts();
      }
    }
  }

  Future<void> _loadProfileData() async {
    setState(() => _loading = true);
    
    try {
      final sp = await SharedPreferences.getInstance();
      final userName = sp.getString('userName') ?? '';
      
      if (userName.isEmpty) {
        setState(() => _loading = false);
        return;
      }
      
      final resp = await Api.getProfileInfo(userName: userName);
      
      if (resp['status'] == 200 && resp['data']['success'] == true && mounted) {
        setState(() {
          _userInfo = resp['data']['data']['userInfo'];
          _totalPostsCount = resp['data']['data']['numberOfTotalPosts'] ?? 0;
          _loading = false;
        });
        _loadPersonalPosts();
      } else {
        setState(() => _loading = false);
      }
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _loadPersonalPosts() async {
    try {
      final sp = await SharedPreferences.getInstance();
      final userName = sp.getString('userName') ?? '';
      
      if (userName.isEmpty) return;
      
      final resp = await Api.getPersonalPosts(userName: userName);
      if (resp['status'] == 200 && mounted) {
        final postsData = resp['data']['data']['posts'] as List?;
        final newPosts = postsData?.map((p) => PostModel.fromJson(p)).toList() ?? [];
        
        setState(() {
          _posts = newPosts;
          _nextCursor = resp['data']['data']['nextCursor'];
          _hasMore = newPosts.length >= 6;
        });
      }
    } catch (e) {
      // Error loading posts
    }
  }

  Future<void> _loadMorePosts() async {
    if (_nextCursor == null || _loadingMore) return;
    
    setState(() => _loadingMore = true);
    
    try {
      final sp = await SharedPreferences.getInstance();
      final userName = sp.getString('userName') ?? '';
      
      if (userName.isEmpty) {
        setState(() => _loadingMore = false);
        return;
      }
      
      final resp = await Api.getPersonalPosts(
        userName: userName,
        lastTimestamp: _nextCursor,
      );
      if (resp['status'] == 200 && mounted) {
        final postsData = resp['data']['data']['posts'] as List?;
        final newPosts = postsData?.map((p) => PostModel.fromJson(p)).toList() ?? [];
        
        setState(() {
          _posts.addAll(newPosts);
          _nextCursor = resp['data']['data']['nextCursor'];
          _hasMore = newPosts.length >= 6;
          _loadingMore = false;
        });
      } else {
        setState(() => _loadingMore = false);
      }
    } catch (e) {
      setState(() => _loadingMore = false);
    }
  }

  Future<void> _refreshProfile() async {
    await _loadProfileData();
  }

  Future<void> _handleAddPost() async {
    final result = await showCreatePostSheet(context);
    if (result == true) {
      // Refresh posts after creating a new post
      _loadProfileData();
    }
  }

  Future<void> _pickAndUploadProfilePicture() async {
    try {
      // Show source selection dialog
      final source = await showDialog<ImageSource>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Choose Profile Picture'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.camera_alt),
                title: const Text('Camera'),
                onTap: () => Navigator.pop(context, ImageSource.camera),
              ),
              ListTile(
                leading: const Icon(Icons.photo_library),
                title: const Text('Gallery'),
                onTap: () => Navigator.pop(context, ImageSource.gallery),
              ),
            ],
          ),
        ),
      );
      
      if (source == null) return;
      
      final image = await _imagePicker.pickImage(source: source);
      if (image == null) return;
      
      setState(() => _uploadingProfilePic = true);
      
      // Get file extension
      final ext = image.path.split('.').last.toLowerCase();
      
      // Determine content type
      String contentType;
      if (ext == 'jpg' || ext == 'jpeg') {
        contentType = 'image/jpeg';
      } else if (ext == 'png') {
        contentType = 'image/png';
      } else if (ext == 'webp') {
        contentType = 'image/webp';
      } else if (ext == 'heic') {
        contentType = 'image/heic';
      } else {
        contentType = 'image/jpeg'; // Default
      }
      
      // Step 1: Get presigned upload URL for profile picture
      final urlResp = await Api.getUploadUrl(fileType: ext, type: 'profile');
      
      if (urlResp['status'] != 200 || urlResp['data']['uploadUrl'] == null) {
        throw Exception('Failed to get upload URL');
      }
      
      final uploadUrl = urlResp['data']['uploadUrl'] as String;
      final s3Key = urlResp['data']['key'] as String;
      
      // Step 2: Upload file to S3
      final file = File(image.path);
      final bytes = await file.readAsBytes();
      
      final uploadSuccess = await Api.uploadToS3(
        presignedUrl: uploadUrl,
        fileBytes: bytes,
        contentType: contentType,
      );
      
      if (!uploadSuccess) {
        throw Exception('Failed to upload to S3');
      }
      
      // Step 3: Save S3 key to user profile using new endpoint
      final updateResp = await Api.uploadProfilePictureKey(key: s3Key);
      
      if (!mounted) return;
      
      if (updateResp['status'] == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile picture updated successfully!'),
            backgroundColor: Color(0xFF2DBE7A),
          ),
        );
        
        // Refresh profile to show new picture
        await _loadProfileData();
      } else {
        throw Exception('Failed to update profile: ${updateResp['data']['message'] ?? 'Unknown error'}');
      }
      
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error uploading profile picture: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _uploadingProfilePic = false);
    }
  }

  Widget _buildProfilePicture(ColorScheme cs) {
    // Angelo's new structure: { provider: 's3', key: 'key-here', type: 'image' }
    final profilePicData = _userInfo?['profilePicture'];
    final profilePic = profilePicData is Map ? profilePicData['key'] as String? : profilePicData as String?;
    
    Widget profileImage;
    if (profilePic != null && profilePic.isNotEmpty) {
      profileImage = ClipOval(
        child: SizedBox(
          width: 88,
          height: 88,
          child: S3Image(
            s3Key: profilePic,
            fit: BoxFit.cover,
            placeholder: CircleAvatar(
              radius: 44,
              backgroundColor: cs.surfaceVariant,
              child: Icon(Icons.person, size: 44, color: cs.onSurfaceVariant),
            ),
            errorWidget: CircleAvatar(
              radius: 44,
              backgroundColor: cs.surfaceVariant,
              child: Icon(Icons.person, size: 44, color: cs.onSurfaceVariant),
            ),
          ),
        ),
      );
    } else {
      profileImage = CircleAvatar(
        radius: 44,
        backgroundColor: cs.surfaceVariant,
        child: Icon(Icons.person, size: 44, color: cs.onSurfaceVariant),
      );
    }
    
    // Show loading indicator if uploading
    if (_uploadingProfilePic) {
      return Stack(
        children: [
          profileImage,
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                color: Colors.black54,
                shape: BoxShape.circle,
              ),
              child: const Center(
                child: CircularProgressIndicator(
                  strokeWidth: 3,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ],
      );
    }
    
    return profileImage;
  }

  String _getDisplayName() {
    final firstName = _userInfo?['firstName'] as String?;
    final lastName = _userInfo?['lastName'] as String?;
    final username = _userInfo?['username'] as String?;
    
    final fullName = '${firstName ?? ''} ${lastName ?? ''}'.trim();
    if (fullName.isNotEmpty) {
      return fullName;
    }
    
    return username ?? 'User';
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

  Widget _buildProfileIcon() {
    final cs = Theme.of(context).colorScheme;
    final color = _tab == 2 ? cs.primary : cs.onSurfaceVariant;
    
    // Handle profile picture from _userInfo
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

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _theme,
      builder: (context, _) {
        _configureSystemUI();
        final theme = _buildTheme();
        final cs = theme.colorScheme;
        
        return Theme(
          data: theme,
          child: Container(
            color: _theme.isDark ? Colors.black : Colors.white,
            child: Scaffold(
              backgroundColor: Colors.transparent,
              extendBody: true,

              // ---------- Header ----------
              appBar: AppBar(
                automaticallyImplyLeading: false,
                centerTitle: false,
                elevation: 0,
                backgroundColor: _theme.isDark ? Colors.black : Colors.white,
                titleSpacing: 20,
                title: Text(
                  'My profile',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: theme.colorScheme.onSurface,
                  ),
                ),
                actions: [
                  Padding(
                    padding: const EdgeInsets.only(right: 4),
                    child: IconButton(
                      icon: Icon(
                        Icons.notifications_outlined,
                        size: 26,
                        color: theme.colorScheme.onSurface,
                      ),
                      tooltip: 'Notifications',
                      onPressed: () {
                        // TODO: Navigate to notifications page when backend is ready
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Notifications feature coming soon!'),
                            duration: Duration(seconds: 2),
                          ),
                        );
                      },
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(right: 12),
                    child: IconButton(
                      icon: Icon(
                        Icons.settings,
                        size: 26,
                        color: theme.colorScheme.onSurface,
                      ),
                      onPressed: () {
                        showModalBottomSheet(
                          context: context,
                          showDragHandle: true,
                          backgroundColor: _theme.isDark ? const Color(0xFF242526) : Colors.white,
                          builder: (bottomSheetContext) => Container(
                            padding: const EdgeInsets.only(bottom: 20),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                // Edit Profile
                                ListTile(
                                  leading: Icon(
                                    Icons.edit,
                                    color: theme.colorScheme.onSurface,
                                  ),
                                  title: Text(
                                    'Edit Profile',
                                    style: TextStyle(
                                      color: theme.colorScheme.onSurface,
                                      fontSize: 16,
                                    ),
                                  ),
                                  onTap: () {
                                    Navigator.pop(bottomSheetContext);
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (context) => const EditProfilePage(),
                                      ),
                                    ).then((updated) {
                                      if (updated == true) {
                                        _loadProfileData();
                                      }
                                    });
                                  },
                                ),
                                
                                // Change Profile Picture
                                ListTile(
                                  leading: Icon(
                                    Icons.camera_alt,
                                    color: theme.colorScheme.onSurface,
                                  ),
                                  title: Text(
                                    'Change Profile Picture',
                                    style: TextStyle(
                                      color: theme.colorScheme.onSurface,
                                      fontSize: 16,
                                    ),
                                  ),
                                  onTap: () {
                                    Navigator.pop(bottomSheetContext);
                                    _pickAndUploadProfilePicture();
                                  },
                                ),
                                
                                const Divider(height: 1),
                                
                                // Sign Out
                                ListTile(
                                  leading: const Icon(
                                    Icons.logout,
                                    color: Colors.red,
                                  ),
                                  title: const Text(
                                    'Sign Out',
                                    style: TextStyle(
                                      color: Colors.red,
                                      fontSize: 16,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  onTap: () async {
                                    Navigator.pop(bottomSheetContext);
                                    
                                    // Show confirmation dialog
                                    final confirmed = await showDialog<bool>(
                                      context: context,
                                      builder: (context) => AlertDialog(
                                        title: const Text('Sign Out'),
                                        content: const Text('Are you sure you want to sign out?'),
                                        actions: [
                                          TextButton(
                                            onPressed: () => Navigator.pop(context, false),
                                            child: const Text('Cancel'),
                                          ),
                                          TextButton(
                                            onPressed: () => Navigator.pop(context, true),
                                            style: TextButton.styleFrom(foregroundColor: Colors.red),
                                            child: const Text('Sign Out'),
                                          ),
                                        ],
                                      ),
                                    );
                                    
                                    if (confirmed == true) {
                                      // Save remember me credentials before clearing
                                      final sp = await SharedPreferences.getInstance();
                                      final savedUsername = sp.getString('saved_username');
                                      final savedPassword = sp.getString('saved_password');
                                      final rememberMe = sp.getBool('remember_me') ?? false;
                                      
                                      // Clear all user data
                                      await sp.clear();
                                      
                                      // Restore remember me credentials if they were saved
                                      if (rememberMe && savedUsername != null && savedPassword != null) {
                                        await sp.setString('saved_username', savedUsername);
                                        await sp.setString('saved_password', savedPassword);
                                        await sp.setBool('remember_me', true);
                                      }
                                      
                                      if (!context.mounted) return;
                                      
                                      // Navigate to welcome/login page
                                      Navigator.of(context).pushAndRemoveUntil(
                                        MaterialPageRoute(builder: (context) => const WelcomePage()),
                                        (route) => false,
                                      );
                                    }
                                  },
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),


        // ---------- Body ----------
        body: _loading
            ? Center(
                child: CircularProgressIndicator(color: cs.primary),
              )
            : RefreshIndicator(
                onRefresh: _refreshProfile,
                color: cs.primary,
                child: ListView(
                  controller: _scrollController,
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 120),
                  children: [
                    const SizedBox(height: 0),

                    // Profile header
                    Center(
                      child: Column(
                        children: [
                          // Profile picture
                          _buildProfilePicture(cs),
                          const SizedBox(height: 12),
                          
                          // Name and verified badge
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                _getDisplayName(),
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              if (_userInfo?['verified'] == true) ...[
                                const SizedBox(width: 6),
                                Icon(Icons.verified_rounded,
                                    size: 18, color: cs.primary),
                              ],
                            ],
                          ),
                          
                          // Email
                          if (_userInfo?['email'] != null) ...[
                            const SizedBox(height: 4),
                            Text(
                              _userInfo!['email'],
                              style: TextStyle(
                                color: cs.onSurfaceVariant,
                                fontSize: 13,
                              ),
                            ),
                          ],
                          
                          // Bio/Description
                          if (_userInfo?['profileDescription'] != null && 
                              (_userInfo!['profileDescription'] as String).isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 24),
                              child: Text(
                                _userInfo!['profileDescription'],
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: cs.onSurface.withOpacity(0.8),
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ],
                          
                          const SizedBox(height: 6),
                          
                          // Stats (posts count)
                          Text(
                            '$_totalPostsCount post${_totalPostsCount == 1 ? '' : 's'}',
                            style: TextStyle(
                              color: cs.onSurfaceVariant,
                              fontSize: 13.5,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Feed/Favorites tabs
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

                    // Posts section
                    if (_filter == 0) ...[
                      if (_posts.isEmpty)
                        Center(
                          child: Padding(
                            padding: const EdgeInsets.all(32),
                            child: Column(
                              children: [
                                Icon(Icons.landscape_outlined,
                                    size: 64, color: cs.onSurfaceVariant.withOpacity(0.3)),
                                const SizedBox(height: 12),
                                Text(
                                  'No posts yet',
                                  style: TextStyle(
                                    color: cs.onSurfaceVariant,
                                    fontSize: 16,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                      else
                        ..._posts.asMap().entries.map((entry) {
                          final index = entry.key;
                          final post = entry.value;
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: PostCard(
                              post: post,
                              onPostDeleted: () {
                                // Remove the post from the list immediately
                                setState(() {
                                  _posts.removeAt(index);
                                  _totalPostsCount = _totalPostsCount > 0 ? _totalPostsCount - 1 : 0;
                                });
                              },
                              onPostUpdated: (updatedPost) {
                                // Update the post in the list immediately
                                setState(() {
                                  _posts[index] = updatedPost;
                                });
                              },
                            ),
                          );
                        }),
                      
                      // Loading more indicator
                      if (_loadingMore)
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: Center(
                            child: CircularProgressIndicator(color: cs.primary),
                          ),
                        ),
                    ] else ...[
                      // Favorites (placeholder for now)
                      Center(
                        child: Padding(
                          padding: const EdgeInsets.all(32),
                          child: Column(
                            children: [
                              Icon(Icons.favorite_border,
                                  size: 64, color: cs.onSurfaceVariant.withOpacity(0.3)),
                              const SizedBox(height: 12),
                              Text(
                                'Favorites coming soon',
                                style: TextStyle(
                                  color: cs.onSurfaceVariant,
                                  fontSize: 16,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),

        // ---------- Bottom Nav ----------
        bottomNavigationBar: FbBottomBar(
          currentIndex: _tab,
          onTap: (i) {
            if (i == 0) {
              // go to Home with slide left transition
              Navigator.of(context).pushAndRemoveUntil(
                PageRouteBuilder(
                  pageBuilder: (context, animation, secondaryAnimation) => const HomePage(),
                  transitionsBuilder: (context, animation, secondaryAnimation, child) {
                    const begin = Offset(-1.0, 0.0); // Slide from left
                    const end = Offset.zero;
                    const curve = Curves.easeInOut;

                    var tween = Tween(begin: begin, end: end).chain(CurveTween(curve: curve));
                    var offsetAnimation = animation.drive(tween);

                    return SlideTransition(
                      position: offsetAnimation,
                      child: child,
                    );
                  },
                  // 👉 ADJUST DURATION HERE (in milliseconds)
                  transitionDuration: const Duration(milliseconds: 200), // Changed from 300 to 200
                ),
                (route) => false,
              );
              return;
            }
            if (i == 1) {
              // Add button (middle button)
              _handleAddPost();
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
            ), // Scaffold
          ), // Container
        ); // Theme
      }, // builder
    ); // AnimatedBuilder
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
