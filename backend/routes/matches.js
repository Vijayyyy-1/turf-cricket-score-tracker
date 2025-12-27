import express from 'express';
import Match from '../models/Match.js';

const router = express.Router();

// Create a new match
router.post('/matches', async (req, res) => {
    try {
        const { oversPerInnings, teams, players } = req.body;

        // Validate input
        if (!oversPerInnings || !teams || teams.length !== 2 || !players) {
            return res.status(400).json({ error: 'Invalid match data' });
        }

        const match = new Match({
            oversPerInnings,
            teams,
            players: new Map(Object.entries(players)),
            battingTeam: teams[0],
            bowlingTeam: teams[1],
            status: 'in_progress',
            innings: [{
                inningsNumber: 1,
                battingTeam: teams[0],
                bowlingTeam: teams[1],
                runs: 0,
                wickets: 0,
                overs: 0,
                balls: 0,
                extras: { wides: 0, noBalls: 0 },
                ballByBall: []
            }]
        });

        await match.save();
        res.status(201).json(match);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all matches
router.get('/matches', async (req, res) => {
    try {
        const matches = await Match.find().sort({ createdAt: -1 });
        res.json(matches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get a specific match
router.get('/matches/:id', async (req, res) => {
    try {
        const match = await Match.findById(req.params.id);
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }
        res.json(match);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Record a ball
router.post('/matches/:id/ball', async (req, res) => {
    try {
        const match = await Match.findById(req.params.id);
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }

        const { runs, isWide, isNoBall, isWicket } = req.body;
        const currentInnings = match.innings[match.currentInnings - 1];

        // Create ball record
        const ball = {
            ballNumber: currentInnings.ballByBall.length + 1,
            runs: runs || 0,
            isWide: isWide || false,
            isNoBall: isNoBall || false,
            isWicket: isWicket || false,
            timestamp: new Date()
        };

        currentInnings.ballByBall.push(ball);

        // Update runs
        if (isWide || isNoBall) {
            currentInnings.runs += 1 + (runs || 0);
            if (isWide) currentInnings.extras.wides += 1;
            if (isNoBall) currentInnings.extras.noBalls += 1;
        } else {
            currentInnings.runs += runs || 0;
        }

        // Update wickets
        if (isWicket) {
            currentInnings.wickets += 1;
        }

        // Update balls and overs (only for legal deliveries)
        if (!isWide && !isNoBall) {
            currentInnings.balls += 1;
            if (currentInnings.balls === 6) {
                currentInnings.overs += 1;
                currentInnings.balls = 0;
            }
        }

        // Check if innings should end
        const totalOvers = currentInnings.overs + (currentInnings.balls / 6);
        const playersPerTeam = match.players.get(currentInnings.battingTeam).length;

        if (totalOvers >= match.oversPerInnings || currentInnings.wickets >= playersPerTeam - 1) {
            // End current innings
            if (match.currentInnings === 1) {
                // Start second innings
                match.currentInnings = 2;
                match.battingTeam = match.teams[1];
                match.bowlingTeam = match.teams[0];
                match.innings.push({
                    inningsNumber: 2,
                    battingTeam: match.teams[1],
                    bowlingTeam: match.teams[0],
                    runs: 0,
                    wickets: 0,
                    overs: 0,
                    balls: 0,
                    extras: { wides: 0, noBalls: 0 },
                    ballByBall: []
                });
            } else {
                // Match completed
                match.status = 'completed';

                // Calculate result
                const innings1 = match.innings[0];
                const innings2 = match.innings[1];

                if (innings1.runs > innings2.runs) {
                    match.result = {
                        winner: innings1.battingTeam,
                        margin: `${innings1.runs - innings2.runs} runs`,
                        isDraw: false
                    };
                } else if (innings2.runs > innings1.runs) {
                    const wicketsRemaining = playersPerTeam - 1 - innings2.wickets;
                    match.result = {
                        winner: innings2.battingTeam,
                        margin: `${wicketsRemaining} wickets`,
                        isDraw: false
                    };
                } else {
                    match.result = {
                        winner: null,
                        margin: 'Match Tied',
                        isDraw: true
                    };
                }
            }
        }

        await match.save();
        res.json(match);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a match
router.delete('/matches/:id', async (req, res) => {
    try {
        const match = await Match.findByIdAndDelete(req.params.id);
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }
        res.json({ message: 'Match deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
