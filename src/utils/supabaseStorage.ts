import { supabase } from '../lib/supabase';
import { Player, DailyGame, MonthlyStats, Group, GameResult } from '../types/types';

// Database response interfaces
interface DbGameResult {
    player_id: string;
    wins: number;
    losses: number;
    position: number;
}

interface DbGameGroup {
    id: string;
    group_index: number;
    game_results: DbGameResult[];
}

interface DbGame {
    id: string;
    date: string;
    completed: boolean;
    game_groups: DbGameGroup[];
}

interface DbMonthlyStat {
    player_id: string;
    player_name: string;
    games_played: number;
    days_played: number;
    total_wins: number;
    total_losses: number;
}

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
        createdAt: p.created_at,
        ...(p.user_id && { userId: p.user_id }), // Include user_id if present
        isPlayingToday: p.is_playing_today ?? true,
        emoji: p.emoji
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
 * Update a player's profile
 */
export async function updatePlayer(player: Player): Promise<boolean> {
    const { error } = await supabase
        .from('players')
        .update({
            name: player.name,
            is_playing_today: player.isPlayingToday,
            emoji: player.emoji
        })
        .eq('id', player.id);

    if (error) {
        console.error('Error updating player:', error);
        return false;
    }

    return true;
}

/**
 * Link a player to a user account (admin/game_manager only)
 */
export async function linkPlayerToUser(playerId: string, userId: string): Promise<boolean> {
    const { error } = await supabase.rpc('link_player_to_user', {
        player_uuid: playerId,
        user_uuid: userId || null  // Pass null for unlinking
    });

    if (error) {
        console.error('Error linking player to user:', error);
        return false;
    }

    return true;
}

/**
 * Get player associated with a user ID
 */
export async function getPlayerByUserId(userId: string): Promise<Player | null> {
    const { data, error } = await supabase.rpc('get_player_by_user_id', {
        user_uuid: userId
    });

    if (error) {
        console.error('Error getting player by user ID:', error);
        return null;
    }

    if (!data || data.length === 0) {
        return null;
    }

    return data[0];
}

/**
 * Get stats for a specific player for a given month
 */
export async function getUserStats(playerId: string, month: string): Promise<MonthlyStats | null> {
    const { data, error } = await supabase
        .rpc('get_monthly_stats', { target_month: month });

    if (error) {
        console.error('Error getting user stats:', error);
        return null;
    }

    const statsData = data as DbMonthlyStat[];
    const playerStats = statsData?.find((s) => s.player_id === playerId);

    if (!playerStats) {
        return null;
    }

    return {
        playerId: playerStats.player_id,
        playerName: playerStats.player_name,
        gamesPlayed: Number(playerStats.games_played),
        daysPlayed: Number(playerStats.days_played),
        totalWins: Number(playerStats.total_wins),
        totalLosses: Number(playerStats.total_losses),
        rating: 1500 // TODO: Implement rating calculation
    };
}

/**
 * Get game history for a specific player for a given month
 */
export async function getUserGameHistory(playerId: string, month: string): Promise<DailyGame[]> {
    const allGames = await loadMonthGames(month);

    // Filter games where the player participated
    return allGames.filter((game) =>
        game.groups.some((group) =>
            group.players.some((player) => player.id === playerId)
        )
    );
}

/**
 * Load games for a specific month
 */
export async function loadMonthGames(month: string): Promise<DailyGame[]> {
    // First, get all players for lookup
    const { data: allPlayers, error: playersError } = await supabase
        .from('players')
        .select('id, name, emoji');

    if (playersError) {
        console.error('Error loading players:', playersError);
        return [];
    }

    const playerMap = new Map(allPlayers.map((p) => [p.id, { name: p.name, emoji: p.emoji }]));

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
        .order('date', { ascending: false })
        .order('created_at', { ascending: true });

    if (gamesError) {
        console.error('Error loading games:', gamesError);
        return [];
    }

    // Transform database structure to app structure
    const dbGames = games as unknown as DbGame[];

    return dbGames.map((game) => {
        const groups: Group[] = game.game_groups
            .sort((a, b) => a.group_index - b.group_index)
            .map((group) => {
                // Get unique player IDs from results
                const playerIds = group.game_results.map((r) => r.player_id);
                const players = playerIds.map((id: string) => {
                    const playerData = playerMap.get(id);
                    return {
                        id,
                        name: playerData?.name || 'Unknown Player',
                        emoji: playerData?.emoji,
                        createdAt: ''
                    };
                });

                return {
                    id: group.id,
                    players,
                    results: group.game_results.map((result) => ({
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
 * Save incomplete games with groups (no results yet)
 * Each group is saved as a SEPARATE game record.
 */
export async function saveIncompleteGame(
    date: string,
    month: string,
    groups: Group[]
): Promise<string | null> {
    if (groups.length === 0) return null;

    let lastGameId = null;

    for (let i = 0; i < groups.length; i++) {
        const group = groups[i];

        // 1. Insert NEW game for THIS group
        const { data: gameData, error: gameError } = await supabase
            .from('games')
            .insert({ date, month, completed: false })
            .select()
            .single();

        if (gameError || !gameData) {
            console.error('Error saving game for group index', i, gameError);
            continue;
        }

        lastGameId = gameData.id;

        // 2. Insert group linked to this new game
        const { data: groupData, error: groupError } = await supabase
            .from('game_groups')
            .insert({ game_id: gameData.id, group_index: i + 1 })
            .select()
            .single();

        if (groupError || !groupData) {
            console.error('Error saving group:', groupError);
            continue;
        }

        // 3. Insert placeholder results for each player in this group
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

    return lastGameId;
}

/**
 * Update groups for a specific day (replaces existing incomplete games)
 */
export async function updateDailyGroups(
    date: string,
    month: string,
    groups: Group[]
): Promise<boolean> {
    console.log('Updating daily groups for date:', date);

    // 1. Get all incomplete games for this date
    // We explicitly look for games that are NOT completed to replace them.
    const { data: existingGames, error: fetchError } = await supabase
        .from('games')
        .select('id, completed')
        .eq('date', date)
        .eq('completed', false);

    if (fetchError) {
        console.error('Error fetching existing games for update:', fetchError);
        return false;
    }

    console.log('Found existing incomplete games to delete:', existingGames?.length);

    // 2. Delete existing games (cascade should handle groups/results)
    if (existingGames && existingGames.length > 0) {
        const gameIds = existingGames.map(g => g.id);
        const { error: deleteError } = await supabase
            .from('games')
            .delete()
            .in('id', gameIds);

        if (deleteError) {
            console.error('Error deleting existing games:', deleteError);
            return false;
        }
    }

    // 3. Create new game with all groups
    if (groups.length > 0) {
        await saveIncompleteGame(date, month, groups);
    }

    return true;
}

/**
 * Save results for a specific group
 */
export async function saveGroupResults(groupId: string, results: GameResult[]): Promise<boolean> {
    // 1. Delete existing results for the group
    const { error: deleteError } = await supabase
        .from('game_results')
        .delete()
        .eq('group_id', groupId);

    if (deleteError) {
        console.error('Error clearing group results:', deleteError);
        return false;
    }

    // 2. Insert new results
    const dbResults = results.map(r => ({
        group_id: groupId,
        player_id: r.playerId,
        wins: r.wins,
        losses: r.losses,
        position: r.position
    }));

    const { error: insertError } = await supabase
        .from('game_results')
        .insert(dbResults);

    if (insertError) {
        console.error('Error saving group results:', insertError);
        return false;
    }

    // 3. Mark game as completed if all groups are done
    // First get the game_id from this group
    const { data: groupData, error: groupError } = await supabase
        .from('game_groups')
        .select('game_id')
        .eq('id', groupId)
        .single();

    if (groupError || !groupData) {
        console.error('Error finding game for group:', groupError);
        return true; // Return true as the group save was successful
    }

    const gameId = groupData.game_id;

    // Get all groups for this game
    const { data: allGroups, error: allGroupsError } = await supabase
        .from('game_groups')
        .select('id')
        .eq('game_id', gameId);

    if (allGroupsError || !allGroups) {
        return true;
    }

    // Check results for all groups
    let allComplete = true;
    for (const group of allGroups) {
        const { count, error: countError } = await supabase
            .from('game_results')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id)
            .gt('position', 0); // Check for valid positions (not placeholders)

        if (countError || count === 0) {
            allComplete = false;
            break;
        }
    }

    // Mark game as completed if all groups are done
    if (allComplete) {
        const { error: updateError } = await supabase
            .from('games')
            .update({ completed: true })
            .eq('id', gameId);

        if (updateError) {
            console.error('Error marking game as completed:', updateError);
        }
    }

    return true;
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

    if (existingGames && existingGames.length > 0) {
        // Update existing incomplete game to completed
        gameId = existingGames[0].id;

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

        // Update results with actual data
        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            const dbGroup = existingGroups[i];

            if (!dbGroup) {
                console.error('No database group found for index:', i);
                continue;
            }

            if (group.results && group.results.length > 0) {
                await supabase
                    .from('game_results')
                    .delete()
                    .eq('group_id', dbGroup.id);

                const results = group.results.map(result => ({
                    group_id: dbGroup.id,
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

        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];

            const { data: groupData, error: groupError } = await supabase
                .from('game_groups')
                .insert({ game_id: gameData.id, group_index: i + 1 })
                .select()
                .single();

            if (groupError || !groupData) {
                console.error('Error saving group:', groupError);
                continue;
            }

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

    const statsData = data as DbMonthlyStat[];

    return statsData.map((stat) => ({
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

    // Typed data
    interface PlayerResult { player_id: string; }
    return new Set((data as PlayerResult[]).map((result) => result.player_id));
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
 * Get incomplete games for a specific date (defaults to today)
 */
export async function getDailyGames(date?: string): Promise<DailyGame[]> {
    const targetDate = date || new Date().toISOString().split('T')[0];

    // First, get all players for lookup
    const { data: allPlayers, error: playersError } = await supabase
        .from('players')
        .select('id, name, emoji');

    if (playersError) {
        console.error('Error loading players:', playersError);
        return [];
    }

    const playerMap = new Map(allPlayers.map(p => [p.id, { name: p.name, emoji: p.emoji }]));

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
        .eq('date', targetDate)
        .eq('date', targetDate)
        .eq('completed', false)
        .order('created_at', { ascending: true });

    if (gamesError) {
        console.error(`Error loading games for ${targetDate}:`, gamesError);
        return [];
    }

    if (!games || games.length === 0) {
        return [];
    }

    // Transform database structure to app structure
    const dbGames = games as unknown as DbGame[];

    return dbGames.map(game => {
        const groups: Group[] = game.game_groups
            .sort((a, b) => a.group_index - b.group_index)
            .map((group) => {
                // Get unique player IDs from results
                const playerIds = group.game_results.map((r) => r.player_id);
                const players = playerIds.map((id: string) => {
                    const playerData = playerMap.get(id);
                    return {
                        id,
                        name: playerData?.name || 'Unknown Player',
                        emoji: playerData?.emoji,
                        createdAt: ''
                    };
                });

                return {
                    id: group.id,
                    players,
                    results: group.game_results.map((result) => ({
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
 * Get absences for a specific player in a given month range
 */
export async function getPlayerAbsences(playerId: string, start: string, end: string): Promise<string[]> {
    const { data, error } = await supabase
        .from('player_absences')
        .select('absence_date')
        .eq('player_id', playerId)
        .gte('absence_date', start)
        .lte('absence_date', end);

    if (error) {
        console.error('Error fetching absences:', error);
        return [];
    }

    return data.map(d => d.absence_date);
}

/**
 * Toggle absence for a specific date
 * Returns true if the absence was ADDED, false if REMOVED (or null on error)
 */
export async function togglePlayerAbsence(playerId: string, date: string): Promise<boolean | null> {
    // Check if absence exists
    const { data: existing } = await supabase
        .from('player_absences')
        .select('id')
        .eq('player_id', playerId)
        .eq('absence_date', date)
        .single();

    if (existing) {
        // Remove absence
        const { error } = await supabase
            .from('player_absences')
            .delete()
            .eq('id', existing.id);

        if (error) {
            console.error('Error removing absence:', error);
            return null;
        }
        return false; // Removed
    } else {
        // Add absence
        const { error } = await supabase
            .from('player_absences')
            .insert({
                player_id: playerId,
                absence_date: date
            });

        if (error) {
            console.error('Error adding absence:', error);
            return null;
        }
        return true; // Added
    }
}

/**
 * Set absence for a specific date (force add or remove)
 */
export async function setPlayerAbsence(playerId: string, date: string, isAbsent: boolean): Promise<boolean> {
    if (isAbsent) {
        // Add absence (ignore if already exists)
        const { error } = await supabase
            .from('player_absences')
            .upsert({
                player_id: playerId,
                absence_date: date
            }, { onConflict: 'player_id, absence_date' });

        if (error) {
            console.error('Error setting absence:', error);
            return false;
        }
    } else {
        // Remove absence
        const { error } = await supabase
            .from('player_absences')
            .delete()
            .eq('player_id', playerId)
            .eq('absence_date', date);

        if (error) {
            console.error('Error removing absence:', error);
            return false;
        }
    }
    return true;
}
