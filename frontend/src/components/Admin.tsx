import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import './Admin.css';

function Admin() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [players, setPlayers] = useState<string[]>([]);
    const [selectedPlayer, setSelectedPlayer] = useState('');
    const [newName, setNewName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

    const filteredPlayers = players.filter(player =>
        player.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="admin-container">
            <div className="admin-content">
                <div className="admin-header">
                    <button onClick={() => navigate('/')} className="back-btn">
                        <span className="back-icon">←</span> Back to Home
                    </button>
                    <h1>Admin Panel</h1>
                    <p className="subtitle">Manage player names across all matches</p>
                </div>

                {message && (
                    <div className={`message-banner ${message.type}`}>
                        <span className="message-icon">
                            {message.type === 'success' ? '✓' : '⚠️'}
                        </span>
                        <span>{message.text}</span>
                        <button onClick={() => setMessage(null)} className="message-close">×</button>
                    </div>
                )}

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
