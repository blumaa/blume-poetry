/**
 * Migration script to transfer poems from JSON to Supabase
 *
 * Prerequisites:
 * 1. Create a Supabase project at https://supabase.com
 * 2. Run the schema.sql in your Supabase SQL Editor
 * 3. Set environment variables in .env.local
 *
 * Run with:
 * npx tsx scripts/migrate-to-supabase.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import type { Database } from '../lib/supabase/types';

interface JsonPoem {
  id: string;
  slug: string;
  title: string;
  content: string;
  plainText: string;
  publishedAt: string;
  url: string;
  x?: number;
  y?: number;
  luminosity?: number;
}

async function migrate() {
  // Check for environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables.');
    console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  // Create Supabase admin client
  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

  // Read poems from JSON file
  const poemsPath = path.join(process.cwd(), 'data', 'poems.json');
  const poemsJson = fs.readFileSync(poemsPath, 'utf-8');
  const poems: JsonPoem[] = JSON.parse(poemsJson);

  console.log(`Found ${poems.length} poems to migrate`);

  // Transform and insert poems
  const poemsToInsert: Database['public']['Tables']['poems']['Insert'][] = poems.map((poem) => ({
    slug: poem.slug,
    title: poem.title,
    content: poem.content,
    plain_text: poem.plainText,
    published_at: poem.publishedAt,
    status: 'published' as const,
    url: poem.url,
  }));

  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < poemsToInsert.length; i += batchSize) {
    const batch = poemsToInsert.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('poems')
      .upsert(batch, { onConflict: 'slug', ignoreDuplicates: false })
      .select();

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error.message);
      errors += batch.length;
    } else {
      inserted += data?.length || 0;
      console.log(`Inserted batch ${i / batchSize + 1}: ${data?.length || 0} poems`);
    }
  }

  console.log('\n--- Migration Complete ---');
  console.log(`Successfully inserted: ${inserted} poems`);
  console.log(`Errors: ${errors}`);

  // Verify migration
  const { count } = await supabase
    .from('poems')
    .select('*', { count: 'exact', head: true });

  console.log(`\nTotal poems in database: ${count}`);
}

migrate().catch(console.error);
