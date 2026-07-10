import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Loader2, ArrowLeft, Package } from 'lucide-react';
import ImageUpload from '../components/ui/ImageUpload';

type Product = {
  id: string;
  title: string;
  description: string;
  price: string;
  image_url: string;
  category: string;
  discount_percentage?: number;
};

type ProductFormData = Product & {
  price_amount: string;
  currency: string;
};

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDiscountEnabled, setIsDiscountEnabled] = useState(false);

  const { register, handleSubmit, reset, setValue, watch } = useForm<ProductFormData>();
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
      
      reset({ ...product, price_amount: amount, currency: isUSD ? 'USD' : 'HTG' } as ProductFormData);
    } else {
      setEditingId(null);
      setIsDiscountEnabled(false);
      reset({ title: '', description: '', price: '', price_amount: '', currency: 'HTG', image_url: '', category: '', discount_percentage: 0 });
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
              <input {...register('category')} placeholder="Ex: Logiciels, Équipements..." className="w-full rounded-lg border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm p-2 border" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea {...register('description')} rows={4} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm p-2 border" />
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pourcentage de réduction (%)</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="100" 
                      {...register('discount_percentage', { valueAsNumber: true })} 
                      placeholder="Ex: 20" 
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm p-2 border" 
                    />
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

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {products.length === 0 ? (
            <li className="p-10 text-center text-gray-500 flex flex-col items-center">
              <Package className="w-10 h-10 text-gray-300 mb-3" />
              <p>Aucun produit dans le catalogue.</p>
            </li>
          ) : (
            products.map((product) => (
              <li key={product.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="h-16 w-16 rounded-lg object-cover bg-gray-100 border border-gray-200" />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200">
                        <Package className="w-6 h-6" />
                      </div>
                    )}
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                        {product.title}
                        {product.category && (
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-normal border border-gray-200">
                            {product.category}
                          </span>
                        )}
                        {product.discount_percentage ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold border border-red-200">
                            -{product.discount_percentage}%
                          </span>
                        ) : null}
                      </h3>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{product.price}</p>
                      <p className="text-sm text-gray-500 line-clamp-1 max-w-xl mt-0.5">{product.description}</p>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button onClick={() => openForm(product)} className="text-gray-500 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDelete(product.id)} className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
