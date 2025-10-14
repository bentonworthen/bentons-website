'use client';

import { Fragment } from 'react';
import { useAuth } from '../providers';
import {
  DocumentTextIcon,
  VideoCameraIcon,
  ChartBarIcon,
  DocumentDuplicateIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

interface NavigationProps {
  currentView: string;
  onViewChange: (view: any) => void;
  user: any;
}

const navigation = [
  { name: 'Reports', id: 'reports', icon: DocumentTextIcon },
  { name: 'Sessions', id: 'sessions', icon: VideoCameraIcon },
  { name: 'Analytics', id: 'analytics', icon: ChartBarIcon },
  { name: 'Snippets', id: 'snippets', icon: DocumentDuplicateIcon },
  { name: 'Audit Logs', id: 'audit', icon: ShieldCheckIcon },
];

export function Navigation({ currentView, onViewChange, user }: NavigationProps) {
  const { logout } = useAuth();

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex flex-col flex-grow pt-5 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-xl font-bold text-gray-900">Reportify</h1>
        </div>

        <div className="mt-5 flex-grow flex flex-col">
          <nav className="flex-1 px-2 pb-4 space-y-1">
            {navigation.map((item) => {
              const isActive = currentView === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.name}
                  onClick={() => onViewChange(item.id)}
                  className={`w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon
                    className={`mr-3 flex-shrink-0 h-6 w-6 ${
                      isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
          <div className="flex-shrink-0 w-full group block">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 group-hover:text-gray-700">
                  {user?.role}
                </p>
              </div>
              <button
                onClick={logout}
                className="ml-3 text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}