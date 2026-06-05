(function () {
  var script = document.currentScript;
  var botId = script && script.getAttribute("data-bot-id");
  if (!botId) { console.error("[ClientHunter widget] missing data-bot-id"); return; }

  var origin = new URL(script.src).origin;
  var projectRef = "zwqtwgjpcxmgkmwhkmne";
  var endpoint = "https://" + projectRef + ".supabase.co/functions/v1/chatbot-message";

  // Load bot config (anon read of active bots is allowed by RLS)
  var anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3cXR3Z2pwY3htZ2ttd2hrbW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDE0NDMsImV4cCI6MjA5MDk3NzQ0M30.iBabIIH209DX7RbAwaQm1MCxzcRut_aiBDnyKjlGWI4";
  fetch("https://" + projectRef + ".supabase.co/rest/v1/chatbots?id=eq." + botId + "&select=name,brand_color,welcome_message,logo_url,is_active", {
    headers: { apikey: anonKey, Authorization: "Bearer " + anonKey },
  }).then(function (r) { return r.json(); }).then(function (rows) {
    var cfg = rows && rows[0];
    if (!cfg || !cfg.is_active) return;
    mount(cfg);
  }).catch(function (e) { console.error("[ClientHunter widget]", e); });

  function mount(cfg) {
    var color = cfg.brand_color || "#3B82F6";
    var threadId = sessionStorage.getItem("ch_thread_" + botId) || null;
    var open = false;

    var host = document.createElement("div");
    host.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:2147483647;";
    document.body.appendChild(host);
    var shadow = host.attachShadow({ mode: "open" });

    shadow.innerHTML =
      '<style>' +
      '*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}' +
      '.bubble{width:60px;height:60px;border-radius:50%;background:' + color + ';color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.2);border:none}' +
      '.panel{position:absolute;bottom:74px;right:0;width:360px;max-width:calc(100vw - 40px);height:520px;max-height:calc(100vh - 100px);background:#fff;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.18);display:none;flex-direction:column;overflow:hidden;color:#111}' +
      '.panel.open{display:flex}' +
      '.head{background:' + color + ';color:#fff;padding:14px 16px;font-weight:600;display:flex;justify-content:space-between;align-items:center}' +
      '.head button{background:transparent;border:none;color:#fff;cursor:pointer;font-size:18px}' +
      '.msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f8fafc}' +
      '.msg{max-width:80%;padding:8px 12px;border-radius:12px;font-size:14px;line-height:1.4;white-space:pre-wrap}' +
      '.user{align-self:flex-end;background:' + color + ';color:#fff}' +
      '.bot{align-self:flex-start;background:#fff;border:1px solid #e5e7eb}' +
      '.in{display:flex;border-top:1px solid #e5e7eb;padding:8px;gap:6px;background:#fff}' +
      '.in input{flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;font-size:14px;outline:none}' +
      '.in button{background:' + color + ';color:#fff;border:none;border-radius:8px;padding:0 14px;cursor:pointer;font-size:14px}' +
      '.in button:disabled{opacity:.5}' +
      '</style>' +
      '<button class="bubble" id="bub" aria-label="Open chat">' +
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
      '</button>' +
      '<div class="panel" id="pan">' +
      '<div class="head"><span>' + escapeHtml(cfg.name || "Chat") + '</span><button id="cls">×</button></div>' +
      '<div class="msgs" id="msgs"></div>' +
      '<div class="in"><input id="inp" placeholder="Type a message..." /><button id="snd">Send</button></div>' +
      '</div>';

    var $ = function (id) { return shadow.getElementById(id); };
    var msgs = $("msgs"), inp = $("inp"), snd = $("snd"), pan = $("pan");

    addMsg("bot", cfg.welcome_message || "Hi! How can I help?");

    $("bub").onclick = function () { open = !open; pan.classList.toggle("open", open); if (open) inp.focus(); };
    $("cls").onclick = function () { open = false; pan.classList.remove("open"); };
    snd.onclick = send;
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") send(); });

    function addMsg(role, text) {
      var d = document.createElement("div");
      d.className = "msg " + role;
      d.textContent = text;
      msgs.appendChild(d);
      msgs.scrollTop = msgs.scrollHeight;
      return d;
    }
    function send() {
      var text = inp.value.trim();
      if (!text) return;
      inp.value = ""; snd.disabled = true;
      addMsg("user", text);
      var pending = addMsg("bot", "…");
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: "Bearer " + anonKey },
        body: JSON.stringify({ bot_id: botId, message: text, thread_id: threadId }),
      }).then(function (r) { return r.json(); }).then(function (data) {
        if (data.thread_id) { threadId = data.thread_id; sessionStorage.setItem("ch_thread_" + botId, threadId); }
        pending.textContent = data.reply || data.error || "Sorry, something went wrong.";
      }).catch(function () {
        pending.textContent = "Network error. Please try again.";
      }).finally(function () { snd.disabled = false; inp.focus(); });
    }
    function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (c) {
      return { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]; }); }
  }
})();
