import { useState, useEffect } from 'react';
import MatchSetupForm from './components/MatchSetupForm';
import LiveScoring from './components/LiveScoring';
import type { Match, MatchSetup } from './types/match';
import { api } from './services/api';
import './App.css';

function App() {
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load match from localStorage on mount
  useEffect(() => {
    const savedMatchId = localStorage.getItem('activeMatchId');
    if (savedMatchId) {
      loadMatch(savedMatchId);
    }
  }, []);

  const loadMatch = async (id: string) => {
    setLoading(true);
    try {
      const match = await api.getMatch(id);
      if (match.status !== 'completed') {
        setCurrentMatch(match);
      } else {
        localStorage.removeItem('activeMatchId');
      }
    } catch (err) {
      console.error('Error loading match:', err);
      localStorage.removeItem('activeMatchId');
    } finally {
      setLoading(false);
    }
  };

  const handleMatchCreate = async (setup: MatchSetup) => {
    setLoading(true);
    setError(null);

    try {
      const match = await api.createMatch(setup);
      setCurrentMatch(match);
      localStorage.setItem('activeMatchId', match._id);
    } catch (err) {
      console.error('Error creating match:', err);
      setError('Failed to create match. Please make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleMatchUpdate = (match: Match) => {
    setCurrentMatch(match);
    if (match.status === 'completed') {
      localStorage.removeItem('activeMatchId');
    }
  };

  const handleEndMatch = () => {
    setCurrentMatch(null);
    setError(null);
    localStorage.removeItem('activeMatchId');
  };

  return (
    <div className="app">
      {error && (
        <div className="error-banner fade-in">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Creating match...</p>
        </div>
      )}

      {!currentMatch ? (
        <MatchSetupForm onMatchCreate={handleMatchCreate} />
      ) : (
        <LiveScoring
          match={currentMatch}
          onMatchUpdate={handleMatchUpdate}
          onEndMatch={handleEndMatch}
        />
      )}
    </div>
  );
}

export default App;
