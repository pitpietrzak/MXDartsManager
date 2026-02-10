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
