import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Trash2, Edit2, Loader2, ImagePlus } from 'lucide-react';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';

interface MultiImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  bucket?: string;
}

export default function MultiImageUpload({ value = [], onChange, bucket = 'cms-uploads' }: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const processAndUploadFile = async (file: File): Promise<string> => {
    // Compression et optimisation automatique de l'image (Max 600KB, format WebP haute qualité)
    const options = {
      maxSizeMB: 0.6,
      maxWidthOrHeight: 1600,
      fileType: 'image/webp',
      useWebWorker: true
    };
    
    let processedFile = file;
    try {
      processedFile = await imageCompression(file, options);
    } catch (error) {
      console.error("Erreur de compression:", error);
    }

    const fileExt = 'webp';
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, processedFile, {
        contentType: 'image/webp',
        cacheControl: '31536000'
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) {
        throw new Error('Vous devez sélectionner une image.');
      }
      
      const publicUrl = await processAndUploadFile(e.target.files[0]);
      onChange([...value, publicUrl]);
      toast.success('Image ajoutée avec succès');
    } catch (error: any) {
      if (error.message !== "Annulé par l'utilisateur") {
        toast.error(error.message || "Erreur lors de l'upload");
      }
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleEditUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (editingIndex === null) return;
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) {
        throw new Error('Vous devez sélectionner une image.');
      }
      
      const publicUrl = await processAndUploadFile(e.target.files[0]);
      const newArray = [...value];
      newArray[editingIndex] = publicUrl;
      onChange(newArray);
      toast.success('Image remplacée avec succès');
    } catch (error: any) {
      if (error.message !== "Annulé par l'utilisateur") {
        toast.error(error.message || 'Erreur lors du remplacement');
      }
    } finally {
      setUploading(false);
      setEditingIndex(null);
      if (editInputRef.current) editInputRef.current.value = '';
    }
  };

  const triggerEdit = (index: number) => {
    setEditingIndex(index);
    editInputRef.current?.click();
  };

  const handleRemove = (indexToRemove: number) => {
    if (window.confirm('Voulez-vous vraiment supprimer cette image ?')) {
      onChange(value.filter((_, index) => index !== indexToRemove));
    }
  };

  return (
    <div className="space-y-4">
      {/* Input caché pour le remplacement d'image */}
      <input 
        type="file" 
        className="hidden" 
        accept="image/*" 
        ref={editInputRef}
        onChange={handleEditUpload} 
        disabled={uploading} 
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
        {value.map((url, index) => (
          <div 
            key={url} 
            className="group relative aspect-square rounded-xl overflow-hidden border border-gray-200 shadow-sm transition-all hover:shadow-md"
          >
            <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            
            {/* Overlay au survol avec fond flouté */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => triggerEdit(index)}
                className="flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white text-gray-800 text-sm font-medium rounded-full shadow-lg transition-transform transform hover:scale-105"
              >
                {uploading && editingIndex === index ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit2 className="w-4 h-4" />}
                Changer
              </button>
              
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/90 hover:bg-red-600 text-white text-sm font-medium rounded-full shadow-lg transition-transform transform hover:scale-105"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
            </div>
            
            {/* Si c'est en train de charger exactement sur cette image */}
            {uploading && editingIndex === index && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              </div>
            )}
          </div>
        ))}

        {/* Bouton d'ajout */}
        <div className="flex items-center justify-center aspect-square">
          <label className="flex flex-col items-center justify-center w-full h-full border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-primary-50 hover:border-primary-300 transition-all group shadow-sm">
            <div className="flex flex-col items-center justify-center transform transition-transform group-hover:scale-105">
              {uploading && editingIndex === null ? (
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-3" />
              ) : (
                <div className="p-3 bg-white rounded-full shadow-sm mb-3 group-hover:text-primary-600 group-hover:shadow-md transition-all text-gray-400">
                  <ImagePlus className="w-6 h-6" />
                </div>
              )}
              <span className="text-sm font-medium text-gray-600 group-hover:text-primary-600 transition-colors">
                {uploading && editingIndex === null ? 'Upload...' : 'Ajouter une photo'}
              </span>
            </div>
            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>
    </div>
  );
}
