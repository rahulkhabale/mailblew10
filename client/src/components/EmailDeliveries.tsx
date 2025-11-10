'use client';

import { useEffect, useState } from 'react';
import { getAllEmails, EmailDelivery } from '@/lib/api';
import { Mail, CheckCircle, XCircle, Clock, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EmailDeliveries() {
  const [deliveries, setDeliveries] = useState<EmailDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<EmailDelivery | null>(null);

  useEffect(() => {
    fetchDeliveries();
    const interval = setInterval(fetchDeliveries, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDeliveries = async () => {
    try {
      const data = await getAllEmails();
      setDeliveries(data.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch deliveries:', error);
      toast.error('Failed to load email deliveries');
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'sending':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      sent: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      sending: 'bg-blue-100 text-blue-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[status as keyof typeof badges] || badges.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
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
      <div className="flex items-center gap-2">
        <Mail className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Email Deliveries</h2>
        <span className="text-sm text-gray-500">({deliveries.length} total)</span>
      </div>

      {deliveries.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No emails sent yet. Compose and send your first email!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {deliveries.map((delivery) => (
            <div
              key={delivery.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedEmail(delivery)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(delivery.status)}
                    <h3 className="text-lg font-semibold text-gray-900">
                      {delivery.email.subject || '(No Subject)'}
                    </h3>
                    {getStatusBadge(delivery.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">From:</span> {delivery.email.from}
                      {delivery.email.from_name && ` (${delivery.email.from_name})`}
                    </div>
                    <div>
                      <span className="font-medium">To:</span> {delivery.email.to.join(', ')}
                    </div>
                    {delivery.ip_used && (
                      <div>
                        <span className="font-medium">IP Used:</span> {delivery.ip_used}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Created:</span>{' '}
                      {new Date(delivery.created_at).toLocaleString()}
                    </div>
                    {delivery.sent_at && (
                      <div>
                        <span className="font-medium">Sent:</span>{' '}
                        {new Date(delivery.sent_at).toLocaleString()}
                      </div>
                    )}
                    {delivery.error_message && (
                      <div className="col-span-2">
                        <span className="font-medium text-red-600">Error:</span>{' '}
                        <span className="text-red-600">{delivery.error_message}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedEmail && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedEmail(null)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Email Details</h3>
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(selectedEmail.status)}
                {getStatusBadge(selectedEmail.status)}
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Subject</label>
                <p className="text-gray-900">{selectedEmail.email.subject}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">From</label>
                <p className="text-gray-900">
                  {selectedEmail.email.from}
                  {selectedEmail.email.from_name && ` (${selectedEmail.email.from_name})`}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">To</label>
                <p className="text-gray-900">{selectedEmail.email.to.join(', ')}</p>
              </div>

              {selectedEmail.email.cc && selectedEmail.email.cc.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700">CC</label>
                  <p className="text-gray-900">{selectedEmail.email.cc.join(', ')}</p>
                </div>
              )}

              {selectedEmail.ip_used && (
                <div>
                  <label className="text-sm font-medium text-gray-700">IP Address Used</label>
                  <p className="text-gray-900">{selectedEmail.ip_used}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700">Created At</label>
                <p className="text-gray-900">{new Date(selectedEmail.created_at).toLocaleString()}</p>
              </div>

              {selectedEmail.sent_at && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Sent At</label>
                  <p className="text-gray-900">{new Date(selectedEmail.sent_at).toLocaleString()}</p>
                </div>
              )}

              {selectedEmail.email.body_text && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Body (Text)</label>
                  <div className="mt-1 p-4 bg-gray-50 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm text-gray-900">
                      {selectedEmail.email.body_text}
                    </pre>
                  </div>
                </div>
              )}

              {selectedEmail.email.body_html && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Body (HTML)</label>
                  <div className="mt-1 p-4 bg-gray-50 rounded-lg">
                    <div
                      className="text-sm"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.email.body_html }}
                    />
                  </div>
                </div>
              )}

              {selectedEmail.error_message && (
                <div>
                  <label className="text-sm font-medium text-red-700">Error Message</label>
                  <p className="text-red-600 mt-1">{selectedEmail.error_message}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
