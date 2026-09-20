"use client";

import { Copy, Plus } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import type { Asset, Policy, PolicyInput } from "@/types";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/overlay";
import { Panel, PanelHeader } from "@/components/ui/primitives";
import { policyService } from "@/lib/services";
import { useStore } from "@/hooks/use-store";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { savedPoliciesStore } from "@/lib/workspace";
import { CopyButton } from "@/components/ui/code-block";
import { RuleEditor } from "./rule-editor";
import { PolicySimulator } from "./policy-simulator";

type Rules = Pick<PolicyInput, "minLiquidityUsd" | "oracleRequired" | "transferRequired" | "redemptionRequired">;
const pickRules = (p: Rules): Rules => ({ minLiquidityUsd: p.minLiquidityUsd, oracleRequired: p.oracleRequired, transferRequired: p.transferRequired, redemptionRequired: p.redemptionRequired });
const NEW_RULES: Rules = { minLiquidityUsd: 100_000, oracleRequired: true, transferRequired: true, redemptionRequired: true };

export function PolicyWorkspace({ assets, initialAsset, initialPolicy }: { assets: Asset[]; initialAsset?: string; initialPolicy?: string }) {
  const policies = useStore(policyService.state);
  const [selectedId, setSelectedId] = useState(policies.find((p) => p.id === initialPolicy)?.id ?? "DEFAULT");
  const selected = policies.find((p) => p.id === selectedId) ?? policies[0];

  const [draft, setDraft] = useState<Rules>(pickRules(selected));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [creating, setCreating] = useState<Rules | null>(null);
  const [apiId, setApiId] = useState<{ id: string; error?: string } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(pickRules(selected));
    setSaved(false);
  }, [selected]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(pickRules(selected)), [draft, selected]);

  async function save() {
    setSaving(true);
    await policyService.update(selected.id, { name: selected.name, description: selected.description, ...draft });
    setSaving(false);
    setSaved(true);
    // also keep a copy in this browser so it survives a reload (the policy service itself is in-memory)
    savedPoliciesStore.set((all) => [{ id: selected.id, name: selected.name, ...draft, savedAt: new Date().toISOString() }, ...all.filter((x) => x.id !== selected.id)]);
  }

  /** A real request: POST /api/policies validates the draft and returns its stateless id for use with /api/eligibility/check. */
  async function mint() {
    try {
      const res = await fetch("/api/policies", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: selected.name, ...draft }) });
      const body = (await res.json()) as { data: { id: string } | null; meta: { error?: string } };
      setApiId(body.data ? { id: body.data.id } : { id: "", error: body.meta.error ?? `HTTP ${res.status}` });
    } catch (e) {
      setApiId({ id: "", error: e instanceof Error ? e.message : "Request failed" });
    }
  }

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* list */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="label">Policies · {policies.length}</span>
            <Button size="sm" variant="secondary" onClick={() => setCreating(NEW_RULES)}>
              <Plus size={14} /> Create policy
            </Button>
          </div>
          <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0" aria-label="Policies">
            {policies.map((p) => (
              <li key={p.id} id={p.id} className="shrink-0 lg:shrink">
                <button
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  aria-pressed={p.id === selectedId}
                  className={cn(
                    "w-56 rounded-lg border p-3.5 text-left transition-colors lg:w-full",
                    p.id === selectedId ? "border-cyan/40 bg-surface-2" : "border-line bg-surface/60 hover:border-line-2",
                  )}
                >
                  <span className="flex items-center justify-between">
                    <span className="font-mono text-[13px] font-medium text-ink">{p.name}</span>
                    {p.builtIn ? <span className="rounded-xs border border-line px-1.5 font-mono text-[9.5px] text-ink-3">BUILT-IN</span> : null}
                  </span>
                  <span className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px] text-ink-3">
                    <span>Liquidity</span><span className="text-right text-ink-2">{formatUsd(p.minLiquidityUsd, { compact: true })}</span>
                    <span>Oracle</span><span className="text-right text-ink-2">{p.oracleRequired ? "YES" : "NO"}</span>
                    <span>Transfer</span><span className="text-right text-ink-2">{p.transferRequired ? "YES" : "NO"}</span>
                    <span>Redemption</span><span className="text-right text-ink-2">{p.redemptionRequired ? "YES" : "NO"}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* editor */}
        <div className="min-w-0">
          <Panel className="mb-3">
            <PanelHeader
              title={`Policy · ${selected.name}`}
              meta={
                <span className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setCreating(pickRules(selected))}>
                    <Copy size={13} /> Duplicate
                  </Button>
                </span>
              }
            />
            <p className="px-4 py-3 text-[13.5px] text-ink-2">{selected.description}</p>
          </Panel>
          <RuleEditor value={draft} onChange={setDraft} />
          <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
            <Button size="sm" variant="ghost" onClick={() => void mint()}>
              Get API policy ID
            </Button>
            <span role="status" className="font-mono text-[11.5px] text-ink-3">
              {saved && !dirty ? <span className="text-eligible">✓ Saved</span> : dirty ? "Unsaved changes" : "No changes"}
            </span>
            <Button size="sm" variant="ghost" disabled={!dirty} onClick={() => setDraft(pickRules(selected))}>
              Reset
            </Button>
            <Button size="sm" variant="primary" disabled={!dirty || saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
          {apiId ? (
            <p role="status" className="mt-3 flex flex-wrap items-center justify-end gap-2 font-mono text-[11.5px] text-ink-3">
              {apiId.error ? (
                <span className="text-ineligible">{apiId.error}</span>
              ) : (
                <>
                  <span className="break-all text-ink">{apiId.id}</span>
                  <CopyButton text={apiId.id} label="Copy ID" />
                  <span>Stateless: the id encodes the policy. Nothing is stored server-side.</span>
                </>
              )}
            </p>
          ) : null}
        </div>
      </div>

      <PolicySimulator assets={assets} policies={policies} initialAsset={initialAsset} initialPolicy={selectedId} key={selectedId} />

      <CreatePolicyModal
        rules={creating}
        onClose={() => setCreating(null)}
        onCreated={(p) => {
          setCreating(null);
          setSelectedId(p.id);
        }}
      />
    </div>
  );
}

function CreatePolicyModal({ rules, onClose, onCreated }: { rules: Rules | null; onClose: () => void; onCreated: (p: Policy) => void }) {
  const id = useId();
  const policies = useStore(policyService.state);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [draft, setDraft] = useState<Rules>(NEW_RULES);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (rules) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(rules);
      setName("");
      setDescription("");
      setTouched(false);
    }
  }, [rules]);

  const clean = name.trim().toUpperCase().replace(/[^A-Z0-9_-]+/g, "_");
  const error = !clean ? "Give the policy a name." : clean.length < 2 ? "Use at least 2 characters." : policies.some((p) => p.id === clean) ? "A policy with this name already exists." : null;

  return (
    <Modal
      open={!!rules}
      onClose={onClose}
      eyebrow="New policy"
      title="Create policy"
      className="max-w-2xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            disabled={busy}
            onClick={async () => {
              setTouched(true);
              if (error) return;
              setBusy(true);
              const p = await policyService.create({ name: clean, description: description.trim() || "Custom policy.", ...draft });
              setBusy(false);
              onCreated(p);
            }}
          >
            {busy ? "Creating…" : "Create policy"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        <div>
          <label htmlFor={`${id}-name`} className="label mb-1.5 block">Name</label>
          <input
            id={`${id}-name`}
            data-autofocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. CONSERVATIVE"
            aria-invalid={touched && !!error}
            aria-describedby={touched && error ? `${id}-err` : undefined}
            className="h-10 w-full rounded-md border border-line-2 bg-base-1 px-3 font-mono text-[13px] text-ink uppercase outline-none placeholder:normal-case placeholder:text-ink-4 focus:border-cyan/60"
          />
          {touched && error ? <p id={`${id}-err`} role="alert" className="mt-1.5 text-xs text-ineligible">{error}</p> : clean ? <p className="mt-1.5 font-mono text-[11px] text-ink-3">ID · {clean}</p> : null}
        </div>
        <div>
          <label htmlFor={`${id}-desc`} className="label mb-1.5 block">Description <span className="text-ink-4 normal-case">(optional)</span></label>
          <input id={`${id}-desc`} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={120} className="h-10 w-full rounded-md border border-line-2 bg-base-1 px-3 text-[13px] text-ink outline-none focus:border-cyan/60" />
        </div>
        <RuleEditor value={draft} onChange={setDraft} />
      </div>
    </Modal>
  );
}
