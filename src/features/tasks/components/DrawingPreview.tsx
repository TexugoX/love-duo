import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Palette, Radius } from '@/constants/theme';
import type { DrawingPayload, DrawingStroke } from '@/types/database';

export function buildSvgPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} L ${(p.x + 0.5).toFixed(1)} ${(p.y + 0.5).toFixed(1)}`;
  }

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i += 1) {
    d += ` L ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}`;
  }
  return d;
}

export function parseDrawingPayload(raw: string | null): DrawingPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DrawingPayload;
    if (parsed && parsed.version === 1 && Array.isArray(parsed.strokes)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

interface DrawingPreviewProps {
  rawDrawing: string | null;
  height?: number;
}

export function DrawingPreview({ rawDrawing, height = 140 }: DrawingPreviewProps) {
  const payload = useMemo(() => parseDrawingPayload(rawDrawing), [rawDrawing]);
  if (!payload) return null;

  return (
    <View
      style={[
        styles.frame,
        {
          height,
          backgroundColor: payload.background || '#FFFDF9',
        },
      ]}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${payload.width || 300} ${payload.height || 180}`}
        preserveAspectRatio="xMidYMid meet">
        {payload.strokes.map((stroke: DrawingStroke, idx: number) => (
          <Path
            key={`stroke-${idx}`}
            d={buildSvgPath(stroke.points)}
            stroke={stroke.color}
            strokeWidth={stroke.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
  },
});
