import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Loader2, ArrowLeft, Package, Sparkles } from 'lucide-react';
import ImageUpload from '../components/ui/ImageUpload';

type Product = {
  id: string;
  title: string;
  description: string;
  price: string;
  image_url: string;
  category: string;
  discount_percentage?: number;
  discount_end_date?: string | null;
};

type ProductFormData = Product & {
  price_amount: string;
  currency: string;
};

const getDiscountStatus = (discount_percentage?: number, discount_end_date?: string | null) => {
  if (!discount_percentage || discount_percentage <= 0) {
    return { isActive: false };
  }
  if (!discount_end_date) {
    return { isActive: true };
  }
  
  const dateParts = discount_end_date.split('T')[0].split('-');
  const end = new Date(
    parseInt(dateParts[0]), 
    parseInt(dateParts[1]) - 1, 
    parseInt(dateParts[2]), 
    23, 59, 59, 999
  );
  const now = new Date();
  
  if (end.getTime() - now.getTime() < 0) {
    return { isActive: false };
  }
  
  return { isActive: true };
};

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDiscountEnabled, setIsDiscountEnabled] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, getValues } = useForm<ProductFormData>();
  const imageUrl = watch('image_url');

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) {
      toast.error('Erreur lors du chargement des produits');
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openForm = (product?: Product) => {
    if (product) {
      setEditingId(product.id);
      setIsDiscountEnabled(!!product.discount_percentage && product.discount_percentage > 0);
      
      // Parse price to extract amount and currency
      const match = product.price.match(/([\d\s.,]+)\s*(HTG|USD|\$|G)/i);
      const amount = match ? match[1].trim() : product.price;
      const isUSD = match ? (match[2].toUpperCase().includes('U') || match[2] === '$') : false;
      
      const formattedDate = product.discount_end_date ? new Date(product.discount_end_date).toISOString().split('T')[0] : '';
      
      reset({ ...product, price_amount: amount, currency: isUSD ? 'USD' : 'HTG', discount_end_date: formattedDate } as ProductFormData);
    } else {
      setEditingId(null);
      setIsDiscountEnabled(false);
      reset({ title: '', description: '', price: '', price_amount: '', currency: 'HTG', image_url: '', category: 'Équipements Réseau & Wi-Fi', discount_percentage: 0, discount_end_date: '' });
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const onSubmit = async (data: ProductFormData) => {
    const { id, price_amount, currency, ...rest } = data;
    
    const formattedPrice = `${price_amount.trim()} ${currency}`;
    const productData: any = { ...rest, price: formattedPrice };
    
    if (!isDiscountEnabled) {
      productData.discount_percentage = 0;
      productData.discount_end_date = null;
    } else if (!productData.discount_end_date) {
      productData.discount_end_date = null;
    }

    let error;

    if (editingId) {
      const res = await supabase.from('products').update(productData).eq('id', editingId);
      error = res.error;
    } else {
      const res = await supabase.from('products').insert([productData]);
      error = res.error;
    }

    if (error) {
      console.error("Supabase Error:", error);
      toast.error(`Erreur: ${error.message || 'lors de la sauvegarde'}`);
    } else {
      toast.success(editingId ? 'Produit modifié' : 'Produit ajouté');
      closeForm();
      fetchProducts();
    }
  };

  const generateDescription = async () => {
    const { title, category, image_url } = getValues();
    
    if (!title) {
      toast.error("Veuillez d'abord saisir le titre du produit.");
      return;
    }

    setIsGenerating(true);
    const loadingToast = toast.loading("L'IA analyse votre produit et rédige la description...");
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5005';
      const response = await fetch(`${apiUrl}/api/generate-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category, imageUrl: image_url })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la génération");
      }
      
      setValue('description', data.description, { shouldValidate: true, shouldDirty: true });
      toast.success("Description générée avec succès !", { id: loadingToast });
    } catch (error: any) {
      toast.error(error.message || "Impossible de contacter l'IA", { id: loadingToast });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce produit ?')) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        toast.error('Erreur lors de la suppression');
      } else {
        toast.success('Produit supprimé');
        fetchProducts();
      }
    }
  };

  if (loading && !isFormOpen) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-900" />
      </div>
    );
  }

  if (isFormOpen) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            {editingId ? 'Modifier le produit' : 'Ajouter un produit'}
          </h1>
          <button onClick={closeForm} className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow-sm rounded-xl p-6 border border-gray-200 space-y-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre du produit</label>
              <input required {...register('title')} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm p-2 border" />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix et Devise</label>
              <div className="flex gap-2">
                <input required {...register('price_amount')} placeholder="Ex: 10 000" className="w-full rounded-lg border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm p-2 border" />
                <select {...register('currency')} className="w-24 rounded-lg border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm p-2 border bg-white">
                  <option value="HTG">HTG</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
            
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <select {...register('category')} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm p-2 border bg-white">
                <option value="Électroménager">Électroménager</option>
                <option value="Énergie Solaire">Énergie Solaire</option>
                <option value="Équipements de Maison">Équipements de Maison</option>
                <option value="Équipements Réseau & Wi-Fi">Équipements Réseau & Wi-Fi</option>
                <option value="Kits Internet (Starlink)">Kits Internet (Starlink)</option>
                <option value="Vidéosurveillance & Sécurité">Vidéosurveillance & Sécurité</option>
                <option value="Ordinateurs & Laptops">Ordinateurs & Laptops</option>
                <option value="Accessoires Informatiques">Accessoires Informatiques</option>
                <option value="Outils Mécanique">Outils Mécanique</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <div className="relative">
                <textarea {...register('description')} rows={5} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm p-2 border pb-10" />
                <button
                  type="button"
                  onClick={generateDescription}
                  disabled={isGenerating}
                  className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold rounded-md shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {isGenerating ? "Génération..." : "Générer avec l'IA"}
                </button>
              </div>
            </div>

            {editingId && (
              <div className="sm:col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-200 mt-2">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Appliquer une promotion</h3>
                    <p className="text-xs text-gray-500">Ajouter une réduction sur ce produit</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDiscountEnabled(!isDiscountEnabled)}
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                    style={{ backgroundColor: isDiscountEnabled ? '#111827' : '#e5e7eb' }}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDiscountEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                
                {isDiscountEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pourcentage de réduction (%)</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="100" 
                        {...register('discount_percentage', { valueAsNumber: true })} 
                        placeholder="Ex: 20" 
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm p-2 border bg-white text-gray-900" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin (Optionnel)</label>
                      <input 
                        type="date" 
                        {...register('discount_end_date')} 
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm p-2 border bg-white text-gray-900" 
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Image du produit</label>
              <ImageUpload value={imageUrl || ''} onChange={(url) => setValue('image_url', url)} />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button type="button" onClick={closeForm} className="mr-3 px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800">
              {editingId ? 'Mettre à jour' : 'Créer le produit'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
          <p className="mt-1 text-sm text-gray-500">Gérez le catalogue de la boutique.</p>
        </div>
        <button onClick={() => openForm()} className="flex items-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors">
          <Plus className="w-4 h-4 mr-2" /> Ajouter un produit
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.length === 0 ? (
          <div className="col-span-full p-10 text-center text-gray-500 bg-white shadow rounded-xl border border-gray-100 flex flex-col items-center justify-center">
            <Package className="w-10 h-10 text-gray-300 mb-3" />
            <p>Aucun produit dans le catalogue.</p>
          </div>
        ) : (
          products.map((product) => (
            <div key={product.id} className="bg-white overflow-hidden shadow rounded-xl border border-gray-100 flex flex-col hover:shadow-md transition-shadow">
              {product.image_url ? (
                <div className="relative">
                  <img src={product.image_url} alt={product.title} className="h-48 w-full object-cover" />
                  {(() => {
                    const status = getDiscountStatus(product.discount_percentage, product.discount_end_date);
                    if (status.isActive && product.discount_percentage) {
                      return (
                        <span className="absolute top-2 right-2 px-2 py-1 rounded-md bg-red-500 text-white text-xs font-bold shadow-sm">
                          -{product.discount_percentage}%
                        </span>
                      );
                    }
                    return null;
                  })()}
                  {product.category && (
                    <span className="absolute top-2 left-2 px-2 py-1 rounded-md bg-white/90 text-gray-800 text-xs font-medium shadow-sm backdrop-blur-sm">
                      {product.category}
                    </span>
                  )}
                </div>
              ) : (
                <div className="h-48 w-full bg-gray-100 flex flex-col items-center justify-center text-gray-400 relative">
                  <Package className="w-10 h-10 mb-2 opacity-50" />
                  <span className="text-sm">Pas d'image</span>
                  {(() => {
                    const status = getDiscountStatus(product.discount_percentage, product.discount_end_date);
                    if (status.isActive && product.discount_percentage) {
                      return (
                        <span className="absolute top-2 right-2 px-2 py-1 rounded-md bg-red-500 text-white text-xs font-bold shadow-sm">
                          -{product.discount_percentage}%
                        </span>
                      );
                    }
                    return null;
                  })()}
                  {product.category && (
                    <span className="absolute top-2 left-2 px-2 py-1 rounded-md bg-white/90 text-gray-800 text-xs font-medium shadow-sm backdrop-blur-sm">
                      {product.category}
                    </span>
                  )}
                </div>
              )}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-bold text-gray-900 truncate pr-2">{product.title}</h3>
                </div>
                <p className="text-lg font-black text-gray-900 mt-1">{product.price}</p>
                <p className="text-sm text-gray-500 mt-2 line-clamp-3 flex-1">{product.description}</p>
                
                <div className="mt-auto pt-4 flex space-x-2 border-t border-gray-100 mt-4">
                  <button onClick={() => openForm(product)} className="flex-1 flex justify-center items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                    <Edit2 className="w-4 h-4 mr-1.5" /> Modifier
                  </button>
                  <button onClick={() => handleDelete(product.id)} className="flex-1 flex justify-center items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-red-600 bg-white hover:bg-red-50 hover:border-red-200 transition-colors">
                    <Trash2 className="w-4 h-4 mr-1.5" /> Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
