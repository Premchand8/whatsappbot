import { L } from "./i18n.js";
import { nodes } from "./nodes.js";
import { applyPatch, loadState, saveState } from "./session.js";
import type { OutgoingMessage, SessionState, ApplyPatch } from "./types.js";

const DRAFT_SAVE_NODES = new Set([
  "home",
  "mine",
  "help",
  "human",
  "canc",
  "cdone",
  "done",
  "thx",
  "issue",
  "set_lang_en",
  "set_lang_te",
]);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export type TurnResult = {
  state: SessionState & { customerId?: string };
  messages: OutgoingMessage[];
};

type FullState = SessionState & { customerId: string };

async function resolveOnEnter(
  state: FullState,
  onEnter?: ApplyPatch | ((s: SessionState) => ApplyPatch | Promise<ApplyPatch>)
): Promise<FullState> {
  if (!onEnter) return state;
  const patch = typeof onEnter === "function" ? await onEnter(state) : onEnter;
  return applyPatch(state, patch);
}

export async function go(
  waId: string,
  nodeId: string,
  collected: OutgoingMessage[] = []
): Promise<TurnResult> {
  let state: FullState = await loadState(waId);
  const node = nodes[nodeId];
  if (!node) {
    collected.push({ kind: "text", text: `Unknown step: ${nodeId}` });
    return { state, messages: collected };
  }

  if (!DRAFT_SAVE_NODES.has(nodeId) && state.draft) {
    state = { ...state, last: nodeId };
  }

  state = await resolveOnEnter(state, node.onEnter);
  state = { ...state, current: nodeId, tracks: { ...state.tracks, conv: node.title || nodeId } };

  if (node.effect) {
    const patch = await node.effect(state);
    if (patch) state = applyPatch(state, patch);
  }

  for (const mm of node.messages) {
    const pair = typeof mm === "function" ? await mm(state) : mm;
    if (!pair) continue;
    collected.push({ kind: "text", text: L(state.lang, pair) });
  }

  await saveState(state);

  if (node.auto) {
    await sleep(node.auto.delayMs ?? 800);
    const nextId = typeof node.auto.next === "function" ? node.auto.next(state) : node.auto.next;
    return go(waId, nextId, collected);
  }

  const opts = typeof node.options === "function" ? node.options(state) : node.options;
  if (opts && opts.length) {
    const buttons = opts.map((o) => ({
      id: `${nodeId}::${o.id}`,
      title: L(state.lang, o.label),
      style: o.style,
    }));
    const lines = opts.map((o, i) => `${i + 1}. ${L(state.lang, o.label)}`).join("\n");
    collected.push({
      kind: "buttons",
      body:
        buttons.length <= 3
          ? L(state.lang, ["Choose an option:", "ఒక ఎంపిక ఎంచుకోండి:"])
          : lines,
      buttons,
    });
  }

  await saveState(state);
  return { state, messages: collected };
}

export async function handleInbound(
  waId: string,
  input: { text?: string; buttonId?: string }
): Promise<TurnResult> {
  let state: FullState = await loadState(waId);
  const text = (input.text || "").trim();

  // Fresh greeting
  if (!input.buttonId && /^hi+|hello|hey|start|హాయ్/i.test(text)) {
    return go(waId, "home");
  }

  if (input.buttonId) {
    const [nodeId, optId] = input.buttonId.split("::");
    const node = nodes[nodeId || ""];
    if (node) {
      const opts = typeof node.options === "function" ? node.options(state) : node.options;
      const opt = opts?.find((o) => o.id === optId);
      if (opt) {
        state = applyPatch(state, opt.apply);
        await saveState(state);
        const next = typeof opt.next === "function" ? opt.next(state) : opt.next;
        return go(waId, next);
      }
    }
  }

  // Free-text: try match option title on current node
  const node = nodes[state.current];
  if (node?.options && text) {
    const opts = typeof node.options === "function" ? node.options(state) : node.options;
    const match = opts?.find((o) => {
      const en = o.label[0].toLowerCase();
      const te = o.label[1];
      return text.toLowerCase() === en || text === te || text.toLowerCase().includes(en.slice(0, 12));
    });
    if (match) {
      state = applyPatch(state, match.apply);
      await saveState(state);
      const next = typeof match.next === "function" ? match.next(state) : match.next;
      return go(waId, next);
    }
  }

  // Numbered reply 1..n
  if (node?.options && /^[1-9]$/.test(text)) {
    const opts = typeof node.options === "function" ? node.options(state) : node.options;
    const idx = Number(text) - 1;
    const match = opts?.[idx];
    if (match) {
      state = applyPatch(state, match.apply);
      await saveState(state);
      const next = typeof match.next === "function" ? match.next(state) : match.next;
      return go(waId, next);
    }
  }

  return go(waId, "home");
}

export async function startConversation(waId: string): Promise<TurnResult> {
  return go(waId, "home");
}
