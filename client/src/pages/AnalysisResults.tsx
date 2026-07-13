import type { AnalysisResult } from '@matchmind/shared';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Message } from 'primereact/message';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { ChatPanel } from '../components/ChatPanel';
import { CoverLetterPanel } from '../components/CoverLetterPanel';
import { CvImprovements } from '../components/CvImprovements';
import { InterviewQuestions } from '../components/InterviewQuestions';
import { OverallScore } from '../components/OverallScore';
import { ResultsNav } from '../components/ResultsNav';
import { SkillBreakdownChart } from '../components/SkillBreakdownChart';
import { StrengthsGaps } from '../components/StrengthsGaps';
import { deleteSession } from '../services/api';

interface ResultsLocationState {
  analysis?: AnalysisResult;
  retrievedChunkIds?: string[];
  fileName?: string;
  jobDescription?: string;
}

const NAV_ITEMS = [
  { id: 'overall-match', label: 'Overall match' },
  { id: 'skill-breakdown', label: 'Skill breakdown' },
  { id: 'strengths-gaps', label: 'Strengths & gaps' },
  { id: 'cv-improvements', label: 'CV improvements' },
  { id: 'cover-letter', label: 'Cover letter' },
  { id: 'interview-questions', label: 'Interview questions' },
  { id: 'chat', label: 'Ask about your CV' },
];

export function AnalysisResults() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const state = (location.state ?? {}) as ResultsLocationState;
  const analysis = state.analysis;
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

  if (!analysis || !sessionId) {
    return (
      <AppShell>
        <section className="workspace-panel">
          <h1 className="section-title m-0">No analysis loaded</h1>
          <p className="section-subtitle m-0 mt-2">
            Results are shown after a successful analysis. Start a new match from Home.
          </p>
          <Message
            className="w-full mt-3"
            severity="info"
            text="Previous analyses are not saved yet. Run a new analysis to view a report."
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

  const sectionCount = state.retrievedChunkIds?.length ?? 0;

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
              <p className="eyebrow m-0">Match report</p>
              <h1 className="hero-title hero-title--compact m-0">Your match report</h1>
              <p className="hero-copy m-0">
                {state.fileName
                  ? `Based on ${state.fileName} and ${sectionCount} relevant CV section${sectionCount === 1 ? '' : 's'}.`
                  : `Based on ${sectionCount} relevant CV section${sectionCount === 1 ? '' : 's'}.`}
              </p>
            </div>
          </section>

          {deleteError && <Message severity="error" text={deleteError} className="w-full mb-3" />}

          <OverallScore score={analysis.overallMatchScore} />
          <SkillBreakdownChart skills={analysis.skillBreakdown} />
          <StrengthsGaps strengths={analysis.strengths} missingSkills={analysis.missingSkills} />
          <CvImprovements improvements={analysis.cvImprovements} />
          <CoverLetterPanel coverLetter={analysis.coverLetter} />
          <InterviewQuestions questions={analysis.interviewQuestions} />
          <ChatPanel sessionId={sessionId} jobDescription={state.jobDescription} />

          <section className="workspace-panel privacy-panel">
            <h2 className="section-title m-0">Privacy</h2>
            <p className="section-subtitle m-0 mt-2">
              Your uploaded CV and analysis data for this session stay available until you delete
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
          This removes your uploaded CV and related analysis data for this session. This cannot be
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
            Removing your CV and related analysis data. Please wait a moment.
          </p>
        </div>
      </Dialog>
    </AppShell>
  );
}
