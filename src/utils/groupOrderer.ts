import { Player, DailyGame, MonthlyStats } from '../types/types';

/**
 * Find the previous gameday date (most recent weekday with completed games
 * before the given date). Skips weekends.
 */
export function getPreviousGameday(selectedDate: string, games: DailyGame[]): string | null {
    // Get all unique dates with completed games, sorted descending
    const completedDates = [...new Set(
        games
            .filter(g => g.completed)
            .map(g => g.date)
    )].sort((a, b) => b.localeCompare(a));

    // Find the most recent date that is strictly before selectedDate
    for (const date of completedDates) {
        if (date < selectedDate) {
            return date;
        }
    }

    return null;
}

/**
 * Get W-L record for a player from a specific gameday's games.
 * Returns { wins, losses } totals across all groups they played in that day.
 */
function getPlayerGamedayWL(
    playerId: string,
    gamedayGames: DailyGame[]
): { wins: number; losses: number } | null {
    let totalWins = 0;
    let totalLosses = 0;
    let found = false;

    for (const game of gamedayGames) {
        for (const group of game.groups) {
            if (!group.results) continue;
            for (const result of group.results) {
                if (result.playerId === playerId) {
                    totalWins += result.wins;
                    totalLosses += result.losses;
                    found = true;
                }
            }
        }
    }

    return found ? { wins: totalWins, losses: totalLosses } : null;
}

/**
 * Order players within a group according to draw priority:
 * 
 * Tier 1 (first): Players who did NOT play on the previous gameday.
 *   Tiebreaker: worst rating first (lowest rating = higher priority = earlier in list).
 * 
 * Tier 2 (after): Players who DID play on the previous gameday.
 *   Sorted by worst W-L from that gameday (losses - wins, descending).
 *   Tiebreaker: worst rating first.
 */
export function orderPlayersInGroup(
    players: Player[],
    previousGamedayGames: DailyGame[],
    stats: MonthlyStats[]
): Player[] {
    // Build a rating lookup (lower = worse)
    const ratingMap = new Map<string, number>();
    for (const s of stats) {
        ratingMap.set(s.playerId, s.rating);
    }

    // Build a set of player IDs who played on the previous gameday
    const previousPlayerIds = new Set<string>();
    for (const game of previousGamedayGames) {
        for (const group of game.groups) {
            if (!group.results) continue;
            for (const result of group.results) {
                previousPlayerIds.add(result.playerId);
            }
        }
    }

    // Partition players into two tiers
    const tier1: Player[] = []; // Did NOT play previous gameday
    const tier2: Player[] = []; // DID play previous gameday

    for (const player of players) {
        if (previousPlayerIds.has(player.id)) {
            tier2.push(player);
        } else {
            tier1.push(player);
        }
    }

    // Sort tier 1 by worst rating (ascending rating)
    tier1.sort((a, b) => {
        const ratingA = ratingMap.get(a.id) ?? 0;
        const ratingB = ratingMap.get(b.id) ?? 0;
        return ratingA - ratingB;
    });

    // Sort tier 2 by worst W-L (most losses relative to wins), then worst rating
    tier2.sort((a, b) => {
        const wlA = getPlayerGamedayWL(a.id, previousGamedayGames);
        const wlB = getPlayerGamedayWL(b.id, previousGamedayGames);

        // W-L difference (losses - wins): higher = worse = should come first
        const diffA = wlA ? (wlA.losses - wlA.wins) : 0;
        const diffB = wlB ? (wlB.losses - wlB.wins) : 0;

        if (diffB !== diffA) {
            return diffB - diffA; // Worst W-L first
        }

        // Tiebreaker: worst rating first
        const ratingA = ratingMap.get(a.id) ?? 0;
        const ratingB = ratingMap.get(b.id) ?? 0;
        return ratingA - ratingB;
    });

    return [...tier1, ...tier2];
}
