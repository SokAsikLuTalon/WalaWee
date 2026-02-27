import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, CreditCard, CheckCircle } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  duration_days: number;
  price: number;
  stock_count: number;
}

interface CheckoutPageProps {
  productId: string;
  onBack: () => void;
  onSuccess: (keyCode: string) => void;
}

export function CheckoutPage({ productId, onBack, onSuccess }: CheckoutPageProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [qrisUrl, setQrisUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success'>('idle');
  const [purchasedKey, setPurchasedKey] = useState<string | null>(null);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  useEffect(() => {
    if (orderId && paymentStatus === 'pending') {
      const channel = supabase
        .channel(`order-${orderId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${orderId}`,
          },
          (payload) => {
            if (payload.new.payment_status === 'paid') {
              setPaymentStatus('success');
              loadPurchasedKey(payload.new.key_id);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [orderId, paymentStatus]);

  const loadProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();

      if (error) throw error;
      setProduct(data);
    } catch (error) {
      console.error('Error loading product:', error);
      alert('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const loadPurchasedKey = async (keyId: string) => {
    try {
      const { data, error } = await supabase
        .from('keys')
        .select('key_code')
        .eq('id', keyId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setPurchasedKey(data.key_code);
      }
    } catch (error) {
      console.error('Error loading key:', error);
    }
  };

  const handleCheckout = async () => {
    if (!product) return;

    setProcessing(true);

    try {
      const { data: session } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({
            product_id: product.id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create payment');
      }

      setQrisUrl(result.qris_url);
      setOrderId(result.order_id);
      setPaymentStatus('pending');
    } catch (error: any) {
      console.error('Error creating payment:', error);
      alert(error.message || 'Failed to create payment');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-white text-xl">Product not found</div>
      </div>
    );
  }

  if (paymentStatus === 'success' && purchasedKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <CheckCircle className="w-20 h-20 text-green-500" />
          </div>

          <h2 className="text-3xl font-bold text-white mb-4">Payment Successful!</h2>
          <p className="text-gray-400 mb-6">Your premium key has been activated</p>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 mb-6">
            <div className="text-gray-400 text-sm mb-2">Your Key Code</div>
            <code className="text-2xl font-mono font-bold text-blue-400">{purchasedKey}</code>
          </div>

          <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-4 mb-6">
            <p className="text-blue-400 text-sm">
              Please save this key code securely. You can also view it in your dashboard.
            </p>
          </div>

          <button
            onClick={() => onSuccess(purchasedKey)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
      <div className="max-w-2xl mx-auto py-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Store
        </button>

        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6">
            <h2 className="text-2xl font-bold text-white">Checkout</h2>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">{product.name}</h3>
              <p className="text-gray-400 text-sm">{product.description}</p>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Duration</span>
                <span className="text-white font-semibold">{product.duration_days} days</span>
              </div>
              <div className="flex justify-between mb-4">
                <span className="text-gray-400">Price</span>
                <span className="text-white font-semibold text-xl">
                  IDR {product.price.toLocaleString()}
                </span>
              </div>
            </div>

            {qrisUrl ? (
              <div className="text-center space-y-4">
                <div className="text-white font-semibold">Scan QR Code to Pay</div>
                <img
                  src={qrisUrl}
                  alt="QRIS Payment"
                  className="mx-auto max-w-sm bg-white p-4 rounded-lg"
                />
                <div className="text-gray-400 text-sm">
                  Waiting for payment confirmation...
                </div>
                <div className="animate-pulse flex justify-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mx-1"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full mx-1"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full mx-1"></div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleCheckout}
                disabled={processing || product.stock_count === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                {processing ? 'Processing...' : 'Proceed to Payment'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
