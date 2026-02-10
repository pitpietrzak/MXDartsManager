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
        .eq('completed', true)
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
 * Save an incomplete game with groups (no results yet)
 * This allows groups to be visible in Today's Games section
 */
export async function saveIncompleteGame(
    date: string,
    month: string,
    groups: Group[]
): Promise<string | null> {
    // 1. Insert game as incomplete
    const { data: gameData, error: gameError } = await supabase
        .from('games')
        .insert({ date, month, completed: false })
        .select()
        .single();

    if (gameError || !gameData) {
        console.error('Error saving incomplete game:', gameError);
        return null;
    }

    // 2. Insert groups with placeholder results (position 0, wins/losses 0)
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

        // Insert placeholder results for each player
        const results = group.players.map((player) => ({
            group_id: groupData.id,
            player_id: player.id,
            wins: 0,
            losses: 0,
            position: 0
        }));

        const { error: resultsError } = await supabase
            .from('game_results')
            .insert(results);

        if (resultsError) {
            console.error('Error saving placeholder results:', resultsError);
        }
    }

    return gameData.id;
}

/**
 * Save a new game with groups and results
 */
export async function saveGame(
    date: string,
    month: string,
    groups: Group[]
): Promise<string | null> {
    // Check if there's an existing incomplete game for this date
    const { data: existingGames, error: checkError } = await supabase
        .from('games')
        .select('id')
        .eq('date', date)
        .eq('completed', false)
        .limit(1);

    let gameId: string;

    if (checkError) {
        console.error('Error checking for existing game:', checkError);
        return null;
    }

    console.log('saveGame - Checking for existing incomplete game on date:', date);
    console.log('saveGame - Found existing games:', existingGames);

    if (existingGames && existingGames.length > 0) {
        // Update existing incomplete game to completed
        gameId = existingGames[0].id;
        console.log('saveGame - Updating existing game:', gameId);

        const { error: updateError } = await supabase
            .from('games')
            .update({ completed: true })
            .eq('id', gameId);

        if (updateError) {
            console.error('Error updating game:', updateError);
            return null;
        }

        // Fetch existing groups for this game to get their database IDs
        const { data: existingGroups, error: groupsError } = await supabase
            .from('game_groups')
            .select('id, group_index')
            .eq('game_id', gameId)
            .order('group_index');

        if (groupsError || !existingGroups) {
            console.error('Error fetching existing groups:', groupsError);
            return null;
        }

        console.log('saveGame - Found existing groups:', existingGroups);

        // Update results with actual data (groups already exist with placeholder results)
        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            const dbGroup = existingGroups[i];

            if (!dbGroup) {
                console.error('No database group found for index:', i);
                continue;
            }

            if (group.results && group.results.length > 0) {
                // Delete old placeholder results for this group
                await supabase
                    .from('game_results')
                    .delete()
                    .eq('group_id', dbGroup.id);

                // Insert actual results
                const results = group.results.map(result => ({
                    group_id: dbGroup.id,
                    player_id: result.playerId,
                    wins: result.wins,
                    losses: result.losses,
                    position: result.position
                }));

                console.log('saveGame - Inserting results for group:', dbGroup.id, results);

                const { error: resultsError } = await supabase
                    .from('game_results')
                    .insert(results);

                if (resultsError) {
                    console.error('Error saving results:', resultsError);
                }
            }
        }
    } else {
        // No existing game, create new one
        const { data: gameData, error: gameError } = await supabase
            .from('games')
            .insert({ date, month, completed: true })
            .select()
            .single();

        if (gameError || !gameData) {
            console.error('Error saving game:', gameError);
            return null;
        }

        gameId = gameData.id;

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

    console.log('saveGame - Returning gameId:', gameId);
    return gameId;
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

/**
 * Get today's incomplete game
 */
export async function getTodaysGame(): Promise<DailyGame | null> {
    const today = new Date().toISOString().split('T')[0];

    // First, get all players for lookup
    const { data: allPlayers, error: playersError } = await supabase
        .from('players')
        .select('id, name');

    if (playersError) {
        console.error('Error loading players:', playersError);
        return null;
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
        .eq('date', today)
        .eq('completed', false)
        .order('created_at', { ascending: false })
        .limit(1);

    if (gamesError) {
        console.error('Error loading today\'s game:', gamesError);
        return null;
    }

    if (!games || games.length === 0) {
        return null;
    }

    const game = games[0];

    // Transform database structure to app structure
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
}
