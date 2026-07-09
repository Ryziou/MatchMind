import { useId, useState } from 'react';

interface CollapsibleSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export function CollapsibleSection({
  id,
  title,
  subtitle,
  defaultOpen = true,
  headerActions,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section id={id} className="result-panel collapsible-section">
      <div className="result-panel__header result-panel__header--row">
        <button
          type="button"
          className="collapsible-trigger"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="collapsible-trigger__copy">
            <h2 className="section-title m-0">{title}</h2>
            {subtitle && <p className="section-subtitle m-0">{subtitle}</p>}
          </span>
          <i className={`pi ${open ? 'pi-chevron-up' : 'pi-chevron-down'}`} aria-hidden />
        </button>
        {headerActions}
      </div>

      {open && (
        <div id={contentId} className="collapsible-section__body">
          {children}
        </div>
      )}
    </section>
  );
}
