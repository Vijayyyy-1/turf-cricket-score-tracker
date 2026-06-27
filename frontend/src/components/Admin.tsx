import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Match } from '../types/match';
import './Admin.css';

function Admin() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<'global' | 'match-specific'>('global');

    // Global rename states
    const [selectedPlayer, setSelectedPlayer] = useState('');
    const [newName, setNewName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Match-specific rename states
    const [selectedMatch, setSelectedMatch] = useState<string>('');
    const [selectedInnings, setSelectedInnings] = useState<number>(1);
    const [matchPlayers, setMatchPlayers] = useState<string[]>([]);
    const [selectedMatchPlayer, setSelectedMatchPlayer] = useState('');
    const [newMatchPlayerName, setNewMatchPlayerName] = useState('');
    const [searchMatchPlayers, setSearchMatchPlayers] = useState('');
    const [matchMessage, setMatchMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const { data: players = [], isLoading: loadingPlayers } = useQuery<string[]>({
        queryKey: ['playerNames'],
        queryFn: () => api.getAllPlayerNames(),
        staleTime: 30_000,
    });

    const { data: matches = [], isLoading: loadingMatches } = useQuery<Match[]>({
        queryKey: ['matches'],
        queryFn: () => api.getMatches(),
        enabled: activeTab === 'match-specific',
        staleTime: 30_000,
        onSuccess: (data: Match[]) => {
            if (data.length > 0 && !selectedMatch) {
                setSelectedMatch(data[0]._id);
                computeMatchPlayers(data[0], 1);
            }
        },
    } as any);

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const renameMutation = useMutation({
        mutationFn: ({ oldName, newName }: { oldName: string; newName: string }) =>
            api.renamePlayer(oldName, newName),
        onSuccess: (result, { oldName, newName: n }) => {
            showMessage('success', `Successfully renamed "${oldName}" to "${n}"! Updated ${result.matchesAffected} matches.`);
            setSelectedPlayer('');
            setNewName('');
            setSearchTerm('');
            queryClient.invalidateQueries({ queryKey: ['playerNames'] });
            queryClient.invalidateQueries({ queryKey: ['players'] });
        },
        onError: () => showMessage('error', 'Failed to rename player. Please try again.'),
    });

    const deleteMutation = useMutation({
        mutationFn: (playerName: string) => api.deletePlayer(playerName),
        onSuccess: (result, playerName) => {
            showMessage('success', `Successfully deleted "${playerName}" from ${result.matchesAffected} matches.`);
            setSelectedPlayer('');
            setNewName('');
            setSearchTerm('');
            queryClient.invalidateQueries({ queryKey: ['playerNames'] });
            queryClient.invalidateQueries({ queryKey: ['players'] });
        },
        onError: () => showMessage('error', 'Failed to delete player. Please try again.'),
    });

    const renameInMatchMutation = useMutation({
        mutationFn: ({ matchId, oldName, newName, inningsNumber }: { matchId: string; oldName: string; newName: string; inningsNumber: number }) =>
            api.renamePlayerInMatch(matchId, oldName, newName, inningsNumber),
        onSuccess: (_, { oldName, newName: n }) => {
            setMatchMessage({ type: 'success', text: `Successfully renamed "${oldName}" to "${n}" in this match` });
            queryClient.invalidateQueries({ queryKey: ['matches'] });
            queryClient.invalidateQueries({ queryKey: ['players'] });
            setSelectedMatchPlayer('');
            setNewMatchPlayerName('');
        },
        onError: () => setMatchMessage({ type: 'error', text: 'Failed to rename player. Please try again.' }),
    });

    const loading = renameMutation.isPending || deleteMutation.isPending || renameInMatchMutation.isPending;

    const computeMatchPlayers = (match: Match, inningsNum: number) => {
        const innings = match.innings[inningsNum - 1];
        if (!innings) return;
        const playerNames = new Set<string>();
        innings.playerStats?.forEach(p => { if (p.name) playerNames.add(p.name); });
        innings.bowlerStats?.forEach(b => { if (b.name) playerNames.add(b.name); });
        if (innings.striker) playerNames.add(innings.striker);
        if (innings.nonStriker) playerNames.add(innings.nonStriker);
        if (innings.currentBowler) playerNames.add(innings.currentBowler);
        setMatchPlayers(Array.from(playerNames).sort());
        setSelectedMatchPlayer('');
        setNewMatchPlayerName('');
    };

    const handleMatchSelect = (matchId: string) => {
        setSelectedMatch(matchId);
        const match = matches.find(m => m._id === matchId);
        if (match) computeMatchPlayers(match, selectedInnings);
    };

    const handleInningsSelect = (inningsNum: number) => {
        setSelectedInnings(inningsNum);
        const match = matches.find(m => m._id === selectedMatch);
        if (match) computeMatchPlayers(match, inningsNum);
    };

    const handleMatchPlayerSelect = (playerName: string) => {
        setSelectedMatchPlayer(playerName);
        setNewMatchPlayerName(playerName);
    };

    const handleRename = () => {
        if (!selectedPlayer) return showMessage('error', 'Please select a player to rename');
        if (!newName.trim()) return showMessage('error', 'Please enter a new name');
        if (selectedPlayer === newName.trim()) return showMessage('error', 'New name must be different from the old name');
        if (!window.confirm(`Are you sure you want to rename "${selectedPlayer}" to "${newName.trim()}"?\n\nThis will update the player name across ALL matches.`)) return;
        renameMutation.mutate({ oldName: selectedPlayer, newName: newName.trim() });
    };

    const handlePlayerSelect = (playerName: string) => {
        setSelectedPlayer(playerName);
        setNewName(playerName);
    };

    const handleDelete = () => {
        if (!selectedPlayer) return showMessage('error', 'Please select a player to delete');
        if (!window.confirm(`⚠️ WARNING: Are you sure you want to DELETE "${selectedPlayer}"?\n\nThis will:\n- Remove the player from ALL matches\n- Delete all their batting and bowling statistics\n- Mark their ball-by-ball records as "Deleted Player"\n\nThis action CANNOT be undone!`)) return;
        if (!window.confirm(`Final confirmation: Are you absolutely sure you want to delete "${selectedPlayer}"?`)) return;
        deleteMutation.mutate(selectedPlayer);
    };

    const handleRenameInMatch = () => {
        if (!selectedMatch || !selectedMatchPlayer || !newMatchPlayerName.trim()) {
            return setMatchMessage({ type: 'error', text: 'Please select a player and enter a new name' });
        }
        if (selectedMatchPlayer === newMatchPlayerName.trim()) {
            return setMatchMessage({ type: 'error', text: 'New name must be different from the old name' });
        }
        const match = matches.find(m => m._id === selectedMatch);
        const teamInfo = match ? match.teams?.join(' vs ') : 'Unknown Match';
        if (!window.confirm(`Rename "${selectedMatchPlayer}" to "${newMatchPlayerName.trim()}" in:\n\n"${teamInfo}"\nInnings ${selectedInnings}?\n\nThis change will ONLY affect this match.`)) return;
        renameInMatchMutation.mutate({ matchId: selectedMatch, oldName: selectedMatchPlayer, newName: newMatchPlayerName.trim(), inningsNumber: selectedInnings });
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
                        onClick={() => setActiveTab('match-specific')}
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
                    <button onClick={() => queryClient.invalidateQueries({ queryKey: ['playerNames'] })} className="action-btn" disabled={loadingPlayers}>
                        <span className="action-icon">🔄</span>
                        Refresh Players
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Admin;
