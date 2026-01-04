import express from 'express';
import Match from '../models/Match.js';

const router = express.Router();

// Get all players with aggregated statistics
router.get('/players', async (req, res) => {
    try {
        const matches = await Match.find();
        const playerMap = new Map();

        matches.forEach(match => {
            match.innings.forEach(innings => {
                // Aggregate batting stats
                innings.playerStats.forEach(player => {
                    const existing = playerMap.get(player.name) || {
                        name: player.name,
                        batting: {
                            matches: 0,
                            innings: 0,
                            runs: 0,
                            balls: 0,
                            fours: 0,
                            sixes: 0,
                            notOuts: 0,
                            highScore: 0,
                            totalOuts: 0
                        },
                        bowling: {
                            matches: 0,
                            innings: 0,
                            overs: 0,
                            balls: 0,
                            runs: 0,
                            wickets: 0,
                            bestBowling: { wickets: 0, runs: Infinity }
                        }
                    };

                    // Update batting stats
                    existing.batting.innings += 1;
                    existing.batting.runs += player.runs || 0;
                    existing.batting.balls += player.balls || 0;
                    existing.batting.fours += player.fours || 0;
                    existing.batting.sixes += player.sixes || 0;

                    if (!player.isOut) {
                        existing.batting.notOuts += 1;
                    } else {
                        existing.batting.totalOuts += 1;
                    }

                    if ((player.runs || 0) > existing.batting.highScore) {
                        existing.batting.highScore = player.runs || 0;
                    }

                    // Track unique matches for batting
                    if (!existing.battingMatchIds) existing.battingMatchIds = new Set();
                    existing.battingMatchIds.add(match._id.toString());

                    playerMap.set(player.name, existing);
                });

                // Aggregate bowling stats
                innings.bowlerStats.forEach(bowler => {
                    const existing = playerMap.get(bowler.name) || {
                        name: bowler.name,
                        batting: {
                            matches: 0,
                            innings: 0,
                            runs: 0,
                            balls: 0,
                            fours: 0,
                            sixes: 0,
                            notOuts: 0,
                            highScore: 0,
                            totalOuts: 0
                        },
                        bowling: {
                            matches: 0,
                            innings: 0,
                            overs: 0,
                            balls: 0,
                            runs: 0,
                            wickets: 0,
                            bestBowling: { wickets: 0, runs: Infinity }
                        }
                    };

                    // Update bowling stats
                    existing.bowling.innings += 1;
                    existing.bowling.overs += bowler.overs || 0;
                    existing.bowling.balls += bowler.balls || 0;
                    existing.bowling.runs += bowler.runs || 0;
                    existing.bowling.wickets += bowler.wickets || 0;

                    // Track best bowling figures
                    const currentWickets = bowler.wickets || 0;
                    const currentRuns = bowler.runs || 0;

                    if (currentWickets > existing.bowling.bestBowling.wickets ||
                        (currentWickets === existing.bowling.bestBowling.wickets &&
                            currentRuns < existing.bowling.bestBowling.runs)) {
                        existing.bowling.bestBowling = {
                            wickets: currentWickets,
                            runs: currentRuns
                        };
                    }

                    // Track unique matches for bowling
                    if (!existing.bowlingMatchIds) existing.bowlingMatchIds = new Set();
                    existing.bowlingMatchIds.add(match._id.toString());

                    playerMap.set(bowler.name, existing);
                });
            });
        });

        // Convert to array and calculate derived stats
        const players = Array.from(playerMap.values()).map(player => {
            // Count unique matches
            const allMatchIds = new Set([
                ...(player.battingMatchIds || []),
                ...(player.bowlingMatchIds || [])
            ]);

            player.batting.matches = (player.battingMatchIds || new Set()).size;
            player.bowling.matches = (player.bowlingMatchIds || new Set()).size;

            // Calculate batting average
            if (player.batting.totalOuts > 0) {
                player.batting.average = (player.batting.runs / player.batting.totalOuts).toFixed(2);
            } else {
                player.batting.average = player.batting.runs > 0 ? player.batting.runs.toFixed(2) : '0.00';
            }

            // Calculate strike rate
            if (player.batting.balls > 0) {
                player.batting.strikeRate = ((player.batting.runs / player.batting.balls) * 100).toFixed(2);
            } else {
                player.batting.strikeRate = '0.00';
            }

            // Calculate bowling average
            if (player.bowling.wickets > 0) {
                player.bowling.average = (player.bowling.runs / player.bowling.wickets).toFixed(2);
            } else {
                player.bowling.average = player.bowling.runs > 0 ? '-' : '0.00';
            }

            // Calculate economy rate
            const totalBowlingOvers = player.bowling.overs + (player.bowling.balls / 6);
            if (totalBowlingOvers > 0) {
                player.bowling.economy = (player.bowling.runs / totalBowlingOvers).toFixed(2);
            } else {
                player.bowling.economy = '0.00';
            }

            // Format best bowling
            if (player.bowling.bestBowling.runs === Infinity) {
                player.bowling.bestBowlingStr = '-';
            } else {
                player.bowling.bestBowlingStr = `${player.bowling.bestBowling.wickets}/${player.bowling.bestBowling.runs}`;
            }

            // Total matches played
            player.totalMatches = allMatchIds.size;

            // Clean up temporary fields
            delete player.battingMatchIds;
            delete player.bowlingMatchIds;

            return player;
        });

        // Sort by total runs (most runs first)
        players.sort((a, b) => b.batting.runs - a.batting.runs);

        res.json(players);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get individual player statistics
router.get('/players/:name', async (req, res) => {
    try {
        const playerName = decodeURIComponent(req.params.name);
        const matches = await Match.find();

        const playerData = {
            name: playerName,
            matchHistory: [],
            batting: {
                matches: 0,
                innings: 0,
                runs: 0,
                balls: 0,
                fours: 0,
                sixes: 0,
                notOuts: 0,
                highScore: 0,
                totalOuts: 0
            },
            bowling: {
                matches: 0,
                innings: 0,
                overs: 0,
                balls: 0,
                runs: 0,
                wickets: 0,
                bestBowling: { wickets: 0, runs: Infinity }
            }
        };

        const battingMatchIds = new Set();
        const bowlingMatchIds = new Set();

        matches.forEach(match => {
            let matchBatting = null;
            let matchBowling = null;

            match.innings.forEach(innings => {
                // Find batting performance
                const battingPerf = innings.playerStats.find(p => p.name === playerName);
                if (battingPerf) {
                    battingMatchIds.add(match._id.toString());
                    playerData.batting.innings += 1;
                    playerData.batting.runs += battingPerf.runs || 0;
                    playerData.batting.balls += battingPerf.balls || 0;
                    playerData.batting.fours += battingPerf.fours || 0;
                    playerData.batting.sixes += battingPerf.sixes || 0;

                    if (!battingPerf.isOut) {
                        playerData.batting.notOuts += 1;
                    } else {
                        playerData.batting.totalOuts += 1;
                    }

                    if ((battingPerf.runs || 0) > playerData.batting.highScore) {
                        playerData.batting.highScore = battingPerf.runs || 0;
                    }

                    matchBatting = {
                        runs: battingPerf.runs || 0,
                        balls: battingPerf.balls || 0,
                        fours: battingPerf.fours || 0,
                        sixes: battingPerf.sixes || 0,
                        isOut: battingPerf.isOut
                    };
                }

                // Find bowling performance
                const bowlingPerf = innings.bowlerStats.find(b => b.name === playerName);
                if (bowlingPerf) {
                    bowlingMatchIds.add(match._id.toString());
                    playerData.bowling.innings += 1;
                    playerData.bowling.overs += bowlingPerf.overs || 0;
                    playerData.bowling.balls += bowlingPerf.balls || 0;
                    playerData.bowling.runs += bowlingPerf.runs || 0;
                    playerData.bowling.wickets += bowlingPerf.wickets || 0;

                    const currentWickets = bowlingPerf.wickets || 0;
                    const currentRuns = bowlingPerf.runs || 0;

                    if (currentWickets > playerData.bowling.bestBowling.wickets ||
                        (currentWickets === playerData.bowling.bestBowling.wickets &&
                            currentRuns < playerData.bowling.bestBowling.runs)) {
                        playerData.bowling.bestBowling = {
                            wickets: currentWickets,
                            runs: currentRuns
                        };
                    }

                    matchBowling = {
                        overs: bowlingPerf.overs || 0,
                        balls: bowlingPerf.balls || 0,
                        runs: bowlingPerf.runs || 0,
                        wickets: bowlingPerf.wickets || 0
                    };
                }
            });

            // Add to match history if player participated
            if (matchBatting || matchBowling) {
                playerData.matchHistory.push({
                    matchId: match._id,
                    date: match.createdAt,
                    teams: match.teams,
                    status: match.status,
                    result: match.result,
                    batting: matchBatting,
                    bowling: matchBowling
                });
            }
        });

        playerData.batting.matches = battingMatchIds.size;
        playerData.bowling.matches = bowlingMatchIds.size;

        // Calculate batting average
        if (playerData.batting.totalOuts > 0) {
            playerData.batting.average = (playerData.batting.runs / playerData.batting.totalOuts).toFixed(2);
        } else {
            playerData.batting.average = playerData.batting.runs > 0 ? playerData.batting.runs.toFixed(2) : '0.00';
        }

        // Calculate strike rate
        if (playerData.batting.balls > 0) {
            playerData.batting.strikeRate = ((playerData.batting.runs / playerData.batting.balls) * 100).toFixed(2);
        } else {
            playerData.batting.strikeRate = '0.00';
        }

        // Calculate bowling average
        if (playerData.bowling.wickets > 0) {
            playerData.bowling.average = (playerData.bowling.runs / playerData.bowling.wickets).toFixed(2);
        } else {
            playerData.bowling.average = playerData.bowling.runs > 0 ? '-' : '0.00';
        }

        // Calculate economy rate
        const totalBowlingOvers = playerData.bowling.overs + (playerData.bowling.balls / 6);
        if (totalBowlingOvers > 0) {
            playerData.bowling.economy = (playerData.bowling.runs / totalBowlingOvers).toFixed(2);
        } else {
            playerData.bowling.economy = '0.00';
        }

        // Format best bowling
        if (playerData.bowling.bestBowling.runs === Infinity) {
            playerData.bowling.bestBowlingStr = '-';
        } else {
            playerData.bowling.bestBowlingStr = `${playerData.bowling.bestBowling.wickets}/${playerData.bowling.bestBowling.runs}`;
        }

        // Sort match history by date (most recent first)
        playerData.matchHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(playerData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
