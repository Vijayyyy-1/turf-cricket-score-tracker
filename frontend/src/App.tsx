import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MatchSetupForm from './components/MatchSetupForm';
import LiveScoring from './components/LiveScoring';
import type { Match, MatchSetup } from './types/match';
import { api } from './services/api';
import './App.css';

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MatchView from './components/MatchView';
import PlayerSummary from './components/PlayerSummary';
import Admin from './components/Admin';

function Home() {
  const queryClient = useQueryClient();
  const [activeMatchId, setActiveMatchId] = useState<string | null>(
    () => localStorage.getItem('activeMatchId')
  );
  const [error, setError] = useState<string | null>(null);

  const { data: currentMatch, isLoading } = useQuery<Match>({
    queryKey: ['match', activeMatchId],
    queryFn: () => api.getMatch(activeMatchId!),
    enabled: !!activeMatchId,
    staleTime: Infinity,
    onSuccess: (match: Match) => {
      if (match.status === 'completed') {
        localStorage.removeItem('activeMatchId');
        setActiveMatchId(null);
        setError('The saved match has been completed.');
      }
    },
    onError: () => {
      localStorage.removeItem('activeMatchId');
      setActiveMatchId(null);
      setError('Could not load the saved match. It may have been deleted.');
    },
  } as any);

  const createMatch = useMutation({
    mutationFn: (setup: MatchSetup) => api.createMatch(setup),
    onSuccess: (match: Match) => {
      localStorage.setItem('activeMatchId', match._id);
      queryClient.setQueryData(['match', match._id], match);
      setActiveMatchId(match._id);
      setError(null);
    },
    onError: () => {
      setError('Failed to create match. Please make sure the server is running.');
    },
  });

  const handleMatchUpdate = (match: Match) => {
    queryClient.setQueryData(['match', match._id], match);
    if (match.status === 'completed') {
      localStorage.removeItem('activeMatchId');
    }
  };

  const handleEndMatch = () => {
    setActiveMatchId(null);
    setError(null);
    localStorage.removeItem('activeMatchId');
  };

  const loading = isLoading || createMatch.isPending;

  return (
    <>
      {error && (
        <div className="error-banner fade-in">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Processing...</p>
        </div>
      )}

      {!currentMatch ? (
        <MatchSetupForm onMatchCreate={(setup) => createMatch.mutate(setup)} />
      ) : (
        <LiveScoring
          match={currentMatch}
          onMatchUpdate={handleMatchUpdate}
          onEndMatch={handleEndMatch}
        />
      )}
    </>
  );
}

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/match/:id" element={<MatchView />} />
          <Route path="/playerSummary" element={<PlayerSummary />} />
          <Route path="/playerSummary/:name" element={<PlayerSummary />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
