import 'package:flutter/material.dart';

/// ---------- Model ----------
class Post {
  final String userName;
  final String handle;
  final String timeAgo;
  final String imageUrl;
  final String caption;
  final int likes;
  final int comments;
  final double rating;

  const Post({
    required this.userName,
    required this.handle,
    required this.timeAgo,
    required this.imageUrl,
    required this.caption,
    required this.likes,
    required this.comments,
    required this.rating,
  });
}

/// ---------- Card ----------
class PostCard extends StatelessWidget {
  final Post post;
  const PostCard({super.key, required this.post});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Card(
      clipBehavior: Clip.antiAlias,
      elevation: 0,
      color: cs.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const CircleAvatar(
                  radius: 18,
                  backgroundImage: NetworkImage(
                    'https://images.unsplash.com/photo-1511367461989-f85a21fda167?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1331',
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(post.userName, style: const TextStyle(fontWeight: FontWeight.w700)),
                      Text('${post.handle} • ${post.timeAgo}',
                          style: TextStyle(color: cs.onSurfaceVariant, fontSize: 12)),
                    ],
                  ),
                ),
                IconButton(onPressed: () {}, icon: const Icon(Icons.more_horiz_rounded)),
              ],
            ),
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: AspectRatio(
                aspectRatio: 16 / 10,
                child: Image.network(post.imageUrl, fit: BoxFit.cover),
              ),
            ),
            const SizedBox(height: 10),
            Text(post.caption, style: TextStyle(color: cs.onSurface)),
            const SizedBox(height: 10),
            Row(
              children: [
                _IconStat(icon: Icons.favorite_border_rounded, value: post.likes),
                const SizedBox(width: 14),
                _IconStat(icon: Icons.mode_comment_outlined, value: post.comments),
                const Spacer(),
                _Stars(rating: post.rating),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _IconStat extends StatelessWidget {
  final IconData icon;
  final int value;
  const _IconStat({required this.icon, required this.value});
  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Row(
      children: [
        Icon(icon, size: 20, color: cs.onSurfaceVariant),
        const SizedBox(width: 6),
        Text('$value', style: TextStyle(color: cs.onSurfaceVariant)),
      ],
    );
  }
}

class _Stars extends StatelessWidget {
  final double rating; // 0..5
  const _Stars({required this.rating});
  @override
  Widget build(BuildContext context) {
    final stars = List.generate(5, (i) {
      final filled = rating >= i + 1 || (rating > i && rating < i + 1);
      return Icon(
        filled ? Icons.star_rounded : Icons.star_outline_rounded,
        size: 20,
        color: const Color(0xFFFFC107),
      );
    });
    return Row(children: stars);
  }
}

/// ---------- Demo data (PUBLIC: no underscore) ----------
final List<Post> demoPosts = <Post>[
  const Post(
    userName: 'Ben Sweet',
    handle: '@craig',
    timeAgo: '2m',
    imageUrl: 'https://cdn.unenvironment.org/s3fs-public/inline-images/1.jpg?VersionId=null',
    caption:
        'Half Dome was incredible! The views from the top were absolutely breathtaking. Can\'t wait to go back! #Yosemite #Climbing #Adventure',
    likes: 400,
    comments: 14,
    rating: 4.5,
  ),
  const Post(
    userName: 'Keval Patel',
    handle: '@keval1',
    timeAgo: '31m',
    imageUrl: 'https://images.unsplash.com/photo-1602842900683-0040b9be5dfe?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=679',
    caption: 'It was a challenging climb, but reaching the summit made it all worth it! #ClimbingLife',
    likes: 287,
    comments: 33,
    rating: 5,
  ),
  const Post(
    userName: 'Tope Omotoye',
    handle: '@topotom',
    timeAgo: '1h',
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200',
    caption: 'Unforgettable experience scaling El Capitan. The rock formations were stunning! #ElCapitan #RockClimbing',
    likes: 109,
    comments: 9,
    rating: 3.5,
  ),
];
