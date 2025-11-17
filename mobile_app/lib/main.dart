import 'package:crag_tag/auth/welcome.dart';
import 'package:flutter/material.dart';

void main() => runApp(const CragTagApp());

class CragTagApp extends StatelessWidget {
  const CragTagApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Crag Tag',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color.fromARGB(255, 82, 156, 87)),
        useMaterial3: true,
      ),
      home: const WelcomePage(), // 👈 Start here
    );
  }
}
