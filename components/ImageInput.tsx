
import React, { useRef } from 'react';
import { X, Image as ImageIcon, RotateCcw, RotateCw } from 'lucide-react';

interface ImageInputProps {
  label: string;
  imageSrc: string | null;
  description?: string;
  onImageChange: (file: string | null) => void;
  onLabelChange?: (text: string) => void;
  onDescriptionChange?: (text: string) => void;
  aspectRatio?: 'landscape' | 'square' | 'portrait';
  readOnly?: boolean;
  rotation?: number; // New prop
  onRotationChange?: (rotation: number) => void; // New prop
}

const ImageInput: React.FC<ImageInputProps> = ({
  label,
  imageSrc,
  description,
  onImageChange,
  onLabelChange,
  onDescriptionChange,
  aspectRatio = 'landscape',
  readOnly = false,
  rotation = 0,
  onRotationChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageChange(reader.result as string);
        if (onRotationChange) onRotationChange(0); // Reset rotation on new image
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageChange(null);
    if (onRotationChange) onRotationChange(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRotate = (e: React.MouseEvent, direction: 'cw' | 'ccw') => {
    e.stopPropagation();
    if (!onRotationChange) return;
    const newRotation = direction === 'cw'
      ? (rotation + 90) % 360
      : (rotation - 90 + 360) % 360;
    onRotationChange(newRotation);
  };

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case 'square': return 'aspect-square';
      case 'portrait': return 'aspect-[3/4]';
      case 'landscape': default: return 'aspect-[4/3]';
    }
  };

  return (
    <div className="flex flex-col gap-2 group/container">
      {/* Editable Label or Static Label */}
      {onLabelChange && !readOnly ? (
        <input
          type="text"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          className="text-xs font-semibold uppercase text-gray-700 bg-transparent border-b border-transparent focus:border-blue-500 outline-none w-full"
          placeholder="Judul Foto"
        />
      ) : (
        <span className="text-xs font-semibold uppercase text-gray-600 truncate" title={label}>{label}</span>
      )}

      {/* Image Container */}
      <div
        className={`relative w-full ${getAspectRatioClass()} bg-white border-2 border-dashed border-gray-300 rounded-lg overflow-hidden ${!readOnly ? 'hover:border-blue-500 cursor-pointer' : ''} group transition-colors`}
        onClick={() => !readOnly && fileInputRef.current?.click()}
      >
        {imageSrc ? (
          <div className="w-full h-full relative overflow-hidden bg-gray-50 flex items-center justify-center">
            <img
              src={imageSrc}
              alt={label}
              className="max-w-full max-h-full object-contain transition-transform duration-300"
              style={{ transform: `rotate(${rotation}deg)` }}
            />

            {!readOnly && (
              <>
                <div className="absolute top-2 right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                  <button
                    onClick={handleRemove}
                    className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md"
                    title="Hapus Foto"
                  >
                    <X size={16} />
                  </button>
                </div>
                {/* Rotation Controls */}
                {onRotationChange && (
                  <div className="absolute bottom-2 right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                    <button
                      onClick={(e) => handleRotate(e, 'ccw')}
                      className="p-1 bg-white text-gray-700 rounded-full hover:bg-gray-100 shadow-md border border-gray-200"
                      title="Putar Kiri"
                    >
                      <RotateCcw size={16} />
                    </button>
                    <button
                      onClick={(e) => handleRotate(e, 'cw')}
                      className="p-1 bg-white text-gray-700 rounded-full hover:bg-gray-100 shadow-md border border-gray-200"
                      title="Putar Kanan"
                    >
                      <RotateCw size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <ImageIcon size={32} className="mb-2" />
            <span className="text-[10px] text-center px-2">{readOnly ? 'Tidak ada foto' : 'Klik Upload'}</span>
          </div>
        )}
        {!readOnly && (
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        )}
      </div>

      {/* Optional Description Input */}
      {onDescriptionChange !== undefined && (
        <input
          type="text"
          value={description || ''}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Keterangan (Opsional)..."
          disabled={readOnly}
          className="text-[10px] p-1.5 border rounded w-full bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
        />
      )}
    </div>
  );
};

export default ImageInput;
