import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Match } from '../types/match';
import LiveScoring from './LiveScoring';

const MatchView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const queryClient = useQueryClient();

    const { data: match, isLoading, isError } = useQuery<Match>({
        queryKey: ['match', id],
        queryFn: () => api.getMatch(id!),
        enabled: !!id,
        staleTime: Infinity,
    });

    if (isLoading) {
        return (
            <div className="loading-overlay">
                <div className="loading-spinner"></div>
                <p>Loading scoreboard...</p>
            </div>
        );
    }

    if (isError || !match) {
        return (
            <div className="error-container fade-in" style={{ textAlign: 'center', padding: '50px' }}>
                <h2>⚠️ Error</h2>
                <p>Could not find this match. It may have been deleted.</p>
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
                onMatchUpdate={(updatedMatch) => queryClient.setQueryData(['match', id], updatedMatch)}
            />
        </div>
    );
};

export default MatchView;
