import { useCallback, useRef, useState } from 'react';

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx'];
const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

interface CvDropzoneProps {
  file: File | null;
  disabled?: boolean;
  onFileChange: (file: File | null) => void;
}

function isAcceptedFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  const hasExtension = ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const hasMime = ACCEPTED_MIME_TYPES.includes(file.type);
  return hasExtension || hasMime;
}

export function CvDropzone({ file, disabled = false, onFileChange }: CvDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const next = files?.[0];
      if (!next) {
        return;
      }

      if (!isAcceptedFile(next)) {
        setLocalError('Please upload a PDF or DOCX file');
        onFileChange(null);
        return;
      }

      setLocalError(null);
      onFileChange(next);
    },
    [onFileChange],
  );

  return (
    <div className="flex flex-column gap-2">
      <div
        className={`cv-dropzone ${isDragging ? 'cv-dropzone--active' : ''} ${file ? 'cv-dropzone--ready' : ''} ${disabled ? 'cv-dropzone--disabled' : ''}`}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload CV"
        onKeyDown={(event) => {
          if (disabled) {
            return;
          }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => {
          if (!disabled) {
            inputRef.current?.click();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) {
            setIsDragging(true);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (!disabled) {
            handleFiles(event.dataTransfer.files);
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          hidden
          disabled={disabled}
          onChange={(event) => handleFiles(event.target.files)}
        />

        <i className={`pi ${file ? 'pi-file' : 'pi-cloud-upload'} cv-dropzone__icon`} aria-hidden />
        {file ? (
          <>
            <p className="cv-dropzone__title m-0">{file.name}</p>
            <p className="cv-dropzone__hint m-0">
              {(file.size / 1024).toFixed(0)} KB · Click or drop to replace
            </p>
          </>
        ) : (
          <>
            <p className="cv-dropzone__title m-0">Drop your CV here</p>
            <p className="cv-dropzone__hint m-0">PDF or DOCX · max 5 MB</p>
          </>
        )}
      </div>
      {localError && <p className="field-error m-0">{localError}</p>}
    </div>
  );
}
