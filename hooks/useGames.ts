import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { GameModule, GameType } from '../types';

export const useGames = (userId?: string) => {
    const [publicGames, setPublicGames] = useState<GameModule[]>([]);
    const [myGames, setMyGames] = useState<GameModule[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Helper to map DB columns to our Typescript Interface
    const mapDbToGame = (dbGame: any): GameModule => ({
        id: dbGame.id,
        title: dbGame.title,
        description: dbGame.description,
        category: 'Custom',
        gameType: dbGame.game_type as GameType,
        data: dbGame.data,
        settings: dbGame.settings,
        author: dbGame.author_name || 'Anonymous',
        author_id: dbGame.author_id,
        plays: dbGame.plays,
        likes: dbGame.likes,
        isPublic: dbGame.is_public
    });

    // 1. Fetch Games Function
    const fetchGames = useCallback(async () => {
        // DEMO MODE
        if (!isSupabaseConfigured()) {
            const localData = localStorage.getItem('demo_games');
            const demoGames: GameModule[] = localData ? JSON.parse(localData) : [];
            
            // Filter locally
            setMyGames(demoGames.filter(g => g.author_id === (userId || 'demo-user')));
            setPublicGames(demoGames.filter(g => g.isPublic));
            setLoading(false);
            return;
        }

        // SUPABASE MODE
        if (!supabase) return;

        setLoading(true);
        try {
            // A. Fetch Public Games
            const { data: publicData, error: pubError } = await supabase
                .from('games')
                .select('*')
                .eq('is_public', true)
                .order('created_at', { ascending: false });
            
            if (pubError) {
                console.error("Error fetching public games:", pubError);
            } else if (publicData) {
                setPublicGames(publicData.map(mapDbToGame));
            }

            // B. Fetch My Games (if logged in)
            if (userId) {
                const { data: myData, error: myError } = await supabase
                    .from('games')
                    .select('*')
                    .eq('author_id', userId)
                    .order('created_at', { ascending: false });
                
                if (myError) {
                    console.error("Error fetching my games:", myError);
                } else if (myData) {
                    setMyGames(myData.map(mapDbToGame));
                }
            } else {
                setMyGames([]);
            }
        } catch (error) {
            console.error("Unexpected error fetching games:", error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    // 2. Realtime Subscription Setup with Granular Updates
    useEffect(() => {
        // Initial Fetch
        fetchGames();

        if (!isSupabaseConfigured() || !supabase) return;

        // Subscribe to changes in the 'games' table
        const channel = supabase
            .channel('public:games')
            .on(
                'postgres_changes', 
                { event: '*', schema: 'public', table: 'games' }, 
                (payload) => {
                    const newGame = payload.new ? mapDbToGame(payload.new) : null;
                    const oldGameId = payload.old ? (payload.old as any).id : null;

                    if (payload.eventType === 'INSERT' && newGame) {
                        // Add to lists
                        if (newGame.isPublic) {
                            setPublicGames(prev => [newGame, ...prev]);
                        }
                        if (userId && newGame.author_id === userId) {
                            setMyGames(prev => [newGame, ...prev]);
                        }
                    } else if (payload.eventType === 'UPDATE' && newGame) {
                        // Update in lists
                        setPublicGames(prev => {
                            if (newGame.isPublic) {
                                // If already exists, update it. If not (was private), add it.
                                const exists = prev.some(g => g.id === newGame.id);
                                return exists 
                                    ? prev.map(g => g.id === newGame.id ? newGame : g) 
                                    : [newGame, ...prev]; 
                            } else {
                                // If made private, remove from public
                                return prev.filter(g => g.id !== newGame.id);
                            }
                        });

                        if (userId) {
                            setMyGames(prev => prev.map(g => g.id === newGame.id ? newGame : g));
                        }
                    } else if (payload.eventType === 'DELETE' && oldGameId) {
                        // Remove from lists
                        setPublicGames(prev => prev.filter(g => g.id !== oldGameId));
                        setMyGames(prev => prev.filter(g => g.id !== oldGameId));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchGames, userId]);

    // 3. Save Function (Create or Update)
    const saveGame = async (gameData: Partial<GameModule>, isEdit: boolean): Promise<GameModule> => {
        
        // DEMO MODE SAVE
        if (!isSupabaseConfigured() || !supabase) {
            const localData = localStorage.getItem('demo_games');
            let demoGames: GameModule[] = localData ? JSON.parse(localData) : [];

            const newGame: GameModule = {
                ...gameData as GameModule,
                id: isEdit ? gameData.id! : `demo-${Date.now()}`,
                plays: gameData.plays || 0,
                likes: gameData.likes || 0,
                author_id: userId || 'demo-user', // Ensure author is attached
                author: 'You'
            };

            if (isEdit) {
                demoGames = demoGames.map(g => g.id === newGame.id ? newGame : g);
            } else {
                demoGames = [newGame, ...demoGames];
            }

            localStorage.setItem('demo_games', JSON.stringify(demoGames));
            fetchGames(); // Update local state
            return newGame;
        }

        // SUPABASE SAVE
        const payload = {
            title: gameData.title,
            description: gameData.description,
            game_type: gameData.gameType,
            data: gameData.data,
            settings: gameData.settings,
            author_id: userId,
            is_public: gameData.isPublic,
            author_name: gameData.author
        };

        let result;
        if (isEdit && gameData.id) {
            const { data, error } = await supabase
                .from('games')
                .update(payload)
                .eq('id', gameData.id)
                .select()
                .single();
            if (error) throw error;
            result = data;
        } else {
            const { data, error } = await supabase
                .from('games')
                .insert([payload])
                .select()
                .single();
            if (error) throw error;
            result = data;
        }

        return mapDbToGame(result);
    };

    // 4. Delete Function
    const deleteGame = async (id: string) => {
        // DEMO MODE DELETE
        if (!isSupabaseConfigured() || !supabase) {
            const localData = localStorage.getItem('demo_games');
            if (localData) {
                const demoGames: GameModule[] = JSON.parse(localData);
                const filtered = demoGames.filter(g => g.id !== id);
                localStorage.setItem('demo_games', JSON.stringify(filtered));
                fetchGames();
            }
            return;
        }

        // SUPABASE DELETE
        // Step 1: Manually delete 'likes' first to avoid Foreign Key Constraint error
        const { error: likeError } = await supabase.from('likes').delete().eq('game_id', id);
        if (likeError) {
            console.warn("Error cleaning up likes:", likeError.message);
        }

        // Step 2: Delete the game
        const { error } = await supabase.from('games').delete().eq('id', id);
        if (error) throw error;
        // State update handled by Realtime subscription
    };

    // 5. Delete All User Data (Account Deletion Helper)
    const deleteAllUserData = async () => {
        if (!isSupabaseConfigured() || !supabase || !userId) {
            // Demo mode clear
            const localData = localStorage.getItem('demo_games');
            if (localData) {
                const demoGames: GameModule[] = JSON.parse(localData);
                // Keep only games NOT by this user (which is 'demo-user')
                const filtered = demoGames.filter(g => g.author_id !== 'demo-user');
                localStorage.setItem('demo_games', JSON.stringify(filtered));
                fetchGames();
            }
            return;
        }

        try {
            // Delete user's likes
            await supabase.from('likes').delete().eq('user_id', userId);
            
            // Delete user's games (will require deleting associated likes first, but we handle likes above. 
            // If other users liked THIS user's games, we need to delete those likes or cascade.
            // Since we can't easily query "all likes on my games" without complex query, 
            // we rely on Supabase CASCADE if configured, OR we fetch game IDs first.)
            
            // Fetch all game IDs by this user
            const { data: userGames } = await supabase.from('games').select('id').eq('author_id', userId);
            
            if (userGames && userGames.length > 0) {
                const gameIds = userGames.map(g => g.id);
                // Delete all likes associated with these games (from ANY user)
                await supabase.from('likes').delete().in('game_id', gameIds);
                
                // Now delete the games
                await supabase.from('games').delete().in('id', gameIds);
            }
            
            // Local state will be cleared by realtime subscription
            
        } catch (error) {
            console.error("Error deleting user data:", error);
            throw error;
        }
    };

    return {
        publicGames,
        myGames,
        loading,
        fetchGames,
        saveGame,
        deleteGame,
        deleteAllUserData
    };
};