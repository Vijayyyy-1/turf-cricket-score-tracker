const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = {
    // Create a new match
    createMatch: async (matchData: any) => {
        const response = await fetch(`${API_BASE_URL}/matches`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(matchData),
        });
        if (!response.ok) throw new Error('Failed to create match');
        return response.json();
    },

    // Get all matches
    getMatches: async () => {
        const response = await fetch(`${API_BASE_URL}/matches`);
        if (!response.ok) throw new Error('Failed to fetch matches');
        return response.json();
    },

    // Get a specific match
    getMatch: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/matches/${id}`);
        if (!response.ok) throw new Error('Failed to fetch match');
        return response.json();
    },

    // Record a ball
    recordBall: async (matchId: string, ballData: any) => {
        const response = await fetch(`${API_BASE_URL}/matches/${matchId}/ball`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(ballData),
        });
        if (!response.ok) throw new Error('Failed to record ball');
        return response.json();
    },

    // Undo last ball
    undoLastBall: async (matchId: string) => {
        const response = await fetch(`${API_BASE_URL}/matches/${matchId}/undo`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Failed to undo ball');
        return response.json();
    },

    // Delete a match
    deleteMatch: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/matches/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete match');
        return response.json();
    },

    // Get all players with statistics
    getAllPlayers: async () => {
        const response = await fetch(`${API_BASE_URL}/players`);
        if (!response.ok) throw new Error('Failed to fetch players');
        return response.json();
    },

    // Get individual player statistics
    getPlayer: async (name: string) => {
        const response = await fetch(`${API_BASE_URL}/players/${encodeURIComponent(name)}`);
        if (!response.ok) throw new Error('Failed to fetch player');
        return response.json();
    },

    // Admin: Get all unique player names
    getAllPlayerNames: async () => {
        const response = await fetch(`${API_BASE_URL}/admin/players`);
        if (!response.ok) throw new Error('Failed to fetch player names');
        return response.json();
    },

    // Admin: Rename a player across all matches
    renamePlayer: async (oldName: string, newName: string) => {
        const response = await fetch(`${API_BASE_URL}/admin/rename-player`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ oldName, newName }),
        });
        if (!response.ok) throw new Error('Failed to rename player');
        return response.json();
    },

    // Admin: Delete a player from all matches
    deletePlayer: async (playerName: string) => {
        const response = await fetch(`${API_BASE_URL}/admin/delete-player`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ playerName }),
        });
        if (!response.ok) throw new Error('Failed to delete player');
        return response.json();
    },
};
