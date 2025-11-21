// database.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Only load .env file in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, '.env') });
}

console.log('🔍 Database - Checking environment variables:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Present' : '❌ Missing');
console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Present' : '❌ Missing');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseKey);import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Only load .env file in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, '.env') });
}

console.log('🔍 Database - Checking environment variables:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Present' : '❌ Missing');
console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Present' : '❌ Missing');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function initializeDatabase() {
  console.log('✅ Connected to Supabase');
  return supabase;
}

export async function getDatabase() {
  return supabase;
}

// Get all ingredients
export async function getAllIngredients() {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .order('added_date', { ascending: false });
  
  if (error) throw error;
  return data;
}

// Add new ingredient
export async function addIngredient(ingredient) {
  const { data, error } = await supabase
    .from('ingredients')
    .insert([ingredient])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Delete ingredient by ID
export async function deleteIngredient(id) {
  const { error } = await supabase
    .from('ingredients')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
}

// Delete all ingredients
export async function deleteAllIngredients() {
  const { count, error } = await supabase
    .from('ingredients')
    .delete()
    .neq('id', 0); // Delete all records
  
  if (error) throw error;
  return count;
}

// Search ingredients by name
export async function searchIngredients(query) {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name');
  
  if (error) throw error;
  return data;
}

// Get ingredients by category
export async function getIngredientsByCategory(category) {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .eq('category', category)
    .order('name');
  
  if (error) throw error;
  return data;
}