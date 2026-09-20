/** Pretty-printed JSON for code blocks. (The documented API itself lives in data/api-spec.ts.) */
export const json = (v: unknown) => JSON.stringify(v, null, 2);
