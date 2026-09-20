import { fetchers, KEYS } from "@/lib/providers/server-data";
import { serve } from "@/lib/providers/serve";

/** GET /api/chain/paused — paused() for every registry contract at one pinned block (rate-limit-friendly sweep, cached 5 min). */
export const GET = () => serve("chain", KEYS.paused, 300, fetchers.paused);
