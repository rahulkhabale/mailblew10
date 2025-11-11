'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Domain {
  id: string;
  domain: string;
  verification_code: string;
  dkim_selector: string;
  dkim_public_key: string;
  verified: boolean;
  created_at: string;
}

interface DnsRecord {
  record_type: string;
  record_name: string;
  record_value: string;
}

interface DnsRecords {
  verification: DnsRecord;
  spf: DnsRecord;
  dkim: DnsRecord;
  dmarc: DnsRecord;
}

export default function DomainManagement() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [dnsRecords, setDnsRecords] = useState<DnsRecords | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchDomains();
    const interval = setInterval(fetchDomains, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchDomains = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/domains`);
      setDomains(response.data);
    } catch (error) {
      console.error('Failed to fetch domains:', error);
    }
  };

  const addDomain = async () => {
    if (!newDomain.trim()) {
      setMessage('Please enter a domain name');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      await axios.post(`${API_URL}/api/domains`, { domain: newDomain.trim() });
      setNewDomain('');
      setMessage('Domain added successfully! Please configure DNS records.');
      fetchDomains();
    } catch (error) {
      setMessage('Failed to add domain');
      console.error('Failed to add domain:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewDnsRecords = async (domain: Domain) => {
    setSelectedDomain(domain);
    try {
      const response = await axios.get(`${API_URL}/api/domains/${domain.id}/dns`);
      setDnsRecords(response.data);
    } catch (error) {
      console.error('Failed to fetch DNS records:', error);
    }
  };

  const verifyDomain = async (domainId: string) => {
    setVerifying(true);
    setMessage('');

    try {
      const response = await axios.post(`${API_URL}/api/domains/${domainId}/verify`);
      if (response.data.verified) {
        setMessage('✅ Domain verified successfully!');
        fetchDomains();
      } else {
        setMessage('❌ Verification failed. Please check your DNS records and try again in a few minutes.');
      }
    } catch (error) {
      setMessage('Failed to verify domain');
      console.error('Failed to verify domain:', error);
    } finally {
      setVerifying(false);
    }
  };

  const deleteDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to delete this domain?')) return;

    try {
      await axios.delete(`${API_URL}/api/domains/${domainId}`);
      setMessage('Domain deleted successfully');
      setSelectedDomain(null);
      setDnsRecords(null);
      fetchDomains();
    } catch (error) {
      setMessage('Failed to delete domain');
      console.error('Failed to delete domain:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage('✅ Copied to clipboard!');
    setTimeout(() => setMessage(''), 2000);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Domain Management</h2>

      {message && (
        <div className={`p-3 rounded ${message.includes('✅') ? 'bg-green-50 text-green-800' : message.includes('❌') ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'}`}>
          {message}
        </div>
      )}

      {/* Add Domain */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Add New Domain</h3>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="example.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            className="flex-1 px-4 py-2 border rounded"
            disabled={loading}
          />
          <button
            onClick={addDomain}
            disabled={loading}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
          >
            {loading ? 'Adding...' : 'Add Domain'}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Enter your domain name (e.g., example.com) to start sending emails from it.
        </p>
      </div>

      {/* Domain List */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Your Domains</h3>
        <div className="space-y-3">
          {domains.length === 0 ? (
            <p className="text-gray-500">No domains added yet. Add your first domain above!</p>
          ) : (
            domains.map((domain) => (
              <div
                key={domain.id}
                className={`border rounded-lg p-4 ${selectedDomain?.id === domain.id ? 'border-blue-500 bg-blue-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-medium">{domain.domain}</span>
                    {domain.verified ? (
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                        ✓ Verified
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                        ⚠ Pending Verification
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => viewDnsRecords(domain)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      View DNS Records
                    </button>
                    {!domain.verified && (
                      <button
                        onClick={() => verifyDomain(domain.id)}
                        disabled={verifying}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
                      >
                        {verifying ? 'Verifying...' : 'Verify'}
                      </button>
                    )}
                    <button
                      onClick={() => deleteDomain(domain.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Added: {new Date(domain.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* DNS Records (SendGrid/Brevo style) */}
      {selectedDomain && dnsRecords && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">
            DNS Records for {selectedDomain.domain}
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Add these DNS records to your domain provider to verify ownership and enable email sending.
            DNS changes can take up to 48 hours to propagate.
          </p>

          <div className="space-y-6">
            {/* Verification Record */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-semibold mb-3">Verification Record</h4>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Type</label>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="px-2 py-1 bg-white border rounded text-sm">
                        {dnsRecords.verification.record_type}
                      </code>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Record Name</label>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="px-2 py-1 bg-white border rounded text-sm flex-1">
                        {dnsRecords.verification.record_name}
                      </code>
                      <button
                        onClick={() => copyToClipboard(dnsRecords.verification.record_name)}
                        className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <label className="text-sm font-medium text-gray-600">Value</label>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="px-2 py-1 bg-white border rounded text-sm flex-1 break-all">
                        {dnsRecords.verification.record_value}
                      </code>
                      <button
                        onClick={() => copyToClipboard(dnsRecords.verification.record_value)}
                        className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SPF Record */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-semibold mb-3">SPF Record</h4>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Type</label>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="px-2 py-1 bg-white border rounded text-sm">
                        {dnsRecords.spf.record_type}
                      </code>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Record Name</label>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="px-2 py-1 bg-white border rounded text-sm flex-1">
                        {dnsRecords.spf.record_name}
                      </code>
                      <button
                        onClick={() => copyToClipboard(dnsRecords.spf.record_name)}
                        className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <label className="text-sm font-medium text-gray-600">Value</label>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="px-2 py-1 bg-white border rounded text-sm flex-1 break-all">
                        {dnsRecords.spf.record_value}
                      </code>
                      <button
                        onClick={() => copyToClipboard(dnsRecords.spf.record_value)}
                        className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DKIM Record */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-semibold mb-3">DKIM Record</h4>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Type</label>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="px-2 py-1 bg-white border rounded text-sm">
                        {dnsRecords.dkim.record_type}
                      </code>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Record Name</label>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="px-2 py-1 bg-white border rounded text-sm flex-1">
                        {dnsRecords.dkim.record_name}
                      </code>
                      <button
                        onClick={() => copyToClipboard(dnsRecords.dkim.record_name)}
                        className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <label className="text-sm font-medium text-gray-600">Value</label>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="px-2 py-1 bg-white border rounded text-sm flex-1 break-all">
                        {dnsRecords.dkim.record_value}
                      </code>
                      <button
                        onClick={() => copyToClipboard(dnsRecords.dkim.record_value)}
                        className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DMARC Record */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-semibold mb-3">DMARC Record</h4>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Type</label>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="px-2 py-1 bg-white border rounded text-sm">
                        {dnsRecords.dmarc.record_type}
                      </code>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Record Name</label>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="px-2 py-1 bg-white border rounded text-sm flex-1">
                        {dnsRecords.dmarc.record_name}
                      </code>
                      <button
                        onClick={() => copyToClipboard(dnsRecords.dmarc.record_name)}
                        className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <label className="text-sm font-medium text-gray-600">Value</label>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="px-2 py-1 bg-white border rounded text-sm flex-1 break-all">
                        {dnsRecords.dmarc.record_value}
                      </code>
                      <button
                        onClick={() => copyToClipboard(dnsRecords.dmarc.record_value)}
                        className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-semibold text-blue-900 mb-2">Next Steps:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
              <li>Add all DNS records above to your domain's DNS settings</li>
              <li>Wait for DNS propagation (can take up to 48 hours)</li>
              <li>Click the "Verify" button to check if records are configured correctly</li>
              <li>Once verified, you can start sending emails from this domain!</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
