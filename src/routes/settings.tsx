import { createFileRoute, redirect } from '@tanstack/react-router'
import { supabase } from "@/integrations/supabase/client"
import { SettingsPage } from './_authenticated/settings' // Temporary fallback or rewrite your SettingsPage component UI block directly here

export const Route = createFileRoute('/settings')({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: '/auth' });
    }
    return { user: data.user };
  },
  head: () => ({ meta: [{ title: "Settings - MWA" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
})
