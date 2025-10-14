'use client';

import { useState } from 'react';

interface ReportEditorProps {
  report: any;
  onSave: (report: any) => void;
  onCancel: () => void;
}

export function ReportEditor({ report, onSave, onCancel }: ReportEditorProps) {
  const [formData, setFormData] = useState({
    problem: report.problem || '',
    result: report.result || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedReport = await response.json();
        onSave(updatedReport);
      }
    } catch (error) {
      console.error('Failed to update report:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="form-label">Problem</label>
        <textarea
          rows={3}
          className="form-input"
          value={formData.problem}
          onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
          placeholder="Describe the problem that was reported..."
        />
      </div>

      <div>
        <label className="form-label">Result</label>
        <textarea
          rows={3}
          className="form-input"
          value={formData.result}
          onChange={(e) => setFormData({ ...formData, result: e.target.value })}
          placeholder="Describe the outcome and resolution..."
        />
      </div>

      <div className="flex space-x-3">
        <button type="submit" className="btn btn-primary">
          Save Changes
        </button>
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}