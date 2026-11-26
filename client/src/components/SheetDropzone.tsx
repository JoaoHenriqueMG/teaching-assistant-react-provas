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
  invalid?: boolean; // the last check found a problem in this sheet
  problem?: string; // a problem found before sending, shown under the box
  testId?: string; // goes on the <input type="file">
}

/**
 * A box to choose one spreadsheet, by clicking or by dropping a file. While
 * empty it shows a faded example of the expected format; once a file is
 * chosen it shows the file name. It turns red when the sheet has a problem.
 */
const SheetDropzone: React.FC<SheetDropzoneProps> = ({ id, label, file, onFile, example, invalid, problem, testId }) => {
  const [isDragging, setIsDragging] = useState(false);
  const hasProblem = invalid || Boolean(problem);
  const classes = ['sheet-dropzone', file ? 'has-file' : '', isDragging ? 'dragging' : '', hasProblem ? 'has-problem' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className="sheet-dropzone-group">
      <span className="sheet-dropzone-label">{label}</span>
      <label
        htmlFor={id}
        className={classes}
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
        <div className="sheet-dropzone-top">
          <SheetIcon size={32} />
          <div className="sheet-dropzone-text">
            {file ? (
              <>
                <span className="sheet-file-name" data-testid={testId ? `${testId}-name` : undefined}>{file.name}</span>
                <span className="sheet-dropzone-hint">Click or drop another file to replace it</span>
              </>
            ) : (
              <>
                <span className="sheet-dropzone-title">Choose a .csv file</span>
                <span className="sheet-dropzone-hint">or drop it here</span>
              </>
            )}
          </div>
        </div>

        {!file && (
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
        )}

        <input
          type="file"
          id={id}
          data-testid={testId}
          className="sheet-input"
          accept=".csv,text/csv"
          aria-invalid={hasProblem || undefined}
          onChange={e => {
            onFile(e.target.files?.[0] ?? null);
            e.target.value = ''; // lets the same file be chosen again after removing it
          }}
        />
      </label>

      {problem && <span className="sheet-problem" role="alert">{problem}</span>}

      {file && (
        <button className="link-btn sheet-remove" onClick={() => onFile(null)}>
          Remove file
        </button>
      )}
    </div>
  );
};

export default SheetDropzone;
