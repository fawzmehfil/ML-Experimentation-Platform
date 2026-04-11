// src/components/UploadZone.jsx
import React, { useState, useRef } from 'react';

export default function UploadZone({ onFileSelect, loading }) {
  const [dragover, setDragover] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragover(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) onFileSelect(file);
  };

  return (
    <div
      className={`upload-zone ${dragover ? 'dragover' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
      onDragLeave={() => setDragover(false)}
      onDrop={handleDrop}
      onClick={() => !loading && inputRef.current.click()}
      style={{ cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      {loading ? (
        <>
          <span className="upload-icon">⏳</span>
          <h3>Uploading & profiling...</h3>
          <p>Validating your dataset</p>
        </>
      ) : (
        <>
          <span className="upload-icon">📂</span>
          <h3>Drop a CSV file here</h3>
          <p>or click to browse · max 16MB · structured/tabular data</p>
          <div style={{ marginTop: 16 }}>
            <span className="badge badge-blue">CSV only</span>
          </div>
        </>
      )}
    </div>
  );
}
