import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Match } from '../types/match';
import { api } from '../services/api';
import { initializeWebSocket, joinMatch, leaveMatch, onScoreUpdate } from '../services/websocket';
import wicketGif from '../assets/images/wicket.gif';
import fourRunsGif from '../assets/images/four-runs.gif';
import sixRunGif from '../assets/images/six-run.gif';
import freeHitGif from '../assets/images/free-hit.gif';
import { enqueue, dequeue, isNetworkError, getPendingForMatch } from '../services/offlineQueue';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import OfflineBanner from './OfflineBanner';
import './LiveScoring.css';

interface LiveScoringProps {
    match: Match;
    onMatchUpdate?: (match: Match) => void;
    onEndMatch?: () => void;
    readOnly?: boolean;
}

const LiveScoring: React.FC<LiveScoringProps> = ({ match, onMatchUpdate, onEndMatch, readOnly = false }) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [viewInnings, setViewInnings] = useState<number>(match.currentInnings);
    const [selectedRuns, setSelectedRuns] = useState<number | null>(null);

    // Player and bowler management states
    const [showPlayerModal, setShowPlayerModal] = useState(false);
    const [showBowlerModal, setShowBowlerModal] = useState(false);
    const [showNewBatsmanModal, setShowNewBatsmanModal] = useState(false);
    const [showNoBallModal, setShowNoBallModal] = useState(false);
    const [strikerName, setStrikerName] = useState('');
    const [nonStrikerName, setNonStrikerName] = useState('');
    const [bowlerName, setBowlerName] = useState('');
    const [newBatsmanName, setNewBatsmanName] = useState('');
    const [pendingBall, setPendingBall] = useState<any>(null);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [showWicketGif, setShowWicketGif] = useState(false);
    const [showFourGif, setShowFourGif] = useState(false);
    const [showSixGif, setShowSixGif] = useState(false);
    const [showFreeHitGif, setShowFreeHitGif] = useState(false);
    const prevWicketsRef = useRef<{ inningsNum: number; wickets: number }>({
        inningsNum: match.currentInnings,
        wickets: match.innings[match.currentInnings - 1]?.wickets ?? 0,
    });
    const prevBallCountRef = useRef<{ inningsNum: number; count: number }>({
        inningsNum: match.currentInnings,
        count: match.innings[match.currentInnings - 1]?.ballByBall?.length ?? 0,
    });
    const wicketTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fourTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sixTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const freeHitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    const { isOnline, isSyncing, pendingItems, refreshPending } = useOfflineQueue({
        matchId: match._id,
        onDrainComplete: (updatedMatch: Match) => {
            queryClient.setQueryData(['match', match._id], updatedMatch);
            onMatchUpdate?.(updatedMatch);
            const drained = updatedMatch.innings[updatedMatch.currentInnings - 1];
            setStrikerName(drained.striker || '');
            setNonStrikerName(drained.nonStriker || '');
            setBowlerName(drained.currentBowler || '');
            setViewInnings(updatedMatch.currentInnings);
        },
        onDrainError: (skipped) =>
            setToast(`${skipped} ball${skipped > 1 ? 's' : ''} could not be synced and were dropped.`),
    });

    useEffect(() => {
        if (!toast) return;
        const id = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(id);
    }, [toast]);

    useEffect(() => {
        if (!showMenu) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    const activeInnings = match.innings[viewInnings - 1] || match.innings[0];
    const totalOvers = activeInnings.overs + (activeInnings.balls / 6);
    const runRate = totalOvers > 0 ? (activeInnings.runs / totalOvers).toFixed(2) : '0.00';

    // Legal balls in the current (incomplete) over — used for over-progress dots
    const currentOverBalls = activeInnings.ballByBall
        .filter(b => !b.isWide && !b.isNoBall)
        .slice(activeInnings.overs * 6);

    // Pending offline balls — used for score delta display
    const pendingBallActions = pendingItems.filter(item => item.type === 'recordBall');
    const pendingRuns = pendingBallActions.reduce((sum, item) => sum + (item.payload?.runs ?? 0), 0);
    const pendingWickets = pendingBallActions.filter(item => item.payload?.isWicket).length;

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
        setStrikerName(activeInnings.striker || '');
        setNonStrikerName(activeInnings.nonStriker || '');
        setBowlerName(activeInnings.currentBowler || '');
    }, [match._id, match.currentInnings]);

    // Show player modal only once on first ball (but not during innings break)
    const isInningsBreak = match.currentInnings === 2 && match.innings.length === 2 && match.innings[1].ballByBall.length === 0;
    const showInningsBreakScreen = isInningsBreak && !readOnly && (!strikerName || !nonStrikerName);

    useEffect(() => {
        if (!readOnly && match.status === 'in_progress' && needsPlayerSetup && !showPlayerModal && !strikerName && !nonStrikerName && !isInningsBreak) {
            setShowPlayerModal(true);
        }
    }, [needsPlayerSetup, readOnly, match.status, showPlayerModal, strikerName, nonStrikerName, isInningsBreak]);

    // WebSocket connection for real-time updates
    useEffect(() => {
        initializeWebSocket();
        joinMatch(match._id);

        const unsubscribe = onScoreUpdate((data: any) => {
            if (data.matchId === match._id) {
                console.log('📡 Received live score update:', data.match);
                queryClient.setQueryData(['match', match._id], data.match);
                if (onMatchUpdate) {
                    onMatchUpdate(data.match);
                }
                const updatedInnings = data.match.innings[data.match.currentInnings - 1];
                setViewInnings(data.match.currentInnings);
                setStrikerName(updatedInnings.striker || '');
                setNonStrikerName(updatedInnings.nonStriker || '');
                setBowlerName(updatedInnings.currentBowler || '');

                // Show celebration GIFs for viewers only
                const newInningsNum = data.match.currentInnings;
                const newInnings = data.match.innings[newInningsNum - 1];
                const newWickets = newInnings?.wickets ?? 0;
                const newBallCount = newInnings?.ballByBall?.length ?? 0;

                if (readOnly && newInningsNum === prevWicketsRef.current.inningsNum && newWickets > prevWicketsRef.current.wickets) {
                    if (wicketTimerRef.current) clearTimeout(wicketTimerRef.current);
                    setShowWicketGif(true);
                    wicketTimerRef.current = setTimeout(() => setShowWicketGif(false), 3000);
                }
                prevWicketsRef.current = { inningsNum: newInningsNum, wickets: newWickets };

                if (readOnly && newInningsNum === prevBallCountRef.current.inningsNum && newBallCount > prevBallCountRef.current.count) {
                    const lastBall = newInnings?.ballByBall?.[newBallCount - 1];
                    if (lastBall?.isNoBall) {
                        if (freeHitTimerRef.current) clearTimeout(freeHitTimerRef.current);
                        setShowFreeHitGif(true);
                        freeHitTimerRef.current = setTimeout(() => setShowFreeHitGif(false), 3000);
                    } else if (lastBall?.runs === 4) {
                        if (fourTimerRef.current) clearTimeout(fourTimerRef.current);
                        setShowFourGif(true);
                        fourTimerRef.current = setTimeout(() => setShowFourGif(false), 3000);
                    } else if (lastBall?.runs === 6) {
                        if (sixTimerRef.current) clearTimeout(sixTimerRef.current);
                        setShowSixGif(true);
                        sixTimerRef.current = setTimeout(() => setShowSixGif(false), 3000);
                    }
                }
                prevBallCountRef.current = { inningsNum: newInningsNum, count: newBallCount };
            }
        });

        return () => {
            leaveMatch(match._id);
            unsubscribe();
        };
    }, [match._id, onMatchUpdate, queryClient]);

    const switchStrikeMutation = useMutation({
        mutationFn: ({ newStriker, newNonStriker }: { newStriker: string; newNonStriker: string }) =>
            api.updateBatsmen(match._id, newStriker, newNonStriker),
        onSuccess: (updatedMatch: Match) => {
            queryClient.setQueryData(['match', match._id], updatedMatch);
            onMatchUpdate?.(updatedMatch);
            const innings = updatedMatch.innings[updatedMatch.currentInnings - 1];
            setStrikerName(innings.striker || '');
            setNonStrikerName(innings.nonStriker || '');
        },
        onError: () => setToast('Failed to switch strike. Please try again.'),
    });

    const recordBallMutation = useMutation({
        mutationFn: (ballData: any) => api.recordBall(match._id, ballData),
        onSuccess: (updatedMatch: Match) => {
            queryClient.setQueryData(['match', match._id], updatedMatch);
            const updatedInnings = updatedMatch.innings[updatedMatch.currentInnings - 1];
            setStrikerName(updatedInnings.striker || '');
            setNonStrikerName(updatedInnings.nonStriker || '');
            if (!updatedInnings.currentBowler && updatedInnings.overs > 0) {
                setBowlerName('');
                setShowBowlerModal(true);
            } else {
                setBowlerName(updatedInnings.currentBowler || '');
            }
            setViewInnings(updatedMatch.currentInnings);
        },
        onError: (error: Error, ballData: any) => {
            if (isNetworkError(error)) {
                enqueue({ matchId: match._id, type: 'recordBall', payload: ballData });
                refreshPending();
            } else {
                setToast('Server error — ball was not recorded. Please try again.');
            }
        },
        onSettled: () => setTimeout(() => setSelectedRuns(null), 300),
    });

    const undoMutation = useMutation({
        mutationFn: () => api.undoLastBall(match._id),
        onSuccess: (updatedMatch: Match) => {
            queryClient.setQueryData(['match', match._id], updatedMatch);
            onMatchUpdate?.(updatedMatch);
            const updatedInnings = updatedMatch.innings[updatedMatch.currentInnings - 1];
            setStrikerName(updatedInnings.striker || '');
            setNonStrikerName(updatedInnings.nonStriker || '');
            setBowlerName(updatedInnings.currentBowler || '');
            setViewInnings(updatedMatch.currentInnings);
        },
        onError: (error: Error) => {
            if (isNetworkError(error)) {
                enqueue({ matchId: match._id, type: 'undoLastBall' });
                refreshPending();
            } else {
                setToast('Server error — undo failed. Please try again.');
            }
        },
    });

    const loading = recordBallMutation.isPending || undoMutation.isPending || switchStrikeMutation.isPending;

    const handlePlayerSetup = () => {
        if (!strikerName.trim() || !nonStrikerName.trim()) {
            alert('Please enter both batsmen names');
            return;
        }
        setShowPlayerModal(false);
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
        if (pendingBall) {
            processBall(pendingBall.runs, pendingBall.isWide, pendingBall.isNoBall, pendingBall.isWicket, newBatsmanName);
            setPendingBall(null);
            setNewBatsmanName('');
        }
    };

    const switchStrike = () => {
        const temp = strikerName || activeInnings.striker || '';
        const newStriker = nonStrikerName || activeInnings.nonStriker || '';
        const newNonStriker = temp;
        switchStrikeMutation.mutate({ newStriker, newNonStriker });
    };

    const processBall = (runs: number, isWide = false, isNoBall = false, isWicket = false, newBatsman?: string) => {
        setSelectedRuns(runs);
        const ballData: any = {
            runs,
            isWide,
            isNoBall,
            isWicket,
            striker: strikerName || activeInnings.striker,
            nonStriker: nonStrikerName || activeInnings.nonStriker,
            bowler: bowlerName || activeInnings.currentBowler,
        };
        if (newBatsman) ballData.newBatsman = newBatsman;
        if (!navigator.onLine) {
            enqueue({ matchId: match._id, type: 'recordBall', payload: ballData });
            refreshPending();
            setTimeout(() => setSelectedRuns(null), 300);

            // Compute full strike rotation for this ball synchronously before any setState call
            let newStriker = strikerName || activeInnings.striker || '';
            let newNonStriker = nonStrikerName || activeInnings.nonStriker || '';

            if (isWicket && newBatsman) {
                // New batsman replaces the out striker
                newStriker = newBatsman;
            } else if (!isWide && runs % 2 !== 0) {
                // Odd runs on a non-wide: batsmen crossed
                [newStriker, newNonStriker] = [newNonStriker, newStriker];
            }

            // Check over completion on legal balls — read fresh queue after enqueue
            if (!isWide && !isNoBall) {
                const freshQueue = getPendingForMatch(match._id);
                const legalPending = freshQueue.filter(
                    item => item.type === 'recordBall' && !item.payload?.isWide && !item.payload?.isNoBall
                ).length;
                const totalLegalInOver = activeInnings.balls + legalPending;
                if (totalLegalInOver > 0 && totalLegalInOver % 6 === 0) {
                    // End of over: batsmen swap ends regardless of last ball
                    [newStriker, newNonStriker] = [newNonStriker, newStriker];
                    setBowlerName('');
                    setShowBowlerModal(true);
                }
            }

            setStrikerName(newStriker);
            setNonStrikerName(newNonStriker);
            return;
        }
        recordBallMutation.mutate(ballData);
    };

    const recordBall = (runs: number, isWide = false, isNoBall = false, isWicket = false) => {
        if (!strikerName || !nonStrikerName) {
            setShowPlayerModal(true);
            return;
        }
        if (!bowlerName) {
            setShowBowlerModal(true);
            return;
        }
        if (isWicket) {
            setPendingBall({ runs, isWide, isNoBall, isWicket });
            setShowNewBatsmanModal(true);
            return;
        }
        processBall(runs, isWide, isNoBall, isWicket);
    };

    const undoLastBall = () => {
        const queued = pendingItems.filter(item => item.type === 'recordBall');
        if (queued.length > 0) {
            dequeue(queued[queued.length - 1].id);
            refreshPending();
            return;
        }
        if (!navigator.onLine) {
            enqueue({ matchId: match._id, type: 'undoLastBall' });
            refreshPending();
            return;
        }
        if (activeInnings.ballByBall.length === 0 && match.currentInnings === 1) {
            setToast('No balls to undo!');
            return;
        }
        undoMutation.mutate();
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
            <OfflineBanner isOnline={isOnline} isSyncing={isSyncing} pendingCount={pendingItems.length} />

            {/* Celebration GIF overlays — viewers only */}
            {readOnly && showWicketGif && (
                <div className="wicket-gif-overlay">
                    <img src={wicketGif} alt="Wicket!" className="wicket-gif" />
                </div>
            )}
            {readOnly && showFourGif && (
                <div className="wicket-gif-overlay">
                    <img src={fourRunsGif} alt="Four!" className="wicket-gif" />
                </div>
            )}
            {readOnly && showSixGif && (
                <div className="wicket-gif-overlay">
                    <img src={sixRunGif} alt="Six!" className="wicket-gif" />
                </div>
            )}
            {readOnly && showFreeHitGif && (
                <div className="wicket-gif-overlay">
                    <img src={freeHitGif} alt="Free Hit!" className="wicket-gif" />
                </div>
            )}

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

            {/* No Ball Runs Modal */}
            {showNoBallModal && (
                <div className="modal-overlay">
                    <div className="modal-content card">
                        <h2>🚫 No Ball</h2>
                        <p className="modal-subtitle">How many runs did the batsman score?</p>
                        <div className="noball-runs-grid">
                            {[0, 1, 2, 3, 4, 6].map((runs) => (
                                <button
                                    key={runs}
                                    className={`btn-run noball-run-btn ${runs === 4 || runs === 6 ? 'btn-run-boundary' : ''} ${runs === 0 ? 'btn-run-dot' : ''}`}
                                    onClick={() => {
                                        setShowNoBallModal(false);
                                        processBall(runs, false, true, false);
                                    }}
                                >
                                    {runs === 0 ? '•' : runs}
                                </button>
                            ))}
                        </div>
                        <button
                            className="btn btn-ghost btn-sm noball-cancel"
                            onClick={() => setShowNoBallModal(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Innings Break Screen (Between 1st and 2nd innings) */}
            {showInningsBreakScreen && (
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

            {/* Show game interface only if NOT in innings break */}
            {!showInningsBreakScreen && (
                <>
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
                            <div className="header-menu" ref={menuRef}>
                                <button
                                    className="menu-trigger"
                                    onClick={() => setShowMenu(v => !v)}
                                    aria-label="More options"
                                >
                                    ⋮
                                </button>
                                {showMenu && (
                                    <div className="menu-dropdown">
                                        {!readOnly && (
                                            <button className="menu-item" onClick={() => { handleShare(); setShowMenu(false); }}>
                                                🔗 Share Score
                                            </button>
                                        )}
                                        <button className="menu-item" onClick={() => { navigate('/playerSummary'); setShowMenu(false); }}>
                                            📊 Players
                                        </button>
                                        <button className="menu-item" onClick={() => { navigate('/admin'); setShowMenu(false); }}>
                                            ⚙️ Admin
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="score-display">
                            <div className="main-score">
                                <span className="runs">{activeInnings.runs}</span>
                                {pendingRuns > 0 && (
                                    <span className="pending-delta">+{pendingRuns}</span>
                                )}
                                <span className="separator">/</span>
                                <span className="wickets">{activeInnings.wickets}</span>
                                {pendingWickets > 0 && (
                                    <span className="pending-delta pending-delta-wicket">+{pendingWickets}</span>
                                )}
                            </div>
                            <div className="overs-display">
                                <span className="overs-label">Overs:</span>
                                <span className="overs-value">
                                    {activeInnings.overs}.{activeInnings.balls} / {match.oversPerInnings}
                                </span>
                                {pendingBallActions.length > 0 && (
                                    <span className="overs-pending">+{pendingBallActions.length}</span>
                                )}
                            </div>
                        </div>

                        {/* Current Players Display */}
                        {(activeInnings.striker || activeInnings.nonStriker || activeInnings.currentBowler) && (
                            <div className="current-players">
                                {/* Batsmen row with FAB between them */}
                                {(strikerName || activeInnings.striker || nonStrikerName || activeInnings.nonStriker) && (
                                    <div className="batsmen-row">
                                        {(strikerName || activeInnings.striker) && (() => {
                                            const name = strikerName || activeInnings.striker!;
                                            const stats = activeInnings.playerStats?.find(p => p.name === name);
                                            return (
                                                <div className="batsman-card striker-card">
                                                    <span className="batsman-name">⭐ {name}</span>
                                                    {stats && (
                                                        <span className="batsman-score">
                                                            <strong>{stats.runs}</strong>
                                                            <span className="batsman-balls">({stats.balls})</span>
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {!readOnly && (strikerName || activeInnings.striker) && (nonStrikerName || activeInnings.nonStriker) && (
                                            <button
                                                onClick={switchStrike}
                                                disabled={loading}
                                                className="fab-switch"
                                                aria-label="Switch strike"
                                            >
                                                ⇄
                                            </button>
                                        )}

                                        {(nonStrikerName || activeInnings.nonStriker) && (() => {
                                            const name = nonStrikerName || activeInnings.nonStriker!;
                                            const stats = activeInnings.playerStats?.find(p => p.name === name);
                                            return (
                                                <div className="batsman-card non-striker-card">
                                                    <span className="batsman-name">{name}</span>
                                                    {stats && (
                                                        <span className="batsman-score">
                                                            <strong>{stats.runs}</strong>
                                                            <span className="batsman-balls">({stats.balls})</span>
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* Bowler row with labelled stats */}
                                {(bowlerName || activeInnings.currentBowler) && (() => {
                                    const name = bowlerName || activeInnings.currentBowler!;
                                    const stats = activeInnings.bowlerStats?.find(b => b.name === name);
                                    return (
                                        <div className="bowler-row">
                                            <span className="bowler-name">⚾ {name}</span>
                                            {stats && (
                                                <span className="bowler-stats">
                                                    <span className="bowler-stat-item">
                                                        <span className="stat-tag">O</span>
                                                        {stats.overs}.{stats.balls}
                                                    </span>
                                                    <span className="bowler-stat-sep">·</span>
                                                    <span className="bowler-stat-item">
                                                        <span className="stat-tag">R</span>
                                                        {stats.runs}
                                                    </span>
                                                    <span className="bowler-stat-sep">·</span>
                                                    <span className="bowler-stat-item">
                                                        <span className="stat-tag">W</span>
                                                        {stats.wickets}
                                                    </span>
                                                </span>
                                            )}
                                        </div>
                                    );
                                })()}
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
                                <h3 className="controls-title">
                                    {isSyncing ? (
                                        <span className="saving-indicator">
                                            <span className="btn-spinner" />
                                            Syncing {pendingItems.length} ball{pendingItems.length !== 1 ? 's' : ''}...
                                        </span>
                                    ) : loading ? (
                                        <span className="saving-indicator">
                                            <span className="btn-spinner" />
                                            Saving...
                                        </span>
                                    ) : pendingItems.length > 0 ? (
                                        <span className="pending-indicator">
                                            {pendingItems.length} ball{pendingItems.length !== 1 ? 's' : ''} pending sync
                                        </span>
                                    ) : 'Record Ball'}
                                </h3>
                            </div>

                            {/* Over progress dots */}
                            <div className="over-dots">
                                <span className="over-dots-label">Ov {activeInnings.overs + 1}</span>
                                {(() => {
                                    const slotsUsed = currentOverBalls.length;
                                    const pendingPayloads = pendingItems
                                        .filter(item => item.type === 'recordBall')
                                        .map(item => item.payload);
                                    const pendingToShow = pendingPayloads.slice(0, Math.max(0, 6 - slotsUsed));
                                    return Array.from({ length: 6 }).map((_, i) => {
                                        const confirmed = currentOverBalls[i];
                                        const pending = !confirmed ? pendingToShow[i - slotsUsed] : undefined;
                                        const ball = confirmed || pending;
                                        const isPending = !!pending && !confirmed;
                                        const type = !ball ? 'empty'
                                            : ball.isWicket ? 'wicket'
                                            : (ball.runs === 4 || ball.runs === 6) ? 'boundary'
                                            : ball.runs > 0 ? 'run'
                                            : 'dot';
                                        return (
                                            <div key={i} className={`over-dot over-dot-${type}${isPending ? ' over-dot-pending' : ''}`}>
                                                <span className="over-dot-label">
                                                    {ball ? (ball.isWicket ? 'W' : ball.runs === 0 ? '·' : ball.runs) : ''}
                                                </span>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>

                            <div className={`runs-buttons${loading ? ' buttons-loading' : ''}`}>
                                {[0, 1, 2, 3, 4, 6].map((runs) => (
                                    <button
                                        key={runs}
                                        onClick={() => recordBall(runs)}
                                        disabled={loading}
                                        className={`btn-run ${selectedRuns === runs ? 'btn-run-active' : ''} ${runs === 4 || runs === 6 ? 'btn-run-boundary' : ''} ${runs === 0 ? 'btn-run-dot' : ''}`}
                                    >
                                        {runs === 0 ? '•' : runs}
                                    </button>
                                ))}
                            </div>

                            <div className="scoring-divider" />

                            <div className={`extras-buttons${loading ? ' buttons-loading' : ''}`}>
                                <button
                                    onClick={() => recordBall(0, true, false, false)}
                                    disabled={loading}
                                    className="btn btn-extra"
                                >
                                    Wide
                                </button>
                                <button
                                    onClick={() => {
                                        if (!strikerName || !nonStrikerName) { setShowPlayerModal(true); return; }
                                        if (!bowlerName && !activeInnings.currentBowler) { setShowBowlerModal(true); return; }
                                        setShowNoBallModal(true);
                                    }}
                                    disabled={loading}
                                    className="btn btn-extra"
                                >
                                    No Ball
                                </button>
                                <button
                                    onClick={() => recordBall(0, false, false, true)}
                                    disabled={loading}
                                    className="btn btn-wicket"
                                >
                                    Wicket
                                </button>
                            </div>

                            <div className="undo-row">
                                <button
                                    onClick={undoLastBall}
                                    disabled={loading || (activeInnings.ballByBall.length === 0 && pendingItems.filter(i => i.type === 'recordBall').length === 0)}
                                    className="btn-undo"
                                >
                                    ↩ Undo last ball
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
                                                        {ball.isWicket ? 'W' : ball.isWide ? 'WD' : ball.isNoBall ? `NB${ball.runs > 0 ? `+${ball.runs}` : ''}` : ball.runs}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}
            {toast && (
                <div className="toast-message" role="alert">{toast}</div>
            )}
        </div>
    );
};

export default LiveScoring;
