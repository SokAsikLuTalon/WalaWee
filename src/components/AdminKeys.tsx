import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, Ban, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

interface Key {
  id: string;
  key_code: string;
  status: string;
  duration_days: number;
  price: number;
  hwid: string | null;
  user_name: string | null;
  created_at: string;
  expires_at: string | null;
}

export function AdminKeys() {
  const [keys, setKeys] = useState<Key[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const keysPerPage = 20;

  useEffect(() => {
    loadKeys();
  }, [currentPage, statusFilter]);

  const loadKeys = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('keys')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * keysPerPage, currentPage * keysPerPage - 1);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setKeys(data || []);
      setTotalPages(Math.ceil((count || 0) / keysPerPage));
    } catch (error) {
      console.error('Error loading keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedKeys(keys.map((k) => k.id));
    } else {
      setSelectedKeys([]);
    }
  };

  const handleSelectKey = (keyId: string) => {
    setSelectedKeys((prev) =>
      prev.includes(keyId) ? prev.filter((id) => id !== keyId) : [...prev, keyId]
    );
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedKeys.length} keys?`)) return;

    try {
      const { error } = await supabase.from('keys').delete().in('id', selectedKeys);

      if (error) throw error;

      setSelectedKeys([]);
      loadKeys();
    } catch (error) {
      console.error('Error deleting keys:', error);
      alert('Failed to delete keys');
    }
  };

  const handleBulkBlock = async () => {
    if (!confirm(`Block ${selectedKeys.length} keys?`)) return;

    try {
      const { error } = await supabase
        .from('keys')
        .update({ status: 'blocked' })
        .in('id', selectedKeys);

      if (error) throw error;

      setSelectedKeys([]);
      loadKeys();
    } catch (error) {
      console.error('Error blocking keys:', error);
      alert('Failed to block keys');
    }
  };

  const handleResetHwid = async (keyCode: string) => {
    if (!confirm('Reset HWID for this key?')) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-hwid`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            key_code: keyCode,
            secret: import.meta.env.VITE_DISCORD_API_SECRET || 'admin-override',
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset HWID');
      }

      alert('HWID reset successfully');
      loadKeys();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Key Management</h1>
      </div>

      <div className="flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="used">Used</option>
          <option value="blocked">Blocked</option>
          <option value="expired">Expired</option>
        </select>

        {selectedKeys.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={handleBulkBlock}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg flex items-center gap-2"
            >
              <Ban className="w-4 h-4" />
              Block ({selectedKeys.length})
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedKeys.length})
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-white text-center py-8">Loading...</div>
      ) : (
        <>
          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedKeys.length === keys.length && keys.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">Key Code</th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">Duration</th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">Price</th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">HWID</th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">User</th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {keys.map((key) => (
                    <tr key={key.id} className="hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedKeys.includes(key.id)}
                          onChange={() => handleSelectKey(key.id)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-blue-400 font-mono text-sm">{key.key_code}</code>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                            key.status
                          )}`}
                        >
                          {key.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{key.duration_days} days</td>
                      <td className="px-4 py-3 text-gray-300">
                        IDR {key.price.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-gray-400 text-xs">
                          {key.hwid ? key.hwid.substring(0, 12) + '...' : '-'}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{key.user_name || '-'}</td>
                      <td className="px-4 py-3">
                        {key.hwid && (
                          <button
                            onClick={() => handleResetHwid(key.key_code)}
                            className="text-blue-400 hover:text-blue-300"
                            title="Reset HWID"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-gray-400">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white rounded-lg flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white rounded-lg flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
