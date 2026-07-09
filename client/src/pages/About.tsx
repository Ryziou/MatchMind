import { AppShell } from '../components/AppShell';

export function About() {
  return (
    <AppShell>
      <section className="hero-panel">
        <p className="eyebrow m-0">About</p>
        <h1 className="hero-title hero-title--compact m-0">What MatchMind is for</h1>
        <p className="hero-copy m-0">
          MatchMind is a portfolio project built to explore practical Retrieval-Augmented Generation
          (RAG): upload a CV, compare it to a job description, and return an evidence-based match
          report from the most relevant sections of that CV.
        </p>
      </section>

      <section className="workspace-panel">
        <h2 className="section-title m-0">In short</h2>
        <p className="section-subtitle m-0 line-height-3">
          It is not a full career platform. It is a focused demo of honest RAG design, structured AI
          output, and a clean end-to-end product flow from upload to results.
        </p>
      </section>
    </AppShell>
  );
}
