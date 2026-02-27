import { useState, useRef, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage, RegisterPage } from './components/AuthPages';
import { StoreLanding } from './components/StoreLanding';
import { CheckoutPage } from './components/CheckoutPage';
import { UserDashboard } from './components/UserDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminKeys } from './components/AdminKeys';
import { AdminGenerateKeys } from './components/AdminGenerateKeys';
import { LogOut, User, Shield, Key, Plus, LayoutDashboard, Menu, X } from 'lucide-react';

type Page =
  | 'landing'
  | 'login'
  | 'register'
  | 'checkout'
  | 'dashboard'
  | 'admin-dashboard'
  | 'admin-keys'
  | 'admin-generate';

function AppContent() {
  const { user, profile, loading, signOut, isAdmin } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const checkoutKeyRef = useRef(0);

  // URL = source of truth: /checkout?product=ID selalu berarti "form checkout baru" (satu link TemanQRIS = satu pemakaian)
  useEffect(() => {
    const syncFromUrl = () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      const productIdFromUrl = params.get('product');
      if (path === '/checkout' && productIdFromUrl) {
        checkoutKeyRef.current += 1;
        setCurrentPage('checkout');
        setSelectedProductId(productIdFromUrl);
      } else if (path === '/' || path === '') {
        setCurrentPage('landing');
        setSelectedProductId(null);
      }
    };
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  const navigateToCheckout = (productId: string) => {
    checkoutKeyRef.current += 1;
    setSelectedProductId(productId);
    setCurrentPage('checkout');
    window.history.pushState({}, '', `/checkout?product=${encodeURIComponent(productId)}`);
  };

  const navigateToStore = () => {
    setCurrentPage('landing');
    setSelectedProductId(null);
    window.history.replaceState({}, '', '/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  const handleBuyClick = (productId: string) => {
    if (!user) {
      setCurrentPage('login');
      return;
    }
    navigateToCheckout(productId);
  };

  const handleCheckoutBack = () => {
    navigateToStore();
  };

  const handleCheckoutSuccess = () => {
    setCurrentPage('dashboard');
    setSelectedProductId(null);
    window.history.replaceState({}, '', '/');
  };

  const handleSignOut = async () => {
    await signOut();
    setCurrentPage('landing');
    setMobileMenuOpen(false);
  };

  const NavBar = () => (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <button
            onClick={() => { setCurrentPage('landing'); setSelectedProductId(null); window.history.replaceState({}, '', '/'); }}
            className="text-2xl font-bold text-white hover:text-blue-400 transition-colors"
          >
            King Vypers
          </button>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => setCurrentPage('admin-dashboard')}
                      className="px-4 py-2 text-gray-300 hover:text-white flex items-center gap-2 transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      Admin
                    </button>
                  </>
                )}
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className="px-4 py-2 text-gray-300 hover:text-white flex items-center gap-2 transition-colors"
                >
                  <User className="w-4 h-4" />
                  My Keys
                </button>
                <div className="text-gray-400">|</div>
                <span className="text-gray-300">{profile?.display_name}</span>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setCurrentPage('login')}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => setCurrentPage('register')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {user ? (
              <>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setCurrentPage('admin-dashboard');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
                  >
                    Admin Panel
                  </button>
                )}
                <button
                  onClick={() => {
                    setCurrentPage('dashboard');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
                >
                  My Keys
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2 text-red-400 hover:text-red-300 hover:bg-gray-800 rounded transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setCurrentPage('login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setCurrentPage('register');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-blue-400 hover:text-blue-300 hover:bg-gray-800 rounded transition-colors"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );

  const AdminLayout = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <NavBar />
      <div className="flex">
        <aside className="hidden md:block w-64 bg-gray-900 border-r border-gray-800 min-h-screen">
          <div className="p-4 space-y-2">
            <button
              onClick={() => setCurrentPage('admin-dashboard')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                currentPage === 'admin-dashboard'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </button>
            <button
              onClick={() => setCurrentPage('admin-keys')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                currentPage === 'admin-keys'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Key className="w-5 h-5" />
              Manage Keys
            </button>
            <button
              onClick={() => setCurrentPage('admin-generate')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                currentPage === 'admin-generate'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Plus className="w-5 h-5" />
              Generate Keys
            </button>
          </div>
        </aside>

        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );

  if (!user && (currentPage === 'login' || currentPage === 'register')) {
    if (currentPage === 'login') {
      return <LoginPage onSuccess={() => setCurrentPage('landing')} />;
    }
    return <RegisterPage onSuccess={() => setCurrentPage('landing')} />;
  }

  if (user && currentPage === 'dashboard') {
    return (
      <>
        <NavBar />
        <UserDashboard />
      </>
    );
  }

  if (user && currentPage === 'checkout' && selectedProductId) {
    return (
      <CheckoutPage
        key={`checkout-${checkoutKeyRef.current}`}
        productId={selectedProductId}
        onBack={handleCheckoutBack}
        onSuccess={handleCheckoutSuccess}
      />
    );
  }

  if (user && isAdmin && currentPage.startsWith('admin-')) {
    return (
      <AdminLayout>
        {currentPage === 'admin-dashboard' && <AdminDashboard />}
        {currentPage === 'admin-keys' && <AdminKeys />}
        {currentPage === 'admin-generate' && <AdminGenerateKeys />}
      </AdminLayout>
    );
  }

  return (
    <>
      <NavBar />
      <StoreLanding onBuyClick={handleBuyClick} />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
