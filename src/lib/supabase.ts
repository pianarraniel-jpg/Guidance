import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ecluqqnyooocohemcgpy.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjbHVxcW55b29vY29oZW1jZ3B5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMjMwMTYsImV4cCI6MjA5NDU5OTAxNn0.yzWbh3l10Rgko7leunyY9FxnBER6lOm-d8bONC8m2-w';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
