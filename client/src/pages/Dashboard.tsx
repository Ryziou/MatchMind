import type { HealthResponse } from '@matchmind/shared';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { useEffect, useState } from 'react';
import { ThemeToggle } from '../components/ThemeToggle';
import { fetchHealth } from '../services/api';

export function Dashboard() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to reach server');
      });
  }, []);

  return (
    <div className="page">
      <header className="page-header flex justify-content-between align-items-center">
        <div>
          <h1 className="m-0">MatchMind</h1>
          <p className="text-secondary m-0 mt-2">
            AI Resume and Job Intelligence Platform
          </p>
        </div>
        <ThemeToggle />
      </header>

      <main className="page-content">
        <Card title="Welcome" subTitle="Milestone 0 foundation">
          <p className="line-height-3 m-0">
            Upload your CV, paste a job description, and receive an intelligent analysis of
            how well your experience matches the role. The full RAG pipeline arrives in upcoming
            milestones.
          </p>
        </Card>

        <Card title="System Status" className="mt-4">
          {error && <Tag severity="danger" value={error} className="mb-3" />}
          {health && (
            <div className="flex flex-column gap-2">
              <div className="flex align-items-center gap-2">
                <span className="font-medium">Server</span>
                <Tag severity="success" value={health.status} />
              </div>
              <div className="flex align-items-center gap-2">
                <span className="font-medium">ChromaDB</span>
                <Tag
                  severity={health.chroma.reachable ? 'success' : 'warning'}
                  value={health.chroma.reachable ? 'reachable' : 'unreachable'}
                />
              </div>
            </div>
          )}
          {!health && !error && <p className="m-0 text-secondary">Checking services...</p>}
        </Card>
      </main>
    </div>
  );
}
