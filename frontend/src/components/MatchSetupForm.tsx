import React, { useState } from 'react';
import type { MatchSetup } from '../types/match';
import './MatchSetupForm.css';

interface MatchSetupFormProps {
    onMatchCreate: (setup: MatchSetup) => void;
}

const MatchSetupForm: React.FC<MatchSetupFormProps> = ({ onMatchCreate }) => {
    const [oversPerInnings, setOversPerInnings] = useState<string>('5');
    const [team1Name, setTeam1Name] = useState('');
    const [team2Name, setTeam2Name] = useState('');
    const [playersPerTeam, setPlayersPerTeam] = useState<string>('11');

    const handleOversChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Allow empty string or valid numbers
        if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
            setOversPerInnings(value);
        }
    };

    const handlePlayersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Allow empty string or valid numbers
        if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
            setPlayersPerTeam(value);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!team1Name || !team2Name) {
            alert('Please enter both team names');
            return;
        }

        const overs = Number(oversPerInnings);
        const players = Number(playersPerTeam);

        if (!overs || overs < 1 || overs > 50) {
            alert('Please enter valid overs (1-50)');
            return;
        }

        if (!players || players < 2 || players > 11) {
            alert('Please enter valid number of players (2-11)');
            return;
        }

        const setup: MatchSetup = {
            oversPerInnings: overs,
            teams: [team1Name, team2Name],
            playersPerTeam: players,
        };

        onMatchCreate(setup);
    };

    return (
        <div className="match-setup-container fade-in">
            <div className="match-setup-header">
                <h1 className="match-setup-title">
                    🏏 <span className="gradient-text">Create New Match</span>
                </h1>
                <p className="match-setup-subtitle">Set up your cricket match in seconds</p>
            </div>

            <form onSubmit={handleSubmit} className="match-setup-form">
                <div className="card">
                    <div className="form-group">
                        <label htmlFor="overs" className="form-label">Overs Per Innings</label>
                        <input
                            id="overs"
                            type="text"
                            inputMode="numeric"
                            placeholder="e.g., 5, 10, 20"
                            value={oversPerInnings}
                            onChange={handleOversChange}
                            className="input"
                        />
                        <span className="form-hint">Enter 1-50 overs</span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="players" className="form-label">Players Per Team</label>
                        <input
                            id="players"
                            type="text"
                            inputMode="numeric"
                            placeholder="e.g., 11"
                            value={playersPerTeam}
                            onChange={handlePlayersChange}
                            className="input"
                        />
                        <span className="form-hint">Enter 2-11 players (wickets = players - 1)</span>
                    </div>

                    <div className="teams-grid">
                        <div className="team-section">
                            <h3 className="team-header">Team 1</h3>
                            <div className="form-group">
                                <label htmlFor="team1-name" className="form-label">Team Name</label>
                                <input
                                    id="team1-name"
                                    type="text"
                                    placeholder="e.g., Warriors"
                                    value={team1Name}
                                    onChange={(e) => setTeam1Name(e.target.value)}
                                    className="input"
                                />
                            </div>
                        </div>

                        <div className="team-section">
                            <h3 className="team-header">Team 2</h3>
                            <div className="form-group">
                                <label htmlFor="team2-name" className="form-label">Team Name</label>
                                <input
                                    id="team2-name"
                                    type="text"
                                    placeholder="e.g., Titans"
                                    value={team2Name}
                                    onChange={(e) => setTeam2Name(e.target.value)}
                                    className="input"
                                />
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg submit-btn">
                        🚀 Start Match
                    </button>
                </div>
            </form>
        </div>
    );
};

export default MatchSetupForm;

