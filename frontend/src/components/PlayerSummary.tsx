import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import './PlayerSummary.css';

interface BattingStats {
    matches: number;
    innings: number;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    notOuts: number;
    highScore: number;
    average: string;
    strikeRate: string;
}

interface BowlingStats {
    matches: number;
    innings: number;
    overs: number;
    balls: number;
    runs: number;
    wickets: number;
    average: string;
    economy: string;
    bestBowlingStr: string;
}

interface Player {
    name: string;
    totalMatches?: number;
    batting: BattingStats;
    bowling: BowlingStats;
}

interface MatchPerformance {
    matchId: string;
    date: string;
    teams: string[];
    status: string;
    result?: {
        winner: string;
        margin: string;
        isDraw: boolean;
    };
    batting?: {
        runs: number;
        balls: number;
        fours: number;
        sixes: number;
        isOut: boolean;
    };
    bowling?: {
        overs: number;
        balls: number;
        runs: number;
        wickets: number;
    };
}

interface PlayerDetail extends Player {
    matchHistory: MatchPerformance[];
}

function PlayerSummary() {
    const { name } = useParams<{ name?: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerDetail | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'runs' | 'wickets' | 'matches'>('runs');

    useEffect(() => {
        loadPlayers();
    }, []);

    useEffect(() => {
        if (name) {
            loadPlayerDetails(name);
        }
    }, [name]);

    const loadPlayers = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.getAllPlayers();
            setPlayers(data);
        } catch (err) {
            console.error('Error loading players:', err);
            setError('Failed to load player statistics');
        } finally {
            setLoading(false);
        }
    };

    const loadPlayerDetails = async (playerName: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.getPlayer(playerName);
            setSelectedPlayer(data);
        } catch (err) {
            console.error('Error loading player details:', err);
            setError('Failed to load player details');
        } finally {
            setLoading(false);
        }
    };

    const handlePlayerClick = (playerName: string) => {
        navigate(`/playerSummary/${encodeURIComponent(playerName)}`);
    };

    const handleBackToList = () => {
        navigate('/playerSummary');
        setSelectedPlayer(null);
    };

    const filteredPlayers = players.filter(player =>
        player.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedPlayers = [...filteredPlayers].sort((a, b) => {
        switch (sortBy) {
            case 'runs':
                return b.batting.runs - a.batting.runs;
            case 'wickets':
                return b.bowling.wickets - a.bowling.wickets;
            case 'matches':
                return (b.totalMatches || 0) - (a.totalMatches || 0);
            default:
                return 0;
        }
    });

    if (loading) {
        return (
            <div className="player-summary-container">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Loading player statistics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="player-summary-container">
                <div className="error-state">
                    <span className="error-icon">⚠️</span>
                    <p>{error}</p>
                    <button onClick={loadPlayers} className="retry-btn">Retry</button>
                </div>
            </div>
        );
    }

    if (selectedPlayer) {
        return (
            <div className="player-summary-container">
                <div className="player-detail-view">
                    <button onClick={handleBackToList} className="back-btn">
                        <span className="back-icon">←</span> Back to Players
                    </button>

                    <div className="player-header">
                        <div className="player-avatar">
                            {selectedPlayer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="player-info">
                            <h1>{selectedPlayer.name}</h1>
                            <p className="player-subtitle">Complete Career Statistics</p>
                        </div>
                    </div>

                    <div className="stats-grid">
                        <div className="stat-card batting-card">
                            <h2>
                                <span className="stat-icon">🏏</span>
                                Batting Statistics
                            </h2>
                            <div className="stat-rows">
                                <div className="stat-row">
                                    <span className="stat-label">Matches</span>
                                    <span className="stat-value">{selectedPlayer.batting.matches}</span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Innings</span>
                                    <span className="stat-value">{selectedPlayer.batting.innings}</span>
                                </div>
                                <div className="stat-row highlight">
                                    <span className="stat-label">Total Runs</span>
                                    <span className="stat-value">{selectedPlayer.batting.runs}</span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Balls Faced</span>
                                    <span className="stat-value">{selectedPlayer.batting.balls}</span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Average</span>
                                    <span className="stat-value">{selectedPlayer.batting.average}</span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Strike Rate</span>
                                    <span className="stat-value">{selectedPlayer.batting.strikeRate}</span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">High Score</span>
                                    <span className="stat-value">{selectedPlayer.batting.highScore}</span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Fours</span>
                                    <span className="stat-value">{selectedPlayer.batting.fours}</span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Sixes</span>
                                    <span className="stat-value">{selectedPlayer.batting.sixes}</span>
                                </div>
                            </div>
                        </div>

                        <div className="stat-card bowling-card">
                            <h2>
                                <span className="stat-icon">⚾</span>
                                Bowling Statistics
                            </h2>
                            <div className="stat-rows">
                                <div className="stat-row">
                                    <span className="stat-label">Matches</span>
                                    <span className="stat-value">{selectedPlayer.bowling.matches}</span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Innings</span>
                                    <span className="stat-value">{selectedPlayer.bowling.innings}</span>
                                </div>
                                <div className="stat-row highlight">
                                    <span className="stat-label">Wickets</span>
                                    <span className="stat-value">{selectedPlayer.bowling.wickets}</span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Runs Conceded</span>
                                    <span className="stat-value">{selectedPlayer.bowling.runs}</span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Overs</span>
                                    <span className="stat-value">{selectedPlayer.bowling.overs}.{selectedPlayer.bowling.balls}</span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Average</span>
                                    <span className="stat-value">{selectedPlayer.bowling.average}</span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Economy</span>
                                    <span className="stat-value">{selectedPlayer.bowling.economy}</span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Best Bowling</span>
                                    <span className="stat-value">{selectedPlayer.bowling.bestBowlingStr}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="match-history-section">
                        <h2>Match History</h2>
                        {selectedPlayer.matchHistory.length === 0 ? (
                            <p className="no-matches">No match history available</p>
                        ) : (
                            <div className="match-history-list">
                                {selectedPlayer.matchHistory.map((match, index) => (
                                    <div key={index} className="match-card">
                                        <div className="match-header">
                                            <div className="match-teams">
                                                <span className="team">{match.teams[0]}</span>
                                                <span className="vs">vs</span>
                                                <span className="team">{match.teams[1]}</span>
                                            </div>
                                            <div className="match-date">
                                                {new Date(match.date).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </div>
                                        </div>

                                        {match.result && (
                                            <div className="match-result">
                                                {match.result.isDraw ? (
                                                    <span className="result-text">Match Tied</span>
                                                ) : (
                                                    <span className="result-text">
                                                        {match.result.winner} won by {match.result.margin}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <div className="match-performance">
                                            {match.batting && (
                                                <div className="performance-section">
                                                    <h4>Batting</h4>
                                                    <p className="performance-stats">
                                                        {match.batting.runs} ({match.batting.balls})
                                                        {match.batting.fours > 0 && ` • ${match.batting.fours} fours`}
                                                        {match.batting.sixes > 0 && ` • ${match.batting.sixes} sixes`}
                                                        {match.batting.isOut && <span className="out-badge">Out</span>}
                                                        {!match.batting.isOut && match.batting.balls > 0 && <span className="not-out-badge">Not Out</span>}
                                                    </p>
                                                </div>
                                            )}

                                            {match.bowling && (
                                                <div className="performance-section">
                                                    <h4>Bowling</h4>
                                                    <p className="performance-stats">
                                                        {match.bowling.wickets}/{match.bowling.runs}
                                                        ({match.bowling.overs}.{match.bowling.balls} overs)
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="player-summary-container">
            <div className="players-list-view">
                <div className="page-header">
                    <div className="header-content">
                        <h1>Player Statistics</h1>
                        <p className="subtitle">Complete career records for all players</p>
                    </div>
                    {/* <button onClick={() => navigate('/')} className="home-btn">
                        <span className="home-icon">🏠</span> Home
                    </button> */}
                </div>

                {/* Top Performers Section */}
                {sortedPlayers.length > 0 && (
                    <div className="top-performers-section">
                        {/* Top 3 Batsmen */}
                        <div className="leaderboard-card">
                            <div className="leaderboard-header">
                                <span className="leaderboard-icon">🏏</span>
                                <h2>Top Batsmen</h2>
                            </div>
                            <div className="podium">
                                {[...players]
                                    .sort((a, b) => b.batting.runs - a.batting.runs)
                                    .slice(0, 3)
                                    .map((player, index) => {
                                        const position = index + 1;
                                        const medals = ['🥇', '🥈', '🥉'];
                                        const podiumHeights = ['podium-1st', 'podium-2nd', 'podium-3rd'];

                                        return (
                                            <div
                                                key={player.name}
                                                className={`podium-item ${podiumHeights[index]}`}
                                                onClick={() => handlePlayerClick(player.name)}
                                            >
                                                <div className="medal">{medals[index]}</div>
                                                <div className="player-avatar-podium">
                                                    {player.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="player-info-podium">
                                                    <div className="player-name-podium">{player.name}</div>
                                                    <div className="player-stat-podium">
                                                        <span className="stat-value-large">{player.batting.runs}</span>
                                                        <span className="stat-label-small">runs</span>
                                                    </div>
                                                    <div className="player-substats">
                                                        <span>Avg: {player.batting.average}</span>
                                                        <span>SR: {player.batting.strikeRate}</span>
                                                    </div>
                                                </div>
                                                <div className="rank-badge">#{position}</div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>

                        {/* Top 3 Bowlers */}
                        <div className="leaderboard-card">
                            <div className="leaderboard-header">
                                <span className="leaderboard-icon">⚾</span>
                                <h2>Top Bowlers</h2>
                            </div>
                            <div className="podium">
                                {[...players]
                                    .sort((a, b) => b.bowling.wickets - a.bowling.wickets)
                                    .slice(0, 3)
                                    .map((player, index) => {
                                        const position = index + 1;
                                        const medals = ['🥇', '🥈', '🥉'];
                                        const podiumHeights = ['podium-1st', 'podium-2nd', 'podium-3rd'];

                                        return (
                                            <div
                                                key={player.name}
                                                className={`podium-item ${podiumHeights[index]}`}
                                                onClick={() => handlePlayerClick(player.name)}
                                            >
                                                <div className="medal">{medals[index]}</div>
                                                <div className="player-avatar-podium">
                                                    {player.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="player-info-podium">
                                                    <div className="player-name-podium">{player.name}</div>
                                                    <div className="player-stat-podium">
                                                        <span className="stat-value-large">{player.bowling.wickets}</span>
                                                        <span className="stat-label-small">wickets</span>
                                                    </div>
                                                    <div className="player-substats">
                                                        <span>Avg: {player.bowling.average}</span>
                                                        <span>Econ: {player.bowling.economy}</span>
                                                    </div>
                                                </div>
                                                <div className="rank-badge">#{position}</div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    </div>
                )}

                <div className="controls-bar">
                    <div className="search-box">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Search players..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="sort-controls">
                        <label>Sort by:</label>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                            <option value="runs">Most Runs</option>
                            <option value="wickets">Most Wickets</option>
                            <option value="matches">Most Matches</option>
                        </select>
                    </div>
                </div>

                {sortedPlayers.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">📊</span>
                        <p>No players found</p>
                        <p className="empty-subtitle">Player statistics will appear here once matches are played</p>
                    </div>
                ) : (
                    <div className="players-table-container">
                        <table className="players-table">
                            <thead>
                                <tr>
                                    <th className="rank-col">#</th>
                                    <th className="name-col">Player Name</th>
                                    <th>Matches</th>
                                    <th>Runs</th>
                                    <th>Avg</th>
                                    <th>SR</th>
                                    <th>HS</th>
                                    <th>4s/6s</th>
                                    <th>Wickets</th>
                                    <th>Econ</th>
                                    <th>Best</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedPlayers.map((player, index) => (
                                    <tr
                                        key={player.name}
                                        onClick={() => handlePlayerClick(player.name)}
                                        className="player-row"
                                    >
                                        <td className="rank-col">{index + 1}</td>
                                        <td className="name-col">
                                            <div className="player-name-cell">
                                                <div className="player-avatar-small">
                                                    {player.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span>{player.name}</span>
                                            </div>
                                        </td>
                                        <td>{player.totalMatches || 0}</td>
                                        <td className="highlight-stat">{player.batting.runs}</td>
                                        <td>{player.batting.average}</td>
                                        <td>{player.batting.strikeRate}</td>
                                        <td>{player.batting.highScore}</td>
                                        <td>{player.batting.fours}/{player.batting.sixes}</td>
                                        <td className="highlight-stat">{player.bowling.wickets}</td>
                                        <td>{player.bowling.economy}</td>
                                        <td>{player.bowling.bestBowlingStr}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PlayerSummary;
