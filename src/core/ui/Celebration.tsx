import { Canvas, createPicture, Picture, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Easing, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';

const COLORS = ['#6C4DFF', '#FF7A2F', '#12A874', '#E2950A', '#E5484D', '#9E8BFF'];

type Particle = { x: number; vx: number; vy: number; spin: number; size: number; color: string };

/** Deterministic, so a screenshot run looks the same every time. */
function particles(count: number, width: number, seed = 7): Particle[] {
  let s = seed;
  const random = () => {
    s = (s * 16_807) % 2_147_483_647;
    return s / 2_147_483_647;
  };
  return Array.from({ length: count }, (_, i) => ({
    x: width * (0.2 + 0.6 * random()),
    vx: (random() - 0.5) * width * 0.9,
    vy: -(500 + random() * 500),
    spin: (random() - 0.5) * 12,
    size: 7 + random() * 7,
    color: COLORS[i % COLORS.length]!,
  }));
}

/**
 * Confetti for goal and level milestones. All particles are drawn into one
 * Skia picture per frame on the UI thread, which stays smooth with dozens of
 * pieces where one animated view per piece would not.
 */
export function Celebration({ play, onDone }: { play: boolean; onDone?: () => void }) {
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);
  const pieces = useMemo(() => particles(70, width), [width]);

  useEffect(() => {
    if (!play) return;
    progress.set(0);
    progress.set(withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }));
    const timer = setTimeout(() => onDone?.(), 2300);
    return () => clearTimeout(timer);
  }, [onDone, play, progress]);

  const picture = useDerivedValue(() =>
    createPicture((canvas) => {
      const t = progress.get() * 2.2;
      if (t <= 0 || t >= 2.2) return;
      const paint = Skia.Paint();
      for (const p of pieces) {
        const x = p.x + p.vx * t;
        const y = height * 0.35 + p.vy * t + 0.5 * 900 * t * t;
        paint.setColor(Skia.Color(p.color));
        paint.setAlphaf(Math.max(0, 1 - t / 2.2));
        canvas.save();
        canvas.translate(x, y);
        canvas.rotate((p.spin * t * 180) / Math.PI, 0, 0);
        canvas.drawRect(Skia.XYWHRect(-p.size / 2, -p.size / 4, p.size, p.size / 2), paint);
        canvas.restore();
      }
    }),
  );

  if (!play) return null;
  return (
    <Canvas pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 10 }]}>
      <Picture picture={picture} />
    </Canvas>
  );
}
