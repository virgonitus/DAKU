import { supabase } from './supabase';
import { User, Role } from '../types';

export const authService = {
    // Login with Username (mapped to email)
    async signIn(username: string, password: string): Promise<{ user: User | null; error: any }> {
        const email = `${username}@daku.com`; // Map username to fake email

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (authError) return { user: null, error: authError };

        if (authData.user) {
            // Fetch Profile Details
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authData.user.id)
                .single();

            if (profileError) {
                console.error("Profile fetch error:", profileError);
                return { user: null, error: profileError };
            }

            // Map to User type
            const user: User = {
                id: authData.user.id,
                username: profile.username,
                name: profile.full_name,
                role: profile.role as Role,
                branchCode: profile.branch_code,
                areaCode: profile.area_code
            };

            return { user, error: null };
        }

        return { user: null, error: 'Unknown error' };
    },

    async signOut() {
        return await supabase.auth.signOut();
    },

    async getCurrentUser(): Promise<User | null> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return null;

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (!profile) return null;

        return {
            id: session.user.id,
            username: profile.username,
            name: profile.full_name,
            role: profile.role as Role,
            branchCode: profile.branch_code,
            areaCode: profile.area_code
        };
    }
};
