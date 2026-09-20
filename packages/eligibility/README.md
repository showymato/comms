# @comms/eligibility

Typed client for the COMMS API. Read-only: it never signs, sends transactions or asks for approvals.

```ts
import { createClient } from "@comms/eligibility";

const eligibility = createClient({ baseUrl: process.env.COMMS_API_URL });

const result = await eligibility.check(tokenAddress);          // default policy
const strict = await eligibility.check(tokenAddress, { minLiquidityUsd: 2_000_000 }); // custom policy

if (result.eligibility === "ELIGIBLE") {
  // protocol can continue
}
```

`result.eligibility` is one of `ELIGIBLE | INELIGIBLE | CONDITIONAL | UNKNOWN`. In `result.checks`, each value is the observed state its name describes (`tokenPaused: false` = not paused) and
`null` = UNKNOWN (no verifiable evidence); `evidence[].result` says PASS / FAIL / UNKNOWN. Treat UNKNOWN as "do not assume either way".

Inside this repository the package is consumed from source (`packages/eligibility/src/index.ts`); it is not yet published to npm.
