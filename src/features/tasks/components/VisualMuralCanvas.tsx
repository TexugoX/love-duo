import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button, Input } from '@/components/ui';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { buildSvgPath } from '@/features/tasks/components/DrawingPreview';
import type { DrawingPayload, DrawingStroke } from '@/types/database';

const BRUSH_COLORS = ['#D97757', '#2F231E', '#D96C7E', '#5E8F6E', '#D4923A', '#FFFFFF'];
const BRUSH_WIDTHS = [3, 6, 10];

interface VisualMuralCanvasProps {
  onSend: (drawing: DrawingPayload, caption?: string) => Promise<void>;
  onDrawingStateChange?: (isDrawing: boolean) => void;
}

export function VisualMuralCanvas({ onSend, onDrawingStateChange }: VisualMuralCanvasProps) {
  const [boardStyle, setBoardStyle] = useState<'paper' | 'chalk'>('paper');
  const [selectedColor, setSelectedColor] = useState('#D97757');
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [activeStroke, setActiveStroke] = useState<DrawingStroke | null>(null);
  const [caption, setCaption] = useState('');
  const [sending, setSending] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 300, height: 200 });

  const colorRef = useRef(selectedColor);
  const widthRef = useRef(strokeWidth);
  const activeStrokeRef = useRef<DrawingStroke | null>(null);
  const onDrawingStateChangeRef = useRef(onDrawingStateChange);

  colorRef.current = selectedColor;
  widthRef.current = strokeWidth;
  onDrawingStateChangeRef.current = onDrawingStateChange;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt) => {
          onDrawingStateChangeRef.current?.(true);
          const { locationX, locationY } = evt.nativeEvent;
          const nextStroke: DrawingStroke = {
            color: colorRef.current,
            width: widthRef.current,
            points: [{ x: locationX, y: locationY }],
          };
          activeStrokeRef.current = nextStroke;
          setActiveStroke(nextStroke);
        },
        onPanResponderMove: (evt) => {
          if (!activeStrokeRef.current) return;
          const { locationX, locationY } = evt.nativeEvent;
          const updated: DrawingStroke = {
            ...activeStrokeRef.current,
            points: [...activeStrokeRef.current.points, { x: locationX, y: locationY }],
          };
          activeStrokeRef.current = updated;
          setActiveStroke(updated);
        },
        onPanResponderRelease: () => {
          onDrawingStateChangeRef.current?.(false);
          if (activeStrokeRef.current && activeStrokeRef.current.points.length > 0) {
            const finalized = activeStrokeRef.current;
            setStrokes((prev) => [...prev, finalized]);
          }
          activeStrokeRef.current = null;
          setActiveStroke(null);
        },
        onPanResponderTerminate: () => {
          onDrawingStateChangeRef.current?.(false);
          if (activeStrokeRef.current && activeStrokeRef.current.points.length > 0) {
            const finalized = activeStrokeRef.current;
            setStrokes((prev) => [...prev, finalized]);
          }
          activeStrokeRef.current = null;
          setActiveStroke(null);
        },
      }),
    []
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setCanvasSize({ width: Math.round(width), height: Math.round(height) });
    }
  };

  const backgroundColor = boardStyle === 'paper' ? '#FFFDF9' : '#2D2624';

  const handleBoardSwitch = (nextBoard: 'paper' | 'chalk') => {
    setBoardStyle(nextBoard);
    if (nextBoard === 'chalk' && selectedColor === '#2F231E') {
      setSelectedColor('#FFFFFF');
    } else if (nextBoard === 'paper' && selectedColor === '#FFFFFF') {
      setSelectedColor('#D97757');
    }
  };

  const handleUndo = () => {
    setStrokes((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setStrokes([]);
    setActiveStroke(null);
  };

  const handleSend = async () => {
    if (strokes.length === 0) return;
    try {
      setSending(true);
      await onSend(
        {
          version: 1,
          width: canvasSize.width,
          height: canvasSize.height,
          background: backgroundColor,
          strokes,
        },
        caption
      );
      setStrokes([]);
      setCaption('');
    } finally {
      setSending(false);
    }
  };

  const allStrokes = activeStroke ? [...strokes, activeStroke] : strokes;

  return (
    <View style={styles.container}>
      {/* Controles de estilo papel / lousa e desfazer/limpar */}
      <View style={styles.toolbarRow}>
        <View style={styles.boardSwitch}>
          <Pressable
            onPress={() => handleBoardSwitch('paper')}
            style={[styles.modePill, boardStyle === 'paper' && styles.modePillActive]}>
            <Text style={[styles.modeText, boardStyle === 'paper' && styles.modeTextActive]}>
              Papel
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleBoardSwitch('chalk')}
            style={[styles.modePill, boardStyle === 'chalk' && styles.modePillActive]}>
            <Text style={[styles.modeText, boardStyle === 'chalk' && styles.modeTextActive]}>
              Lousa
            </Text>
          </Pressable>
        </View>

        <View style={styles.actionIcons}>
          <Pressable
            onPress={handleUndo}
            disabled={strokes.length === 0}
            style={[styles.iconBtn, strokes.length === 0 && styles.iconBtnDisabled]}>
            <Ionicons name="arrow-undo-outline" size={18} color={Palette.text} />
          </Pressable>
          <Pressable
            onPress={handleClear}
            disabled={strokes.length === 0}
            style={[styles.iconBtn, strokes.length === 0 && styles.iconBtnDisabled]}>
            <Ionicons name="trash-outline" size={18} color={Palette.danger} />
          </Pressable>
        </View>
      </View>

      {/* Área desenhável */}
      <View
        onLayout={handleLayout}
        style={[styles.canvas, { backgroundColor }]}
        {...panResponder.panHandlers}>
        {allStrokes.length === 0 ? (
          <View pointerEvents="none" style={styles.placeholderOverlay}>
            <Ionicons
              name="brush-outline"
              size={22}
              color={boardStyle === 'paper' ? Palette.textMuted : '#8E827C'}
            />
            <Text
              style={[
                styles.placeholderText,
                { color: boardStyle === 'paper' ? Palette.textMuted : '#A89B95' },
              ]}>
              Desenhe um coração ou escreva um bilhete com o dedo
            </Text>
          </View>
        ) : null}

        <Svg width="100%" height="100%" pointerEvents="none">
          {allStrokes.map((stroke, index) => (
            <Path
              key={`path-${index}`}
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

      {/* Paleta de cores e espessura */}
      <View style={styles.paletteRow}>
        <View style={styles.colorsRow}>
          {BRUSH_COLORS.map((color) => {
            const active = selectedColor === color;
            return (
              <Pressable
                key={color}
                onPress={() => setSelectedColor(color)}
                style={[
                  styles.colorDot,
                  { backgroundColor: color },
                  color === '#FFFFFF' && styles.whiteDotBorder,
                  active && styles.colorDotActive,
                ]}
              />
            );
          })}
        </View>

        <View style={styles.widthsRow}>
          {BRUSH_WIDTHS.map((width) => {
            const active = strokeWidth === width;
            return (
              <Pressable
                key={width}
                onPress={() => setStrokeWidth(width)}
                style={[styles.widthBtn, active && styles.widthBtnActive]}>
                <View
                  style={{
                    width: width + 4,
                    height: width + 4,
                    borderRadius: Radius.full,
                    backgroundColor: active ? Palette.primary : Palette.textSecondary,
                  }}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      <Input
        placeholder="Legenda opcional para o bilhete..."
        value={caption}
        onChangeText={setCaption}
      />

      <Button
        title="Enviar bilhete visual"
        loading={sending}
        disabled={strokes.length === 0}
        onPress={handleSend}
        icon={<Ionicons name="paper-plane-outline" size={16} color={Palette.textOnPrimary} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  toolbarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boardSwitch: {
    flexDirection: 'row',
    backgroundColor: Palette.surfaceSubtle,
    borderRadius: Radius.sm,
    padding: 3,
    gap: 3,
  },
  modePill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: 7,
  },
  modePillActive: {
    backgroundColor: Palette.surface,
  },
  modeText: {
    ...Typography.captionBold,
    color: Palette.textSecondary,
  },
  modeTextActive: {
    color: Palette.primary,
  },
  actionIcons: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    backgroundColor: Palette.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  iconBtnDisabled: {
    opacity: 0.4,
  },
  canvas: {
    height: 200,
    width: '100%',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Palette.borderStrong,
    overflow: 'hidden',
  },
  placeholderOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
  },
  placeholderText: {
    ...Typography.caption,
    textAlign: 'center',
  },
  paletteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  colorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
  },
  whiteDotBorder: {
    borderWidth: 1,
    borderColor: Palette.borderStrong,
  },
  colorDotActive: {
    borderWidth: 2.5,
    borderColor: Palette.primary,
    transform: [{ scale: 1.12 }],
  },
  widthsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  widthBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surfaceSubtle,
  },
  widthBtnActive: {
    borderWidth: 1.2,
    borderColor: Palette.primary,
    backgroundColor: Palette.surfaceAccent,
  },
});
