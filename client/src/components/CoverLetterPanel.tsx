import { Button } from 'primereact/button';
import { useState } from 'react';
import { CollapsibleSection } from './CollapsibleSection';

interface CoverLetterPanelProps {
  coverLetter: string;
}

export function CoverLetterPanel({ coverLetter }: CoverLetterPanelProps) {
  const [copied, setCopied] = useState(false);

  return (
    <CollapsibleSection
      id="cover-letter"
      title="Cover letter"
      subtitle="Draft tailored to the job description and the most relevant parts of your CV."
      defaultOpen={false}
      headerActions={
        <Button
          type="button"
          label={copied ? 'Copied' : 'Copy'}
          icon={copied ? 'pi pi-check' : 'pi pi-copy'}
          outlined
          size="small"
          onClick={async (event) => {
            event.stopPropagation();
            await navigator.clipboard.writeText(coverLetter);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
          }}
        />
      }
    >
      <pre className="cover-letter">{coverLetter}</pre>
    </CollapsibleSection>
  );
}
