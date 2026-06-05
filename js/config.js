// ============================================================
// config.js — URLs, keys, platform constants
// To move to VPS: change NB and SUPABASE_URL only
// ============================================================

var NB = window.location.origin + '/webhook';

var SUPABASE_URL = 'https://bkdbqpjourrnjbfrqedi.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZGJxcGpvdXJybmpiZnJxZWRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MDI1MTQsImV4cCI6MjA5NTk3ODUxNH0.QRs2c-69GX1XbStIIJSCpBGD-C98gVfnd8pJws3m4fQ';

// Page colors — add new pages here
var PC = {
  'A1': '#1877f2',
  'A2': '#0d8a6f',
  '4.0': '#7c3aed',
  'Bag Xpress': '#ea580c',
  '5.0': '#d97706',
  '6.0': '#db2777',
  '8.0': '#64748b',
  'Unknown': '#888'
};

// Platform identifiers — future use
var PLATFORMS = {
  FACEBOOK: 'facebook',
  WHATSAPP: 'whatsapp',    // future
  INSTAGRAM: 'instagram',  // future
  TELEGRAM: 'telegram'     // future
};
