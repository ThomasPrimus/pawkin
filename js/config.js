const { createClient } = window.supabase;

const SUPABASE_URL = 'https://csgvhxtwihpzhekofyzb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzZ3ZoeHR3aWhwemhla29meXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0OTIyNDAsImV4cCI6MjEwMDA2ODI0MH0.vXEwZpdf7E4sGloO7OK4__NEpygHK5miDILNDKCrAKY';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
