import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, X, Loader2, ClipboardPaste } from 'lucide-react';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  enableGlobalPaste?: boolean;
}

export default function ImageUpload({ 
  value, 
  onChange, 
  bucket = 'cms-uploads',
  enableGlobalPaste = true 
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const processAndUploadFile = useCallback(async (file: File) => {
    try {
      setUploading(true);
      const loadingToast = toast.loading('Optimisation et téléversement de l\'image...');

      // Compression et optimisation automatique de l'image (Max 600KB, format WebP haute performance)
      const options = {
        maxSizeMB: 0.6,
        maxWidthOrHeight: 1600,
        fileType: 'image/webp',
        useWebWorker: true
      };
      
      let optimizedFile = file;
      try {
        optimizedFile = await imageCompression(file, options);
      } catch (error) {
        console.error("Erreur de compression:", error);
      }

      const fileExt = 'webp';
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, optimizedFile, {
          contentType: 'image/webp',
          cacheControl: '31536000'
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      onChange(data.publicUrl);
      toast.success('Image téléversée avec succès !', { id: loadingToast });
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  }, [bucket, onChange]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    processAndUploadFile(e.target.files[0]);
  };

  // Support du collage Ctrl + V depuis le presse-papier (Snipping Tool, Capture, Copier-Coller)
  useEffect(() => {
    if (!enableGlobalPaste) return;

    const handlePaste = (e: ClipboardEvent) => {
      if (uploading) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            processAndUploadFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [enableGlobalPaste, uploading, processAndUploadFile]);

  // Support Drag and Drop
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (uploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        processAndUploadFile(file);
      } else {
        toast.error('Veuillez déposer un fichier image valide.');
      }
    }
  };

  const handleRemove = () => {
    onChange('');
  };

  return (
    <div className="w-full space-y-3">
      {value ? (
        <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-3 h-52 sm:h-64 shadow-xs">
          <img src={value} alt="Aperçu produit" className="max-h-full max-w-full object-contain" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-3 right-3 p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-full text-red-600 hover:bg-white dark:hover:bg-gray-800 shadow-md transition-all hover:scale-110"
            title="Supprimer l'image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="w-full">
          <label 
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center w-full h-36 sm:h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
              isDragOver 
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 scale-[1.01]' 
                : 'border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-blue-400'
            }`}
          >
            <div className="flex flex-col items-center justify-center p-4 text-center">
              {uploading ? (
                <>
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                  <p className="text-xs font-semibold text-blue-600 animate-pulse">
                    Téléversement en cours...
                  </p>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2 shadow-xs">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                    Cliquez pour choisir un fichier ou déposez votre image ici
                  </p>
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 shadow-xs">
                      <ClipboardPaste className="w-3.5 h-3.5 text-blue-600" />
                      Faites directement <kbd className="font-mono font-bold bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded shadow-xs border border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400">Ctrl + V</kbd> pour coller une image
                    </span>
                  </div>
                </>
              )}
            </div>
            <input type="file" className="hidden" accept="image/*" onChange={handleFileInput} disabled={uploading} />
          </label>
        </div>
      )}
    </div>
  );
}
