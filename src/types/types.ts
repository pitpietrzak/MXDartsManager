// Core data types for the Macrix Dart Competition app

export interface Player {
  id: string;
  name: string;
  createdAt: string;
  userId?: string; // Optional link to auth user
  isPlayingToday?: boolean;
  emoji?: string;
}

export interface Absence {
  id: string;
  playerId: string;
  date: string; // ISO date string YYYY-MM-DD
}

export interface GameResult {
  playerId: string;
  wins: number;
  losses: number;
  position: number; // 1st, 2nd, 3rd, 4th place
}

export interface Group {
  id: string;
  players: Player[];
  results?: GameResult[];
}

export interface DailyGame {
  id: string;
  date: string;
  groups: Group[];
  completed: boolean;
}

export interface MonthlyStats {
  playerId: string;
  playerName: string;
  totalWins: number;
  totalLosses: number;
  gamesPlayed: number;
  daysPlayed: number; // Number of unique days this player participated
  rating: number;
}

export interface MonthData {
  month: string; // Format: "YYYY-MM"
  games: DailyGame[];
  stats: MonthlyStats[];
}

export interface AppState {
  players: Player[];
  currentMonth: MonthData;
  monthlyArchive: MonthData[];
  currentView: 'dashboard' | 'players' | 'newGame' | 'leaderboard' | 'history';
  todayGame?: DailyGame;
}
