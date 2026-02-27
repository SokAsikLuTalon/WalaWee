import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Key, RotateCcw, Calendar, Clock } from 'lucide-react';

interface UserKey {
  id: string;
  key_code: string;
  status: string;
  duration_days: number;
  hwid: string | null;
  expires_at: string | null;
  activated_at: string | null;
  hwid_reset_count: number;
  last_hwid_reset_at: string | null;
}

export function UserDashboard() {
  const [keys, setKeys] = useState<UserKey[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadUserKeys();
  }, [user]);

  const loadUserKeys = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('keys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKeys(data || []);
    } catch (error) {
      console.error('Error loading keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetHwid = async (keyCode: string) => {
    if (!confirm('Are you sure you want to reset HWID? This can only be done once per 30 days.')) {
      return;
    }

    try {
      const { data: session } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-hwid`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({
            key_code: keyCode,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset HWID');
      }

      alert(result.message);
      loadUserKeys();
    } catch (error: any) {
      console.error('Error resetting HWID:', error);
      alert(error.message || 'Failed to reset HWID');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500';
      case 'used':
        return 'bg-blue-500/20 text-blue-400 border-blue-500';
      case 'blocked':
        return 'bg-red-500/20 text-red-400 border-red-500';
      case 'expired':
        return 'bg-gray-500/20 text-gray-400 border-gray-500';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500';
    }
  };

  const getDaysRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;

    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    return days;
  };

  const canResetHwid = (key: UserKey) => {
    if (!key.hwid) return false;
    if (key.status === 'blocked' || key.status === 'expired') return false;

    if (!key.last_hwid_reset_at) return true;

    const now = new Date();
    const lastReset = new Date(key.last_hwid_reset_at);
    const daysSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24);

    return daysSinceReset >= 30;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
      <div className="max-w-6xl mx-auto py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">My Keys</h1>
          <p className="text-gray-400">Manage your premium activation keys</p>
        </div>

        {keys.length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
            <Key className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No keys yet</h3>
            <p className="text-gray-500">Purchase a key to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {keys.map((key) => {
              const daysRemaining = getDaysRemaining(key.expires_at);

              return (
                <div
                  key={key.id}
                  className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shadow-xl"
                >
                  <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key className="w-5 h-5 text-white" />
                        <span className="text-white font-semibold">
                          {key.duration_days} Days License
                        </span>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          key.status
                        )}`}
                      >
                        {key.status}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <div className="text-gray-400 text-xs mb-1">KEY CODE</div>
                      <code className="text-blue-400 font-mono text-lg font-semibold">
                        {key.key_code}
                      </code>
                    </div>

                    {key.hwid && (
                      <div>
                        <div className="text-gray-400 text-xs mb-1">HARDWARE ID</div>
                        <code className="text-gray-400 font-mono text-xs break-all">
                          {key.hwid}
                        </code>
                      </div>
                    )}

                    {key.expires_at && (
                      <div className="flex items-center gap-4 pt-4 border-t border-gray-700">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-gray-400 text-xs">EXPIRES</div>
                            <div className="text-white text-sm">
                              {new Date(key.expires_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        {daysRemaining !== null && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-gray-400 text-xs">REMAINING</div>
                              <div
                                className={`text-sm font-semibold ${
                                  daysRemaining > 7 ? 'text-green-400' : 'text-yellow-400'
                                }`}
                              >
                                {daysRemaining} days
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                      <div className="text-gray-400 text-xs">
                        HWID Resets: {key.hwid_reset_count}
                      </div>

                      {canResetHwid(key) ? (
                        <button
                          onClick={() => handleResetHwid(key.key_code)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Reset HWID
                        </button>
                      ) : key.hwid ? (
                        <div className="text-gray-500 text-xs text-right">
                          {key.last_hwid_reset_at
                            ? `Next reset available in ${Math.ceil(
                                30 -
                                  (new Date().getTime() -
                                    new Date(key.last_hwid_reset_at).getTime()) /
                                    (1000 * 60 * 60 * 24)
                              )} days`
                            : 'HWID reset not available'}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
