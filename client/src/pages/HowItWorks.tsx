import { AppShell } from '../components/AppShell';

export function HowItWorks() {
  return (
    <AppShell>
      <section className="hero-panel">
        <p className="eyebrow m-0">How It Works</p>
        <h1 className="hero-title hero-title--compact m-0">From upload to tailored package</h1>
        <p className="hero-copy m-0">
          MatchMind fetches or accepts a job posting, retrieves only the most relevant CV sections,
          then drafts, reviews, and compiles a tailored application package.
        </p>
      </section>

      <section className="content-stack">
        <article className="workspace-panel">
          <h2 className="section-title m-0">Simple overview</h2>
          <ol className="plain-steps">
            <li>
              <strong>Upload your CV.</strong> We prepare it for this session and keep it available
              while you review results.
            </li>
            <li>
              <strong>Add a job URL or paste the job description.</strong> A bare URL is fetched as a
              posting. It is never treated as job-description text by itself.
            </li>
            <li>
              <strong>Choose an AI provider.</strong> Gemini or OpenAI embeds your CV and runs the
              tailored pipeline for that session.
            </li>
            <li>
              <strong>Retrieve evidence and evaluate fit.</strong> MatchMind pulls the CV sections
              that best match the role, then scores strengths and gaps honestly.
            </li>
            <li>
              <strong>Draft, research, review, and compile.</strong> You get tailored CV and cover
              letter PDFs, company research when available, interview prep, and a CV chat grounded
              in the same evidence.
            </li>
          </ol>
        </article>

        <article className="workspace-panel">
          <h2 className="section-title m-0">Why this approach?</h2>
          <p className="section-subtitle m-0 line-height-3">
            Sending an entire CV into an AI model can waste context and encourage guesses. By
            focusing on the most relevant sections first, and by fetching real posting text from a
            job URL, MatchMind stays closer to evidence and avoids matching against a link string.
          </p>
        </article>

        <article className="workspace-panel">
          <h2 className="section-title m-0">Technical overview</h2>
          <p className="section-subtitle m-0 mb-3">
            For readers who want the engineering detail behind the product flow.
          </p>
          <ul className="tech-list">
            <li>
              <strong>Ingestion:</strong> PDF/DOCX parsing, section-aware chunking, provider-specific
              embeddings, and storage in a session-scoped Chroma collection.
            </li>
            <li>
              <strong>Posting resolve:</strong> Job URLs are fetched with SSRF protections. URL-only
              JD fields are promoted to URL fetch or rejected, never used as prose.
            </li>
            <li>
              <strong>Retrieval:</strong> Multi-section Top-K search against the session collection,
              capped for the apply pipeline.
            </li>
            <li>
              <strong>Generation:</strong> Fit summary, drafter/reviewer passes, optional company
              research (Tavily), moderncv LaTeX compile to PDF, interview questions, and an
              internal keyword coverage check.
            </li>
            <li>
              <strong>Validation:</strong> Responses are checked with Zod schemas, with retry on
              invalid JSON and SSE progress events for the UI stepper.
            </li>
          </ul>
        </article>
      </section>
    </AppShell>
  );
}
