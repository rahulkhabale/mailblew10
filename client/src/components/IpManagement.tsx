'use client';

import { useEffect, useState } from 'react';
import { getAllIps, addIp, updateIp, deleteIp, IpAddress } from '@/lib/api';
import { Plus, Trash2, Power, PowerOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function IpManagement() {
  const [ips, setIps] = useState<IpAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIp, setNewIp] = useState('');
  const [newInterface, setNewInterface] = useState('eth0');

  useEffect(() => {
    fetchIps();
  }, []);

  const fetchIps = async () => {
    try {
      const data = await getAllIps();
      setIps(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch IPs:', error);
      toast.error('Failed to load IP addresses');
      setLoading(false);
    }
  };

  const handleAddIp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(newIp)) {
      toast.error('Please enter a valid IP address');
      return;
    }

    try {
      await addIp(newIp, newInterface);
      toast.success('IP address added successfully');
      setNewIp('');
      setNewInterface('eth0');
      setShowAddForm(false);
      fetchIps();
    } catch (error) {
      console.error('Failed to add IP:', error);
      toast.error('Failed to add IP address');
    }
  };

  const handleToggleIp = async (id: string, enabled: boolean) => {
    try {
      await updateIp(id, !enabled);
      toast.success(`IP ${!enabled ? 'enabled' : 'disabled'} successfully`);
      fetchIps();
    } catch (error) {
      console.error('Failed to update IP:', error);
      toast.error('Failed to update IP address');
    }
  };

  const handleDeleteIp = async (id: string, ip: string) => {
    if (!confirm(`Are you sure you want to delete IP ${ip}?`)) {
      return;
    }

    try {
      await deleteIp(id);
      toast.success('IP address deleted successfully');
      fetchIps();
    } catch (error) {
      console.error('Failed to delete IP:', error);
      toast.error('Failed to delete IP address');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">IP Address Management</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add IP Address
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddIp} className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New IP Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IP Address
              </label>
              <input
                type="text"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                placeholder="192.168.1.100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interface Name
              </label>
              <input
                type="text"
                value={newInterface}
                onChange={(e) => setNewInterface(e.target.value)}
                placeholder="eth0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Add IP
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewIp('');
                setNewInterface('eth0');
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Interface
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created At
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {ips.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No IP addresses configured. Add one to get started.
                </td>
              </tr>
            ) : (
              ips.map((ip) => (
                <tr key={ip.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {ip.ip}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ip.interface_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ip.enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {ip.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ip.created_at ? new Date(ip.created_at).toLocaleString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleIp(ip.id, ip.enabled)}
                        className={`p-2 rounded-lg transition-colors ${
                          ip.enabled
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-400 hover:bg-gray-50'
                        }`}
                        title={ip.enabled ? 'Disable' : 'Enable'}
                      >
                        {ip.enabled ? <Power className="w-5 h-5" /> : <PowerOff className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => handleDeleteIp(ip.id, ip.ip)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
