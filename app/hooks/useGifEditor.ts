"use client";

import { useMemo, useState } from "react";
import type { FramePosition } from "../lib/images";
import { GIF_PRESETS, getNextFrameDuration, type GifPresetId } from "../lib/presets";

interface UseGifEditorOptions {
  selectedImageId: string | null;
  onMutation: () => void;
  reorderImages: (sourceId: string, targetId: string) => void;
}

export function useGifEditor({ selectedImageId, onMutation, reorderImages }: UseGifEditorOptions) {
  const [frameDuration, setFrameDuration] = useState(2);
  const [frameDurationOverrides, setFrameDurationOverrides] = useState<Record<string, number>>({});
  const [gifPresetId, setGifPresetId] = useState<GifPresetId>("source");
  const [gifFramePositions, setGifFramePositions] = useState<Record<string, FramePosition>>({});
  const [draggedFrameId, setDraggedFrameId] = useState<string | null>(null);

  const selectedGifPreset = useMemo(
    () => GIF_PRESETS.find((preset) => preset.id === gifPresetId) ?? GIF_PRESETS[0],
    [gifPresetId]
  );
  const selectedGifPosition = selectedImageId
    ? (gifFramePositions[selectedImageId] ?? { x: 0, y: 0 })
    : { x: 0, y: 0 };

  const cycleFrameDuration = (id: string) => {
    setFrameDurationOverrides((current) => {
      const next = { ...current };
      const nextValue = getNextFrameDuration(current[id]);
      if (nextValue === undefined) delete next[id];
      else next[id] = nextValue;
      return next;
    });
    onMutation();
  };

  const reorderFrames = (sourceId: string, targetId: string) => {
    reorderImages(sourceId, targetId);
  };

  const setFramePosition = (id: string, position: FramePosition) => {
    setGifFramePositions((current) => ({ ...current, [id]: position }));
    onMutation();
  };

  const clearFrameState = (id: string) => {
    setFrameDurationOverrides((current) => {
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
    setGifFramePositions((current) => {
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const clearAllFrameState = () => {
    setFrameDurationOverrides({});
    setGifFramePositions({});
    setDraggedFrameId(null);
  };

  return {
    frameDuration,
    setFrameDuration,
    frameDurationOverrides,
    gifPresetId,
    setGifPresetId,
    gifFramePositions,
    selectedGifPreset,
    selectedGifPosition,
    draggedFrameId,
    setDraggedFrameId,
    cycleFrameDuration,
    reorderFrames,
    setFramePosition,
    clearFrameState,
    clearAllFrameState,
  };
}
