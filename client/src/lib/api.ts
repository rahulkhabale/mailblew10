import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface IpAddress {
  id: string;
  ip: string;
  interface_name: string;
  enabled: boolean;
  created_at?: string;
}

export interface EmailRequest {
  from: string;
  from_name?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body_text?: string;
  body_html?: string;
  reply_to?: string;
}

export interface EmailDelivery {
  id: string;
  email: EmailMessage;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  ip_used?: string;
  created_at: string;
  sent_at?: string;
  error_message?: string;
}

export interface EmailMessage {
  from: string;
  from_name?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body_text?: string;
  body_html?: string;
  reply_to?: string;
}

export interface ServerStats {
  total_emails: number;
  sent: number;
  failed: number;
  pending: number;
  ip_stats: IpStats[];
}

export interface IpStats {
  ip: string;
  total_sent: number;
  failures: number;
  last_used?: string;
}

// Email APIs
export const sendEmail = async (email: EmailRequest) => {
  const response = await api.post('/api/emails/send', email);
  return response.data;
};

export const getAllEmails = async (): Promise<EmailDelivery[]> => {
  const response = await api.get('/api/emails');
  return response.data;
};

export const getEmail = async (id: string): Promise<EmailDelivery> => {
  const response = await api.get(`/api/emails/${id}`);
  return response.data;
};

// IP APIs
export const getAllIps = async (): Promise<IpAddress[]> => {
  const response = await api.get('/api/ips');
  return response.data;
};

export const addIp = async (ip: string, interface_name: string) => {
  const response = await api.post('/api/ips', { ip, interface_name });
  return response.data;
};

export const updateIp = async (id: string, enabled: boolean) => {
  const response = await api.put(`/api/ips/${id}`, { enabled });
  return response.data;
};

export const deleteIp = async (id: string) => {
  const response = await api.delete(`/api/ips/${id}`);
  return response.data;
};

// Stats API
export const getStats = async (): Promise<ServerStats> => {
  const response = await api.get('/api/stats');
  return response.data;
};

export default api;
