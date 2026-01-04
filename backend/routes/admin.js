import express from 'express';
import Match from '../models/Match.js';

const router = express.Router();

// Rename a player across all matches
router.post('/admin/rename-player', async (req, res) => {
    try {
        const { oldName, newName } = req.body;

        if (!oldName || !newName) {
            return res.status(400).json({ error: 'Both oldName and newName are required' });
        }

        if (oldName.trim() === newName.trim()) {
            return res.status(400).json({ error: 'Old name and new name cannot be the same' });
        }

        // Find all matches
        const matches = await Match.find();
        let updatedCount = 0;
        let matchesAffected = 0;

        for (const match of matches) {
            let matchModified = false;

            // Update each innings
            for (const innings of match.innings) {
                // Update striker
                if (innings.striker === oldName) {
                    innings.striker = newName;
                    matchModified = true;
                }

                // Update non-striker
                if (innings.nonStriker === oldName) {
                    innings.nonStriker = newName;
                    matchModified = true;
                }

                // Update current bowler
                if (innings.currentBowler === oldName) {
                    innings.currentBowler = newName;
                    matchModified = true;
                }

                // Update player stats
                if (innings.playerStats) {
                    for (const player of innings.playerStats) {
                        if (player.name === oldName) {
                            player.name = newName;
                            matchModified = true;
                            updatedCount++;
                        }
                    }
                }

                // Update bowler stats
                if (innings.bowlerStats) {
                    for (const bowler of innings.bowlerStats) {
                        if (bowler.name === oldName) {
                            bowler.name = newName;
                            matchModified = true;
                            updatedCount++;
                        }
                    }
                }

                // Update ball-by-ball records
                if (innings.ballByBall) {
                    for (const ball of innings.ballByBall) {
                        if (ball.batsmanName === oldName) {
                            ball.batsmanName = newName;
                            matchModified = true;
                        }
                        if (ball.bowlerName === oldName) {
                            ball.bowlerName = newName;
                            matchModified = true;
                        }
                    }
                }
            }

            // Save the match if it was modified
            if (matchModified) {
                match.markModified('innings');
                await match.save();
                matchesAffected++;
            }
        }

        res.json({
            success: true,
            message: `Successfully renamed "${oldName}" to "${newName}"`,
            matchesAffected,
            recordsUpdated: updatedCount
        });
    } catch (error) {
        console.error('Error renaming player:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete a player from all matches
router.post('/admin/delete-player', async (req, res) => {
    try {
        const { playerName } = req.body;

        if (!playerName) {
            return res.status(400).json({ error: 'Player name is required' });
        }

        // Find all matches
        const matches = await Match.find();
        let deletedCount = 0;
        let matchesAffected = 0;

        for (const match of matches) {
            let matchModified = false;

            // Update each innings
            for (const innings of match.innings) {
                // Clear striker/non-striker if they match
                if (innings.striker === playerName) {
                    innings.striker = undefined;
                    matchModified = true;
                }

                if (innings.nonStriker === playerName) {
                    innings.nonStriker = undefined;
                    matchModified = true;
                }

                // Clear current bowler if they match
                if (innings.currentBowler === playerName) {
                    innings.currentBowler = undefined;
                    matchModified = true;
                }

                // Remove from player stats
                if (innings.playerStats) {
                    const initialLength = innings.playerStats.length;
                    innings.playerStats = innings.playerStats.filter(p => p.name !== playerName);
                    if (innings.playerStats.length < initialLength) {
                        matchModified = true;
                        deletedCount++;
                    }
                }

                // Remove from bowler stats
                if (innings.bowlerStats) {
                    const initialLength = innings.bowlerStats.length;
                    innings.bowlerStats = innings.bowlerStats.filter(b => b.name !== playerName);
                    if (innings.bowlerStats.length < initialLength) {
                        matchModified = true;
                        deletedCount++;
                    }
                }

                // Remove from ball-by-ball records (set to null to preserve history structure)
                if (innings.ballByBall) {
                    for (const ball of innings.ballByBall) {
                        if (ball.batsmanName === playerName) {
                            ball.batsmanName = 'Deleted Player';
                            matchModified = true;
                        }
                        if (ball.bowlerName === playerName) {
                            ball.bowlerName = 'Deleted Player';
                            matchModified = true;
                        }
                    }
                }
            }

            // Save the match if it was modified
            if (matchModified) {
                match.markModified('innings');
                await match.save();
                matchesAffected++;
            }
        }

        res.json({
            success: true,
            message: `Successfully deleted "${playerName}" from all matches`,
            matchesAffected,
            recordsDeleted: deletedCount
        });
    } catch (error) {
        console.error('Error deleting player:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all unique player names
router.get('/admin/players', async (req, res) => {
    try {
        const matches = await Match.find();
        const playerNames = new Set();

        matches.forEach(match => {
            match.innings.forEach(innings => {
                // Add from player stats
                innings.playerStats?.forEach(player => {
                    if (player.name) playerNames.add(player.name);
                });

                // Add from bowler stats
                innings.bowlerStats?.forEach(bowler => {
                    if (bowler.name) playerNames.add(bowler.name);
                });

                // Add current players
                if (innings.striker) playerNames.add(innings.striker);
                if (innings.nonStriker) playerNames.add(innings.nonStriker);
                if (innings.currentBowler) playerNames.add(innings.currentBowler);
            });
        });

        const sortedPlayers = Array.from(playerNames).sort();
        res.json(sortedPlayers);
    } catch (error) {
        console.error('Error fetching players:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
