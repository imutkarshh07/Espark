import React, { useEffect, useState } from 'react';
import { documentService } from '../services/documentService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorAlert';
import { EmptyState } from '../components/EmptyState';
import { FileText, Upload, Trash2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await documentService.listDocuments();
      setDocuments(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load document inventory.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('Only PDF files are supported.');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please choose a PDF file to upload.');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      await documentService.uploadDocument(selectedFile, {
        subject: subject || 'General',
        chapter: chapter || 'General',
      });

      setSelectedFile(null);
      setSubject('');
      setChapter('');
      await loadDocuments();
    } catch (err) {
      setError(err.message || 'Failed to upload and register document.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Delete this study document from storage and RAG index?')) return;

    try {
      await documentService.deleteDocument(docId);
      setDocuments(documents.filter((d) => d.id !== docId));
    } catch (err) {
      setError(err.message || 'Failed to delete document.');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Study Documents & Notes</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Original PDFs are stored in Supabase Storage (`study-documents`) and indexed in ChromaDB for AI citation.
        </p>
      </div>

      <ErrorAlert message={error} onClose={() => setError(null)} />

      {/* Upload Box */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '16px' }}>Upload New Study Notes (PDF)</h3>

        <form onSubmit={handleUpload}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '16px',
          }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Subject</label>
              <input
                type="text"
                className="form-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Physics, Biology"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Chapter / Topic</label>
              <input
                type="text"
                className="form-input"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                placeholder="e.g. Thermodynamics"
              />
            </div>
          </div>

          <div style={{
            border: '2px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            textAlign: 'center',
            marginBottom: '16px',
            background: 'var(--bg-glass)',
          }}>
            <input
              type="file"
              accept=".pdf"
              id="pdf-upload"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <label htmlFor="pdf-upload" style={{ cursor: 'pointer', display: 'inline-block' }}>
              <Upload size={32} style={{ color: 'var(--primary)', marginBottom: '8px' }} />
              <p style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: '4px' }}>
                {selectedFile ? selectedFile.name : 'Click to select textbook or notes PDF'}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {selectedFile ? formatFileSize(selectedFile.size) : 'PDF format up to 25MB'}
              </p>
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={uploading || !selectedFile}
          >
            <Upload size={16} />
            <span>{uploading ? 'Uploading & Indexing...' : 'Upload Document'}</span>
          </button>
        </form>
      </div>

      {/* Documents Inventory List */}
      <div>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Indexed Knowledge Base</h3>

        {loading ? (
          <LoadingSpinner text="Fetching document records..." />
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No Documents Uploaded"
            description="Upload PDF chapters or lecture notes so the AI can diagnose your test mistakes using your exact textbook material."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {documents.map((doc) => {
              const isCompleted = doc.status === 'completed';
              const isProcessing = doc.status === 'processing';
              const isFailed = doc.status === 'failed';

              return (
                <div
                  key={doc.id}
                  className="glass-panel"
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(99, 102, 241, 0.12)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <FileText size={20} />
                    </div>

                    <div>
                      <h4 style={{ fontSize: '0.95rem', marginBottom: '2px' }}>{doc.file_name}</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {doc.subject} • {doc.chapter} • {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span className={`badge badge-${isCompleted ? 'success' : isFailed ? 'calculation' : 'pending'}`}>
                      {isCompleted && <CheckCircle2 size={12} />}
                      {isProcessing && <Clock size={12} />}
                      {isFailed && <AlertCircle size={12} />}
                      {doc.status}
                    </span>

                    <button
                      onClick={() => handleDelete(doc.id)}
                      style={{ background: 'transparent', color: 'var(--text-muted)' }}
                      title="Delete document"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
