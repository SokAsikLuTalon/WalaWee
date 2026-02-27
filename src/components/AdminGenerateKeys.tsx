import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Download } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  duration_days: number;
  price: number;
  stock_count: number;
}

export function AdminGenerateKeys() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [loading, setLoading] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState<any[]>([]);

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
      if (data && data.length > 0) {
        setSelectedProduct(data[0].id);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct || quantity < 1) {
      alert('Please select a product and valid quantity');
      return;
    }

    setLoading(true);
    setGeneratedKeys([]);

    try {
      const { data: session } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-keys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({
            product_id: selectedProduct,
            quantity,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate keys');
      }

      setGeneratedKeys(result.keys || []);
      alert(`Successfully generated ${quantity} keys!`);
      loadProducts();
    } catch (error: any) {
      console.error('Error generating keys:', error);
      alert(error.message || 'Failed to generate keys');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (generatedKeys.length === 0) return;

    const csv = [
      ['Key Code', 'Duration (days)', 'Price', 'Status', 'Created At'].join(','),
      ...generatedKeys.map((key) =>
        [
          key.key_code,
          key.duration_days,
          key.price,
          key.status,
          new Date(key.created_at).toLocaleString(),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keys-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Generate Keys</h1>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <form onSubmit={handleGenerate} className="space-y-6">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Select Product
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
              required
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} - {product.duration_days} days - IDR{' '}
                  {product.price.toLocaleString()} (Stock: {product.stock_count})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Quantity</label>
            <select
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value={10}>10 keys</option>
              <option value={25}>25 keys</option>
              <option value={50}>50 keys</option>
              <option value={100}>100 keys</option>
              <option value={250}>250 keys</option>
              <option value={500}>500 keys</option>
              <option value={1000}>1000 keys</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {loading ? 'Generating...' : `Generate ${quantity} Keys`}
          </button>
        </form>
      </div>

      {generatedKeys.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">
              Generated Keys ({generatedKeys.length})
            </h2>
            <button
              onClick={handleDownloadCSV}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download CSV
            </button>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {generatedKeys.map((key) => (
                <div
                  key={key.id}
                  className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
                >
                  <code className="text-blue-400 font-mono text-sm">{key.key_code}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
