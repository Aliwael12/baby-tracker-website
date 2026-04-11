"use client";

import { useState, useRef, useCallback } from "react";

const DELETE_THRESHOLD = 100;

export function SwipeableRow({
  children,
  onDelete,
}: {
  children: React.ReactNode;
  onDelete: () => void;
}) {
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const swiping = useRef(false);
  const dismissed = useRef(false);
  const [offset, setOffset] = useState(0);
  const [removing, setRemoving] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (dismissed.current) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = 0;
    swiping.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (dismissed.current) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    if (!swiping.current && Math.abs(dy) > Math.abs(dx)) return;
    if (Math.abs(dx) > 10) {
      swiping.current = true;
      setIsSwiping(true);
    }
    if (!swiping.current) return;

    currentX.current = dx;
    setOffset(dx);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (dismissed.current) return;
    if (Math.abs(currentX.current) > DELETE_THRESHOLD) {
      dismissed.current = true;
      const direction = currentX.current > 0 ? 1 : -1;
      setOffset(direction * window.innerWidth);
      setRemoving(true);
      setTimeout(onDelete, 300);
    } else {
      setOffset(0);
    }
    swiping.current = false;
    setIsSwiping(false);
  }, [onDelete]);

  const progress = Math.min(Math.abs(offset) / DELETE_THRESHOLD, 1);

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        maxHeight: removing ? 0 : 200,
        opacity: removing ? 0 : 1,
        marginBottom: removing ? 0 : undefined,
        transition: removing
          ? "max-height 0.3s ease, opacity 0.3s ease, margin 0.3s ease"
          : undefined,
      }}
    >
      <div
        className="absolute inset-0 flex items-center rounded-2xl px-4"
        style={{
          background: `rgba(239, 68, 68, ${progress * 0.9})`,
          justifyContent: offset >= 0 ? "flex-start" : "flex-end",
        }}
      >
        <span
          className="text-sm font-semibold text-white"
          style={{ opacity: progress }}
        >
          🗑️ Delete
        </span>
      </div>
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative"
        style={{
          transform: `translateX(${offset}px)`,
          transition: isSwiping ? "none" : "transform 0.3s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function DeleteConfirm({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl">
        <p className="mb-1 text-center text-base font-semibold text-gray-800">
          Delete this log?
        </p>
        <p className="mb-5 text-center text-sm text-gray-400">
          This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-500 transition-all active:scale-[0.97]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white shadow transition-all active:scale-[0.97]"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
