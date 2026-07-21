import type { AIProviderName, ApplyResult } from '@matchmind/shared';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Message } from 'primereact/message';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { ChatPanel } from '../components/ChatPanel';
import { InterviewQuestions } from '../components/InterviewQuestions';
import { OverallScore } from '../components/OverallScore';
import { ResultsNav } from '../components/ResultsNav';
import { StrengthsGaps } from '../components/StrengthsGaps';
import { applyDownloadUrl, deleteSession } from '../services/api';
import { CollapsibleSection } from '../components/CollapsibleSection';

interface ResultsLocationState {
  apply?: ApplyResult;
  fileName?: string;
  provider?: AIProviderName;
}

const PROVIDER_LABELS: Record<AIProviderName, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI',
};

const NAV_ITEMS = [
  { id: 'overall-match', label: 'Fit summary' },
  { id: 'company-research', label: 'Company research' },
  { id: 'tailoring', label: 'Tailoring decisions' },
  { id: 'interview-questions', label: 'Interview prep' },
  { id: 'chat', label: 'Ask about your CV' },
  { id: 'downloads', label: 'Downloads' },
];

export function AnalysisResults() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const state = (location.state ?? {}) as ResultsLocationState;
  const apply = state.apply;
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (!sessionId) {
      return;
    }

    setConfirmVisible(false);
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteSession(sessionId);
      navigate('/', { replace: true });
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete CV');
      setIsDeleting(false);
    }
  };

  if (!apply || !sessionId) {
    return (
      <AppShell>
        <section className="workspace-panel">
          <h1 className="section-title m-0">No application package loaded</h1>
          <p className="section-subtitle m-0 mt-2">
            Results appear after a successful tailored run from Home.
          </p>
          <Message
            className="w-full mt-3"
            severity="info"
            text="Previous packages are not saved yet. Start again from Home."
          />
          <Button
            className="mt-4"
            type="button"
            label="Back to Home"
            icon="pi pi-arrow-left"
            onClick={() => navigate('/')}
          />
        </section>
      </AppShell>
    );
  }

  const providerLabel = state.provider ? PROVIDER_LABELS[state.provider] : null;
  const basisParts = [
    state.fileName ? `Based on ${state.fileName}` : null,
    apply.resolvedCompanyName,
    apply.resolvedRoleTitle,
    `${apply.retrievedChunkIds.length} CV evidence chunk${apply.retrievedChunkIds.length === 1 ? '' : 's'}`,
    providerLabel ? `via ${providerLabel}` : null,
  ].filter(Boolean);

  return (
    <AppShell>
      <div className="results-layout">
        <ResultsNav
          items={NAV_ITEMS}
          onNewAnalysis={() => navigate('/')}
          onDeleteCv={() => {
            setDeleteError(null);
            setConfirmVisible(true);
          }}
          isDeleting={isDeleting}
        />

        <div className="results-content">
          <section className="results-header">
            <div>
              <p className="eyebrow m-0">Tailored application</p>
              <h1 className="hero-title hero-title--compact m-0">Your application package</h1>
              <p className="hero-copy m-0">{basisParts.join(' · ')}.</p>
            </div>
          </section>

          {deleteError && <Message severity="error" text={deleteError} className="w-full mb-3" />}

          {apply.compileWarnings.length > 0 && (
            <Message
              className="w-full mb-3"
              severity="warn"
              text={apply.compileWarnings.join(' ')}
            />
          )}

          <OverallScore score={apply.fitSummary.overallMatchScore} />
          <StrengthsGaps
            strengths={apply.fitSummary.strengths}
            missingSkills={apply.fitSummary.missingSkills}
          />

          <CollapsibleSection id="company-research" title="Company research" defaultOpen>
            <p className="section-subtitle m-0">
              Status: {apply.companyBrief.researchStatus}
              {apply.companyBrief.mission ? ` · ${apply.companyBrief.mission}` : ''}
            </p>
            {apply.companyBrief.anglesForCoverLetter.length > 0 && (
              <ul className="mt-2">
                {apply.companyBrief.anglesForCoverLetter.map((angle) => (
                  <li key={angle}>{angle}</li>
                ))}
              </ul>
            )}
            {apply.companyBrief.sources.length > 0 && (
              <ul className="mt-2">
                {apply.companyBrief.sources.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.title}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CollapsibleSection>

          <CollapsibleSection id="tailoring" title="Tailoring decisions" defaultOpen>
            <ul className="m-0">
              {apply.tailoringDecisions.map((decision) => (
                <li key={decision}>{decision}</li>
              ))}
            </ul>
          </CollapsibleSection>

          <InterviewQuestions questions={apply.interviewQuestions} />

          <ChatPanel sessionId={sessionId} jobDescription={apply.jobDescription} />

          <CollapsibleSection id="downloads" title="Downloads" defaultOpen>
            <p className="section-subtitle m-0 mb-3">
              Formatted PDFs use moderncv / Font Awesome layout. Sources zip includes the LaTeX.
            </p>
            <div className="dialog-actions">
              <Button
                type="button"
                label="Download CV PDF"
                icon="pi pi-download"
                disabled={!apply.downloadsAvailable.cvPdf}
                onClick={() => window.open(applyDownloadUrl(sessionId, 'cv.pdf'), '_blank')}
              />
              <Button
                type="button"
                label="Download cover letter PDF"
                icon="pi pi-download"
                disabled={!apply.downloadsAvailable.coverLetterPdf}
                onClick={() =>
                  window.open(applyDownloadUrl(sessionId, 'cover-letter.pdf'), '_blank')
                }
              />
              <Button
                type="button"
                label="Download sources (.tex / PDF)"
                icon="pi pi-file"
                outlined
                onClick={() => window.open(applyDownloadUrl(sessionId, 'sources.zip'), '_blank')}
              />
            </div>
          </CollapsibleSection>

          <section className="workspace-panel privacy-panel">
            <h2 className="section-title m-0">Privacy</h2>
            <p className="section-subtitle m-0 mt-2">
              Your uploaded CV and package data for this session stay available until you delete
              them. Use <strong>Delete CV</strong> in the side menu to remove the file and related
              stored data.
            </p>
          </section>
        </div>
      </div>

      <Dialog
        header="Delete CV?"
        visible={confirmVisible}
        style={{ width: 'min(420px, 92vw)' }}
        modal
        draggable={false}
        resizable={false}
        onHide={() => setConfirmVisible(false)}
        footer={
          <div className="dialog-actions">
            <Button
              type="button"
              label="Cancel"
              text
              onClick={() => setConfirmVisible(false)}
            />
            <Button
              type="button"
              label="Delete CV"
              icon="pi pi-trash"
              severity="danger"
              onClick={() => {
                void handleConfirmDelete();
              }}
            />
          </div>
        }
      >
        <p className="m-0 line-height-3">
          This removes your uploaded CV and related package data for this session. This cannot be
          undone.
        </p>
      </Dialog>

      <Dialog
        header="Deleting CV"
        visible={isDeleting}
        style={{ width: 'min(360px, 92vw)' }}
        modal
        closable={false}
        draggable={false}
        resizable={false}
        onHide={() => undefined}
      >
        <div className="deleting-dialog">
          <ProgressSpinner style={{ width: '42px', height: '42px' }} strokeWidth="5" />
          <p className="m-0 line-height-3">
            Removing your CV and related package data. Please wait a moment.
          </p>
        </div>
      </Dialog>
    </AppShell>
  );
}
