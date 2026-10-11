import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import { createChatHandler } from './handler.mjs';
serve(createChatHandler({ env: (name: string) => Deno.env.get(name), createClient }));
