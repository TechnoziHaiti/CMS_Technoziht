import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
}

export default function ImageUpload({ value, onChange, bucket = 'cms-uploads' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) {
        throw new Error('Vous devez sélectionner une image.');
      }
      let file = e.target.files[0];
      
      // Demander confirmation si le fichier fait plus de 5 Mo (5 * 1024 * 1024)
      if (file.size > 5 * 1024 * 1024) {
        const confirmCompression = window.confirm("Cette image est assez lourde (plus de 5 Mo). Sa qualité sera légèrement réduite pour garantir la rapidité de votre site. Voulez-vous continuer ?");
        if (!confirmCompression) {
          setUploading(false);
          return;
        }
      }
      
      // Compression de l'image (Max 5MB)
      const options = {
        maxSizeMB: 4.8, // On vise juste en dessous de 5 pour être sûr
        maxWidthOrHeight: 2048,
        useWebWorker: true
      };
      
      try {
        file = await imageCompression(file, options);
      } catch (error) {
        console.error("Erreur de compression:", error);
        toast.error("Erreur lors de la compression de l'image");
      }

      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      onChange(data.publicUrl);
      toast.success('Image uploadée avec succès');
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
  };

  return (
    <div className="space-y-4">
      {value ? (
        <div className="relative w-full max-w-sm rounded-lg overflow-hidden border border-gray-200">
          <img src={value} alt="Preview" className="w-full h-auto object-cover" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 bg-white rounded-full text-red-600 hover:bg-red-50 shadow-sm transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center w-full max-w-sm">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {uploading ? (
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-2" />
              ) : (
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
              )}
              <p className="text-sm text-gray-500">
                {uploading ? 'Upload en cours...' : 'Cliquez pour uploader'}
              </p>
            </div>
            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      )}
    </div>
  );
}
