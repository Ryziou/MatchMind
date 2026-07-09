import { Button } from 'primereact/button';

export interface ResultsNavItem {
  id: string;
  label: string;
}

interface ResultsNavProps {
  items: ResultsNavItem[];
  onNewAnalysis: () => void;
  onDeleteCv?: () => void;
  isDeleting?: boolean;
}

export function ResultsNav({
  items,
  onNewAnalysis,
  onDeleteCv,
  isDeleting = false,
}: ResultsNavProps) {
  return (
    <aside className="results-nav" aria-label="Results sections">
      <Button
        type="button"
        label="New analysis"
        icon="pi pi-refresh"
        className="w-full results-nav__cta"
        onClick={onNewAnalysis}
      />

      {onDeleteCv && (
        <Button
          type="button"
          label={isDeleting ? 'Deleting...' : 'Delete CV'}
          icon="pi pi-trash"
          severity="danger"
          outlined
          className="w-full"
          disabled={isDeleting}
          onClick={onDeleteCv}
        />
      )}

      <p className="results-nav__label m-0">Jump to</p>
      <nav>
        <ul className="results-nav__list">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="results-nav__link"
                onClick={(event) => {
                  event.preventDefault();
                  document.getElementById(item.id)?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  });
                }}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
