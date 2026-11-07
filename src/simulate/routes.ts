import { Router } from "express";
import { paymentProvider } from "../domain/payment.js";
import { handleInbound, startConversation } from "../engine/runner.js";
import { resetConversation, loadState } from "../engine/session.js";
import { prisma } from "../db.js";

export const simulateRouter = Router();

simulateRouter.get("/", (_req, res) => {
  res.type("html").send(simulatorHtml());
});

simulateRouter.post("/start", async (req, res) => {
  const waId = String(req.body.waId || "919999000001");
  await resetConversation(waId);
  const result = await startConversation(waId);
  res.json(result);
});

simulateRouter.post("/message", async (req, res) => {
  const waId = String(req.body.waId || "919999000001");
  const text = req.body.text ? String(req.body.text) : undefined;
  const buttonId = req.body.buttonId ? String(req.body.buttonId) : undefined;
  const result = await handleInbound(waId, { text, buttonId });
  res.json(result);
});

simulateRouter.get("/state/:waId", async (req, res) => {
  const state = await loadState(req.params.waId);
  res.json(state);
});

simulateRouter.get("/pay/:paymentId", async (req, res) => {
  const payment = await prisma.payment.findUnique({ where: { id: req.params.paymentId } });
  if (!payment) {
    res.status(404).send("Payment not found");
    return;
  }
  res.type("html").send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Mock checkout</title>
<style>body{font:16px system-ui;max-width:420px;margin:40px auto;padding:0 16px}
button{display:block;width:100%;margin:8px 0;padding:12px;font:inherit;border-radius:8px;border:1px solid #ccc;cursor:pointer}
.ok{background:#075e54;color:#fff;border:0}</style></head><body>
<h1>Mock checkout</h1>
<p>Amount: ₹${(payment.amountPaise / 100).toFixed(0)}</p>
<p>Booking: ${payment.bookingId}</p>
<form method="POST" action="/simulate/pay/${payment.id}/result"><input type="hidden" name="result" value="paid"><button class="ok">Payment succeeds</button></form>
<form method="POST" action="/simulate/pay/${payment.id}/result"><input type="hidden" name="result" value="failed"><button>Payment fails</button></form>
<form method="POST" action="/simulate/pay/${payment.id}/result"><input type="hidden" name="result" value="pending"><button>Payment pending</button></form>
</body></html>`);
});

simulateRouter.post("/pay/:paymentId/result", async (req, res) => {
  const result = String(req.body.result || "paid") as "paid" | "failed" | "pending";
  await paymentProvider.markResult(req.params.paymentId, result);
  res.type("html").send(`<p>Marked ${result}. Return to the simulator and continue the chat.</p><a href="/simulate">Back</a>`);
});

function simulatorHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ReadyLocal WhatsApp simulator</title>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;700&family=Noto+Sans+Telugu:wght@400;600&display=swap" rel="stylesheet">
<style>
:root{--bg:#eef2f1;--panel:#fff;--ink:#14211f;--mut:#5b6b68;--line:#d6dedc;--acc:#075e54}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 'Hanken Grotesk','Noto Sans Telugu',system-ui,sans-serif}
main{max-width:980px;margin:0 auto;padding:20px 16px;display:grid;grid-template-columns:380px 1fr;gap:28px}
@media(max-width:860px){main{grid-template-columns:1fr}}
h1{font-size:22px;margin:0 0 4px}
.mut{color:var(--mut);font-size:13px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin-top:12px}
.row{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-top:1px solid var(--line);font-size:14px}
.row:first-of-type{border-top:0}
.phone{width:380px;max-width:100%;height:700px;border:8px solid #1b1b1b;border-radius:30px;overflow:hidden;display:flex;flex-direction:column;background:#efe7dd;box-shadow:0 8px 28px rgba(0,0,0,.2)}
.hd{background:#075e54;color:#fff;padding:10px 14px;display:flex;align-items:center;gap:10px}
.av{width:34px;height:34px;border-radius:50%;background:#fff;color:#075e54;font-weight:700;display:grid;place-items:center}
.hd small{display:block;opacity:.8;font-size:12px}
#chat{flex:1;overflow-y:auto;padding:12px 10px;display:flex;flex-direction:column;gap:6px;color:#111}
.b{max-width:84%;padding:7px 10px;border-radius:8px;white-space:pre-line;box-shadow:0 1px 1px rgba(0,0,0,.12);font-size:14px;line-height:1.45}
.bot{background:#fff;align-self:flex-start;border-top-left-radius:2px}
.me{background:#d9fdd3;align-self:flex-end;border-top-right-radius:2px}
.opts{align-self:flex-start;width:84%;display:flex;flex-direction:column;gap:5px}
.o{font:inherit;font-size:14px;background:#fff;color:#0a7cff;border:0;border-radius:8px;padding:9px;text-align:center;cursor:pointer;box-shadow:0 1px 1px rgba(0,0,0,.12)}
.o.sim{color:#555;border:1px dashed #9aa}
.o.hi{color:#075e54;font-weight:700}
.bar{background:#f0f0f0;padding:8px 10px;display:flex;gap:8px;align-items:center}
.bar input{flex:1;border:0;border-radius:16px;padding:8px 12px;font:inherit}
.bar button{font:inherit;font-size:13px;border:0;background:#fff;border-radius:16px;padding:6px 12px;cursor:pointer;color:#075e54}
.ctl button{font:inherit;border:1px solid var(--line);background:var(--panel);padding:7px 12px;border-radius:8px;cursor:pointer;margin-right:6px}
</style>
</head>
<body>
<main>
  <div class="phone">
    <div class="hd"><div class="av">R</div><div>ReadyLocal<small>Simulator · not live WhatsApp</small></div></div>
    <div id="chat"></div>
    <div class="bar"><input id="inp" placeholder="Type a message" /><button id="send">Send</button><button id="hi">Hi</button></div>
  </div>
  <div>
    <h1>ReadyLocal on WhatsApp</h1>
    <div class="mut">Same conversation engine that will run on your Meta Cloud API number. Paste credentials in <code>.env</code> and set <code>WHATSAPP_MODE=live</code> to go live.</div>
    <div class="card"><div class="ctl"><button id="reset">Restart</button></div></div>
    <div class="card"><h2 style="margin:0 0 8px;font-size:15px">Status tracks</h2><div id="st"></div></div>
    <div class="card mut">Paths: Plumbing = Instant · Nursing = Assisted · AC = Variable price. At payment, use the sim buttons.</div>
  </div>
</main>
<script>
const waId = '919999000001';
const chat = document.getElementById('chat');
const st = document.getElementById('st');

function bub(t,c){const d=document.createElement('div');d.className='b '+c;d.textContent=t;chat.appendChild(d);chat.scrollTop=chat.scrollHeight}
function renderState(state){
  const t=state.tracks||{};
  st.innerHTML=['conv','book','pay','asg','ref','sup'].map(k=>\`<div class="row"><span class="mut">\${k}</span><b>\${t[k]||'—'}</b></div>\`).join('');
}
function renderMessages(msgs){
  chat.querySelectorAll('.opts').forEach(e=>e.remove());
  for(const m of msgs){
    if(m.kind==='text'||m.kind==='tag') bub(m.text,'bot');
    else if(m.kind==='buttons'){
      const box=document.createElement('div');box.className='opts';
      for(const b of m.buttons){
        const btn=document.createElement('button');
        btn.className='o '+(b.style||'');
        btn.textContent=b.title;
        btn.onclick=()=>tap(b.id,b.title);
        box.appendChild(btn);
      }
      chat.appendChild(box);chat.scrollTop=chat.scrollHeight;
    }
  }
}
async function start(){
  chat.innerHTML='';
  const r=await fetch('/simulate/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({waId})}).then(r=>r.json());
  bub('Hi','me');
  renderMessages(r.messages);renderState(r.state);
}
async function tap(buttonId,title){
  bub(title,'me');
  const r=await fetch('/simulate/message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({waId,buttonId})}).then(r=>r.json());
  renderMessages(r.messages);renderState(r.state);
}
async function sendText(text){
  if(!text) return;
  bub(text,'me');
  document.getElementById('inp').value='';
  const r=await fetch('/simulate/message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({waId,text})}).then(r=>r.json());
  renderMessages(r.messages);renderState(r.state);
}
document.getElementById('reset').onclick=start;
document.getElementById('hi').onclick=()=>sendText('Hi');
document.getElementById('send').onclick=()=>sendText(document.getElementById('inp').value.trim());
document.getElementById('inp').addEventListener('keydown',e=>{if(e.key==='Enter')sendText(e.target.value.trim())});
start();
</script>
</body>
</html>`;
}
