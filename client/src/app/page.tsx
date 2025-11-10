'use client';

import { useState } from 'react';
import Dashboard from '@/components/Dashboard';
import IpManagement from '@/components/IpManagement';
import EmailComposer from '@/components/EmailComposer';
import EmailDeliveries from '@/components/EmailDeliveries';
import { Mail, Server, BarChart, Send } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart },
    { id: 'compose', label: 'Compose Email', icon: Send },
    { id: 'deliveries', label: 'Email Deliveries', icon: Mail },
    { id: 'ips', label: 'IP Management', icon: Server },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            MailBlew
          </h1>
          <p className="text-gray-600">
            Custom SMTP Server with IP Rotation
          </p>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors
                      ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'compose' && <EmailComposer />}
            {activeTab === 'deliveries' && <EmailDeliveries />}
            {activeTab === 'ips' && <IpManagement />}
          </div>
        </div>
      </div>
    </div>
  );
}
