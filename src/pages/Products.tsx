import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Loader2, ArrowLeft, Package, Sparkles } from 'lucide-react';
import ImageUpload from '../components/ui/ImageUpload';

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  price_text?: string;
  discount_price?: number;
  image_url: string;
  category: string;
  brand?: string;
  quantite_stock: number;
  quantite_reservee: number;
  status: string;
  discount_percentage?: number; // legacy frontend might still expect this logic or we calculate it
  discount_end_date?: string | null;
};

type ProductFormData = Product & {
  currency: string;
};



export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPromotionEnabled, setIsPromotionEnabled] = useState(false);

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
      
      const currency = product.price_text?.includes('USD') || product.price_text?.includes('$') ? 'USD' : 'HTG';
      const formattedDate = product.discount_end_date ? new Date(product.discount_end_date).toISOString().split('T')[0] : '';
      
      setIsPromotionEnabled((product.discount_percentage || 0) > 0);
      reset({ ...product, currency, discount_end_date: formattedDate } as ProductFormData);
    } else {
      setEditingId(null);
      reset({ 
        name: '', 
        description: '', 
        price: 0, 
        currency: 'HTG', 
        image_url: '', 
        category: 'Équipements Réseau & Wi-Fi', 
        brand: '',
        quantite_stock: 0,
        quantite_reservee: 0,
        status: 'active',
        discount_price: 0,
        discount_percentage: 0, 
        discount_end_date: '' 
      });
      setIsPromotionEnabled(false);
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const onSubmit = async (data: ProductFormData) => {
    const { id, currency, discount_percentage, ...rest } = data;
    
    // Auto generate backward compatible fields
    const formattedPrice = `${data.price} ${currency}`;
    const productData: any = { 
      ...rest, 
      price_text: formattedPrice,
      discount_percentage: discount_percentage || 0
    };
    
    if (data.price > 0 && productData.discount_percentage > 0 && isPromotionEnabled) {
      // Calculate the discount_price for the backend API
      productData.discount_price = data.price * (1 - (productData.discount_percentage / 100));
    } else {
      productData.discount_price = 0;
      productData.discount_percentage = 0;
    }

    if (!productData.discount_end_date || !isPromotionEnabled) {
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
    const { name, category, image_url } = getValues();
    
    if (!name) {
      toast.error("Veuillez d'abord saisir le nom du produit.");
      return;
    }

    setIsGenerating(true);
    const loadingToast = toast.loading("L'IA analyse votre produit et rédige la description...");
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5005';
      const response = await fetch(`${apiUrl}/api/generate-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: name, category, imageUrl: image_url })
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
        <Loader2 className="w-8 h-8 animate-spin text-gray-900 dark:text-white" />
      </div>
    );
  }

  if (isFormOpen) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {editingId ? 'Modifier le produit' : 'Ajouter un produit'}
          </h1>
          <button onClick={closeForm} className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom du produit</label>
              <input required {...register('name')} className="w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm p-2 border" />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prix (Chiffre)</label>
              <div className="flex gap-2">
                <input required type="number" step="0.01" {...register('price', { valueAsNumber: true })} className="w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm p-2 border" />
                <select {...register('currency')} className="w-24 rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm p-2 border bg-white dark:bg-gray-800">
                  <option value="HTG">HTG</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pourcentage de réduction (%)</label>
              <div className="relative">
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  disabled={!isPromotionEnabled}
                  {...register('discount_percentage', { valueAsNumber: true })} 
                  className={`w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm p-2 border pr-20 ${!isPromotionEnabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white dark:bg-gray-800'}`} 
                />
                <button
                  type="button"
                  onClick={() => {
                    if (isPromotionEnabled) {
                      setValue('discount_percentage', 0);
                      setValue('discount_end_date', '');
                    }
                    setIsPromotionEnabled(!isPromotionEnabled);
                  }}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isPromotionEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-800 shadow ring-0 transition duration-200 ease-in-out ${isPromotionEnabled ? 'translate-x-4' : 'translate-x-0'}`}
                  />
                </button>
              </div>
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fin de Promotion (Optionnel)</label>
              <input 
                type="date" 
                disabled={!isPromotionEnabled}
                {...register('discount_end_date')} 
                className={`w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm p-2 border ${!isPromotionEnabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white dark:bg-gray-800'}`} 
              />
            </div>
            
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catégorie</label>
              <select {...register('category')} className="w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm p-2 border bg-white dark:bg-gray-800">
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

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marque</label>
              <input type="text" {...register('brand')} className="w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm p-2 border" />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Réel</label>
              <input required type="number" {...register('quantite_stock', { valueAsNumber: true })} className="w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm p-2 border" />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Statut</label>
              <select {...register('status')} className="w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm p-2 border bg-white dark:bg-gray-800">
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <div className="relative">
                <textarea {...register('description')} rows={5} className="w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm p-2 border pb-10" />
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

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Image du produit</label>
              <ImageUpload value={imageUrl || ''} onChange={(url) => setValue('image_url', url)} />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button type="button" onClick={closeForm} className="mr-3 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm">
              {editingId ? 'Mettre à jour' : 'Créer le produit'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Produits</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Gérez le catalogue et les stocks.</p>
        </div>
        <button onClick={() => openForm()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium">
          <Plus className="w-4 h-4" /> Ajouter un produit
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.length === 0 ? (
          <div className="col-span-full p-10 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 shadow rounded-xl border border-gray-100 flex flex-col items-center justify-center">
            <Package className="w-10 h-10 text-gray-300 mb-3" />
            <p>Aucun produit dans le catalogue.</p>
          </div>
        ) : (
          products.map((product) => {
            const isAvailable = (product.quantite_stock - product.quantite_reservee) > 0;
            return (
              <div key={product.id} className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-xl border border-gray-100 flex flex-col hover:shadow-md transition-shadow">
                {product.image_url ? (
                  <div className="relative h-48">
                    <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                    {!isAvailable && (
                      <div className="absolute inset-0 bg-white dark:bg-gray-800/60 backdrop-blur-sm flex items-center justify-center">
                        <span className="bg-red-500 text-white font-bold px-3 py-1 rounded-full text-xs">Rupture</span>
                      </div>
                    )}
                    {(product.discount_percentage || 0) > 0 && (
                      <span className="absolute top-2 right-2 px-2 py-1 rounded-md bg-red-500 text-white text-xs font-bold shadow-sm">
                        -{product.discount_percentage}%
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="h-48 w-full bg-gray-100 flex flex-col items-center justify-center text-gray-400 relative">
                    <Package className="w-10 h-10 mb-2 opacity-50" />
                    <span className="text-sm">Pas d'image</span>
                  </div>
                )}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate pr-2">{product.name}</h3>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-lg font-black text-gray-900 dark:text-white">{product.price_text}</p>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      Stock: {product.quantite_stock - product.quantite_reservee}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2 flex-1">{product.description}</p>
                  
                  <div className="mt-auto pt-4 flex space-x-2 border-t border-gray-100 mt-4">
                    <button onClick={() => openForm(product)} className="flex-1 flex justify-center items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 transition-colors">
                      <Edit2 className="w-4 h-4 mr-1.5" /> Modifier
                    </button>
                    <button onClick={() => handleDelete(product.id)} className="flex-1 flex justify-center items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-red-600 bg-white dark:bg-gray-800 hover:bg-red-50 hover:border-red-200 transition-colors">
                      <Trash2 className="w-4 h-4 mr-1.5" /> Supprimer
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
