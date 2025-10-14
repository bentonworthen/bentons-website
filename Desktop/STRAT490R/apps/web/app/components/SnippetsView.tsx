'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface Snippet {
  id: string;
  title: string;
  content: string;
  category?: string;
  tags: string[];
  usageCount: number;
  createdByUser: {
    name: string;
  };
  createdAt: string;
}

export function SnippetsView() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchSnippets();
  }, [searchTerm, selectedCategory]);

  const fetchSnippets = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('category', selectedCategory);

      const response = await fetch(`/api/snippets?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSnippets(data);
      }
    } catch (error) {
      console.error('Failed to fetch snippets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseSnippet = async (snippetId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`/api/snippets/${snippetId}/use`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Update usage count locally
      setSnippets(snippets.map(snippet =>
        snippet.id === snippetId
          ? { ...snippet, usageCount: snippet.usageCount + 1 }
          : snippet
      ));
    } catch (error) {
      console.error('Failed to update snippet usage:', error);
    }
  };

  // Get unique categories for filter
  const categories = [...new Set(snippets.map(s => s.category).filter(Boolean))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Knowledge Snippets</h1>
          <p className="mt-2 text-sm text-gray-700">
            Reusable content snippets for common resolutions and responses.
          </p>
        </div>

        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary"
          >
            Add Snippet
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <input
            type="text"
            placeholder="Search snippets..."
            className="form-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <select
            className="form-input"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Snippets Grid */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {snippets.map((snippet) => (
          <div key={snippet.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-medium text-gray-900 line-clamp-2">
                {snippet.title}
              </h3>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Used {snippet.usageCount}x
              </span>
            </div>

            {snippet.category && (
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {snippet.category}
                </span>
              </div>
            )}

            <p className="mt-3 text-sm text-gray-600 line-clamp-3">
              {snippet.content}
            </p>

            {snippet.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {snippet.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                By {snippet.createdByUser.name}
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleUseSnippet(snippet.id)}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Use
                </button>
                <button className="text-sm text-gray-600 hover:text-gray-700">
                  Copy
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {snippets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No snippets found</p>
          <p className="text-sm text-gray-400 mt-1">
            {searchTerm || selectedCategory
              ? 'Try adjusting your search or filter'
              : 'Create your first snippet to get started'
            }
          </p>
        </div>
      )}

      {/* Create Snippet Form Modal - placeholder */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Snippet</h3>
            <p className="text-gray-600 mb-4">Snippet creation form would go here...</p>
            <div className="flex space-x-3">
              <button className="btn btn-primary">Create</button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}