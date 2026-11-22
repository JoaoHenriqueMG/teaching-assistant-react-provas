import React, { useState } from 'react';
import SheetIcon from './SheetIcon';

export interface SheetExample {
  header: string[];
  rows: string[][];
}

interface SheetDropzoneProps {
  id: string;
  label: string;
  file: File | null;
  onFile: (file: File | null) => void;
  example: SheetExample; // shown faded until a file is chosen
  testId?: string; // goes on the <input type="file">
}

/**
 * A rounded box with the sheet icon and a text, to choose one spreadsheet (by
 * clicking or by dropping a file). While empty it shows a faded example of
 * the format that is expected; once a file is chosen it shows the file name
 * instead.
 */
const SheetDropzone: React.FC<SheetDropzoneProps> = ({ id, label, file, onFile, example, testId }) => {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="sheet-dropzone-group">
      <label
        htmlFor={id}
        className={`sheet-dropzone${file ? ' has-file' : ''}${isDragging ? ' dragging' : ''}`}
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setIsDragging(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) onFile(dropped);
        }}
      >
        <SheetIcon size={40} />

        <div className="sheet-dropzone-body">
          <span className="sheet-dropzone-title">{label}</span>

          {file ? (
            <span className="sheet-file-name">{file.name}</span>
          ) : (
            <>
              <span className="sheet-dropzone-hint">Click or drop a .csv file</span>
              <div className="sheet-example-scroll" aria-hidden="true">
                <table className="sheet-example">
                  <thead>
                    <tr>
                      {example.header.map(title => <th key={title}>{title}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {example.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <input
          type="file"
          id={id}
          data-testid={testId}
          className="sheet-input"
          accept=".csv"
          onChange={e => {
            onFile(e.target.files?.[0] ?? null);
            e.target.value = ''; // lets the same file be chosen again after removing it
          }}
        />
      </label>

      {file && (
        <button type="button" className="sheet-remove" onClick={() => onFile(null)}>
          Remove file
        </button>
      )}
    </div>
  );
};

export default SheetDropzone;