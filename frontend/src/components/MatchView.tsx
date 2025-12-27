import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Match } from '../types/match';
import LiveScoring from './LiveScoring';

const MatchView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [match, setMatch] = useState<Match | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            loadMatch(id);
        }
    }, [id]);

    const loadMatch = async (matchId: string) => {
        try {
            const data = await api.getMatch(matchId);
            setMatch(data);
        } catch (err) {
            console.error('Error loading match:', err);
            setError('Could not find this match. It may have been deleted.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-overlay">
                <div className="loading-spinner"></div>
                <p>Loading scoreboard...</p>
            </div>
        );
    }

    if (error || !match) {
        return (
            <div className="error-container fade-in" style={{ textAlign: 'center', padding: '50px' }}>
                <h2>⚠️ Error</h2>
                <p>{error}</p>
                <Link to="/" className="btn btn-primary" style={{ marginTop: '20px', display: 'inline-block' }}>
                    Go to Home
                </Link>
            </div>
        );
    }

    return (
        <div className="view-only-mode">
            <div className="view-header" style={{ textAlign: 'center', padding: '10px', background: 'rgba(0,0,0,0.2)', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: '#ffcc00' }}>⚡ Viewing Live Score (Read-Only)</span>
            </div>
            <LiveScoring
                match={match}
                readOnly={true}
                onMatchUpdate={(updatedMatch) => setMatch(updatedMatch)}
            />
        </div>
    );
};

export default MatchView;
