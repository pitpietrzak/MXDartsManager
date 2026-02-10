
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

    // 3. Check if all groups for this game are complete
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
