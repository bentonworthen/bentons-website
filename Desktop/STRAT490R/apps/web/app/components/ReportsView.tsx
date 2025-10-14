'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ReportEditor } from './ReportEditor';
import { LoadingSpinner } from './LoadingSpinner';

interface Report {
  id: string;
  problem: string;
  result: string;
  createdAt: string;
  session: {
    customerId?: string;
    customerName?: string;
    agent: {
      name: string;
    };
  };
}

export function ReportsView() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/reports', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setReports(data);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReportSelect = async (reportId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/reports/${reportId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedReport(data);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to fetch report details:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Reports List */}
      <div className="lg:col-span-1">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Reports</h2>
            <span className="text-sm text-gray-500">{reports.length} total</span>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {reports.map((report) => (
              <div
                key={report.id}
                onClick={() => handleReportSelect(report.id)}
                className={`p-3 rounded-md border cursor-pointer transition-colors ${
                  selectedReport?.id === report.id
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
                  {report.problem || 'Untitled Report'}
                </h3>
                <div className="mt-1 text-xs text-gray-500">
                  <p>Customer: {report.session.customerName || report.session.customerId || 'Unknown'}</p>
                  <p>Agent: {report.session.agent.name}</p>
                  <p>{format(new Date(report.createdAt), 'MMM d, yyyy h:mm a')}</p>
                </div>
              </div>
            ))}

            {reports.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No reports found</p>
                <p className="text-sm">Start a recording session to generate reports</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Details */}
      <div className="lg:col-span-2">
        {selectedReport ? (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">Report Details</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`btn ${isEditing ? 'btn-secondary' : 'btn-primary'}`}
                >
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
                <button className="btn btn-secondary">
                  Export
                </button>
              </div>
            </div>

            {isEditing ? (
              <ReportEditor
                report={selectedReport}
                onSave={(updatedReport) => {
                  setSelectedReport(updatedReport);
                  setIsEditing(false);
                  fetchReports(); // Refresh list
                }}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <div className="space-y-6">
                {/* Problem Section */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-2">Problem</h3>
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-gray-800">{selectedReport.problem || 'No problem description'}</p>
                  </div>
                </div>

                {/* Actions Section */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-2">Actions Taken</h3>
                  <div className="space-y-2">
                    {Array.isArray(selectedReport.actions) && selectedReport.actions.length > 0 ? (
                      selectedReport.actions.map((action: any, index: number) => (
                        <div key={index} className="bg-blue-50 border border-blue-200 rounded-md p-3">
                          <div className="flex items-start">
                            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center mr-3">
                              {action.step || index + 1}
                            </span>
                            <div className="flex-1">
                              <p className="text-gray-800">{action.description}</p>
                              {action.timestamp && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {format(new Date(action.timestamp), 'h:mm:ss a')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 italic">No actions recorded</p>
                    )}
                  </div>
                </div>

                {/* Result Section */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-2">Result</h3>
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <p className="text-gray-800">{selectedReport.result || 'No result recorded'}</p>
                  </div>
                </div>

                {/* Next Steps Section */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-2">Next Steps</h3>
                  <div className="space-y-2">
                    {Array.isArray(selectedReport.nextSteps) && selectedReport.nextSteps.length > 0 ? (
                      selectedReport.nextSteps.map((step: any, index: number) => (
                        <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-gray-800">{step.description}</p>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              step.priority === 'high'
                                ? 'bg-red-100 text-red-800'
                                : step.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {step.priority || 'medium'}
                            </span>
                          </div>
                          {(step.owner || step.dueDate) && (
                            <div className="text-xs text-gray-500 mt-1">
                              {step.owner && <span>Owner: {step.owner}</span>}
                              {step.owner && step.dueDate && <span> • </span>}
                              {step.dueDate && <span>Due: {format(new Date(step.dueDate), 'MMM d, yyyy')}</span>}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 italic">No next steps recorded</p>
                    )}
                  </div>
                </div>

                {/* Session Info */}
                <div className="border-t pt-6">
                  <h3 className="text-md font-medium text-gray-900 mb-2">Session Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Customer:</span>
                      <p className="font-medium">{selectedReport.session.customerName || selectedReport.session.customerId || 'Unknown'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Agent:</span>
                      <p className="font-medium">{selectedReport.session.agent.name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <p className="font-medium">{format(new Date(selectedReport.createdAt), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card">
            <div className="text-center py-12 text-gray-500">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2">Select a report to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}