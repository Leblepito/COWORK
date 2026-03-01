"use client";

import { useState, useRef, useCallback } from "react";

interface CargoDropZoneProps {
  onFileDrop: (file: File) => void;
  disabled?: boolean;
}

export default function CargoDropZone({ onFileDrop, disabled }: CargoDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      setDroppedFile(file);
      onFileDrop(file);
    }
  }, [disabled, onFileDrop]);

  const handleClick = () => {
    if (!disabled) fileRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDroppedFile(file);
      onFileDrop(file);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
        ${isDragging
          ? "border-pink-400 bg-pink-500/10 scale-[1.02]"
          : "border-[#f472b630] hover:border-pink-400/50"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />
      {droppedFile ? (
        <div className="text-[10px] text-pink-400">
          📄 {droppedFile.name} ({(droppedFile.size / 1024).toFixed(1)} KB)
        </div>
      ) : (
        <>
          <div className="text-2xl mb-2">📦</div>
          <div className="text-[10px] text-gray-500">
            {isDragging ? "Birak!" : "Dosya surukle veya tikla"}
          </div>
          <div className="text-[8px] text-gray-600 mt-1">
            Cargo Agent otomatik analiz edecek
          </div>
        </>
      )}
    </div>
  );
}
