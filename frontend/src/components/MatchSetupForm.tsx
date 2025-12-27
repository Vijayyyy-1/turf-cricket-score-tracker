import React, { useState } from 'react';
import type { MatchSetup } from '../types/match';
import './MatchSetupForm.css';

interface MatchSetupFormProps {
    onMatchCreate: (setup: MatchSetup) => void;
}

const MatchSetupForm: React.FC<MatchSetupFormProps> = ({ onMatchCreate }) => {
    const [oversPerInnings, setOversPerInnings] = useState(5);
    const [team1Name, setTeam1Name] = useState('');
    const [team2Name, setTeam2Name] = useState('');
    const [team1Players, setTeam1Players] = useState('');
    const [team2Players, setTeam2Players] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!team1Name || !team2Name || !team1Players || !team2Players) {
            alert('Please fill in all fields');
            return;
        }

        const team1PlayerList = team1Players.split(',').map(p => p.trim()).filter(p => p);
        const team2PlayerList = team2Players.split(',').map(p => p.trim()).filter(p => p);

        if (team1PlayerList.length < 2 || team2PlayerList.length < 2) {
            alert('Each team must have at least 2 players');
            return;
        }

        const setup: MatchSetup = {
            oversPerInnings,
            teams: [team1Name, team2Name],
            players: {
                [team1Name]: team1PlayerList,
                [team2Name]: team2PlayerList,
            },
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
                            type="number"
                            min="1"
                            max="50"
                            value={oversPerInnings}
                            onChange={(e) => setOversPerInnings(Number(e.target.value))}
                            className="input"
                        />
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
                            <div className="form-group">
                                <label htmlFor="team1-players" className="form-label">
                                    Players (comma separated)
                                </label>
                                <textarea
                                    id="team1-players"
                                    placeholder="e.g., John, Mike, Sarah, Alex"
                                    value={team1Players}
                                    onChange={(e) => setTeam1Players(e.target.value)}
                                    className="input textarea"
                                    rows={4}
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
                            <div className="form-group">
                                <label htmlFor="team2-players" className="form-label">
                                    Players (comma separated)
                                </label>
                                <textarea
                                    id="team2-players"
                                    placeholder="e.g., Emma, David, Chris, Lisa"
                                    value={team2Players}
                                    onChange={(e) => setTeam2Players(e.target.value)}
                                    className="input textarea"
                                    rows={4}
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
