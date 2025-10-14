'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../providers';
import { Navigation } from './Navigation';
import { ReportsView } from './ReportsView';
import { SessionsView } from './SessionsView';
import { AnalyticsView } from './AnalyticsView';
import { SnippetsView } from './SnippetsView';
import { AuditView } from './AuditView';

type ViewType = 'reports' | 'sessions' | 'analytics' | 'snippets' | 'audit';

export function Dashboard() {
  const [currentView, setCurrentView] = useState<ViewType>('reports');
  const { user } = useAuth();

  const renderView = () => {
    switch (currentView) {
      case 'reports':
        return <ReportsView />;
      case 'sessions':
        return <SessionsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'snippets':
        return <SnippetsView />;
      case 'audit':
        return <AuditView />;
      default:
        return <ReportsView />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        currentView={currentView}
        onViewChange={setCurrentView}
        user={user}
      />

      <main className="lg:pl-64">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {renderView()}
        </div>
      </main>
    </div>
  );
}