import { AppShell } from '../components/AppShell';

export function HowItWorks() {
  return (
    <AppShell>
      <section className="hero-panel">
        <p className="eyebrow m-0">How It Works</p>
        <h1 className="hero-title hero-title--compact m-0">From upload to match report</h1>
        <p className="hero-copy m-0">
          MatchMind compares your CV to a job description using only the most relevant sections of
          your experience. That keeps the report focused and reduces invented details.
        </p>
      </section>

      <section className="content-stack">
        <article className="workspace-panel">
          <h2 className="section-title m-0">Simple overview</h2>
          <ol className="plain-steps">
            <li>
              <strong>Upload your CV.</strong> We prepare it for this analysis session and keep it
              available while you review results.
            </li>
            <li>
              <strong>Paste a job description.</strong> This becomes the target role we compare
              against.
            </li>
            <li>
              <strong>Choose an AI provider.</strong> Gemini or OpenAI embeds your CV and generates
              the report for that session.
            </li>
            <li>
              <strong>Find the best-matching sections.</strong> Instead of sending your whole CV to
              the AI, MatchMind pulls out the parts that best match the role.
            </li>
            <li>
              <strong>Generate your report.</strong> You get a match score, strengths, gaps, CV
              rewrite ideas, a cover letter draft, and interview practice questions.
            </li>
          </ol>
        </article>

        <article className="workspace-panel">
          <h2 className="section-title m-0">Why this approach?</h2>
          <p className="section-subtitle m-0 line-height-3">
            Sending an entire CV into an AI model can waste context and encourage guesses. By
            focusing on the most relevant sections first, MatchMind stays closer to what is actually
            written in your CV.
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
              <strong>Retrieval:</strong> The job description is embedded with the same provider and
              used for Top-K semantic search against that session collection.
            </li>
            <li>
              <strong>Generation:</strong> Only retrieved chunks plus the job description are sent
              to the selected provider for structured JSON analysis.
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
