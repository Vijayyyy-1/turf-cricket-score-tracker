import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Match } from '../types/match';
import './Admin.css';

function Admin() {
    const navigate = useNavigate();
    
    // Tab state
    const [activeTab, setActiveTab] = useState<'global' | 'match-specific'>('global');
    
    // Global rename states
    const [loading, setLoading] = useState(false);
    const [players, setPlayers] = useState<string[]>([]);
    const [selectedPlayer, setSelectedPlayer] = useState('');
    const [newName, setNewName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Match-specific rename states
    const [matches, setMatches] = useState<Match[]>([]);
    const [loadingMatches, setLoadingMatches] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<string>('');
    const [selectedInnings, setSelectedInnings] = useState<number>(1);
    const [matchPlayers, setMatchPlayers] = useState<string[]>([]);
    const [selectedMatchPlayer, setSelectedMatchPlayer] = useState('');
    const [newMatchPlayerName, setNewMatchPlayerName] = useState('');
    const [searchMatchPlayers, setSearchMatchPlayers] = useState('');
    const [matchMessage, setMatchMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        loadPlayers();
    }, []);

    const loadPlayers = async () => {
        setLoading(true);
        try {
            const data = await api.getAllPlayerNames();
            setPlayers(data);
        } catch (error) {
            console.error('Error loading players:', error);
            showMessage('error', 'Failed to load players');
        } finally {
            setLoading(false);
        }
    };

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const handleRename = async () => {
        if (!selectedPlayer) {
            showMessage('error', 'Please select a player to rename');
            return;
        }

        if (!newName.trim()) {
            showMessage('error', 'Please enter a new name');
            return;
        }

        if (selectedPlayer === newName.trim()) {
            showMessage('error', 'New name must be different from the old name');
            return;
        }

        const confirmRename = window.confirm(
            `Are you sure you want to rename "${selectedPlayer}" to "${newName.trim()}"?\n\nThis will update the player name across ALL matches.`
        );

        if (!confirmRename) return;

        setLoading(true);
        try {
            const result = await api.renamePlayer(selectedPlayer, newName.trim());
            showMessage(
                'success',
                `Successfully renamed "${selectedPlayer}" to "${newName.trim()}"! Updated ${result.matchesAffected} matches.`
            );

            // Reset form
            setSelectedPlayer('');
            setNewName('');
            setSearchTerm('');

            // Reload players list
            await loadPlayers();
        } catch (error) {
            console.error('Error renaming player:', error);
            showMessage('error', 'Failed to rename player. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePlayerSelect = (playerName: string) => {
        setSelectedPlayer(playerName);
        setNewName(playerName); // Pre-fill with current name for easy editing
    };

    const handleDelete = async () => {
        if (!selectedPlayer) {
            showMessage('error', 'Please select a player to delete');
            return;
        }

        const confirmDelete = window.confirm(
            `⚠️ WARNING: Are you sure you want to DELETE "${selectedPlayer}"?\n\nThis will:\n- Remove the player from ALL matches\n- Delete all their batting and bowling statistics\n- Mark their ball-by-ball records as "Deleted Player"\n\nThis action CANNOT be undone!`
        );

        if (!confirmDelete) return;

        // Double confirmation for safety
        const doubleConfirm = window.confirm(
            `Final confirmation: Type the player name to confirm deletion.\n\nAre you absolutely sure you want to delete "${selectedPlayer}"?`
        );

        if (!doubleConfirm) return;

        setLoading(true);
        try {
            const result = await api.deletePlayer(selectedPlayer);
            showMessage(
                'success',
                `Successfully deleted "${selectedPlayer}" from ${result.matchesAffected} matches.`
            );

            // Reset form
            setSelectedPlayer('');
            setNewName('');
            setSearchTerm('');

            // Reload players list
            await loadPlayers();
        } catch (error) {
            console.error('Error deleting player:', error);
            showMessage('error', 'Failed to delete player. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Match-specific player renaming functions
    const loadMatches = async () => {
        setLoadingMatches(true);
        try {
            const data = await api.getMatches();
            setMatches(data);
            if (data.length > 0) {
                setSelectedMatch(data[0]._id);
                loadMatchPlayers(data[0]._id, 1);
            }
        } catch (error) {
            console.error('Error loading matches:', error);
            setMatchMessage({ type: 'error', text: 'Failed to load matches' });
        } finally {
            setLoadingMatches(false);
        }
    };

    const loadMatchPlayers = (matchId: string, inningsNum: number) => {
        const match = matches.find(m => m._id === matchId);
        if (match && match.innings[inningsNum - 1]) {
            const innings = match.innings[inningsNum - 1];
            const playerNames = new Set<string>();
            
            if (innings.playerStats) {
                innings.playerStats.forEach(p => {
                    if (p.name) playerNames.add(p.name);
                });
            }
            if (innings.bowlerStats) {
                innings.bowlerStats.forEach(b => {
                    if (b.name) playerNames.add(b.name);
                });
            }
            if (innings.striker) playerNames.add(innings.striker);
            if (innings.nonStriker) playerNames.add(innings.nonStriker);
            if (innings.currentBowler) playerNames.add(innings.currentBowler);
            
            const sortedPlayers = Array.from(playerNames).sort();
            setMatchPlayers(sortedPlayers);
            setSelectedMatchPlayer('');
            setNewMatchPlayerName('');
        }
    };

    const handleMatchSelect = (matchId: string) => {
        setSelectedMatch(matchId);
        loadMatchPlayers(matchId, selectedInnings);
    };

    const handleInningsSelect = (inningsNum: number) => {
        setSelectedInnings(inningsNum);
        loadMatchPlayers(selectedMatch, inningsNum);
    };

    const handleMatchPlayerSelect = (playerName: string) => {
        setSelectedMatchPlayer(playerName);
        setNewMatchPlayerName(playerName);
    };

    const handleRenameInMatch = async () => {
        if (!selectedMatch || !selectedMatchPlayer || !newMatchPlayerName.trim()) {
            setMatchMessage({ type: 'error', text: 'Please select a player and enter a new name' });
            return;
        }

        if (selectedMatchPlayer === newMatchPlayerName.trim()) {
            setMatchMessage({ type: 'error', text: 'New name must be different from the old name' });
            return;
        }

        const match = matches.find(m => m._id === selectedMatch);
        const teamInfo = match ? `${match.teams?.join(' vs ')}` : 'Unknown Match';

        const confirmRename = window.confirm(
            `Rename "${selectedMatchPlayer}" to "${newMatchPlayerName.trim()}" in:\n\n"${teamInfo}"\nInnings ${selectedInnings}?\n\nThis change will ONLY affect this match.`
        );

        if (!confirmRename) return;

        setLoading(true);
        try {
            await api.renamePlayerInMatch(selectedMatch, selectedMatchPlayer, newMatchPlayerName.trim(), selectedInnings);
            setMatchMessage({
                type: 'success',
                text: `Successfully renamed "${selectedMatchPlayer}" to "${newMatchPlayerName.trim()}" in this match`
            });

            // Reload players for this match
            await loadMatchPlayers(selectedMatch, selectedInnings);
            setSelectedMatchPlayer('');
            setNewMatchPlayerName('');
        } catch (error) {
            console.error('Error renaming player in match:', error);
            setMatchMessage({ type: 'error', text: 'Failed to rename player. Please try again.' });
        } finally {
            setLoading(false);
        }
    };



    const filteredPlayers = players.filter(player =>
        player.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredMatchPlayers = matchPlayers.filter(player =>
        player.toLowerCase().includes(searchMatchPlayers.toLowerCase())
    );

    const getMatchDisplayInfo = (match: Match) => {
        if (!match) return { team1: 'Team 1', team2: 'Team 2', date: 'Unknown', status: 'unknown' };
        const teams = match.teams || ['Team 1', 'Team 2'];
        return {
            team1: teams[0] || 'Team 1',
            team2: teams[1] || 'Team 2',
            date: new Date(match.createdAt || '').toLocaleDateString(),
            status: match.status || 'unknown'
        };
    };

    return (
        <div className="admin-container">
            <div className="admin-content">
                <div className="admin-header">
                    <button onClick={() => navigate('/')} className="back-btn">
                        <span className="back-icon">←</span> Back to Home
                    </button>
                    <h1>Admin Panel</h1>
                    <p className="subtitle">Manage player names and matches</p>
                </div>

                {/* Tabs */}
                <div className="admin-tabs">
                    <button 
                        className={`tab-btn ${activeTab === 'global' ? 'active' : ''}`}
                        onClick={() => setActiveTab('global')}
                    >
                        <span className="tab-icon">👥</span>
                        Global Player Rename
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'match-specific' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('match-specific');
                            if (matches.length === 0) {
                                loadMatches();
                            }
                        }}
                    >
                        <span className="tab-icon">📋</span>
                        Match-Specific Rename
                    </button>
                </div>

                {message && activeTab === 'global' && (
                    <div className={`message-banner ${message.type}`}>
                        <span className="message-icon">
                            {message.type === 'success' ? '✓' : '⚠️'}
                        </span>
                        <span>{message.text}</span>
                        <button onClick={() => setMessage(null)} className="message-close">×</button>
                    </div>
                )}

                {matchMessage && activeTab === 'match-specific' && (
                    <div className={`message-banner ${matchMessage.type}`}>
                        <span className="message-icon">
                            {matchMessage.type === 'success' ? '✓' : '⚠️'}
                        </span>
                        <span>{matchMessage.text}</span>
                        <button onClick={() => setMatchMessage(null)} className="message-close">×</button>
                    </div>
                )}

                {/* Global Rename Tab */}
                {activeTab === 'global' && (
                    <div className="admin-grid">
                        {/* Players List */}
                    <div className="admin-card players-list-card">
                        <h2>Select Player</h2>

                        <div className="search-box">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                placeholder="Search players..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {loading && players.length === 0 ? (
                            <div className="loading-state">
                                <div className="loading-spinner"></div>
                                <p>Loading players...</p>
                            </div>
                        ) : filteredPlayers.length === 0 ? (
                            <div className="empty-state">
                                <span className="empty-icon">👤</span>
                                <p>No players found</p>
                            </div>
                        ) : (
                            <div className="players-list">
                                {filteredPlayers.map((player) => (
                                    <button
                                        key={player}
                                        onClick={() => handlePlayerSelect(player)}
                                        className={`player-item ${selectedPlayer === player ? 'selected' : ''}`}
                                    >
                                        <div className="player-avatar">
                                            {player.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="player-name">{player}</span>
                                        {selectedPlayer === player && (
                                            <span className="selected-badge">✓</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="players-count">
                            Total Players: {players.length}
                        </div>
                    </div>

                    {/* Rename/Delete Form */}
                    <div className="admin-card rename-card">
                        <h2>Manage Player</h2>

                        <div className="rename-form">
                            <div className="form-group">
                                <label>Current Name</label>
                                <input
                                    type="text"
                                    value={selectedPlayer}
                                    disabled
                                    placeholder="Select a player from the list"
                                    className="input-disabled"
                                />
                            </div>

                            <div className="rename-arrow">↓</div>

                            <div className="form-group">
                                <label>New Name</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Enter new name"
                                    disabled={!selectedPlayer}
                                    className={!selectedPlayer ? 'input-disabled' : ''}
                                />
                            </div>

                            <button
                                onClick={handleRename}
                                disabled={loading || !selectedPlayer || !newName.trim()}
                                className="btn-rename"
                            >
                                {loading ? (
                                    <>
                                        <div className="btn-spinner"></div>
                                        Renaming...
                                    </>
                                ) : (
                                    <>
                                        <span className="btn-icon">✏️</span>
                                        Rename Player
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleDelete}
                                disabled={loading || !selectedPlayer}
                                className="btn-delete"
                            >
                                {loading ? (
                                    <>
                                        <div className="btn-spinner"></div>
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <span className="btn-icon">🗑️</span>
                                        Delete Player
                                    </>
                                )}
                            </button>

                            <div className="warning-box">
                                <span className="warning-icon">⚠️</span>
                                <div className="warning-content">
                                    <strong>Warning:</strong> This action will rename the player across ALL matches,
                                    including batting stats, bowling stats, and ball-by-ball records.
                                    This cannot be undone automatically.
                                </div>
                            </div>
                        </div>
                    </div>
                    </div>
                )}

                {/* Match-Specific Rename Tab */}
                {activeTab === 'match-specific' && (
                    <div className="admin-grid match-specific-grid">
                        {/* Match Selector */}
                        <div className="admin-card match-selector-card">
                            <h2>Select Match</h2>

                            {loadingMatches ? (
                                <div className="loading-state">
                                    <div className="loading-spinner"></div>
                                    <p>Loading matches...</p>
                                </div>
                            ) : matches.length === 0 ? (
                                <div className="empty-state">
                                    <span className="empty-icon">📋</span>
                                    <p>No matches found</p>
                                </div>
                            ) : (
                                <>
                                    <div className="match-list">
                                        {matches.map((match) => {
                                            const matchInfo = getMatchDisplayInfo(match);
                                            return (
                                                <button
                                                    key={match._id}
                                                    onClick={() => handleMatchSelect(match._id)}
                                                    className={`match-item ${selectedMatch === match._id ? 'selected' : ''}`}
                                                >
                                                    <div className="match-info">
                                                        <div className="match-teams">
                                                            <strong>{matchInfo.team1}</strong>
                                                            {' vs '}
                                                            <strong>{matchInfo.team2}</strong>
                                                        </div>
                                                        <div className="match-date">
                                                            📅 {matchInfo.date}
                                                        </div>
                                                        <div className="match-status">
                                                            <span className={`status-badge ${matchInfo.status.toLowerCase()}`}>
                                                                {matchInfo.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {selectedMatch === match._id && (
                                                        <span className="selected-badge">✓</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {selectedMatch && (
                                        <>
                                            <div className="innings-selector">
                                                <label>Select Innings:</label>
                                                <div className="innings-buttons">
                                                    <button
                                                        onClick={() => handleInningsSelect(1)}
                                                        className={`innings-btn ${selectedInnings === 1 ? 'active' : ''}`}
                                                    >
                                                        <span className="innings-icon">🏏</span>
                                                        Innings 1
                                                    </button>
                                                    <button
                                                        onClick={() => handleInningsSelect(2)}
                                                        className={`innings-btn ${selectedInnings === 2 ? 'active' : ''}`}
                                                    >
                                                        <span className="innings-icon">🏏</span>
                                                        Innings 2
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Player Manager for Match */}
                        {selectedMatch && (
                            <div className="admin-card match-player-card">
                                <h2>Manage Players in Match</h2>

                                <div className="search-box">
                                    <span className="search-icon">🔍</span>
                                    <input
                                        type="text"
                                        placeholder="Search players in this match..."
                                        value={searchMatchPlayers}
                                        onChange={(e) => setSearchMatchPlayers(e.target.value)}
                                    />
                                </div>

                                {matchPlayers.length === 0 ? (
                                    <div className="empty-state">
                                        <span className="empty-icon">👤</span>
                                        <p>No players in selected innings</p>
                                    </div>
                                ) : (
                                    <div className="match-players-list">
                                        {filteredMatchPlayers.map((player) => (
                                            <button
                                                key={player}
                                                onClick={() => handleMatchPlayerSelect(player)}
                                                className={`player-item ${selectedMatchPlayer === player ? 'selected' : ''}`}
                                            >
                                                <div className="player-avatar">
                                                    {player.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="player-name">{player}</span>
                                                {selectedMatchPlayer === player && (
                                                    <span className="selected-badge">✓</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="players-count">
                                    Total Players: {matchPlayers.length}
                                </div>
                            </div>
                        )}

                        {/* Rename Form for Match */}
                        {selectedMatch && (
                            <div className="admin-card match-rename-form-card">
                                <h2>Rename Player in Match</h2>

                                <div className="match-rename-form">
                                    <div className="form-group">
                                        <label>Current Name (Innings {selectedInnings})</label>
                                        <input
                                            type="text"
                                            value={selectedMatchPlayer}
                                            disabled
                                            placeholder="Select a player from the list"
                                            className="input-disabled"
                                        />
                                    </div>

                                    <div className="rename-arrow">↓</div>

                                    <div className="form-group">
                                        <label>New Name</label>
                                        <input
                                            type="text"
                                            value={newMatchPlayerName}
                                            onChange={(e) => setNewMatchPlayerName(e.target.value)}
                                            placeholder="Enter new name"
                                            disabled={!selectedMatchPlayer}
                                            className={!selectedMatchPlayer ? 'input-disabled' : ''}
                                        />
                                    </div>

                                    <button
                                        onClick={handleRenameInMatch}
                                        disabled={loading || !selectedMatchPlayer || !newMatchPlayerName.trim()}
                                        className="btn-rename"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="btn-spinner"></div>
                                                Renaming...
                                            </>
                                        ) : (
                                            <>
                                                <span className="btn-icon">✏️</span>
                                                Rename in Match
                                            </>
                                        )}
                                    </button>

                                    <div className="info-box">
                                        <span className="info-icon">ℹ️</span>
                                        <div className="info-content">
                                            <strong>Info:</strong> This will rename the player only in this specific match and innings.
                                            The player's name in other matches will not be affected. This change updates all related
                                            records: batting stats, bowling stats, and ball-by-ball records.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Quick Actions */}
                <div className="quick-actions">
                    <button onClick={() => navigate('/playerSummary')} className="action-btn">
                        <span className="action-icon">📊</span>
                        View Player Statistics
                    </button>
                    <button onClick={loadPlayers} className="action-btn" disabled={loading}>
                        <span className="action-icon">🔄</span>
                        Refresh Players
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Admin;
