import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api.dart';
import '../home.dart';

class EditProfilePage extends StatefulWidget {
  const EditProfilePage({super.key});

  @override
  State<EditProfilePage> createState() => _EditProfilePageState();
}

class _EditProfilePageState extends State<EditProfilePage> {
  final ThemeController _themeController = ThemeController();
  final _formKey = GlobalKey<FormState>();
  
  late final TextEditingController _firstNameCtrl;
  late final TextEditingController _lastNameCtrl;
  late final TextEditingController _phoneCtrl;
  late final TextEditingController _descriptionCtrl;
  
  String _userName = '';
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _firstNameCtrl = TextEditingController();
    _lastNameCtrl = TextEditingController();
    _phoneCtrl = TextEditingController();
    _descriptionCtrl = TextEditingController();
    _loadProfileData();
  }

  @override
  void dispose() {
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _phoneCtrl.dispose();
    _descriptionCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadProfileData() async {
    try {
      final sp = await SharedPreferences.getInstance();
      final userName = sp.getString('userName') ?? '';
      
      if (userName.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Error: User not logged in')),
          );
          Navigator.of(context).pop();
        }
        return;
      }
      
      setState(() => _userName = userName);
      
      final resp = await Api.getProfileInfo(userName: userName);
      
      if (!mounted) return;
      
      if (resp['status'] == 200) {
        final userInfo = resp['data']['data']['userInfo'] as Map<String, dynamic>?;
        
        if (userInfo != null) {
          setState(() {
            _firstNameCtrl.text = userInfo['firstName'] as String? ?? '';
            _lastNameCtrl.text = userInfo['lastName'] as String? ?? '';
            _phoneCtrl.text = userInfo['phone'] as String? ?? '';
            _descriptionCtrl.text = userInfo['profileDescription'] as String? ?? '';
            _loading = false;
          });
        } else {
          setState(() => _loading = false);
        }
      } else {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load profile: ${resp['data']['message']}')),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading profile: $e')),
      );
    }
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _saving = true);
    
    try {
      final resp = await Api.updateProfileInfo(
        userName: _userName,
        firstName: _firstNameCtrl.text.trim(),
        lastName: _lastNameCtrl.text.trim(),
        phone: _phoneCtrl.text.trim(),
        profileDescription: _descriptionCtrl.text.trim(),
      );
      
      if (!mounted) return;
      
      if (resp['status'] == 200 || resp['status'] == 201) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile updated successfully!'),
            backgroundColor: Color(0xFF2DBE7A),
          ),
        );
        
        // Return true to indicate profile was updated
        Navigator.of(context).pop(true);
      } else {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update profile: ${resp['data']['message'] ?? 'Unknown error'}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _themeController,
      builder: (context, _) {
        final isDark = _themeController.isDark;
        final backgroundColor = isDark ? const Color(0xFF1A1A1A) : Colors.white;
        final textColor = isDark ? Colors.white : Colors.black;
        final borderColor = isDark ? Colors.grey[800]! : Colors.grey[300]!;

        final theme = ThemeData(
          useMaterial3: true,
          brightness: isDark ? Brightness.dark : Brightness.light,
          colorSchemeSeed: const Color.fromARGB(255, 94, 116, 201),
        );

        return Theme(
          data: theme,
          child: Scaffold(
            backgroundColor: backgroundColor,
            appBar: AppBar(
              backgroundColor: backgroundColor,
              elevation: 0,
              leading: IconButton(
                icon: Icon(Icons.arrow_back, color: textColor),
                onPressed: () => Navigator.of(context).pop(),
              ),
              title: Text(
                'Edit Profile',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: textColor,
                ),
              ),
              centerTitle: true,
              actions: [
                TextButton(
                  onPressed: _saving ? null : _handleSave,
                  child: _saving
                      ? SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: textColor,
                          ),
                        )
                      : Text(
                          'Save',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: textColor.withOpacity(_saving ? 0.5 : 1.0),
                          ),
                        ),
                ),
              ],
            ),
            body: _loading
                ? Center(
                    child: CircularProgressIndicator(color: theme.colorScheme.primary),
                  )
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Username (read-only)
                          _buildLabel('Username', textColor),
                          const SizedBox(height: 8),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                            decoration: BoxDecoration(
                              color: isDark ? Colors.grey[850] : Colors.grey[200],
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              _userName,
                              style: TextStyle(
                                fontSize: 16,
                                color: textColor.withOpacity(0.7),
                              ),
                            ),
                          ),
                          
                          const SizedBox(height: 20),
                          
                          // First Name
                          _buildLabel('First Name', textColor),
                          const SizedBox(height: 8),
                          _buildTextField(
                            controller: _firstNameCtrl,
                            hintText: 'Enter your first name',
                            textColor: textColor,
                            borderColor: borderColor,
                            isDark: isDark,
                          ),
                          
                          const SizedBox(height: 20),
                          
                          // Last Name
                          _buildLabel('Last Name', textColor),
                          const SizedBox(height: 8),
                          _buildTextField(
                            controller: _lastNameCtrl,
                            hintText: 'Enter your last name',
                            textColor: textColor,
                            borderColor: borderColor,
                            isDark: isDark,
                          ),
                          
                          const SizedBox(height: 20),
                          
                          // Phone
                          _buildLabel('Phone Number', textColor),
                          const SizedBox(height: 8),
                          _buildTextField(
                            controller: _phoneCtrl,
                            hintText: 'Enter your phone number',
                            textColor: textColor,
                            borderColor: borderColor,
                            isDark: isDark,
                            keyboardType: TextInputType.phone,
                          ),
                          
                          const SizedBox(height: 20),
                          
                          // Profile Description
                          _buildLabel('Bio', textColor),
                          const SizedBox(height: 8),
                          _buildTextField(
                            controller: _descriptionCtrl,
                            hintText: 'Tell us about yourself',
                            textColor: textColor,
                            borderColor: borderColor,
                            isDark: isDark,
                            maxLines: 5,
                          ),
                          
                          const SizedBox(height: 40),
                          
                          // Info text
                          Text(
                            'Your profile information will be visible to other users.',
                            style: TextStyle(
                              fontSize: 13,
                              color: textColor.withOpacity(0.6),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
          ),
        );
      },
    );
  }

  Widget _buildLabel(String text, Color textColor) {
    return Text(
      text,
      style: TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w600,
        color: textColor,
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hintText,
    required Color textColor,
    required Color borderColor,
    required bool isDark,
    TextInputType? keyboardType,
    int maxLines = 1,
  }) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      keyboardType: keyboardType,
      style: TextStyle(fontSize: 16, color: textColor),
      decoration: InputDecoration(
        hintText: hintText,
        hintStyle: TextStyle(
          color: isDark ? Colors.grey[500] : Colors.grey[600],
        ),
        filled: true,
        fillColor: isDark ? Colors.grey[900] : Colors.grey[50],
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: borderColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: borderColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF178E79), width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
    );
  }
}
