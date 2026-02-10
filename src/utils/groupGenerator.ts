import { Player } from '../types/types';

/**
 * Fisher-Yates shuffle algorithm for randomizing arrays
 */
function shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Generate groups from a list of players with balanced distribution
 * @param players - List of players to distribute
 * @param numberOfGroups - Number of groups to create (1, 2, or 3)
 * @returns Array of player groups with balanced sizes
 */
export function generateGroups(players: Player[], numberOfGroups: number = 1): Player[][] {
    if (players.length < 2) {
        throw new Error('Need at least 2 players to create a group');
    }

    if (numberOfGroups < 1 || numberOfGroups > 3) {
        throw new Error('Number of groups must be 1, 2, or 3');
    }

    // Can't have more groups than players
    const actualGroupCount = Math.min(numberOfGroups, players.length);

    const shuffled = shuffle(players);
    const groups: Player[][] = [];

    const numPlayers = shuffled.length;
    const baseSize = Math.floor(numPlayers / actualGroupCount);
    const remainder = numPlayers % actualGroupCount;

    let currentIndex = 0;

    // Distribute players evenly across groups
    // Groups with remainder get one extra player
    for (let i = 0; i < actualGroupCount; i++) {
        const groupSize = baseSize + (i < remainder ? 1 : 0);
        groups.push(shuffled.slice(currentIndex, currentIndex + groupSize));
        currentIndex += groupSize;
    }

    return groups;
}

/**
 * Calculate wins and losses based on position in a group
 * Position 1 (winner) beats everyone else
 * Position 2 beats positions 3 and 4
 * etc.
 */
export function calculateWinsLosses(position: number, groupSize: number): { wins: number; losses: number } {
    const wins = groupSize - position;
    const losses = position - 1;
    return { wins, losses };
}
