/**
 * Smoke-test Instant, Assisted, and Variable booking paths in-process.
 */
import { prisma } from "./db.js";
import { handleInbound, startConversation } from "./engine/runner.js";
import { resetConversation } from "./engine/session.js";

async function choose(waId: string, buttonId: string) {
  const r = await handleInbound(waId, { buttonId });
  const last = r.messages.filter((m) => m.kind === "text").at(-1);
  console.log(
    `  -> ${buttonId} | node=${r.state.current} | ${
      last && last.kind === "text" ? last.text.slice(0, 60) : ""
    }`
  );
  return r;
}

async function pathInstant() {
  const waId = "910000000001";
  console.log("\n=== Instant (Plumbing) ===");
  await resetConversation(waId);
  await startConversation(waId);
  await choose(waId, "home::book");
  await choose(waId, "cat::plumbing");
  await choose(waId, "iIssue::leak");
  await choose(waId, "addr::saved");
  await choose(waId, "slot::slot_0");
  await choose(waId, "review::pay");
  await choose(waId, "pay::ok");
  await choose(waId, "sotp::otp_ok");
  await choose(waId, "prog::done");
  await choose(waId, "cotp::complete");
  await choose(waId, "done::great");
  const end = await choose(waId, "thx::back");
  if (end.state.tracks.book !== "Completed") throw new Error("Instant: book not Completed");
  console.log("PASS Instant");
}

async function pathAssisted() {
  const waId = "910000000002";
  console.log("\n=== Assisted (Nursing) ===");
  await resetConversation(waId);
  await startConversation(waId);
  await choose(waId, "home::book");
  await choose(waId, "cat::nursing");
  await choose(waId, "aReq::care");
  await choose(waId, "aDur::w1");
  await choose(waId, "addr::saved");
  await choose(waId, "aPref::tm");
  await choose(waId, "aQuote::approve");
  await choose(waId, "pay::ok");
  const end = await choose(waId, "aCo::back");
  if (end.state.tracks.pay !== "Paid (server verified)") {
    throw new Error("Assisted: pay not verified");
  }
  console.log("PASS Assisted");
}

async function pathVariable() {
  const waId = "910000000003";
  console.log("\n=== Variable (AC) ===");
  await resetConversation(waId);
  await startConversation(waId);
  await choose(waId, "home::book");
  await choose(waId, "cat::ac");
  await choose(waId, "vIssue::ac_cool");
  await choose(waId, "addr::saved");
  await choose(waId, "slot::slot_1");
  await choose(waId, "review::pay");
  await choose(waId, "pay::ok");
  await choose(waId, "sotp::otp_ok");
  await choose(waId, "vq::approve");
  await choose(waId, "cotp::complete");
  await choose(waId, "done::great");
  const end = await choose(waId, "thx::back");
  if (end.state.tracks.book !== "Completed") throw new Error("Variable: book not Completed");
  console.log("PASS Variable");
}

async function main() {
  await pathInstant();
  await pathAssisted();
  await pathVariable();
  console.log("\nAll smoke paths passed.");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
