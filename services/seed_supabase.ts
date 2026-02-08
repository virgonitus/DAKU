import { createClient } from '@supabase/supabase-js';
import { INITIAL_USERS, INITIAL_BRANCHES, INITIAL_AREAS } from './initialData';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
// NOTE: For admin user creation, we technically need SERVICE_ROLE_KEY to bypass email verification or set passwords directly. 
// However, since we are doing client-side simulation first, we will ask user to Sign Up manually or provide SERVICE_ROLE_KEY.
// For now, let's just create public data (Branches/Areas) if any. 

// Actually, we can use the signUp API to create users if "Enable email adjustments" is on, or just guide user.
// Let's create a script that outputs SQL to insert USERS into auth.users (requires psql or dashboard SQL) is better.

// Wait, the user has ANON key which is safe.
// Let's try to sign up the admin user via API.

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Env Variables");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log("Seeding...");

    // 1. SignUp Initial Users
    for (const user of INITIAL_USERS) {
        const { data, error } = await supabase.auth.signUp({
            email: `${user.username}@daku.com`, // Fake email
            password: (user.password && user.password.length >= 6) ? user.password : '123456',
            options: {
                data: {
                    username: user.username,
                    full_name: user.name,
                    role: user.role,
                    branch_code: user.branchCode,
                    area_code: user.areaCode
                }
            }
        });

        if (error) {
            console.error(`Failed to create ${user.username}:`, error.message);
        } else {
            console.log(`Created user: ${user.username} (ID: ${data.user?.id})`);

            // The Trigger in PostgreSQL should handle profile creation if we set it up.
            // But our schema didn't have a trigger. We rely on the client or manual insert.
            // Let's insert into profiles manually if SignUp successful.
            if (data.user) {
                const { error: profileError } = await supabase.from('profiles').insert({
                    id: data.user.id,
                    username: user.username,
                    full_name: user.name,
                    role: user.role,
                    branch_code: user.branchCode,
                    area_code: user.areaCode
                });
                if (profileError) console.error("Profile insert failed:", profileError.message);
            }
        }
    }

    console.log("Seeding Config done.");
}

seed();
