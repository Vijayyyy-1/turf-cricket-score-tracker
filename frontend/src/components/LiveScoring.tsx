import React, { useState } from 'react';
import type { Match } from '../types/match';
import { api } from '../services/api';
import './LiveScoring.css';

interface LiveScoringProps {
    match: Match;
    onMatchUpdate: (match: Match) => void;
    onEndMatch: () => void;
}

const LiveScoring: React.FC<LiveScoringProps> = ({ match, onMatchUpdate, onEndMatch }) => {
    const [loading, setLoading] = useState(false);
    const [selectedRuns, setSelectedRuns] = useState<number | null>(null);

    const currentInnings = match.innings[match.currentInnings - 1];
    const totalOvers = currentInnings.overs + (currentInnings.balls / 6);
    const playersPerTeam = match.players[currentInnings.battingTeam].length;
    const runRate = totalOvers > 0 ? (currentInnings.runs / totalOvers).toFixed(2) : '0.00';

    const recordBall = async (runs: number, isWide = false, isNoBall = false, isWicket = false) => {
        setLoading(true);
        setSelectedRuns(runs);

        try {
            const updatedMatch = await api.recordBall(match._id, {
                runs,
                isWide,
                isNoBall,
                isWicket,
            });
            onMatchUpdate(updatedMatch);
        } catch (error) {
            console.error('Error recording ball:', error);
            alert('Failed to record ball. Please try again.');
        } finally {
            setLoading(false);
            setTimeout(() => setSelectedRuns(null), 300);
        }
    };

    if (match.status === 'completed') {
        return (
            <div className="match-result-container fade-in">
                <div className="result-card card">
                    <div className="trophy-icon">🏆</div>
                    <h1 className="result-title">Match Completed!</h1>

                    {match.result?.isDraw ? (
                        <div className="result-info">
                            <p className="result-text">Match Tied!</p>
                            <p className="result-score">
                                Both teams scored {match.innings[0].runs} runs
                            </p>
                        </div>
                    ) : (
                        <div className="result-info">
                            <p className="result-winner">{match.result?.winner}</p>
                            <p className="result-text">won by</p>
                            <p className="result-margin">{match.result?.margin}</p>
                        </div>
                    )}

                    <div className="innings-summary">
                        {match.innings.map((innings, idx) => (
                            <div key={idx} className="innings-card">
                                <h3>{innings.battingTeam}</h3>
                                <p className="innings-score">
                                    {innings.runs}/{innings.wickets}
                                </p>
                                <p className="innings-overs">
                                    ({innings.overs}.{innings.balls} overs)
                                </p>
                            </div>
                        ))}
                    </div>

                    <button onClick={onEndMatch} className="btn btn-primary btn-lg">
                        🏏 New Match
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="live-scoring-container fade-in">
            <div className="scoreboard card">
                <div className="scoreboard-header">
                    <div className="team-info">
                        <h2 className="batting-team">{currentInnings.battingTeam}</h2>
                        <p className="vs-text">vs {currentInnings.bowlingTeam}</p>
                    </div>
                    <div className="innings-badge">
                        Innings {match.currentInnings}
                    </div>
                </div>

                <div className="score-display">
                    <div className="main-score">
                        <span className="runs">{currentInnings.runs}</span>
                        <span className="separator">/</span>
                        <span className="wickets">{currentInnings.wickets}</span>
                    </div>
                    <div className="overs-display">
                        <span className="overs-label">Overs:</span>
                        <span className="overs-value">
                            {currentInnings.overs}.{currentInnings.balls} / {match.oversPerInnings}
                        </span>
                    </div>
                </div>

                <div className="stats-grid">
                    <div className="stat-item">
                        <span className="stat-label">Run Rate</span>
                        <span className="stat-value">{runRate}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Extras</span>
                        <span className="stat-value">
                            {currentInnings.extras.wides + currentInnings.extras.noBalls}
                        </span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Wides</span>
                        <span className="stat-value">{currentInnings.extras.wides}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">No Balls</span>
                        <span className="stat-value">{currentInnings.extras.noBalls}</span>
                    </div>
                </div>
            </div>

            <div className="scoring-controls card">
                <h3 className="controls-title">Record Ball</h3>

                <div className="runs-buttons">
                    {[0, 1, 2, 3, 4, 6].map((runs) => (
                        <button
                            key={runs}
                            onClick={() => recordBall(runs)}
                            disabled={loading}
                            className={`btn-run ${selectedRuns === runs ? 'btn-run-active' : ''} ${runs === 4 || runs === 6 ? 'btn-run-boundary' : ''
                                }`}
                        >
                            {runs}
                        </button>
                    ))}
                </div>

                <div className="extras-buttons">
                    <button
                        onClick={() => recordBall(0, true, false, false)}
                        disabled={loading}
                        className="btn btn-secondary"
                    >
                        Wide
                    </button>
                    <button
                        onClick={() => recordBall(0, false, true, false)}
                        disabled={loading}
                        className="btn btn-secondary"
                    >
                        No Ball
                    </button>
                    <button
                        onClick={() => recordBall(0, false, false, true)}
                        disabled={loading}
                        className="btn btn-danger"
                    >
                        Wicket
                    </button>
                </div>
            </div>

            {currentInnings.ballByBall.length > 0 && (
                <div className="ball-history card">
                    <h3 className="history-title">Recent Balls</h3>
                    <div className="balls-list">
                        {currentInnings.ballByBall.slice(-12).reverse().map((ball, idx) => (
                            <div
                                key={ball.ballNumber}
                                className={`ball-item ${ball.isWicket ? 'ball-wicket' : ''} ${ball.runs === 4 || ball.runs === 6 ? 'ball-boundary' : ''
                                    }`}
                            >
                                {ball.isWicket ? 'W' : ball.isWide ? 'WD' : ball.isNoBall ? 'NB' : ball.runs}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LiveScoring;
