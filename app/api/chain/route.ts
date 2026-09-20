import { SERVER_TTL } from "@/lib/data/config";
import { fetchers, KEYS } from "@/lib/providers/server-data";
import { serve } from "@/lib/providers/serve";

/** GET /api/chain — latest Robinhood Chain (4663) block, cached a few seconds so RPC traffic stays low. */
export const GET = () => serve("chain", KEYS.chain, SERVER_TTL.chain, fetchers.chain);
