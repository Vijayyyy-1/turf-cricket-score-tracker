import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
  oversPerInnings: {
    type: Number,
    required: true,
    min: 1
  },
  teams: {
    type: [String],
    required: true,
    validate: {
      validator: function (v) {
        return v.length === 2;
      },
      message: 'Must have exactly 2 teams'
    }
  },
  playersPerTeam: {
    type: Number,
    required: true,
    min: 2,
    max: 11
  },
  currentInnings: {
    type: Number,
    default: 1,
    min: 1,
    max: 2
  },
  battingTeam: {
    type: String,
    required: true
  },
  bowlingTeam: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started'
  },
  innings: [{
    inningsNumber: Number,
    battingTeam: String,
    bowlingTeam: String,
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    overs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    extras: {
      wides: { type: Number, default: 0 },
      noBalls: { type: Number, default: 0 }
    },
    striker: String,
    nonStriker: String,
    currentBowler: String,
    playerStats: [{
      name: String,
      runs: { type: Number, default: 0 },
      balls: { type: Number, default: 0 },
      fours: { type: Number, default: 0 },
      sixes: { type: Number, default: 0 },
      isOut: { type: Boolean, default: false }
    }],
    bowlerStats: [{
      name: String,
      overs: { type: Number, default: 0 },
      balls: { type: Number, default: 0 },
      runs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 }
    }],
    ballByBall: [{
      ballNumber: Number,
      runs: Number,
      isWide: Boolean,
      isNoBall: Boolean,
      isWicket: Boolean,
      timestamp: { type: Date, default: Date.now },
      batsmanName: String,
      bowlerName: String
    }]
  }],
  result: {
    winner: String,
    margin: String,
    isDraw: Boolean
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Match = mongoose.model('Match', matchSchema);

export default Match;
