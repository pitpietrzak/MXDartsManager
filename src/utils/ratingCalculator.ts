import { MonthlyStats } from '../types/types';

/**
 * Calculate player rating based on the formula:
 * RATING = W / (W + L) × AD
 * 
 * Where:
 * W = number of wins
 * L = number of losses
 * AD = attendance bonus = 1 + (X / Xmax) × (Xavg / Xmax)
 * X = number of days played
 * Xmax = maximum days played by any player this month
 * Xavg = average number of days played by players
 */
export function calculateRating(
    totalWins: number,
    totalLosses: number,
    daysPlayed: number,
    maxDaysInMonth: number,
    avgDaysPlayed: number
): number {
    // Handle edge case: no games played
    if (totalWins === 0 && totalLosses === 0) {
        return 0;
    }

    // Win rate component: W / (W + L)
    const winRate = totalWins / (totalWins + totalLosses);

    // Attendance bonus: AD = 1 + (X / Xmax) - (Xavg / Xmax)
    const attendanceBonus = 1 + (daysPlayed / maxDaysInMonth) - (avgDaysPlayed / maxDaysInMonth);

    // Final rating: RATING = W / (W + L) × AD
    const rating = winRate * attendanceBonus;

    return Math.max(0, rating); // Ensure non-negative
}

/**
 * Calculate all monthly statistics and ratings for players
 * @param stats - Array of player statistics
 * @param currentMonth - Current month string in format "YYYY-MM"
 */
export function calculateMonthlyRatings(
    stats: MonthlyStats[]
): MonthlyStats[] {
    if (stats.length === 0) return [];

    // Calculate Xmax: maximum days played by any player this month
    const maxDaysPlayed = Math.max(...stats.map(s => s.daysPlayed), 1); // At least 1 to avoid division by zero

    // Calculate average days played (Xavg)
    const totalDaysPlayed = stats.reduce((sum, s) => sum + s.daysPlayed, 0);
    const avgDaysPlayed = totalDaysPlayed / stats.length;

    // Calculate rating for each player
    return stats.map(stat => ({
        ...stat,
        rating: calculateRating(
            stat.totalWins,
            stat.totalLosses,
            stat.daysPlayed,
            maxDaysPlayed,
            avgDaysPlayed
        )
    }));
}

/**
 * Sort players by rating (highest first)
 */
export function sortByRating(stats: MonthlyStats[]): MonthlyStats[] {
    return [...stats].sort((a, b) => b.rating - a.rating);
}

/**
 * Calculate basic stats (wins/losses/etc) from a list of games
 */
import { DailyGame } from '../types/types';

export function calculateStatsFromGames(games: DailyGame[]): MonthlyStats[] {
    const playerStatsMap = new Map<string, {
        playerId: string;
        playerName: string;
        gamesPlayed: number;
        totalWins: number;
        totalLosses: number;
        dateSet: Set<string>;
    }>();

    games.forEach(game => {
        // Skip incomplete games if any slipped through (though loadMonthGames filters them)
        if (!game.completed) return;

        game.groups.forEach(group => {
            if (!group.results) return;

            group.results.forEach(result => {
                const playerId = result.playerId;

                // Find player name (available in group.players)
                const player = group.players.find(p => p.id === playerId);
                const playerName = player ? player.name : 'Unknown';

                if (!playerStatsMap.has(playerId)) {
                    playerStatsMap.set(playerId, {
                        playerId,
                        playerName,
                        gamesPlayed: 0,
                        totalWins: 0,
                        totalLosses: 0,
                        dateSet: new Set()
                    });
                }

                const stats = playerStatsMap.get(playerId)!;
                stats.gamesPlayed += 1;
                stats.totalWins += result.wins;
                stats.totalLosses += result.losses;
                stats.dateSet.add(game.date);
            });
        });
    });

    // Convert map to array and calculate daysPlayed
    return Array.from(playerStatsMap.values()).map(stats => ({
        playerId: stats.playerId,
        playerName: stats.playerName,
        gamesPlayed: stats.gamesPlayed,
        daysPlayed: stats.dateSet.size,
        totalWins: stats.totalWins,
        totalLosses: stats.totalLosses,
        rating: 0 // Will be calculated by calculateMonthlyRatings
    }));
}
