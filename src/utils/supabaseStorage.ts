import { supabase } from '../lib/supabase';
import { Player, DailyGame, MonthlyStats, Group } from '../types/types';

/**
 * Get current month string (YYYY-MM format)
 */
export function getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Load all players from database
 */
export async function loadPlayers(): Promise<Player[]> {
    const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error loading players:', error);
        return [];
    }

    return data.map(p => ({
        id: p.id,
        name: p.name,
        createdAt: p.created_at
    }));
}

/**
 * Add a new player
 */
export async function addPlayer(name: string): Promise<Player | null> {
    const { data, error } = await supabase
        .from('players')
        .insert({ name })
        .select()
        .single();

    if (error) {
        console.error('Error adding player:', error);
        return null;
    }

    return {
        id: data.id,
        name: data.name,
        createdAt: data.created_at
    };
}

/**
 * Remove a player
 */
export async function removePlayer(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error removing player:', error);
        return false;
    }

    return true;
}

/**
 * Load games for a specific month
 */
export async function loadMonthGames(month: string): Promise<DailyGame[]> {
    // First, get all players for lookup
    const { data: allPlayers, error: playersError } = await supabase
        .from('players')
        .select('id, name');

    if (playersError) {
        console.error('Error loading players:', playersError);
        return [];
    }

    const playerMap = new Map(allPlayers.map(p => [p.id, p.name]));

    const { data: games, error: gamesError } = await supabase
        .from('games')
        .select(`
      *,
      game_groups (
        id,
        group_index,
        game_results (
          player_id,
          wins,
          losses,
          position
        )
      )
    `)
        .eq('month', month)
        .order('date', { ascending: false });

    if (gamesError) {
        console.error('Error loading games:', gamesError);
        return [];
    }

    // Transform database structure to app structure
    return games.map(game => {
        const groups: Group[] = game.game_groups
            .sort((a: any, b: any) => a.group_index - b.group_index)
            .map((group: any) => {
                // Get unique player IDs from results
                const playerIds = group.game_results.map((r: any) => r.player_id);
                const players = playerIds.map((id: string) => ({
                    id,
                    name: playerMap.get(id) || 'Unknown Player',
                    createdAt: ''
                }));

                return {
                    id: group.id,
                    players,
                    results: group.game_results.map((result: any) => ({
                        playerId: result.player_id,
                        wins: result.wins,
                        losses: result.losses,
                        position: result.position
                    }))
                };
            });

        return {
            id: game.id,
            date: game.date,
            groups,
            completed: game.completed
        };
    });
}

/**
 * Save a new game with groups and results
 */
export async function saveGame(
    date: string,
    month: string,
    groups: Group[]
): Promise<string | null> {
    // 1. Insert game
    const { data: gameData, error: gameError } = await supabase
        .from('games')
        .insert({ date, month, completed: true })
        .select()
        .single();

    if (gameError || !gameData) {
        console.error('Error saving game:', gameError);
        return null;
    }

    // 2. Insert groups and results
    for (let i = 0; i < groups.length; i++) {
        const group = groups[i];

        // Insert group
        const { data: groupData, error: groupError } = await supabase
            .from('game_groups')
            .insert({ game_id: gameData.id, group_index: i })
            .select()
            .single();

        if (groupError || !groupData) {
            console.error('Error saving group:', groupError);
            continue;
        }

        // Insert results for this group
        if (group.results && group.results.length > 0) {
            const results = group.results.map(result => ({
                group_id: groupData.id,
                player_id: result.playerId,
                wins: result.wins,
                losses: result.losses,
                position: result.position
            }));

            const { error: resultsError } = await supabase
                .from('game_results')
                .insert(results);

            if (resultsError) {
                console.error('Error saving results:', resultsError);
            }
        }
    }

    return gameData.id;
}

/**
 * Calculate monthly stats for a given month
 */
export async function calculateMonthlyStats(month: string): Promise<MonthlyStats[]> {
    const { data, error } = await supabase
        .rpc('get_monthly_stats', { target_month: month });

    if (error) {
        console.error('Error calculating stats:', error);
        return [];
    }

    return data.map((stat: any) => ({
        playerId: stat.player_id,
        playerName: stat.player_name,
        gamesPlayed: Number(stat.games_played),
        daysPlayed: Number(stat.days_played),
        totalWins: Number(stat.total_wins),
        totalLosses: Number(stat.total_losses),
        rating: 0 // Will be calculated on client side
    }));
}

/**
 * Get players who played on a specific date
 */
export async function getPlayersWhoPlayedOnDate(date: string): Promise<Set<string>> {
    const { data, error } = await supabase
        .from('game_results')
        .select(`
      player_id,
      game_groups!inner (
        games!inner (
          date
        )
      )
    `)
        .eq('game_groups.games.date', date);

    if (error) {
        console.error('Error getting players for date:', error);
        return new Set();
    }

    return new Set(data.map((result: any) => result.player_id));
}

/**
 * Delete a game and all its associated data (groups and results cascade)
 */
export async function deleteGame(gameId: string): Promise<boolean> {
    const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', gameId);

    if (error) {
        console.error('Error deleting game:', error);
        return false;
    }

    return true;
}
