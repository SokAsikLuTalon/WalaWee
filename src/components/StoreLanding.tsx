import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingCart, Check, Package } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  duration_days: number;
  price: number;
  stock_count: number;
}

export function StoreLanding({ onBuyClick }: { onBuyClick: (productId: string) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('duration_days', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const features = ['Support All Device', '1 Key / 1 Device', 'Support Reset HWID'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">King Vypers Premium Keys</h1>
          <p className="text-xl text-gray-400">
            Unlock premium features with our secure, high-quality activation keys
          </p>
        </div>

        {loading ? (
          <div className="text-white text-center py-12">Loading products...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shadow-xl hover:shadow-2xl transition-shadow"
              >
                <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6">
                  <div className="flex items-center justify-between">
                    <Package className="w-8 h-8 text-white" />
                    <div className="text-right">
                      <div className="text-white text-sm font-medium">
                        {product.duration_days} Days
                      </div>
                      <div className="text-blue-200 text-xs">Premium Access</div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-2xl font-bold text-white mb-4">{product.name}</h3>

                  <div className="space-y-3 mb-6">
                    {features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-700 pt-4 mb-6">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-gray-400 text-sm">Price</span>
                        <div className="text-3xl font-bold text-white">
                          IDR {product.price.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-400 text-sm">Stock</span>
                        <div
                          className={`text-lg font-semibold ${
                            product.stock_count > 0 ? 'text-green-500' : 'text-red-500'
                          }`}
                        >
                          {product.stock_count > 0 ? `${product.stock_count} left` : 'Out of Stock'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onBuyClick(product.id)}
                    disabled={product.stock_count === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {product.stock_count > 0 ? 'Buy Now' : 'Out of Stock'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
