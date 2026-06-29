// =====================================================================
//  KONFIGURATION
//  Fyll i dessa tre värden enligt guiden (steg 6). Inga hemligheter här –
//  anon-nyckeln och VAPID-PUBLIC-nyckeln är avsedda att ligga i klienten.
//  Din Trafikverket-nyckel och VAPID-PRIVATE ligger ALDRIG här, utan som
//  secrets i Supabase.
// =====================================================================
window.TT_CONFIG = {
  // Från Supabase → Project Settings → API
  SUPABASE_URL: "https://spcexkaygcvwwqsskhqg.supabase.coo",
  SUPABASE_ANON_KEY: "yJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwY2V4a2F5Z2N2d3dxc3NraHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MjE4NzMsImV4cCI6MjA5ODI5Nzg3M30.2TNlqdxBk4NopIvkCl7_VJqaB3n7otIpZwI0GDHZIjY",

  // VAPID public key (genereras i guiden, steg 4)
  VAPID_PUBLIC_KEY: "BIvjgB8FFLkKVJtabBaSSxpV-P9fGIg3RnzQMijwU7TV0444w17jEfkiAOQRa0ie4tKP1XOj7Popk3hMNt_A-IM",
};
