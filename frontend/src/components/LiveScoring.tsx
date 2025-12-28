import React, { useState } from 'react';
import type { Match } from '../types/match';
import { api } from '../services/api';
import './LiveScoring.css';

interface LiveScoringProps {
    match: Match;
    onMatchUpdate?: (match: Match) => void;
    onEndMatch?: () => void;
    readOnly?: boolean;
}

const LiveScoring: React.FC<LiveScoringProps> = ({ match, onMatchUpdate, onEndMatch, readOnly = false }) => {
    const [viewInnings, setViewInnings] = useState<number>(match.currentInnings);
    const [loading, setLoading] = useState(false);
    const [selectedRuns, setSelectedRuns] = useState<number | null>(null);

    const activeInnings = match.innings[viewInnings - 1] || match.innings[0];
    const totalOvers = activeInnings.overs + (activeInnings.balls / 6);
    const runRate = totalOvers > 0 ? (activeInnings.runs / totalOvers).toFixed(2) : '0.00';

    // 2nd Innings Statistics
    const isShowingSecondInnings = viewInnings === 2;
    const target = match.innings[0].runs + 1;
    const runsNeeded = (target !== null && match.status !== 'completed') ? Math.max(0, target - activeInnings.runs) : null;
    const totalBalls = match.oversPerInnings * 6;
    const ballsBowled = (activeInnings.overs * 6) + activeInnings.balls;
    const ballsRemaining = totalBalls - ballsBowled;
    const requiredRunRate = (runsNeeded !== null && ballsRemaining > 0)
        ? ((runsNeeded / ballsRemaining) * 6).toFixed(2)
        : (runsNeeded !== null && runsNeeded <= 0 ? '0.00' : 'N/A');

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
            onMatchUpdate?.(updatedMatch);
            // Always switch to the innings being bowled
            setViewInnings(updatedMatch.currentInnings);
        } catch (error) {
            console.error('Error recording ball:', error);
            alert('Failed to record ball. Please try again.');
        } finally {
            setLoading(false);
            setTimeout(() => setSelectedRuns(null), 300);
        }
    };

    const undoLastBall = async () => {
        if (activeInnings.ballByBall.length === 0 && match.currentInnings === 1) {
            alert('No balls to undo!');
            return;
        }

        setLoading(true);
        try {
            const updatedMatch = await api.undoLastBall(match._id);
            onMatchUpdate?.(updatedMatch);
            setViewInnings(updatedMatch.currentInnings);
        } catch (error) {
            console.error('Error undoing ball:', error);
            alert('Failed to undo ball. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Auto-refresh for viewers
    React.useEffect(() => {
        if (!readOnly || match.status === 'completed') return;

        const interval = setInterval(async () => {
            try {
                const updatedMatch = await api.getMatch(match._id);
                if (JSON.stringify(updatedMatch) !== JSON.stringify(match)) {
                    onMatchUpdate?.(updatedMatch);
                    // Stay on the live innings
                    if (updatedMatch.status !== 'completed') {
                        setViewInnings(updatedMatch.currentInnings);
                    }
                }
            } catch (err) {
                console.error('Failed to auto-refresh match:', err);
            }
        }, 5000); // Refresh every 5 seconds

        return () => clearInterval(interval);
    }, [readOnly, match._id, match.status, onMatchUpdate]);

    const handleShare = () => {
        const shareUrl = `${window.location.origin}/match/${match._id}`;
        navigator.clipboard.writeText(shareUrl);
        alert('Shareable link copied to clipboard!');
    };

    // Helper function to organize balls by overs
    const getBallsByOvers = () => {
        const balls = activeInnings.ballByBall;
        const overs: any[][] = [];
        let currentOver: any[] = [];
        let legalBallsInOver = 0;

        balls.forEach((ball) => {
            currentOver.push(ball);

            // Count legal balls (not wide or no ball)
            if (!ball.isWide && !ball.isNoBall) {
                legalBallsInOver++;

                // Complete over after 6 legal balls
                if (legalBallsInOver === 6) {
                    overs.push(currentOver);
                    currentOver = [];
                    legalBallsInOver = 0;
                }
            }
        });

        // Add incomplete over if it has balls
        if (currentOver.length > 0) {
            overs.push(currentOver);
        }

        return overs;
    };


    return (
        <div className="live-scoring-container fade-in">
            {/* 1. Result Summary (Only if completed) */}
            {match.status === 'completed' && (
                <div className="result-card card completed-header">
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

                    <div className="innings-summary-compact">
                        {match.innings.map((innings, idx) => (
                            <div key={idx} className="summary-row">
                                <div className="summary-team">{innings.battingTeam}</div>
                                <div className="summary-data">
                                    <span className="summary-score">{innings.runs}/{innings.wickets}</span>
                                    <span className="summary-overs">({innings.overs}.{innings.balls})</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="result-actions">
                        {!readOnly ? (
                            <button onClick={onEndMatch} className="btn btn-primary btn-lg">
                                🏏 New Match
                            </button>
                        ) : (
                            <p className="viewer-msg">Summary view only</p>
                        )}
                    </div>
                </div>
            )}
            <div className="scoreboard card">
                <div className="scoreboard-header">
                    <div className="team-info">
                        <h2 className="batting-team">{activeInnings.battingTeam}</h2>
                        <p className="vs-text">vs {activeInnings.bowlingTeam}</p>
                    </div>
                    <div className="innings-badge">
                        Innings {viewInnings}
                    </div>
                    {!readOnly && (
                        <button onClick={handleShare} className="btn-share" title="Copy share link">
                            🔗 Share Score
                        </button>
                    )}
                </div>

                <div className="score-display">
                    <div className="main-score">
                        <span className="runs">{activeInnings.runs}</span>
                        <span className="separator">/</span>
                        <span className="wickets">{activeInnings.wickets}</span>
                    </div>
                    <div className="overs-display">
                        <span className="overs-label">Overs:</span>
                        <span className="overs-value">
                            {activeInnings.overs}.{activeInnings.balls} / {match.oversPerInnings}
                        </span>
                    </div>
                </div>

                {isShowingSecondInnings && target !== null && (
                    <div className="chase-info-container fade-in">
                        <div className="target-badge">
                            Target: <span className="highlight">{target}</span>
                        </div>
                        <div className="chase-details">
                            <p className="needed-text">
                                Need <span className="highlight">{runsNeeded}</span> runs in <span className="highlight">{ballsRemaining}</span> balls
                            </p>
                            <p className="rrr-text">
                                Required RR: <span className="highlight">{requiredRunRate}</span>
                            </p>
                        </div>
                    </div>
                )}

                <div className="stats-grid">
                    <div className="stat-item">
                        <span className="stat-label">Run Rate</span>
                        <span className="stat-value">{runRate}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Extras</span>
                        <span className="stat-value">
                            {activeInnings.extras.wides + activeInnings.extras.noBalls}
                        </span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Wides</span>
                        <span className="stat-value">{activeInnings.extras.wides}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">No Balls</span>
                        <span className="stat-value">{activeInnings.extras.noBalls}</span>
                    </div>
                </div>
            </div>

            {/* 3. Innings Selector (If match has 2nd innings or is completed) */}
            {(match.innings.length > 1 || match.status === 'completed') && (
                <div className="innings-selector card">
                    <button
                        onClick={() => setViewInnings(1)}
                        className={`btn-innings ${viewInnings === 1 ? 'active' : ''}`}
                    >
                        1st Innings
                    </button>
                    <button
                        onClick={() => setViewInnings(2)}
                        disabled={match.innings.length < 2 && match.status !== 'completed'}
                        className={`btn-innings ${viewInnings === 2 ? 'active' : ''}`}
                    >
                        2nd Innings
                    </button>
                </div>
            )}

            {!readOnly && match.status === 'in_progress' && (
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
                        <button
                            onClick={undoLastBall}
                            disabled={loading || activeInnings.ballByBall.length === 0}
                            className="btn btn-warning"
                        >
                            Undo
                        </button>
                    </div>
                </div>
            )}

            {activeInnings.ballByBall.length > 0 && (
                <div className="ball-history card">
                    <h3 className="history-title">{activeInnings.battingTeam} - Innings History</h3>
                    <div className="overs-history">
                        {getBallsByOvers().reverse().map((overBalls, index, array) => {
                            const overNum = array.length - index;
                            const overRuns = overBalls.reduce((sum, ball) => {
                                let runs = ball.runs || 0;
                                if (ball.isWide || ball.isNoBall) runs += 1;
                                return sum + runs;
                            }, 0);
                            const overWickets = overBalls.filter(b => b.isWicket).length;

                            return (
                                <div key={overNum} className="over-row">
                                    <div className="over-info">
                                        <span className="over-number">Over {overNum}</span>
                                        <span className="over-summary">
                                            {overRuns} runs, {overWickets} {overWickets === 1 ? 'wicket' : 'wickets'}
                                        </span>
                                    </div>
                                    <div className="over-balls">
                                        {overBalls.map((ball) => (
                                            <div
                                                key={ball.ballNumber}
                                                className={`ball-item small ${ball.isWicket ? 'ball-wicket' : ''} ${(ball.runs === 4 || ball.runs === 6) && !ball.isWide && !ball.isNoBall ? 'ball-boundary' : ''
                                                    } ${ball.isWide || ball.isNoBall ? 'ball-extra' : ''}`}
                                            >
                                                {ball.isWicket ? 'W' : ball.isWide ? 'WD' : ball.isNoBall ? 'NB' : ball.runs}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LiveScoring;
