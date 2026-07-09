import { Route, Routes } from 'react-router-dom';
import { About } from './pages/About';
import { AnalysisResults } from './pages/AnalysisResults';
import { Dashboard } from './pages/Dashboard';
import { HowItWorks } from './pages/HowItWorks';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/about" element={<About />} />
      <Route path="/results/:sessionId" element={<AnalysisResults />} />
    </Routes>
  );
}
