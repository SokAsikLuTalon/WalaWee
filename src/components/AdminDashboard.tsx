import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { BarChart3, Key, ShoppingBag, DollarSign } from 'lucide-react';

interface DashboardStats {
  totalKeys: number;
  activeKeys: number;
  usedKeys: number;
  totalRevenue: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalKeys: 0,
    activeKeys: 0,
    usedKeys: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.admin.stats();
      setStats({
        totalKeys: data.totalKeys,
        activeKeys: data.activeKeys,
        usedKeys: data.usedKeys,
        totalRevenue: data.totalRevenue,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const statCards = [
    { title: 'Total Keys', value: stats.totalKeys, icon: Key, color: 'bg-blue-600' },
    { title: 'Active Keys', value: stats.activeKeys, icon: BarChart3, color: 'bg-green-600' },
    { title: 'Used Keys', value: stats.usedKeys, icon: ShoppingBag, color: 'bg-yellow-600' },
    {
      title: 'Total Revenue',
      value: `IDR ${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-purple-600',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-gray-800 border border-gray-700 rounded-lg p-6 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">{stat.title}</p>
                  <p className="text-white text-2xl font-bold mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
