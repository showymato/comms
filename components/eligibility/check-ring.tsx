"use client";

import { motion } from "motion/react";
import type { CheckOutcome } from "@/types";
import { CHECK_STATUS, STATUS } from "@/lib/status";

/** Nine segments, one per check, coloured by outcome. The product's identity mark, as data. */
export function CheckRing({ checks, size = 132, label }: { checks: CheckOutcome[]; size?: number; label?: React.ReactNode }) {
  const R = 46;
  const arc = (i: number) => {
    const p = (deg: number) => {
      const a = (deg * Math.PI) / 180;
      return `${(60 + R * Math.cos(a)).toFixed(2)} ${(60 + R * Math.sin(a)).toFixed(2)}`;
    };
    const a0 = -90 + i * 40 + 4;
    return `M${p(a0)} A${R} ${R} 0 0 1 ${p(a0 + 32)}`;
  };
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`${checks.filter((c) => c.result === "PASS").length} of ${checks.length} checks passed`}>
        {checks.map((c, i) => (
          <motion.path
            key={c.id}
            d={arc(i)}
            fill="none"
            strokeWidth={5}
            stroke={STATUS[CHECK_STATUS[c.result]].hex}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: c.required || c.result === "PASS" ? 1 : 0.4 }}
            transition={{ duration: 0.5, delay: 0.1 + i * 0.06 }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{label}</div>
    </div>
  );
}
