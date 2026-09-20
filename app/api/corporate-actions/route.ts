import { SERVER_TTL } from "@/lib/data/config";
import { fetchers, KEYS } from "@/lib/providers/server-data";
import { serve } from "@/lib/providers/serve";

/** GET /api/corporate-actions — Robinhood /rhj/corporate-actions, normalized. */
export const GET = () => serve("robinhood", KEYS.corporateActions, SERVER_TTL.corporateActions, fetchers.corporateActions);
