import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
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

const POLL_INTERVAL_MS = 2500;

export function CheckoutPage({ productId, onBack, onSuccess }: CheckoutPageProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [qrisUrl, setQrisUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success'>('idle');
  const [purchasedKey, setPurchasedKey] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.products.get(productId).then(setProduct).catch(() => setProduct(null)).finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => {
    if (!orderId || paymentStatus !== 'pending') return;

    const checkOrder = async () => {
      try {
        const order = await api.orders.get(orderId);
        if (order.payment_status === 'paid' && order.key_id) {
          setPaymentStatus('success');
          const keyData = await api.keys.getById(order.key_id);
          setPurchasedKey(keyData.key_code);
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch {
        // ignore
      }
    };

    pollRef.current = setInterval(checkOrder, POLL_INTERVAL_MS);
    checkOrder();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [orderId, paymentStatus]);

  const handleCheckout = async () => {
    if (!product) return;

    setProcessing(true);
    try {
      const result = await api.orders.create(product.id);
      const orderId = result?.order_id;
      const displayUrl = typeof result?.qris_url === 'string' && result.qris_url
        ? result.qris_url
        : typeof result?.payment_link === 'string' && result.payment_link
          ? result.payment_link
          : null;
      if (orderId) setOrderId(orderId);
      setPaymentStatus('pending');
      setQrisUrl(displayUrl || null);
    } catch (error: unknown) {
      console.error('Error creating payment:', error);
      alert(error instanceof Error ? error.message : 'Gagal buat pembayaran');
    } finally {
      setProcessing(false);
    }
  };

  const isQrImage = typeof qrisUrl === 'string' && qrisUrl.startsWith('data:');
  const hasPaymentLink = typeof qrisUrl === 'string' && qrisUrl.length > 0 && (qrisUrl.startsWith('http://') || qrisUrl.startsWith('https://'));

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
                {isQrImage ? (
                  <img
                    src={qrisUrl}
                    alt="QRIS Payment"
                    className="mx-auto max-w-sm bg-white p-4 rounded-lg"
                  />
                ) : hasPaymentLink ? (
                  <div className="space-y-2">
                    <p className="text-gray-400 text-sm">Buka halaman pembayaran lalu scan QR di sana:</p>
                    <a
                      href={qrisUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg"
                    >
                      Buka Halaman Pembayaran →
                    </a>
                  </div>
                ) : null}
                <div className="text-gray-400 text-sm">
                  Waiting for payment confirmation...
                </div>
                <div className="animate-pulse flex justify-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mx-1"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full mx-1"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full mx-1"></div>
                </div>
              </div>
            ) : paymentStatus === 'pending' && orderId ? (
              <div className="text-center space-y-4 py-6">
                <div className="text-white font-semibold">Pembayaran berhasil dibuat</div>
                <p className="text-gray-400 text-sm">
                  Cek status di My Keys setelah kamu selesai bayar. Halaman akan otomatis update saat pembayaran terkonfirmasi.
                </p>
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
