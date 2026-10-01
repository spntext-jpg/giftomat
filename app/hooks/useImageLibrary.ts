"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { looksLikeHeic, resolveImageFile } from "../lib/heic";

export interface ImageItem {
  id: string;
  url: string;
  file: File;
}

export const MAX_FILES = 60;
const MAX_FILE_BYTES = 40 * 1024 * 1024;

function createId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface UseImageLibraryOptions {
  locked: boolean;
  onMutation: () => void;
  onNotice: (message: string | null) => void;
}

export function useImageLibrary({ locked, onMutation, onNotice }: UseImageLibraryOptions) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const addFilesInFlightRef = useRef(false);
  const imagesRef = useRef<ImageItem[]>([]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => () => {
    for (const image of imagesRef.current) URL.revokeObjectURL(image.url);
  }, []);

  const selectedImage = useMemo(
    () => images.find((image) => image.id === selectedId) ?? images[0] ?? null,
    [images, selectedId]
  );

  const addFiles = async (incoming: FileList | File[]) => {
    if (locked || addFilesInFlightRef.current) return;
    addFilesInFlightRef.current = true;
    onMutation();
    try {
      const allIncoming = Array.from(incoming);
      const availableSlots = Math.max(0, MAX_FILES - images.length);
      const candidates = allIncoming
        .filter((file) => (file.type.startsWith("image/") || looksLikeHeic(file)) && file.size <= MAX_FILE_BYTES)
        .slice(0, availableSlots);

      const rejectedCount = allIncoming.length - candidates.length;
      const resolved = await Promise.all(candidates.map((file) => resolveImageFile(file)));
      const usableFiles = resolved.filter((file): file is File => file !== null);
      const failedHeicCount = resolved.length - usableFiles.length;
      const nextImages = usableFiles.map((file) => ({ id: createId(), url: URL.createObjectURL(file), file }));

      if (nextImages.length) {
        setImages((current) => [...current, ...nextImages]);
        setSelectedId((current) => current ?? nextImages[0].id);
      }

      const notices: string[] = [];
      if (rejectedCount > 0) {
        notices.push(`Пропущено файлов: ${rejectedCount}. Поддерживаются изображения до 40 МБ, максимум ${MAX_FILES} кадров.`);
      }
      if (failedHeicCount > 0) notices.push(`Не удалось прочитать HEIC/HEIF: ${failedHeicCount}.`);
      onNotice(notices.length ? notices.join(" ") : null);
    } finally {
      addFilesInFlightRef.current = false;
    }
  };

  const pasteFiles = useEffectEvent((files: File[]) => {
    void addFiles(files);
  });

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      const files = Array.from(items)
        .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);
      if (!files.length) return;
      event.preventDefault();
      pasteFiles(files);
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const removeImage = (id: string) => {
    if (locked) return;
    const removed = imagesRef.current.find((image) => image.id === id);
    setImages((current) => current.filter((image) => image.id !== id));
    setSelectedId((current) => current === id ? imagesRef.current.find((image) => image.id !== id)?.id ?? null : current);
    if (removed) queueMicrotask(() => URL.revokeObjectURL(removed.url));
    onMutation();
  };

  const replaceImages = (updates: { id: string; file: File }[]) => {
    if (!updates.length) return;
    const updatesById = new Map(updates.map((update) => [update.id, update.file]));
    const replacements = new Map<string, ImageItem>();
    const oldUrls: string[] = [];

    for (const image of imagesRef.current) {
      const file = updatesById.get(image.id);
      if (!file) continue;
      replacements.set(image.id, { id: image.id, url: URL.createObjectURL(file), file });
      oldUrls.push(image.url);
    }

    if (!replacements.size) return;
    setImages((current) => current.map((image) => replacements.get(image.id) ?? image));
    queueMicrotask(() => oldUrls.forEach((url) => URL.revokeObjectURL(url)));
    onMutation();
  };

  const clearImages = () => {
    if (locked) return;
    const urls = imagesRef.current.map((image) => image.url);
    setImages([]);
    setSelectedId(null);
    queueMicrotask(() => urls.forEach((url) => URL.revokeObjectURL(url)));
    onMutation();
  };

  const reorderImages = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setImages((current) => {
      const from = current.findIndex((item) => item.id === sourceId);
      const to = current.findIndex((item) => item.id === targetId);
      if (from < 0 || to < 0) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    onMutation();
  };

  const moveImage = (id: string, offset: -1 | 1) => {
    const current = imagesRef.current;
    const index = current.findIndex((item) => item.id === id);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= current.length) return;
    reorderImages(id, current[target].id);
  };

  return {
    images,
    selectedImage,
    selectedId,
    setSelectedId,
    addFiles,
    removeImage,
    replaceImages,
    clearImages,
    reorderImages,
    moveImage,
  };
}
