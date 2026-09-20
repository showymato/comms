import { SERVER_TTL } from "@/lib/data/config";
import { fetchers, KEYS } from "@/lib/providers/server-data";
import { serve } from "@/lib/providers/serve";

/** GET /api/prices — every quote in one upstream request (Robinhood /rhj/prices). Raw underlying bid/ask. */
export const GET = () => serve("robinhood", KEYS.prices, SERVER_TTL.prices, fetchers.prices);
