import React, { useState, useEffect } from 'react';
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

    // Player and bowler management states
    const [showPlayerModal, setShowPlayerModal] = useState(false);
    const [showBowlerModal, setShowBowlerModal] = useState(false);
    const [showNewBatsmanModal, setShowNewBatsmanModal] = useState(false);
    const [strikerName, setStrikerName] = useState('');
    const [nonStrikerName, setNonStrikerName] = useState('');
    const [bowlerName, setBowlerName] = useState('');
    const [newBatsmanName, setNewBatsmanName] = useState('');
    const [pendingBall, setPendingBall] = useState<any>(null);

    const activeInnings = match.innings[viewInnings - 1] || match.innings[0];
    const totalOvers = activeInnings.overs + (activeInnings.balls / 6);
    const runRate = totalOvers > 0 ? (activeInnings.runs / totalOvers).toFixed(2) : '0.00';

    // Check if we need player/bowler setup
    const needsPlayerSetup = !activeInnings.striker || !activeInnings.nonStriker;
    const needsNewBowler = activeInnings.balls === 0 && activeInnings.overs > 0 && !showBowlerModal;

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

    // Initialize local state from server data
    useEffect(() => {
        if (activeInnings.striker) setStrikerName(activeInnings.striker);
        if (activeInnings.nonStriker) setNonStrikerName(activeInnings.nonStriker);
        if (activeInnings.currentBowler) setBowlerName(activeInnings.currentBowler);
    }, [match._id, match.currentInnings]);

    // Show player modal only once on first ball (but not during innings break)
    const isInningsBreak = match.currentInnings === 2 && match.innings.length === 2 && match.innings[1].ballByBall.length === 0;

    useEffect(() => {
        if (!readOnly && match.status === 'in_progress' && needsPlayerSetup && !showPlayerModal && !strikerName && !nonStrikerName && !isInningsBreak) {
            setShowPlayerModal(true);
        }
    }, [needsPlayerSetup, readOnly, match.status, showPlayerModal, strikerName, nonStrikerName, isInningsBreak]);

    const handlePlayerSetup = () => {
        if (!strikerName.trim() || !nonStrikerName.trim()) {
            alert('Please enter both batsmen names');
            return;
        }
        setShowPlayerModal(false);
        // Check if we need bowler after player setup
        if (!activeInnings.currentBowler && !bowlerName) {
            setShowBowlerModal(true);
        }
    };

    const handleBowlerSetup = () => {
        if (!bowlerName.trim()) {
            alert('Please enter bowler name');
            return;
        }
        setShowBowlerModal(false);
    };

    const handleNewBatsmanSetup = () => {
        if (!newBatsmanName.trim()) {
            alert('Please enter new batsman name');
            return;
        }
        setShowNewBatsmanModal(false);
        // Process the pending ball with new batsman
        if (pendingBall) {
            processBall(pendingBall.runs, pendingBall.isWide, pendingBall.isNoBall, pendingBall.isWicket, newBatsmanName);
            setPendingBall(null);
            setNewBatsmanName('');
        }
    };

    const switchStrike = () => {
        const temp = strikerName || activeInnings.striker || '';
        setStrikerName(nonStrikerName || activeInnings.nonStriker || '');
        setNonStrikerName(temp);
    };

    const processBall = async (runs: number, isWide = false, isNoBall = false, isWicket = false, newBatsman?: string) => {
        setLoading(true);
        setSelectedRuns(runs);

        try {
            const ballData: any = {
                runs,
                isWide,
                isNoBall,
                isWicket,
                striker: strikerName || activeInnings.striker,
                nonStriker: nonStrikerName || activeInnings.nonStriker,
                bowler: bowlerName || activeInnings.currentBowler,
            };

            if (newBatsman) {
                ballData.newBatsman = newBatsman;
            }

            const updatedMatch = await api.recordBall(match._id, ballData);
            onMatchUpdate?.(updatedMatch);

            // Update local state with server response
            const updatedInnings = updatedMatch.innings[updatedMatch.currentInnings - 1];
            setStrikerName(updatedInnings.striker || '');
            setNonStrikerName(updatedInnings.nonStriker || '');

            // Check if over completed (bowler will be cleared by backend)
            if (!updatedInnings.currentBowler && updatedInnings.overs > 0) {
                // Over completed, clear local bowler and show modal
                setBowlerName('');
                setShowBowlerModal(true);
            } else {
                setBowlerName(updatedInnings.currentBowler || '');
            }

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

    const recordBall = async (runs: number, isWide = false, isNoBall = false, isWicket = false) => {
        // Check if players/bowler are set up
        if (!strikerName || !nonStrikerName) {
            setShowPlayerModal(true);
            return;
        }
        if (!bowlerName) {
            setShowBowlerModal(true);
            return;
        }

        // If wicket, ask for new batsman
        if (isWicket) {
            setPendingBall({ runs, isWide, isNoBall, isWicket });
            setShowNewBatsmanModal(true);
            return;
        }

        await processBall(runs, isWide, isNoBall, isWicket);
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

            // Update local state
            const updatedInnings = updatedMatch.innings[updatedMatch.currentInnings - 1];
            setStrikerName(updatedInnings.striker || '');
            setNonStrikerName(updatedInnings.nonStriker || '');
            setBowlerName(updatedInnings.currentBowler || '');

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

    // Get available bowlers (bowlers who have bowled before)
    const getAvailableBowlers = () => {
        return activeInnings.bowlerStats?.map(b => b.name) || [];
    };

    return (
        <div className="live-scoring-container fade-in">
            {/* Player Setup Modal */}
            {showPlayerModal && (
                <div className="modal-overlay">
                    <div className="modal-content card">
                        <h2>🏏 Select Opening Batsmen</h2>
                        <p className="modal-subtitle">Enter the names of the two batsmen</p>
                        <div className="form-group">
                            <label>Striker (On Strike)</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Enter striker name"
                                value={strikerName}
                                onChange={(e) => setStrikerName(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label>Non-Striker</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Enter non-striker name"
                                value={nonStrikerName}
                                onChange={(e) => setNonStrikerName(e.target.value)}
                            />
                        </div>
                        <button onClick={handlePlayerSetup} className="btn btn-primary btn-lg">
                            Continue
                        </button>
                    </div>
                </div>
            )}

            {/* Bowler Setup Modal */}
            {showBowlerModal && (
                <div className="modal-overlay">
                    <div className="modal-content card">
                        <h2>⚾ Select Bowler</h2>
                        <p className="modal-subtitle">
                            {needsNewBowler ? 'New over - Select bowler' : 'Enter bowler name'}
                        </p>

                        {getAvailableBowlers().length > 0 && (
                            <div className="bowler-selection">
                                <p className="selection-label">Previous bowlers:</p>
                                <div className="bowler-chips">
                                    {getAvailableBowlers().map((name) => (
                                        <button
                                            key={name}
                                            onClick={() => setBowlerName(name)}
                                            className={`chip ${bowlerName === name ? 'chip-active' : ''}`}
                                        >
                                            {name}
                                        </button>
                                    ))}
                                </div>
                                <p className="selection-label" style={{ marginTop: '1rem' }}>Or enter new bowler:</p>
                            </div>
                        )}

                        <div className="form-group">
                            <input
                                type="text"
                                className="input"
                                placeholder="Enter bowler name"
                                value={bowlerName}
                                onChange={(e) => setBowlerName(e.target.value)}
                                autoFocus={getAvailableBowlers().length === 0}
                            />
                        </div>
                        <button onClick={handleBowlerSetup} className="btn btn-primary btn-lg">
                            Start Bowling
                        </button>
                    </div>
                </div>
            )}

            {/* New Batsman Modal (After Wicket) */}
            {showNewBatsmanModal && (
                <div className="modal-overlay">
                    <div className="modal-content card">
                        <h2>🏏 Wicket! New Batsman</h2>
                        <p className="modal-subtitle">Enter the name of the new batsman</p>
                        <div className="form-group">
                            <input
                                type="text"
                                className="input"
                                placeholder="Enter new batsman name"
                                value={newBatsmanName}
                                onChange={(e) => setNewBatsmanName(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <button onClick={handleNewBatsmanSetup} className="btn btn-primary btn-lg">
                            Continue
                        </button>
                    </div>
                </div>
            )}

            {/* Innings Break Screen (Between 1st and 2nd innings) */}
            {match.currentInnings === 2 && match.innings.length === 2 && match.innings[1].ballByBall.length === 0 && !readOnly && (
                <div className="innings-break-screen card">
                    <div className="innings-break-header">
                        <h1 className="innings-break-title">🏏 First Innings Complete!</h1>
                        <p className="innings-break-subtitle">Time for the chase</p>
                    </div>

                    <div className="innings-summary-box">
                        <div className="innings-summary-header">
                            <h2>{match.innings[0].battingTeam}</h2>
                            <div className="innings-summary-score">
                                <span className="big-score">{match.innings[0].runs}/{match.innings[0].wickets}</span>
                                <span className="innings-overs">({match.innings[0].overs}.{match.innings[0].balls} overs)</span>
                            </div>
                        </div>

                        <div className="target-display">
                            <div className="target-label">Target</div>
                            <div className="target-value">{match.innings[0].runs + 1}</div>
                            <div className="target-subtitle">{match.teams[1]} needs {match.innings[0].runs + 1} runs to win</div>
                        </div>
                    </div>

                    {/* First Innings Batting Stats */}
                    {match.innings[0].playerStats && match.innings[0].playerStats.length > 0 && (
                        <div className="stats-table">
                            <h3 className="stats-title">Batting Performance - {match.innings[0].battingTeam}</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Batsman</th>
                                        <th>R</th>
                                        <th>B</th>
                                        <th>4s</th>
                                        <th>6s</th>
                                        <th>SR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {match.innings[0].playerStats.map((player, idx) => (
                                        <tr key={idx} className={player.isOut ? 'player-out' : ''}>
                                            <td>
                                                {player.name}
                                                {player.isOut && ' (out)'}
                                            </td>
                                            <td>{player.runs}</td>
                                            <td>{player.balls}</td>
                                            <td>{player.fours}</td>
                                            <td>{player.sixes}</td>
                                            <td>{player.balls > 0 ? ((player.runs / player.balls) * 100).toFixed(1) : '0.0'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* First Innings Bowling Stats */}
                    {match.innings[0].bowlerStats && match.innings[0].bowlerStats.length > 0 && (
                        <div className="stats-table">
                            <h3 className="stats-title">Bowling Performance - {match.innings[0].bowlingTeam}</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Bowler</th>
                                        <th>O</th>
                                        <th>R</th>
                                        <th>W</th>
                                        <th>Econ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {match.innings[0].bowlerStats.map((bowler, idx) => (
                                        <tr key={idx}>
                                            <td>{bowler.name}</td>
                                            <td>{bowler.overs}.{bowler.balls}</td>
                                            <td>{bowler.runs}</td>
                                            <td>{bowler.wickets}</td>
                                            <td>
                                                {bowler.overs > 0 || bowler.balls > 0
                                                    ? (bowler.runs / (bowler.overs + bowler.balls / 6)).toFixed(2)
                                                    : '0.00'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="innings-break-actions">
                        <button
                            onClick={() => {
                                // Reset local state for second innings
                                setStrikerName('');
                                setNonStrikerName('');
                                setBowlerName('');
                                setShowPlayerModal(true);
                            }}
                            className="btn btn-primary btn-lg"
                        >
                            🚀 Start Second Innings
                        </button>
                    </div>
                </div>
            )}

            {/* Result Summary (Only if completed) */}
            {match.status === 'completed' && (
                <div className="result-card card completed-header">
                    <div className="match-timestamp">
                        {new Date(match.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </div>
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

            {/* Scoreboard */}
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

                {/* Current Players Display */}
                {(activeInnings.striker || activeInnings.nonStriker || activeInnings.currentBowler) && (
                    <div className="current-players">
                        {(strikerName || activeInnings.striker) && (
                            <div className="player-badge striker">
                                ⭐ {strikerName || activeInnings.striker}
                                {activeInnings.playerStats?.find(p => p.name === (strikerName || activeInnings.striker)) && (
                                    <span className="player-score">
                                        {activeInnings.playerStats.find(p => p.name === (strikerName || activeInnings.striker))?.runs}
                                        ({activeInnings.playerStats.find(p => p.name === (strikerName || activeInnings.striker))?.balls})
                                    </span>
                                )}
                            </div>
                        )}
                        {(nonStrikerName || activeInnings.nonStriker) && (
                            <div className="player-badge non-striker">
                                {nonStrikerName || activeInnings.nonStriker}
                                {activeInnings.playerStats?.find(p => p.name === (nonStrikerName || activeInnings.nonStriker)) && (
                                    <span className="player-score">
                                        {activeInnings.playerStats.find(p => p.name === (nonStrikerName || activeInnings.nonStriker))?.runs}
                                        ({activeInnings.playerStats.find(p => p.name === (nonStrikerName || activeInnings.nonStriker))?.balls})
                                    </span>
                                )}
                            </div>
                        )}
                        {(bowlerName || activeInnings.currentBowler) && (
                            <div className="player-badge bowler">
                                ⚾ {bowlerName || activeInnings.currentBowler}
                                {activeInnings.bowlerStats?.find(b => b.name === (bowlerName || activeInnings.currentBowler)) && (
                                    <span className="player-score">
                                        {activeInnings.bowlerStats.find(b => b.name === (bowlerName || activeInnings.currentBowler))?.overs}.
                                        {activeInnings.bowlerStats.find(b => b.name === (bowlerName || activeInnings.currentBowler))?.balls}-
                                        {activeInnings.bowlerStats.find(b => b.name === (bowlerName || activeInnings.currentBowler))?.runs}-
                                        {activeInnings.bowlerStats.find(b => b.name === (bowlerName || activeInnings.currentBowler))?.wickets}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}

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

            {/* Innings Selector */}
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

            {/* Scoring Controls */}
            {!readOnly && match.status === 'in_progress' && (
                <div className="scoring-controls card">
                    <div className="controls-header">
                        <h3 className="controls-title">Record Ball</h3>
                        {(strikerName || activeInnings.striker) && (nonStrikerName || activeInnings.nonStriker) && (
                            <button onClick={switchStrike} className="btn btn-secondary btn-sm">
                                🔄 Switch Strike
                            </button>
                        )}
                    </div>

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

            {/* Batting Stats */}
            {activeInnings.playerStats && activeInnings.playerStats.length > 0 && (
                <div className="stats-table card">
                    <h3 className="stats-title">Batting Statistics</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Batsman</th>
                                <th>R</th>
                                <th>B</th>
                                <th>4s</th>
                                <th>6s</th>
                                <th>SR</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeInnings.playerStats.map((player, idx) => (
                                <tr key={idx} className={player.isOut ? 'player-out' : ''}>
                                    <td>
                                        {player.name}
                                        {player.name === activeInnings.striker && ' *'}
                                        {player.isOut && ' (out)'}
                                    </td>
                                    <td>{player.runs}</td>
                                    <td>{player.balls}</td>
                                    <td>{player.fours}</td>
                                    <td>{player.sixes}</td>
                                    <td>{player.balls > 0 ? ((player.runs / player.balls) * 100).toFixed(1) : '0.0'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Bowling Stats */}
            {activeInnings.bowlerStats && activeInnings.bowlerStats.length > 0 && (
                <div className="stats-table card">
                    <h3 className="stats-title">Bowling Statistics</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Bowler</th>
                                <th>O</th>
                                <th>R</th>
                                <th>W</th>
                                <th>Econ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeInnings.bowlerStats.map((bowler, idx) => (
                                <tr key={idx}>
                                    <td>
                                        {bowler.name}
                                        {bowler.name === activeInnings.currentBowler && ' *'}
                                    </td>
                                    <td>{bowler.overs}.{bowler.balls}</td>
                                    <td>{bowler.runs}</td>
                                    <td>{bowler.wickets}</td>
                                    <td>
                                        {bowler.overs > 0 || bowler.balls > 0
                                            ? (bowler.runs / (bowler.overs + bowler.balls / 6)).toFixed(2)
                                            : '0.00'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Ball History */}
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
                                                title={`${ball.batsmanName || ''} - ${ball.bowlerName || ''}`}
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
