import { useState, useEffect, useMemo } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2, 
  ArrowLeft, 
  Package, 
  Sparkles, 
  Search, 
  Tag, 
  CheckCircle2, 
  EyeOff, 
  Percent, 
  X,
  LayoutGrid,
  List,
  Star
} from 'lucide-react';
import ImageUpload from '../components/ui/ImageUpload';

const dbClient = supabaseAdmin || supabase;

export const DEFAULT_CATEGORIES = [
  'AIR CONDITIONNERS & ACCESSORIES',
  'AUDIO & MICROPHONES',
  'AUDIO&VIDEO ACCESSORIES',
  'BACKPACK',
  'BADGE LANYARD',
  'BLENDER',
  'CAMERAS CAMCORDERS & DRONE',
  'CELL PHONES',
  'COMPUTERS',
  'CONTENT CREATION KIT',
  'ELECTRONIC ACCESSORIES',
  'ELECTRONICS',
  'ENERGY CONTROL SYSTEM',
  'FAN',
  'FREEZER',
  'HARD DRIVE DOCKING STATION',
  'HEADPHONES',
  'HOME APPLIANCES',
  'SSD',
  'TABLET',
  'TV & Home Theather',
];

export type Product = {
  id: string;
  name: string;
  description?: string;
  price?: number | null;
  price_text?: string | null;
  discount_price?: number | null;
  image_url: string;
  category: string;
  brand?: string;
  quantite_stock?: number;
  quantite_reservee?: number;
  status: string;
  discount_percentage?: number;
  discount_end_date?: string | null;
  created_at?: string;
  is_featured?: boolean;
};

type ProductFormData = {
  name: string;
  category: string;
  custom_category?: string;
  image_url: string;
  price?: number | string;
  currency: string;
  brand?: string;
  description?: string;
  status: string;
  discount_percentage?: number;
  discount_end_date?: string | null;
};

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPromotionEnabled, setIsPromotionEnabled] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  // View mode: compact grid or table
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Featured Product Confirmation State
  const [featuredConfirmProduct, setFeaturedConfirmProduct] = useState<Product | null>(null);
  const [isUpdatingFeatured, setIsUpdatingFeatured] = useState(false);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const { register, handleSubmit, reset, setValue, watch, getValues } = useForm<ProductFormData>();
  const imageUrl = watch('image_url');
  const watchedCategory = watch('category');

  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('technozi_custom_categories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await dbClient
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur Supabase:', error);
      toast.error('Erreur lors du chargement des produits');
    } else {
      // Nettoyer automatiquement les anciennes entrées corrompues "null HTG"
      const sanitized = (data || []).map((p: Product) => {
        const isCorruptPrice = !p.price || p.price <= 0 || p.price_text?.toLowerCase().includes('null') || p.price_text?.toLowerCase().includes('undefined');
        return {
          ...p,
          price: isCorruptPrice ? null : p.price,
          price_text: isCorruptPrice ? null : p.price_text,
          discount_price: isCorruptPrice ? null : p.discount_price,
        };
      });
      setProducts(sanitized);

      // Récupérer et synchroniser automatiquement toutes les catégories personnalisées de la base de données
      const dbCategories = sanitized
        .map(p => p.category?.trim())
        .filter((cat): cat is string => !!cat && !DEFAULT_CATEGORIES.includes(cat));
      if (dbCategories.length > 0) {
        setCustomCategories(prev => {
          const merged = Array.from(new Set([...prev, ...dbCategories]));
          try {
            localStorage.setItem('technozi_custom_categories', JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }

      // Réparation transparente en arrière-plan dans la base de données
      const corruptRows = (data || []).filter((p: any) => p.price_text?.toLowerCase().includes('null'));
      if (corruptRows.length > 0) {
        corruptRows.forEach((cr: any) => {
          dbClient.from('products').update({ price: null, price_text: null, discount_price: null }).eq('id', cr.id).then(() => {});
        });
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const availableCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    // Charger dynamiquement toutes les catégories présentes dans la base de données
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    // Ajouter également les catégories personnalisées mémorisées
    customCategories.forEach((cat) => {
      if (cat && cat.trim()) {
        set.add(cat.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products, customCategories]);

  // Compute stats without stock notions
  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter(p => p.status === 'active').length;
    const inactive = products.filter(p => p.status === 'inactive').length;
    const inPromo = products.filter(p => (p.discount_percentage || 0) > 0).length;
    const featured = products.filter(p => p.is_featured).length;
    return { total, active, inactive, inPromo, featured };
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = 
        !term ||
        p.name?.toLowerCase().includes(term) ||
        p.brand?.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term);

      const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;

      let matchesStatus = true;
      if (selectedStatus === 'ACTIVE') {
        matchesStatus = p.status === 'active';
      } else if (selectedStatus === 'INACTIVE') {
        matchesStatus = p.status === 'inactive';
      } else if (selectedStatus === 'PROMO') {
        matchesStatus = (p.discount_percentage || 0) > 0;
      } else if (selectedStatus === 'FEATURED') {
        matchesStatus = Boolean(p.is_featured);
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchTerm, selectedCategory, selectedStatus]);

  // Handle clicking the Featured Star
  const handleFeaturedClick = (product: Product) => {
    if (!product.is_featured) {
      const currentFeaturedCount = products.filter(p => p.is_featured).length;
      if (currentFeaturedCount >= 3) {
        toast.error("Vous avez déjà 3 produits en vedette. Veuillez d'abord en retirer un pour pouvoir ajouter celui-ci.", { duration: 4000 });
        return;
      }
    }
    setFeaturedConfirmProduct(product);
  };

  // Confirm toggling featured status
  const confirmToggleFeatured = async () => {
    if (!featuredConfirmProduct) return;
    const newStatus = !featuredConfirmProduct.is_featured;
    setIsUpdatingFeatured(true);

    try {
      const { error } = await dbClient
        .from('products')
        .update({ is_featured: newStatus })
        .eq('id', featuredConfirmProduct.id);

      if (error) throw error;

      setProducts(prev => prev.map(p => 
        p.id === featuredConfirmProduct.id ? { ...p, is_featured: newStatus } : p
      ));

      if (newStatus) {
        toast.success(`« ${featuredConfirmProduct.name} » est maintenant en vedette sur l'accueil !`);
      } else {
        toast.success(`« ${featuredConfirmProduct.name} » a été retiré des produits en vedette.`);
      }
      setFeaturedConfirmProduct(null);
    } catch (err: any) {
      console.error('Erreur mise en vedette:', err);
      toast.error("Erreur lors de la mise à jour. Assurez-vous que la colonne 'is_featured' existe dans Supabase.");
    } finally {
      setIsUpdatingFeatured(false);
    }
  };

  const openForm = (product?: Product) => {
    if (product) {
      setEditingId(product.id);
      
      const currency = product.price_text?.includes('HTG') ? 'HTG' : 'USD';
      const formattedDate = product.discount_end_date ? new Date(product.discount_end_date).toISOString().split('T')[0] : '';
      
      const isKnownCategory = availableCategories.includes(product.category);
      setIsCustomCategory(!isKnownCategory && !!product.category);
      setIsPromotionEnabled((product.discount_percentage || 0) > 0);

      reset({ 
        name: product.name || '',
        category: isKnownCategory ? product.category : 'AUTRE',
        custom_category: isKnownCategory ? '' : product.category,
        image_url: product.image_url || '',
        price: product.price && product.price > 0 ? product.price : '',
        currency,
        brand: product.brand || '',
        description: product.description || '',
        status: product.status || 'active',
        discount_percentage: product.discount_percentage || 0,
        discount_end_date: formattedDate 
      });
    } else {
      setEditingId(null);
      setIsCustomCategory(false);
      setIsPromotionEnabled(false);
      reset({ 
        name: '', 
        category: availableCategories[0] || DEFAULT_CATEGORIES[0], 
        custom_category: '',
        image_url: '', 
        price: '', 
        currency: 'USD', 
        brand: '',
        description: '', 
        status: 'active',
        discount_percentage: 0, 
        discount_end_date: '' 
      });
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setIsCustomCategory(false);
    setIsPromotionEnabled(false);
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      if (!data.image_url || !data.image_url.trim()) {
        toast.error("Veuillez ajouter une image pour le produit (l'image est obligatoire).");
        return;
      }

      const finalCategory = data.category === 'AUTRE' ? (data.custom_category?.trim() || '') : (data.category?.trim() || '');
      if (!finalCategory) {
        toast.error("Veuillez sélectionner ou saisir une catégorie pour le produit.");
        return;
      }

      setSubmitting(true);

      const rawPrice = data.price !== undefined && data.price !== null && data.price !== '' ? Number(data.price) : NaN;
      const hasValidPrice = !isNaN(rawPrice) && rawPrice > 0;
      const finalPrice = hasValidPrice ? rawPrice : null;
      const finalPriceText = hasValidPrice ? `${rawPrice} ${data.currency || 'USD'}` : null;

      let discountPrice: number | null = null;
      let discountPercentage = 0;
      if (hasValidPrice && isPromotionEnabled && data.discount_percentage && data.discount_percentage > 0) {
        discountPercentage = Number(data.discount_percentage);
        discountPrice = Number((rawPrice * (1 - (discountPercentage / 100))).toFixed(2));
      }

      const productData: any = { 
        name: data.name.trim(),
        category: finalCategory,
        image_url: data.image_url.trim(),
        description: data.description?.trim() || '',
        brand: data.brand?.trim() || null,
        price: finalPrice,
        price_text: finalPriceText,
        discount_price: discountPrice,
        discount_percentage: discountPercentage,
        discount_end_date: (isPromotionEnabled && data.discount_end_date) ? data.discount_end_date : null,
        status: data.status || 'active',
        quantite_stock: 999,
        quantite_reservee: 0
      };

      let error;
      if (editingId) {
        const res = await dbClient.from('products').update(productData).eq('id', editingId);
        error = res.error;
      } else {
        const res = await dbClient.from('products').insert([productData]);
        error = res.error;
      }

      if (error) {
        console.error("Erreur Supabase:", error);
        toast.error(`Erreur: ${error.message || 'lors de la sauvegarde'}`);
      } else {
        if (!DEFAULT_CATEGORIES.includes(finalCategory)) {
          setCustomCategories((prev) => {
            const updated = Array.from(new Set([...prev, finalCategory]));
            try {
              localStorage.setItem('technozi_custom_categories', JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }
        toast.success(editingId ? 'Produit modifié avec succès !' : 'Produit publié sur le site avec succès !');
        closeForm();
        fetchProducts();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  const generateDescription = async () => {
    const { name, category, image_url, brand } = getValues();
    
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
        body: JSON.stringify({ 
          title: name, 
          category: category === 'AUTRE' ? 'Divers' : category, 
          brand, 
          imageUrl: image_url 
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la génération");
      }
      
      setValue('description', data.description, { shouldValidate: true, shouldDirty: true });
      toast.success("Description générée avec succès !", { id: loadingToast });
    } catch (error: any) {
      toast.error(error.message || "Serveur IA non joignable (vous pouvez rédiger manuellement)", { id: loadingToast });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Voulez-vous vraiment supprimer le produit "${name}" du site web ?`)) {
      const { error } = await dbClient.from('products').delete().eq('id', id);
      if (error) {
        toast.error(`Erreur lors de la suppression: ${error.message}`);
      } else {
        toast.success('Produit supprimé du catalogue');
        fetchProducts();
      }
    }
  };

  if (loading && !isFormOpen && products.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs text-gray-500 dark:text-gray-400">Chargement des produits...</p>
      </div>
    );
  }

  // Form View (Add / Edit)
  if (isFormOpen) {
    return (
      <div className="space-y-5 w-full pb-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800 pb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              {editingId ? 'Modifier le produit' : 'Ajouter un nouveau produit'}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Champs obligatoires : <span className="font-semibold text-gray-800 dark:text-gray-200">Nom</span>, <span className="font-semibold text-gray-800 dark:text-gray-200">Catégorie</span> et <span className="font-semibold text-gray-800 dark:text-gray-200">Image</span>.
            </p>
          </div>
          <button 
            type="button" 
            onClick={closeForm} 
            className="flex items-center text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Retour
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-[#1e293b] shadow-xs rounded-xl p-5 border border-gray-200 dark:border-gray-800 space-y-5">
          <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
            
            {/* Nom du produit (OBLIGATOIRE) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                Nom du produit <span className="text-red-500">*</span>
              </label>
              <input 
                required 
                placeholder="Ex: Routeur Wi-Fi 6 Archer AX12 Gigabit" 
                {...register('name')} 
                className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs p-2.5 border focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
              />
            </div>

            {/* Catégorie (OBLIGATOIRE) */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                Catégorie <span className="text-red-500">*</span>
              </label>
              <select 
                {...register('category', {
                  onChange: (e) => {
                    setIsCustomCategory(e.target.value === 'AUTRE');
                  }
                })} 
                className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs p-2.5 border focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="AUTRE" className="font-semibold text-blue-600 dark:text-blue-400">+ Autre catégorie personnalisée...</option>
              </select>

              {(isCustomCategory || watchedCategory === 'AUTRE') && (
                <div className="mt-2">
                  <input 
                    type="text" 
                    placeholder="Saisissez la catégorie personnalisée (ex: RACK SERVER)" 
                    {...register('custom_category')} 
                    className="w-full rounded-lg border-blue-400 dark:border-blue-600 bg-blue-50/50 dark:bg-gray-900 text-gray-900 dark:text-white text-xs p-2 border" 
                  />
                </div>
              )}
            </div>

            {/* Statut de visibilité */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                Statut de publication sur le site
              </label>
              <select 
                {...register('status')} 
                className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs p-2.5 border focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="active">Actif (Visible sur le site)</option>
                <option value="inactive">Inactif (Masqué du site)</option>
              </select>
            </div>

            {/* Image du produit (OBLIGATOIRE) */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200">
                  Image du produit <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                  Obligatoire pour l'affichage catalogue
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
                Téléversez une photo du produit (format WebP haute qualité automatique).
              </p>
              <ImageUpload value={imageUrl || ''} onChange={(url) => setValue('image_url', url, { shouldDirty: true })} />
            </div>

            {/* Prix et devise (OPTIONNEL) */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                Prix unitaire <span className="font-normal text-gray-400 dark:text-gray-500">(Optionnel)</span>
              </label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  inputMode="decimal"
                  placeholder="Laisser vide si aucun prix"
                  onWheel={(e) => e.currentTarget.blur()}
                  {...register('price')} 
                  className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs p-2.5 border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                />
                <select 
                  {...register('currency')} 
                  className="w-24 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs p-2.5 border font-semibold"
                >
                  <option value="USD">USD</option>
                  <option value="HTG">HTG</option>
                </select>
              </div>
            </div>

            {/* Marque (OPTIONNEL) */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                Marque <span className="font-normal text-gray-400 dark:text-gray-500">(Optionnel)</span>
              </label>
              <input 
                type="text" 
                placeholder="Ex: Starlink, Netgear, Apple, Dell..." 
                {...register('brand')} 
                className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs p-2.5 border focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
              />
            </div>

            {/* Description (OPTIONNEL) */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200">
                  Description <span className="font-normal text-gray-400 dark:text-gray-500">(Optionnel)</span>
                </label>
                <button
                  type="button"
                  onClick={generateDescription}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[11px] font-semibold rounded-md shadow-xs transition-all disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {isGenerating ? "Génération..." : "Générer avec l'IA"}
                </button>
              </div>
              <textarea 
                rows={3} 
                placeholder="Spécifications, détails ou avantages de l'article (optionnel)..."
                {...register('description')} 
                className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs p-2.5 border focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
              />
            </div>

            {/* Promotion Box (OPTIONNEL) */}
            <div className="sm:col-span-2 p-3.5 rounded-lg border border-gray-200 dark:border-gray-700/80 bg-gray-50 dark:bg-gray-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-rose-500" />
                    Offre Promotionnelle & Remise
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Badge de réduction sur l'image du produit (nécessite un prix).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isPromotionEnabled) {
                      setValue('discount_percentage', 0);
                      setValue('discount_end_date', '');
                    }
                    setIsPromotionEnabled(!isPromotionEnabled);
                  }}
                  className={`inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isPromotionEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isPromotionEnabled ? 'translate-x-4' : 'translate-x-0'}`}
                  />
                </button>
              </div>

              {isPromotionEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Pourcentage de réduction (%)
                    </label>
                    <input 
                      type="number" 
                      min="1" 
                      max="99" 
                      inputMode="numeric"
                      placeholder="Ex: 15"
                      onWheel={(e) => e.currentTarget.blur()}
                      {...register('discount_percentage', { valueAsNumber: true })} 
                      className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs p-2 border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Date de fin (Optionnel)
                    </label>
                    <input 
                      type="date" 
                      {...register('discount_end_date')} 
                      className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs p-2 border" 
                    />
                  </div>
                </div>
              )}
            </div>

          </div>

          <div className="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-gray-800 gap-2.5">
            <button 
              type="button" 
              onClick={closeForm} 
              disabled={submitting}
              className="px-3.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Package className="w-3.5 h-3.5" />
                  {editingId ? 'Enregistrer les modifications' : 'Publier le produit'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-4">
      
      {/* Page Header (Compact) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Gestion des Produits
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Publiez et organisez vos produits par catégorie pour le site web Technozi.
          </p>
        </div>
        <button 
          onClick={() => openForm()} 
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs text-xs font-medium transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Ajouter un produit
        </button>
      </div>

      {/* KPI Stats Cards (Streamlined Compact & Clean) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <div className="bg-white dark:bg-[#1e293b] p-3 rounded-lg border border-gray-200 dark:border-gray-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Catalogue</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">{stats.total}</p>
          </div>
          <Package className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        </div>

        <div className="bg-white dark:bg-[#1e293b] p-3 rounded-lg border border-gray-200 dark:border-gray-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">En ligne</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">{stats.active}</p>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        </div>

        <div className="bg-white dark:bg-[#1e293b] p-3 rounded-lg border border-gray-200 dark:border-gray-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Masqués</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">{stats.inactive}</p>
          </div>
          <EyeOff className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        </div>

        <div className="bg-white dark:bg-[#1e293b] p-3 rounded-lg border border-gray-200 dark:border-gray-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">En Promotion</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">{stats.inPromo}</p>
          </div>
          <Percent className="w-5 h-5 text-purple-500" />
        </div>

        <div 
          onClick={() => setSelectedStatus(selectedStatus === 'FEATURED' ? 'ALL' : 'FEATURED')}
          className={`p-3 rounded-lg border shadow-xs flex items-center justify-between cursor-pointer transition-all ${
            selectedStatus === 'FEATURED'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700'
              : 'bg-white dark:bg-[#1e293b] border-gray-200 dark:border-gray-800 hover:border-amber-400'
          }`}
          title="Cliquer pour afficher uniquement les produits en vedette sur l'accueil"
        >
          <div>
            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">En Vedette</p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">{stats.featured} / 3</p>
          </div>
          <Star className={`w-5 h-5 ${stats.featured > 0 ? 'fill-amber-400 text-amber-500' : 'text-gray-400'}`} />
        </div>
      </div>

      {/* Filters Toolbar + View Toggle */}
      <div className="bg-white dark:bg-[#1e293b] p-2.5 rounded-lg border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input 
            type="text" 
            placeholder="Rechercher par nom, marque, catégorie..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:outline-none focus:border-blue-500"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs py-1.5 px-2.5 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Toutes les catégories</option>
            {availableCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select 
            value={selectedStatus} 
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs py-1.5 px-2.5 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="ACTIVE">En ligne</option>
            <option value="INACTIVE">Masqués</option>
            <option value="PROMO">En promotion</option>
            <option value="FEATURED">⭐ En vedette ({stats.featured}/3)</option>
          </select>

          {/* Toggle Grille / Tableau */}
          <div className="flex border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50'}`}
              title="Vue Grille compacte"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 transition-colors ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50'}`}
              title="Vue Tableau condensé"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="py-12 px-4 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-[#1e293b] shadow-xs rounded-lg border border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center">
          <Package className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Aucun produit trouvé</h3>
          <p className="text-xs mt-1 max-w-sm text-gray-500 dark:text-gray-400">
            {products.length === 0 
              ? "Votre catalogue est actuellement vide."
              : "Aucun produit ne correspond à vos filtres de recherche."}
          </p>
          {products.length === 0 && (
            <button 
              onClick={() => openForm()}
              className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Ajouter mon premier produit
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* VUE TABLEAU (ULTRA-COMPACTE) */
        <div className="bg-white dark:bg-[#1e293b] rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700/80 text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Produit</th>
                  <th className="py-2.5 px-3">Catégorie</th>
                  <th className="py-2.5 px-3">Prix</th>
                  <th className="py-2.5 px-3">Affichage</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredProducts.map((product) => {
                  const hasDiscount = (product.discount_percentage || 0) > 0;
                  const hasPrice = product.price && product.price > 0 && product.price_text;

                  return (
                    <tr key={product.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} className="w-full h-full object-contain p-0.5" />
                            ) : (
                              <Package className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate max-w-xs sm:max-w-sm" title={product.name}>
                              {product.name}
                            </p>
                            {product.brand && (
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{product.brand}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-2 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-700 dark:text-gray-300">
                          <Tag className="w-2.5 h-2.5 text-gray-400" />
                          {product.category}
                        </span>
                      </td>

                      <td className="py-2 px-3 whitespace-nowrap">
                        {hasPrice ? (
                          hasDiscount && product.discount_price ? (
                            <div>
                              <span className="font-bold text-rose-600 dark:text-rose-400">
                                {product.discount_price} {product.price_text?.split(' ')[1] || 'HTG'}
                              </span>
                              <span className="ml-1.5 text-[10px] text-gray-400 line-through">
                                {product.price_text}
                              </span>
                            </div>
                          ) : (
                            <span className="font-bold text-gray-900 dark:text-white">
                              {product.price_text}
                            </span>
                          )
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">Non affiché</span>
                        )}
                      </td>

                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium">
                          <span className={`w-1.5 h-1.5 rounded-full ${product.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                          <span className={product.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}>
                            {product.status === 'active' ? 'En ligne' : 'Masqué'}
                          </span>
                        </span>
                      </td>

                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleFeaturedClick(product)}
                            className={`p-1.5 rounded transition-all cursor-pointer ${
                              product.is_featured 
                                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60' 
                                : 'text-gray-300 dark:text-gray-600 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                            title={product.is_featured ? "En vedette sur l'accueil (cliquer pour retirer)" : "Mettre en vedette sur l'accueil (max 3)"}
                          >
                            <Star className={`w-3.5 h-3.5 ${product.is_featured ? 'fill-amber-400 text-amber-500' : ''}`} />
                          </button>
                          <button
                            onClick={() => openForm(product)}
                            className="p-1.5 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Modifier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id, product.name)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VUE GRILLE (COMPACTE & PROPORTIONNÉE) */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
          {filteredProducts.map((product) => {
            const hasDiscount = (product.discount_percentage || 0) > 0;
            const hasPrice = product.price && product.price > 0 && product.price_text;

            return (
              <div 
                key={product.id} 
                className="bg-white dark:bg-[#1e293b] overflow-hidden shadow-xs hover:shadow-md rounded-lg border border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-150 group"
              >
                {/* Image Conteneur (Épurée sans fond de couleur) */}
                <div className="relative h-32 w-full bg-white dark:bg-[#1e293b] p-2 flex items-center justify-center border-b border-gray-100 dark:border-gray-800">
                  {/* Bouton Étoile Vedette direct */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleFeaturedClick(product); }}
                    className={`absolute top-1.5 left-1.5 z-10 p-1.5 rounded-full transition-all cursor-pointer ${
                      product.is_featured
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 hover:scale-110'
                        : 'bg-white/90 dark:bg-gray-900/90 text-gray-400 hover:text-amber-500 hover:bg-white dark:hover:bg-gray-800 shadow-xs'
                    }`}
                    title={product.is_featured ? "En vedette (cliquer pour retirer)" : "Mettre en vedette sur l'accueil"}
                  >
                    <Star className={`w-3.5 h-3.5 ${product.is_featured ? 'fill-white' : ''}`} />
                  </button>

                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name} 
                      className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center text-gray-400">
                      <Package className="w-7 h-7 mb-0.5 opacity-40" />
                      <span className="text-[10px]">Sans image</span>
                    </div>
                  )}

                  {product.status === 'inactive' && (
                    <span className="absolute top-1.5 left-1.5 text-gray-400 dark:text-gray-500 font-semibold text-[9px]">
                      Masqué
                    </span>
                  )}

                  {hasDiscount && (
                    <span className="absolute top-1.5 right-1.5 text-rose-600 dark:text-rose-400 text-[10px] font-black">
                      -{product.discount_percentage}%
                    </span>
                  )}
                </div>

                {/* Contenu de la fiche (Épuré sans background sous texte) */}
                <div className="p-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Catégorie & Marque sans fond */}
                    <div className="flex items-center gap-1 mb-1 text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {product.category && (
                        <span className="truncate" title={product.category}>
                          {product.category}
                        </span>
                      )}
                      {product.category && product.brand && <span>•</span>}
                      {product.brand && (
                        <span className="text-blue-600 dark:text-blue-400 truncate">
                          {product.brand}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xs font-bold text-gray-900 dark:text-white leading-tight line-clamp-2" title={product.name}>
                      {product.name}
                    </h3>

                    {/* Prix */}
                    <div className="mt-1.5">
                      {hasPrice ? (
                        hasDiscount && product.discount_price && product.discount_price > 0 ? (
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                              {product.discount_price} {product.price_text?.split(' ')[1] || 'HTG'}
                            </span>
                            <span className="text-[9px] text-gray-400 line-through">
                              {product.price_text}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-black text-gray-900 dark:text-white">
                            {product.price_text}
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">
                          Sans prix affiché
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Statut & Actions en bas (texte pur sans pilule de fond) */}
                  <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium">
                      <span className={`w-1.5 h-1.5 rounded-full ${product.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                      <span className={product.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}>
                        {product.status === 'active' ? 'En ligne' : 'Masqué'}
                      </span>
                    </span>

                    <div className="flex items-center gap-1">
                      <button 
                        type="button"
                        onClick={() => handleFeaturedClick(product)} 
                        className={`p-1 rounded transition-colors cursor-pointer ${
                          product.is_featured 
                            ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60' 
                            : 'text-gray-300 dark:text-gray-600 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                        title={product.is_featured ? "Retirer de la vedette" : "Mettre en vedette sur l'accueil (max 3)"}
                      >
                        <Star className={`w-3 h-3 ${product.is_featured ? 'fill-amber-400 text-amber-500' : ''}`} />
                      </button>
                      <button 
                        onClick={() => openForm(product)} 
                        className="p-1 rounded text-gray-600 hover:text-blue-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-gray-800 transition-colors"
                        title="Modifier"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id, product.name)} 
                        className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Confirmation Mise en vedette */}
      {featuredConfirmProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-sm w-full p-5 border border-gray-200 dark:border-gray-800 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                featuredConfirmProduct.is_featured ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/50' : 'bg-blue-100 text-blue-600 dark:bg-blue-950/50'
              }`}>
                <Star className={`w-5 h-5 ${featuredConfirmProduct.is_featured ? 'fill-amber-500' : ''}`} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  {featuredConfirmProduct.is_featured ? 'Retirer de la vedette ?' : 'Mettre en vedette ?'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {featuredConfirmProduct.is_featured ? 'Accueil — Catalogue en vedette' : `Accueil — Maximum 3 produits (${stats.featured}/3 actuellement)`}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              {featuredConfirmProduct.is_featured ? (
                <>Souhaitez-vous retirer <strong>« {featuredConfirmProduct.name} »</strong> des 3 produits mis en avant sur la page d'accueil ?</>
              ) : (
                <>Souhaitez-vous afficher <strong>« {featuredConfirmProduct.name} »</strong> parmi les 3 produits mis en vedette sur la page d'accueil ?</>
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setFeaturedConfirmProduct(null)}
                disabled={isUpdatingFeatured}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmToggleFeatured}
                disabled={isUpdatingFeatured}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-white transition-colors cursor-pointer ${
                  featuredConfirmProduct.is_featured 
                    ? 'bg-rose-600 hover:bg-rose-700' 
                    : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                {isUpdatingFeatured ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Mise à jour...
                  </>
                ) : (
                  <>
                    <Star className="w-3.5 h-3.5 fill-white" />
                    {featuredConfirmProduct.is_featured ? 'Retirer' : 'Mettre en vedette'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
