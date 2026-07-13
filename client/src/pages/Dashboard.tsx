import { Button } from 'primereact/button';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { CvDropzone } from '../components/CvDropzone';
import { ProgressStepper } from '../components/ProgressStepper';
import { useAnalysis } from '../hooks/useAnalysis';

export function Dashboard() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const { stage, error, isRunning, runAnalysis } = useAnalysis();

  const canAnalyze = Boolean(file && jobDescription.trim() && !isRunning);

  return (
    <AppShell>
      <section className="hero-panel">
        <p className="eyebrow m-0">Evidence-based analysis</p>
        <h1 className="hero-title m-0">See how your CV matches the role</h1>
        <p className="hero-copy m-0">
          Upload your CV, paste a job description, and receive an evidence-based match report
          generated only from the most relevant sections of your CV.
        </p>
      </section>

      <section className="workspace-grid">
        <div className="workspace-panel">
          <div className="workspace-panel__header">
            <h2 className="section-title m-0">1. Upload CV</h2>
            <p className="section-subtitle m-0">
              PDF or DOCX. We prepare your CV for this analysis and keep it available while you
              review results.
            </p>
          </div>
          <CvDropzone file={file} disabled={isRunning} onFileChange={setFile} />
        </div>

        <div className="workspace-panel">
          <div className="workspace-panel__header">
            <h2 className="section-title m-0">2. Job description</h2>
            <p className="section-subtitle m-0">
              Paste the role requirements you want to match against. Drag the bottom-right corner to
              resize.
            </p>
          </div>
          <textarea
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            rows={10}
            disabled={isRunning}
            className="jd-input w-full"
            placeholder="Example: Looking for a TypeScript developer with React, Node.js, Docker, and cloud experience..."
          />
        </div>
      </section>

      <div className="analyze-bar">
        <div>
          <p className="analyze-bar__title m-0">Ready when you are</p>
          <p className="section-subtitle m-0">
            Progress advances only when each analysis stage is confirmed.
          </p>
        </div>
        <Button
          type="button"
          label={isRunning ? 'Analyzing...' : 'Analyze match'}
          icon={isRunning ? 'pi pi-spin pi-spinner' : 'pi pi-chart-bar'}
          disabled={!canAnalyze}
          onClick={async () => {
            if (!file) {
              return;
            }

            const result = await runAnalysis(file, jobDescription);
            if (result) {
              navigate(`/results/${result.sessionId}`, {
                state: {
                  analysis: result.analysis,
                  retrievedChunkIds: result.retrievedChunkIds,
                  fileName: file.name,
                  jobDescription,
                },
              });
            }
          }}
        />
      </div>

      {(isRunning || stage === 'error') && (
        <ProgressStepper stage={stage} error={stage === 'error' ? error : null} />
      )}
    </AppShell>
  );
}
