import type { AIProviderName, ProviderOption } from '@matchmind/shared';
import { isUrlOnlyJobInput } from '@matchmind/shared';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { CvDropzone } from '../components/CvDropzone';
import { ProgressStepper } from '../components/ProgressStepper';
import { ProviderPicker } from '../components/ProviderPicker';
import { useMatchPipeline } from '../hooks/useMatchPipeline';
import { fetchProviders } from '../services/api';

export function Dashboard() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [jobUrl, setJobUrl] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [jdFieldError, setJdFieldError] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [provider, setProvider] = useState<AIProviderName>('gemini');
  const [providersError, setProvidersError] = useState<string | null>(null);
  const { stage, error, isRunning, sessionId, needsCompany, runMatch } = useMatchPipeline();

  useEffect(() => {
    let cancelled = false;

    void fetchProviders()
      .then((response) => {
        if (cancelled) {
          return;
        }

        setProviders(response.providers);
        setProvider(response.defaultProvider);
        setProvidersError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }

        setProvidersError(err instanceof Error ? err.message : 'Could not load AI providers');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!needsCompany) {
      return;
    }
    if (needsCompany.suggestedCompanyName) {
      setCompanyName((current) => current || needsCompany.suggestedCompanyName || '');
    }
    if (needsCompany.suggestedCompanyUrl) {
      setCompanyUrl((current) => current || needsCompany.suggestedCompanyUrl || '');
    }
    if (needsCompany.jobDescription) {
      setJobDescription((current) => current || needsCompany.jobDescription || '');
    }
  }, [needsCompany]);

  const selectedAvailable = providers.find((item) => item.id === provider)?.available ?? false;
  const hasJobInput = Boolean(jobUrl.trim() || jobDescription.trim());
  const canStart = Boolean(
    (file || (stage === 'needs_company' && sessionId)) &&
      hasJobInput &&
      selectedAvailable &&
      !isRunning &&
      !providersError &&
      (stage !== 'needs_company' || companyName.trim()),
  );

  const handleJobDescriptionChange = (value: string) => {
    setJobDescription(value);
    if (isUrlOnlyJobInput(value)) {
      setJdFieldError(
        'That looks like a job link. Put it in Job posting URL so we can fetch the posting.',
      );
    } else {
      setJdFieldError(null);
    }
  };

  const handleSubmit = async () => {
    let nextUrl = jobUrl.trim();
    let nextJd = jobDescription.trim();

    if (isUrlOnlyJobInput(nextJd) && !nextUrl) {
      nextUrl = nextJd;
      nextJd = '';
      setJobUrl(nextUrl);
      setJobDescription('');
      setJdFieldError(null);
    } else if (isUrlOnlyJobInput(nextJd)) {
      setJdFieldError(
        'That looks like a job link. Put it in Job posting URL so we can fetch the posting.',
      );
      return;
    }

    const result = await runMatch(
      file,
      {
        ...(nextUrl ? { jobUrl: nextUrl } : {}),
        ...(nextJd ? { jobDescription: nextJd } : {}),
        ...(companyName.trim() ? { companyName: companyName.trim() } : {}),
        ...(companyUrl.trim() ? { companyUrl: companyUrl.trim() } : {}),
      },
      provider,
      stage === 'needs_company' && sessionId ? { reuseSessionId: sessionId } : undefined,
    );

    if (result) {
      navigate(`/results/${result.sessionId}`, {
        state: {
          apply: result.apply,
          sessionId: result.sessionId,
          fileName: file?.name,
          provider,
        },
      });
    }
  };

  return (
    <AppShell>
      <section className="hero-panel">
        <p className="eyebrow m-0">Tailored application package</p>
        <h1 className="hero-title m-0">Match your CV to a role and draft the application</h1>
        <p className="hero-copy m-0">
          Upload your CV, paste a job posting URL or the job description, then get a fit summary,
          researched company angles, tailored PDF downloads, interview prep, and CV chat.
        </p>
      </section>

      <section className="workspace-grid">
        <div className="workspace-panel">
          <div className="workspace-panel__header">
            <h2 className="section-title m-0">1. Upload CV</h2>
            <p className="section-subtitle m-0">
              PDF or DOCX. We prepare your CV for this session and keep it available while you review
              results.
            </p>
          </div>
          <CvDropzone file={file} disabled={isRunning} onFileChange={setFile} />
        </div>

        <div className="workspace-panel">
          <div className="workspace-panel__header">
            <h2 className="section-title m-0">2. Job posting</h2>
            <p className="section-subtitle m-0">
              Paste a public job URL when possible (including LinkedIn job links). If a board blocks
              fetch, paste the full description below.
            </p>
          </div>

          <label className="field-label" htmlFor="home-job-url">
            Job posting URL
          </label>
          <InputText
            id="home-job-url"
            className="w-full"
            value={jobUrl}
            disabled={isRunning}
            placeholder="https://www.linkedin.com/jobs/view/..."
            onChange={(event) => setJobUrl(event.target.value)}
          />

          <label className="field-label mt-3" htmlFor="home-job-description">
            Or paste job description
          </label>
          <textarea
            id="home-job-description"
            value={jobDescription}
            onChange={(event) => handleJobDescriptionChange(event.target.value)}
            rows={8}
            disabled={isRunning}
            className="jd-input w-full"
            placeholder="Paste the full role text if URL fetch fails..."
          />
          {jdFieldError && <p className="field-error m-0 mt-2">{jdFieldError}</p>}

          {(stage === 'needs_company' || companyName || companyUrl) && (
            <div className="mt-3">
              {needsCompany && (
                <p className="field-error m-0 mb-2">{needsCompany.message}</p>
              )}
              <label className="field-label" htmlFor="home-company-name">
                Company name
              </label>
              <InputText
                id="home-company-name"
                className="w-full"
                value={companyName}
                disabled={isRunning}
                onChange={(event) => setCompanyName(event.target.value)}
              />
              <label className="field-label mt-3" htmlFor="home-company-url">
                Company website (optional)
              </label>
              <InputText
                id="home-company-url"
                className="w-full"
                value={companyUrl}
                disabled={isRunning}
                placeholder="https://..."
                onChange={(event) => setCompanyUrl(event.target.value)}
              />
            </div>
          )}
        </div>
      </section>

      <section className="workspace-panel provider-panel">
        <div className="workspace-panel__header">
          <h2 className="section-title m-0">3. AI provider</h2>
          <p className="section-subtitle m-0">
            Choose which model family embeds your CV and runs the tailored pipeline for this
            session.
          </p>
        </div>
        {providersError ? (
          <p className="provider-panel__error m-0">{providersError}</p>
        ) : (
          <ProviderPicker
            providers={providers}
            value={provider}
            disabled={isRunning}
            onChange={setProvider}
          />
        )}
      </section>

      <div className="analyze-bar">
        <div>
          <p className="analyze-bar__title m-0">Ready when you are</p>
          <p className="section-subtitle m-0">
            Progress advances only when each pipeline stage is confirmed.
          </p>
        </div>
        <Button
          type="button"
          label={
            isRunning
              ? 'Working…'
              : stage === 'needs_company'
                ? 'Continue with company'
                : 'Generate tailored application'
          }
          icon="pi pi-sparkles"
          disabled={!canStart || Boolean(jdFieldError)}
          onClick={() => {
            void handleSubmit();
          }}
        />
      </div>

      <ProgressStepper stage={stage} error={error} />
    </AppShell>
  );
}
