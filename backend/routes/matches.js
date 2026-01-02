import express from 'express';
import Match from '../models/Match.js';

const router = express.Router();

// Create a new match
router.post('/matches', async (req, res) => {
    try {
        const { oversPerInnings, teams, playersPerTeam } = req.body;

        // Validate input
        if (!oversPerInnings || !teams || teams.length !== 2 || !playersPerTeam) {
            return res.status(400).json({ error: 'Invalid match data' });
        }

        const match = new Match({
            oversPerInnings,
            teams,
            playersPerTeam,
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
                playerStats: [],
                bowlerStats: [],
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

        const { runs, isWide, isNoBall, isWicket, striker, nonStriker, bowler, newBatsman } = req.body;
        const currentInnings = match.innings[match.currentInnings - 1];

        // Update striker and non-striker if provided
        if (striker) currentInnings.striker = striker;
        if (nonStriker) currentInnings.nonStriker = nonStriker;
        if (bowler) currentInnings.currentBowler = bowler;

        // Handle new batsman after wicket
        if (newBatsman && isWicket) {
            currentInnings.striker = newBatsman;
        }

        // Initialize player stats if not exists
        const ensurePlayerStats = (playerName) => {
            if (!currentInnings.playerStats) currentInnings.playerStats = [];
            let player = currentInnings.playerStats.find(p => p.name === playerName);
            if (!player) {
                player = { name: playerName, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
                currentInnings.playerStats.push(player);
                // Re-fetch the player to get the Mongoose reference (with _id added)
                player = currentInnings.playerStats.find(p => p.name === playerName);
            }
            return player;
        };

        // Initialize bowler stats if not exists
        const ensureBowlerStats = (bowlerName) => {
            if (!currentInnings.bowlerStats) currentInnings.bowlerStats = [];
            let bowler = currentInnings.bowlerStats.find(b => b.name === bowlerName);
            if (!bowler) {
                bowler = { name: bowlerName, overs: 0, balls: 0, runs: 0, wickets: 0 };
                currentInnings.bowlerStats.push(bowler);
                // Re-fetch the bowler to get the Mongoose reference (with _id added)
                bowler = currentInnings.bowlerStats.find(b => b.name === bowlerName);
            }
            return bowler;
        };

        // Update batsman stats - ensure both striker and non-striker are initialized
        const currentBatsman = ensurePlayerStats(currentInnings.striker);
        // Also ensure non-striker is initialized so they appear in stats table
        if (currentInnings.nonStriker) {
            ensurePlayerStats(currentInnings.nonStriker);
        }
        const currentBowlerStats = currentInnings.currentBowler ? ensureBowlerStats(currentInnings.currentBowler) : null;

        // Create ball record
        const ball = {
            ballNumber: currentInnings.ballByBall.length + 1,
            runs: runs || 0,
            isWide: isWide || false,
            isNoBall: isNoBall || false,
            isWicket: isWicket || false,
            timestamp: new Date(),
            batsmanName: currentInnings.striker,
            bowlerName: currentInnings.currentBowler
        };

        currentInnings.ballByBall.push(ball);

        // Update runs
        const totalRuns = runs || 0;
        if (isWide || isNoBall) {
            currentInnings.runs += 1 + totalRuns;
            if (isWide) currentInnings.extras.wides += 1;
            if (isNoBall) currentInnings.extras.noBalls += 1;
            // Batsman gets runs on no-ball, not on wide
            if (isNoBall) {
                currentBatsman.runs += totalRuns;
                if (totalRuns === 4) currentBatsman.fours += 1;
                if (totalRuns === 6) currentBatsman.sixes += 1;
            }
            // Bowler concedes all runs
            if (currentBowlerStats) {
                currentBowlerStats.runs += 1 + totalRuns;
            }
        } else {
            currentInnings.runs += totalRuns;
            currentBatsman.runs += totalRuns;
            currentBatsman.balls += 1;
            if (totalRuns === 4) currentBatsman.fours += 1;
            if (totalRuns === 6) currentBatsman.sixes += 1;

            // Update bowler stats
            if (currentBowlerStats) {
                currentBowlerStats.runs += totalRuns;
            }
        }

        // Update wickets
        if (isWicket) {
            currentInnings.wickets += 1;
            currentBatsman.isOut = true;
            if (currentBowlerStats) {
                currentBowlerStats.wickets += 1;
            }
        }

        // Track if we should rotate strike
        let shouldRotateStrike = false;

        // Update balls and overs (only for legal deliveries)
        if (!isWide && !isNoBall) {
            currentInnings.balls += 1;
            if (currentBowlerStats) {
                currentBowlerStats.balls += 1;
            }

            if (currentInnings.balls === 6) {
                currentInnings.overs += 1;
                currentInnings.balls = 0;
                shouldRotateStrike = true; // Rotate strike at end of over

                // Update bowler overs
                if (currentBowlerStats) {
                    currentBowlerStats.overs += 1;
                    currentBowlerStats.balls = 0;
                }

                // Clear current bowler to prompt for new bowler in next over
                currentInnings.currentBowler = undefined;
            }
        }

        // Rotate strike on odd runs (1, 3, 5) for legal deliveries
        if (!isWide && !isNoBall && !isWicket && totalRuns % 2 === 1) {
            shouldRotateStrike = true;
        }

        // Perform strike rotation
        if (shouldRotateStrike && currentInnings.striker && currentInnings.nonStriker) {
            const temp = currentInnings.striker;
            currentInnings.striker = currentInnings.nonStriker;
            currentInnings.nonStriker = temp;
        }

        // Check if innings should end
        const totalOvers = currentInnings.overs + (currentInnings.balls / 6);
        const playersPerTeam = match.playersPerTeam;
        let shouldEndInnings = false;

        // Second innings specific end condition: target reached
        if (match.currentInnings === 2) {
            const target = match.innings[0].runs + 1;
            if (currentInnings.runs >= target) {
                shouldEndInnings = true;
            }
        }

        // Standard end conditions: overs completed or all out
        if (totalOvers >= match.oversPerInnings || currentInnings.wickets >= playersPerTeam - 1) {
            shouldEndInnings = true;
        }

        if (shouldEndInnings) {
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
                    playerStats: [],
                    bowlerStats: [],
                    ballByBall: []
                });
            } else {
                // Match completed
                match.status = 'completed';

                // Calculate result
                const innings1 = match.innings[0];
                const innings2 = match.innings[1];

                if (innings2.runs > innings1.runs) {
                    const wicketsRemaining = playersPerTeam - 1 - innings2.wickets;
                    match.result = {
                        winner: innings2.battingTeam,
                        margin: `${wicketsRemaining} wickets`,
                        isDraw: false
                    };
                } else if (innings1.runs > innings2.runs) {
                    match.result = {
                        winner: innings1.battingTeam,
                        margin: `${innings1.runs - innings2.runs} runs`,
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

        // Mark nested arrays as modified for Mongoose
        match.markModified('innings');

        await match.save();
        res.json(match);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Undo last ball
router.post('/matches/:id/undo', async (req, res) => {
    try {
        const match = await Match.findById(req.params.id);
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }

        // If match was completed, bring it back to in_progress
        if (match.status === 'completed') {
            match.status = 'in_progress';
            match.result = undefined;
        }

        let currentInnings = match.innings[match.currentInnings - 1];

        // If current innings has no balls and we're in 2nd innings, go back to 1st innings
        if (currentInnings.ballByBall.length === 0 && match.currentInnings === 2) {
            match.currentInnings = 1;
            match.battingTeam = match.teams[0];
            match.bowlingTeam = match.teams[1];
            // Remove the empty 2nd innings
            match.innings.pop();
            currentInnings = match.innings[0];
        }

        // Check if there are any balls to undo
        if (currentInnings.ballByBall.length === 0) {
            return res.status(400).json({ error: 'No balls to undo' });
        }

        // Get the last ball
        const lastBall = currentInnings.ballByBall.pop();

        // Reverse the runs
        if (lastBall.isWide || lastBall.isNoBall) {
            currentInnings.runs -= 1 + (lastBall.runs || 0);
            if (lastBall.isWide) currentInnings.extras.wides -= 1;
            if (lastBall.isNoBall) currentInnings.extras.noBalls -= 1;
        } else {
            currentInnings.runs -= lastBall.runs || 0;
        }

        // Reverse wickets
        if (lastBall.isWicket) {
            currentInnings.wickets -= 1;
        }

        // Reverse balls and overs (only for legal deliveries)
        if (!lastBall.isWide && !lastBall.isNoBall) {
            if (currentInnings.balls === 0) {
                // We're at the start of an over, go back to previous over
                if (currentInnings.overs > 0) {
                    currentInnings.overs -= 1;
                    currentInnings.balls = 5;
                }
            } else {
                currentInnings.balls -= 1;
            }
        }

        // --- Revert Player Stats ---

        // Revert Batsman Stats
        if (lastBall.batsmanName) {
            const batsman = currentInnings.playerStats.find(p => p.name === lastBall.batsmanName);
            if (batsman) {
                const totalRuns = lastBall.runs || 0;

                // Reverse runs
                if (lastBall.isNoBall) {
                    // In recordBall, runs are added to batsman for no-balls
                    batsman.runs -= totalRuns;
                    if (totalRuns === 4) batsman.fours -= 1;
                    if (totalRuns === 6) batsman.sixes -= 1;
                } else if (!lastBall.isWide) {
                    // Legal delivery: runs, balls, boundaries
                    batsman.runs -= totalRuns;
                    batsman.balls -= 1;
                    if (totalRuns === 4) batsman.fours -= 1;
                    if (totalRuns === 6) batsman.sixes -= 1;
                }

                // Reverse wickets
                if (lastBall.isWicket) {
                    batsman.isOut = false;
                }
            }
        }

        // Revert Bowler Stats
        if (lastBall.bowlerName) {
            const bowler = currentInnings.bowlerStats.find(b => b.name === lastBall.bowlerName);
            if (bowler) {
                const totalRuns = lastBall.runs || 0;

                // Reverse runs conceded
                if (lastBall.isWide || lastBall.isNoBall) {
                    bowler.runs -= (1 + totalRuns);
                } else {
                    bowler.runs -= totalRuns;
                }

                // Reverse wickets
                if (lastBall.isWicket) {
                    bowler.wickets -= 1;
                }

                // Reverse balls/overs
                if (!lastBall.isWide && !lastBall.isNoBall) {
                    if (bowler.balls === 0) {
                        if (bowler.overs > 0) {
                            bowler.overs -= 1;
                            bowler.balls = 5;
                        }
                    } else {
                        bowler.balls -= 1;
                    }
                }
            }
        }

        // Mark nested arrays as modified for Mongoose
        match.markModified('innings');

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
