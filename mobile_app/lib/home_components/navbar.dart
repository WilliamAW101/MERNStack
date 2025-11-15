import 'package:flutter/material.dart';


// ---------- Facebook-style Bottom Bar ----------
class FbBottomBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;
  final List<FbItemData> items;

  const FbBottomBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
    required this.items,
  });

  @override
  Widget build(BuildContext context) {
    const barHeight = 70.0;
    const iconSize  = 28.0;
    const addSize   = 45.0; // black circle size
    const indicatorThickness = 3.0;

    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final addIndex = items.indexWhere((e) => e.isAdd);

    return Align(
      alignment: Alignment.bottomCenter,
      child: Container(
        height: barHeight,
        margin: EdgeInsets.zero,
        decoration: BoxDecoration(
          color: isDark ? Colors.black : Colors.white,
        ),
        child: LayoutBuilder(
          builder: (context, c) {
            final itemWidth = c.maxWidth / items.length;

            // underline only for non-add items
            final showIndicator = currentIndex != addIndex;
            final left = showIndicator
                ? currentIndex * itemWidth + (itemWidth * .18)
                : 0.0;
            final right = showIndicator
                ? (items.length - 1 - currentIndex) * itemWidth + (itemWidth * .18)
                : c.maxWidth;

            return Stack(
              children: [
                // top indicator
                AnimatedPositioned(
                  duration: const Duration(milliseconds: 220),
                  curve: Curves.easeOut,
                  left: left,
                  right: right,
                  top: 6,
                  child: showIndicator
                      ? Container(
                          height: indicatorThickness,
                          decoration: BoxDecoration(
                            color: cs.primary,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        )
                      : const SizedBox.shrink(),
                ),

                Row(
                  children: List.generate(items.length, (i) {
                    final it = items[i];
                    final selected = i == currentIndex;

                    if (it.isAdd) {
                      // center smooth circle with white plus
                      return Expanded(
                        child: InkWell(
                          customBorder: const CircleBorder(),
                          onTap: () => onTap(i),
                          child: Center(
                            child: Transform.translate(
                              offset: const Offset(0, -6), // move upward 6 pixels
                              child: Container(
                                width: addSize,
                                height: addSize,
                                decoration: BoxDecoration(
                                  color: cs.primary,
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: cs.primary.withOpacity(0.3),
                                      blurRadius: 8,
                                      spreadRadius: 0,
                                    ),
                                  ],
                                ),
                                child: const Icon(
                                  Icons.add,
                                  color: Colors.white,
                                  size: 26,
                                ),
                              ),
                            ),
                          ),
                        ),
                      );
                    }

                    // normal item
                    final color = selected ? cs.primary : cs.onSurfaceVariant;

                    return Expanded(
                      child: InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: () => onTap(i),
                        child: Center(
                          child: SizedBox(
                            height: iconSize,
                            width: iconSize,
                            child: it.customIcon ?? Image.asset(
                              it.asset,
                              fit: BoxFit.contain,
                              color: color,                 // tint PNG
                              colorBlendMode: BlendMode.srcIn,
                            ),
                          ),
                        ),
                      ),
                    );
                  }),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

// item model
class FbItemData {
  final String asset;
  final String label;
  final bool isAdd; // mark center special item
  final Widget? customIcon; // optional custom widget (e.g., avatar)
  const FbItemData(this.asset, this.label, {this.isAdd = false, this.customIcon});
}