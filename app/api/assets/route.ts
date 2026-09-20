import { SERVER_TTL } from "@/lib/data/config";
import { fetchers, KEYS } from "@/lib/providers/server-data";
import { serve } from "@/lib/providers/serve";

/** GET /api/assets — normalized Stock Token registry (Robinhood /rhj/assets). */
export const GET = () => serve("robinhood", KEYS.registry, SERVER_TTL.registry, fetchers.registry);
