'use client';

import { useState } from 'react';
import { sendEmail, EmailRequest } from '@/lib/api';
import { Send, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EmailComposer() {
  const [loading, setLoading] = useState(false);
  const [emailData, setEmailData] = useState<EmailRequest>({
    from: '',
    from_name: '',
    to: [],
    cc: [],
    bcc: [],
    subject: '',
    body_text: '',
    body_html: '',
    reply_to: '',
  });
  const [toInput, setToInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [bccInput, setBccInput] = useState('');
  const [useHtml, setUseHtml] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailData.from || toInput.trim() === '') {
      toast.error('Please fill in required fields (From and To)');
      return;
    }

    const toEmails = toInput.split(',').map(e => e.trim()).filter(e => e);
    const ccEmails = ccInput ? ccInput.split(',').map(e => e.trim()).filter(e => e) : undefined;
    const bccEmails = bccInput ? bccInput.split(',').map(e => e.trim()).filter(e => e) : undefined;

    const emailPayload: EmailRequest = {
      from: emailData.from,
      from_name: emailData.from_name || undefined,
      to: toEmails,
      cc: ccEmails && ccEmails.length > 0 ? ccEmails : undefined,
      bcc: bccEmails && bccEmails.length > 0 ? bccEmails : undefined,
      subject: emailData.subject,
      body_text: useHtml ? undefined : emailData.body_text || undefined,
      body_html: useHtml ? emailData.body_html || undefined : undefined,
      reply_to: emailData.reply_to || undefined,
    };

    setLoading(true);
    try {
      const response = await sendEmail(emailPayload);
      toast.success(`Email queued successfully! Delivery ID: ${response.delivery_id}`);

      // Reset form
      setEmailData({
        from: emailData.from, // Keep from address
        from_name: emailData.from_name,
        to: [],
        cc: [],
        bcc: [],
        subject: '',
        body_text: '',
        body_html: '',
        reply_to: emailData.reply_to,
      });
      setToInput('');
      setCcInput('');
      setBccInput('');
    } catch (error: any) {
      console.error('Failed to send email:', error);
      toast.error(error.response?.data || 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <Mail className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Compose Email</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={emailData.from}
              onChange={(e) => setEmailData({ ...emailData, from: e.target.value })}
              placeholder="noreply@yourdomain.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Name
            </label>
            <input
              type="text"
              value={emailData.from_name}
              onChange={(e) => setEmailData({ ...emailData, from_name: e.target.value })}
              placeholder="Your Company"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            To (comma-separated) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={toInput}
            onChange={(e) => setToInput(e.target.value)}
            placeholder="recipient@example.com, another@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CC (comma-separated)
            </label>
            <input
              type="text"
              value={ccInput}
              onChange={(e) => setCcInput(e.target.value)}
              placeholder="cc@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              BCC (comma-separated)
            </label>
            <input
              type="text"
              value={bccInput}
              onChange={(e) => setBccInput(e.target.value)}
              placeholder="bcc@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reply-To
          </label>
          <input
            type="email"
            value={emailData.reply_to}
            onChange={(e) => setEmailData({ ...emailData, reply_to: e.target.value })}
            placeholder="support@yourdomain.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={emailData.subject}
            onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
            placeholder="Email Subject"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Email Body
            </label>
            <button
              type="button"
              onClick={() => setUseHtml(!useHtml)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {useHtml ? 'Switch to Plain Text' : 'Switch to HTML'}
            </button>
          </div>

          {useHtml ? (
            <textarea
              value={emailData.body_html}
              onChange={(e) => setEmailData({ ...emailData, body_html: e.target.value })}
              placeholder="<h1>Your HTML content here</h1>"
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          ) : (
            <textarea
              value={emailData.body_text}
              onChange={(e) => setEmailData({ ...emailData, body_text: e.target.value })}
              placeholder="Your email message here..."
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send Email
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
