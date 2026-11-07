/* HomeTally shared behaviors: buy buttons, lead forms, fine print.
   Reads window.HOMETALLY_CONFIG from config.js. Only the boxes a person fills in a form are sent
   (to the HomeTally Leads Google Form). Letters, documents and checker numbers are never sent. */
(function () {
  "use strict";
  var C = window.HOMETALLY_CONFIG || {};
  var LINKS = C.PAYMENT_LINKS || {};
  var PRICES = C.PRICES || {};
  var PLAN_NAMES = {
    fixKit: "Fix Kit (" + ((PRICES.fixKit || {}).label || "$39 one-time") + ")",
    watch: "Payment Watch (" + ((PRICES.watch || {}).label || "$49 a year") + ")"
  };
  var FINE = {
    "default": "How we use this: only to reply to you about HomeTally. It goes to a private sheet only HomeTally's founder can read. We never sell it. Your letters and documents are never sent; this form sends only the boxes above. Not legal or tax advice.",
    buy: "How we use this: to record that you want this plan, email you a secure payment link and set up what you bought. Card payments are handled by Stripe; HomeTally never asks for or stores card numbers. It goes to a private sheet only HomeTally's founder can read. We never sell it. Your letters and documents are never sent.",
    insurance: "How we use this: to contact you about an insurance review. We ask you first before passing your name and number to any licensed agent, and only to that one agent. It goes to a private sheet only HomeTally's founder can read. We never sell it.",
    protest: "How we use this: to tell you when the done-for-you protest opens (it needs a Texas property tax consultant registration first). It goes to a private sheet only HomeTally's founder can read. We never sell it. Not legal or tax advice.",
    partner: "How we use this: to reply to you about a partnership. It goes to a private sheet only HomeTally's founder can read. We never sell it or add you to a list."
  };
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function isTest(o) {
    if (/[?&]test=1\b/.test(location.search)) return true;
    return /\bTEST\b/.test([o.name, o.email, o.details, o.organization].join(" "));
  }
  function pagePath() { return location.pathname.replace(/^\/escrow-checker/, "") + (location.hash || ""); }

  /* Post one lead to the Google Form. Resolves when the request was sent (Google answers opaquely). */
  function sendLead(o) {
    var L = C.LEADS || {};
    if (!L.action || !L.fields) return Promise.reject(new Error("lead logging is not set up"));
    var body = new URLSearchParams();
    var F = L.fields;
    o.page = o.page || pagePath();
    o.test = isTest(o) ? "TEST" : "";
    Object.keys(F).forEach(function (k) { if (o[k] != null && String(o[k]).trim() !== "") body.append(F[k], String(o[k]).trim().slice(0, 3000)); });
    return fetch(L.action, { method: "POST", mode: "no-cors", credentials: "omit", referrerPolicy: "no-referrer", body: body });
  }

  function fineprint(kind) {
    var p = document.createElement("p");
    p.className = "ht-fine";
    p.textContent = FINE[kind] || FINE["default"];
    return p;
  }

  /* ---------- Buy buttons ---------- */
  function buyLabel(plan) {
    var pr = PRICES[plan] || {};
    if (plan === "fixKit") return "Get the Fix Kit \u00b7 " + (pr.amount || "$39");
    if (plan === "watch") return "Start Payment Watch \u00b7 " + (pr.amount || "$49") + "/yr";
    return "Buy";
  }
  function initBuyButtons() {
    $all("[data-buy]").forEach(function (b) {
      var plan = b.getAttribute("data-buy");
      if (!b.hasAttribute("data-keep-label")) b.textContent = b.getAttribute("data-label") || buyLabel(plan);
      b.addEventListener("click", function (e) {
        e.preventDefault();
        var link = (LINKS[plan] || "").trim();
        if (/^https:\/\/(buy|checkout)\.stripe\.com\//.test(link)) {
          // log the checkout click (no personal data), then go to Stripe; Stripe records who paid
          var go = function () { location.href = link; };
          var t = setTimeout(go, 900);
          sendLead({ form: "checkout_click", plan: PLAN_NAMES[plan], details: "Opened Stripe checkout from: " + (b.textContent || "").trim() })
            .then(function () { clearTimeout(t); go(); }, function () { clearTimeout(t); go(); });
          return;
        }
        openBuyModal(plan);
      });
    });
  }

  /* ---------- Modal (buyer-intent form) ---------- */
  var dlg = null;
  function ensureModal() {
    if (dlg) return dlg;
    dlg = document.createElement("dialog");
    dlg.className = "ht-modal";
    dlg.setAttribute("aria-labelledby", "htm-title");
    dlg.innerHTML =
      '<form class="ht-form" novalidate>' +
      '<button type="button" class="ht-x" aria-label="Close">\u00d7</button>' +
      '<p class="ht-kicker" id="htm-kicker"></p>' +
      '<h2 id="htm-title">Reserve your plan</h2>' +
      '<p class="ht-lead" id="htm-lead"></p>' +
      '<div class="ht-grid">' +
      '<label>Name<input name="name" autocomplete="name" required></label>' +
      '<label>Email<input name="email" type="email" autocomplete="email" inputmode="email" required></label>' +
      '<label>Plan<select name="plan"><option value="fixKit"></option><option value="watch"></option></select></label>' +
      '<label>County<input name="county" autocomplete="address-level2" value="Tarrant" required></label>' +
      '<label class="ht-wide">Phone <span class="ht-opt">(optional)</span><input name="phone" type="tel" autocomplete="tel" inputmode="tel"></label>' +
      '</div>' +
      '<input class="ht-hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<div class="ht-actions"><button type="submit" class="x-cta ht-submit">Continue</button><span class="ht-status" role="status" aria-live="polite"></span></div>' +
      '</form>';
    document.body.appendChild(dlg);
    var form = $("form", dlg);
    $all("select[name=plan] option", dlg).forEach(function (o) { o.textContent = PLAN_NAMES[o.value]; });
    form.appendChild(fineprint("buy"));
    $(".ht-x", dlg).addEventListener("click", function () { closeModal(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) closeModal(); });
    $("select[name=plan]", dlg).addEventListener("change", function () { setModalPlan(this.value); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var o = collect(form);
      if (o.website) return; // bot
      var st = $(".ht-status", dlg);
      if (!o.name || !EMAIL_RE.test(o.email) || !o.county) { st.textContent = "Please add your name, a valid email and your county."; st.classList.add("is-err"); return; }
      st.classList.remove("is-err"); st.textContent = "Saving\u2026";
      var plan = o.plan;
      var payload = { form: "buy_" + (plan === "watch" ? "watch" : "fixkit"), plan: PLAN_NAMES[plan], name: o.name, email: o.email, county: o.county, phone: o.phone,
        details: "Buyer intent (payment link not live yet). Clicked: " + buyLabel(plan) };
      $(".ht-submit", dlg).disabled = true;
      sendLead(payload).then(function () {
        try { localStorage.setItem("hometally.intent." + plan, "1"); } catch (_) {}
        var unlock = plan === "fixKit" && C.KIT_UNLOCK_WITHOUT_PAYMENT && !LINKS.fixKit;
        if (unlock) { try { localStorage.setItem("hometally.kit", "tester"); } catch (_) {} }
        form.innerHTML = '<button type="button" class="ht-x" aria-label="Close">\u00d7</button>' +
          '<h2>Thanks, ' + esc(o.name.split(" ")[0]) + '. You\u2019re on the list.</h2>' +
          (unlock
            ? '<p class="ht-lead">Online payment opens soon. While we test, early testers get the Fix Kit tools now at no charge. We\u2019ll email you at ' + esc(o.email) + ' before anything is charged.</p><div class="ht-actions"><a class="x-cta" href="' + kitHref() + '#kit-tools">Open my Fix Kit</a></div>'
            : '<p class="ht-lead">Online payment opens soon. We\u2019ll email a secure payment link to ' + esc(o.email) + '. Nothing has been charged.</p>' +
              (plan === "watch" ? '<p class="ht-lead">Meanwhile, add this year\u2019s deadlines to your calendar from the free guide.</p>' : "") +
              '<div class="ht-actions"><button type="button" class="btn ht-done">Done</button></div>');
        $(".ht-x", form).addEventListener("click", closeModal);
        var d = $(".ht-done", form); if (d) d.addEventListener("click", closeModal);
        document.dispatchEvent(new CustomEvent("hometally:intent", { detail: { plan: plan, unlocked: unlock } }));
      }).catch(function () {
        $(".ht-submit", dlg).disabled = false;
        st.classList.add("is-err");
        st.textContent = "Couldn\u2019t save that. Check your connection, or email " + (C.FEEDBACK_EMAIL || "laurent@kuumba.app") + ".";
      });
    });
    return dlg;
  }
  function kitHref() { return /\/fix-kit\/?$/.test(location.pathname) ? "./" : (location.pathname.indexOf("/escrow-checker/") === 0 ? "/escrow-checker/fix-kit/" : "fix-kit/"); }
  function setModalPlan(plan) {
    $("#htm-kicker", dlg).textContent = PLAN_NAMES[plan];
    $("#htm-title", dlg).textContent = plan === "watch" ? "Start Payment Watch" : "Get the Fix Kit";
    $("#htm-lead", dlg).textContent = plan === "watch"
      ? "Yearly reminders for your April county notice, your escrow statement and your insurance renewal, so a payment jump never surprises you. Online payment opens soon; tell us where to send your link."
      : "Fill your Form 50-869 motion, build your protest packet, send an escrow dispute letter and get every deadline on your calendar. Online payment opens soon; tell us where to reach you.";
  }
  function openBuyModal(plan) {
    ensureModal();
    var form = $("form", dlg);
    if (!$("input[name=email]", form)) { dlg.remove(); dlg = null; ensureModal(); form = $("form", dlg); }
    $("select[name=plan]", dlg).value = plan;
    setModalPlan(plan);
    var st = $(".ht-status", dlg); st.textContent = ""; st.classList.remove("is-err");
    $(".ht-submit", dlg).disabled = false;
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    setTimeout(function () { var n = $("input[name=name]", dlg); if (n) n.focus(); }, 30);
  }
  function closeModal() { if (!dlg) return; if (typeof dlg.close === "function" && dlg.open) dlg.close(); else dlg.removeAttribute("open"); }

  function collect(form) {
    var o = {};
    $all("input, select, textarea", form).forEach(function (el) {
      if (!el.name) return;
      if ((el.type === "checkbox" || el.type === "radio") && !el.checked) return;
      var v = (el.value || "").trim();
      if (el.hasAttribute("data-detail")) { if (v) o.__d = (o.__d ? o.__d + "\n" : "") + el.getAttribute("data-detail") + ": " + v; return; }
      o[el.name] = o[el.name] ? o[el.name] + ", " + v : v;
    });
    if (o.__d) { o.details = (o.details ? o.details + "\n" : "") + o.__d; delete o.__d; }
    return o;
  }

  /* ---------- Inline lead forms: <form data-ht-form="insurance_match" data-fine="insurance"> ---------- */
  function initForms() {
    $all("form[data-ht-form]").forEach(function (form) {
      if (!$(".ht-fine", form)) form.appendChild(fineprint(form.getAttribute("data-fine")));
      if (!$(".ht-hp", form)) { var hp = document.createElement("input"); hp.className = "ht-hp"; hp.name = "website"; hp.tabIndex = -1; hp.autocomplete = "off"; hp.setAttribute("aria-hidden", "true"); form.appendChild(hp); }
      form.setAttribute("novalidate", "");
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var o = collect(form);
        if (o.website) return;
        delete o.website;
        var st = $(".ht-status", form);
        var need = (form.getAttribute("data-required") || "name,email").split(",");
        var miss = need.filter(function (k) { return k === "email" ? !EMAIL_RE.test(o.email || "") : !o[k]; });
        if (miss.length) { st.textContent = "Please fill in: " + miss.join(", ") + (miss.indexOf("email") >= 0 ? " (a valid email)" : "") + "."; st.classList.add("is-err"); return; }
        st.classList.remove("is-err"); st.textContent = "Sending\u2026";
        o.form = form.getAttribute("data-ht-form");
        o.plan = o.plan || form.getAttribute("data-plan") || "";
        var btn = $("button[type=submit]", form); if (btn) btn.disabled = true;
        sendLead(o).then(function () {
          var ok = form.getAttribute("data-thanks") || "Thanks. We\u2019ll be in touch by email.";
          var box = document.createElement("div");
          box.className = "ht-thanks"; box.setAttribute("role", "status");
          box.innerHTML = "<strong>Got it, " + esc((o.name || "").split(" ")[0] || "thanks") + ".</strong> " + esc(ok);
          form.replaceWith(box);
        }).catch(function () {
          if (btn) btn.disabled = false;
          st.classList.add("is-err");
          st.textContent = "Couldn\u2019t send that. Check your connection, or email " + (C.FEEDBACK_EMAIL || "laurent@kuumba.app") + ".";
        });
      });
    });
  }

  /* ---------- Return from Stripe (?paid=fixKit / ?paid=watch) ---------- */
  function handlePaidReturn() {
    var m = /[?&]paid=(fixKit|watch)\b/.exec(location.search);
    if (!m) return;
    var plan = m[1];
    var key = "hometally.paidlogged." + plan;
    var logged = false; try { logged = !!sessionStorage.getItem(key); } catch (_) {}
    if (plan === "fixKit") { try { localStorage.setItem("hometally.kit", "paid"); } catch (_) {} }
    if (!logged) {
      sendLead({ form: "paid_return", plan: PLAN_NAMES[plan], details: "Returned from Stripe checkout. Match by time with the Stripe Dashboard payment." }).catch(function () {});
      try { sessionStorage.setItem(key, "1"); } catch (_) {}
    }
    document.documentElement.setAttribute("data-paid", plan);
  }

  window.HomeTally = { sendLead: sendLead, openBuyModal: openBuyModal, config: C,
    kitUnlocked: function () { try { return !!localStorage.getItem("hometally.kit"); } catch (_) { return false; } } };

  function init() { handlePaidReturn(); initBuyButtons(); initForms(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
