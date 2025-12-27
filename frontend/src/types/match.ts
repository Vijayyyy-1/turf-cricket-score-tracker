export interface Match {
    _id: string;
    oversPerInnings: number;
    teams: [string, string];
    playersPerTeam: number;
    currentInnings: number;
    battingTeam: string;
    bowlingTeam: string;
    status: 'not_started' | 'in_progress' | 'completed';
    innings: Innings[];
    result?: {
        winner: string | null;
        margin: string;
        isDraw: boolean;
    };
    createdAt: string;
}

export interface Innings {
    inningsNumber: number;
    battingTeam: string;
    bowlingTeam: string;
    runs: number;
    wickets: number;
    overs: number;
    balls: number;
    extras: {
        wides: number;
        noBalls: number;
    };
    ballByBall: Ball[];
}

export interface Ball {
    ballNumber: number;
    runs: number;
    isWide: boolean;
    isNoBall: boolean;
    isWicket: boolean;
    timestamp: string;
}

export interface MatchSetup {
    oversPerInnings: number;
    teams: [string, string];
    playersPerTeam: number;
}
