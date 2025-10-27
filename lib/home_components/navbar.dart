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
    const barHeight = 75.0;
    const iconSize  = 22.0;
    const addSize   = 40.0; // black circle size
    const indicatorThickness = 3.0;

    final cs = Theme.of(context).colorScheme;
    final addIndex = items.indexWhere((e) => e.isAdd);

    return Align(
      alignment: Alignment.bottomCenter,
      child: Container(
        height: barHeight,
        margin: EdgeInsets.zero,
        decoration: BoxDecoration(
        color: cs.surface,
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
                      // center black circle with white plus (no label)
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
                                  color: cs.primary, // or your custom color
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.add, color: Colors.white, size: 26),
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
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            SizedBox(
                              height: iconSize,
                              width: iconSize,
                              child: Image.asset(
                                it.asset,
                                fit: BoxFit.contain,
                                color: color,                 // tint PNG
                                colorBlendMode: BlendMode.srcIn,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              it.label,
                              style: TextStyle(
                                fontSize: 12,
                                color: color,
                                fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                              ),
                            ),
                          ],
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
  const FbItemData(this.asset, this.label, {this.isAdd = false});
}