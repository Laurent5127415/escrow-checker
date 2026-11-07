/* HomeTally Fix Kit: in-browser tools. Nothing here is uploaded.
   Numbers come from the checker (sessionStorage "hometally.checker", this tab only) or are typed in.
   PDFs are made with pdf-lib 1.17.1 from cdn.jsdelivr.net (SRI pinned); Form 50-869 is the official
   Comptroller blank (rev. 08-24/4) served from this site. */
(function () {
  "use strict";
  var PDFLIB_URL = "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js";
  var PDFLIB_SRI = "sha384-weMABwrltA6jWR8DDe9Jp5blk+tZQh7ugpCsF3JwSA53WZM9/14PjS5LAJNHNjAI";
  var ROLL_CERTIFIED = { 2026: "July 24", 2025: "July 25" };
  var ARB = "Tarrant Appraisal Review Board, 2500 Handley-Ederville Rd, Fort Worth, TX 76118-6909";
  var C = window.HOMETALLY_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function num(v) { if (v == null) return null; var n = parseFloat(String(v).replace(/[$,\s]/g, "")); return isFinite(n) ? n : null; }
  function money(n, d) { if (n == null || !isFinite(n)) return "$—"; return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d }); }
  function money0(n) { return money(n, 0); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function pdate(s) { if (!s) return null; var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) return new Date(+m[1], +m[2] - 1, +m[3]); m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s); return m ? new Date(+m[3], +m[1] - 1, +m[2]) : null; }
  var MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function longDate(d) { return d ? MON[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear() : ""; }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function nextBiz(d) { var x = new Date(d); while (x.getDay() === 0 || x.getDay() === 6) x = addDays(x, 1); return x; }
  function today() { var t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }

  /* ------------------------------------------------------------------ unlock */
  var LINK = ((C.PAYMENT_LINKS || {}).fixKit || "").trim();
  function unlocked() {
    var v = null; try { v = localStorage.getItem("hometally.kit"); } catch (_) {}
    if (v === "paid") return true;
    if (v === "tester" && !LINK && C.KIT_UNLOCK_WITHOUT_PAYMENT) return true;
    return false;
  }
  function showKit() {
    if (!unlocked()) return false;
    $("kitLock").hidden = true;
    var box = $("kit-tools");
    if (!box.getAttribute("data-built")) { box.innerHTML = toolsHtml(); box.setAttribute("data-built", "1"); wire(); }
    box.hidden = false;
    return true;
  }
  document.addEventListener("hometally:intent", function (e) { if (e.detail && e.detail.unlocked) showKit(); });

  /* ------------------------------------------------------------------ numbers from the checker */
  var CK = {};
  try { CK = JSON.parse(sessionStorage.getItem("hometally.checker") || "{}") || {}; } catch (_) { CK = {}; }
  var E = CK.escrow || {}, K = CK.county || {};

  function defaultTaxYear() {
    if (K.open_years && K.open_years.length) return K.open_years[0];
    var t = today(); return t.getMonth() === 0 ? t.getFullYear() - 1 : t.getFullYear();
  }
  function appraisedFor(year) {
    var v = (K.values || []).filter(function (r) { return r.year === year; })[0];
    return v ? v.appraised : null;
  }

  function inp(id, label, val, opts) {
    opts = opts || {};
    return '<label' + (opts.wide ? ' class="ht-wide"' : "") + ">" + label + (opts.opt ? ' <span class="ht-opt">(optional)</span>' : "") +
      (opts.area ? '<textarea id="' + id + '">' + esc(val) + "</textarea>"
        : '<input id="' + id + '" type="' + (opts.type || "text") + '" value="' + esc(val == null ? "" : val) + '"' + (opts.money ? ' inputmode="decimal"' : "") + ' autocomplete="off"' + (opts.ph ? ' placeholder="' + esc(opts.ph) + '"' : "") + ">") + "</label>";
  }
  function sel(id, label, options, val) {
    return "<label>" + label + '<select id="' + id + '">' + options.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === val ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select></label>";
  }
  function fmtN(n) { return n == null ? "" : Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 }); }

  function toolsHtml() {
    var ty = defaultTaxYear();
    var fromChecker = (E.total_new != null || K.purchase_price != null);
    var monthsOpt = [["", "Don't know"]].concat(MON.map(function (m, i) { return [String(i + 1), m]; }));
    var stMonth = "";
    var ad = pdate(E.analysis_date); if (ad) stMonth = String(ad.getMonth() + 1);
    return '' +
      '<div class="' + (fromChecker ? "kit-ok" : "kit-warn") + '">' + (fromChecker
        ? "Filled in from your checker results in this tab. Check every box; you can change anything."
        : 'No checker results in this tab yet. <a class="link" href="../check/">Run the free checker</a> first and come back with the Fix Kit button, or type your numbers below.') + "</div>" +

      '<div class="kit-tool" id="tool-numbers"><h3><span class="kit-num">0</span> Your numbers</h3>' +
      '<p class="muted">Used by every tool below. Kept only in this browser tab; close the tab to clear it. Never uploaded.</p>' +
      '<div class="ht-form"><div class="ht-grid">' +
      inp("k_names", "Owner name(s), as on your deed", K.owner_names || "", { ph: "e.g. Jane Q. Example" }) +
      inp("k_prop", "Property address", K.address || "", { ph: "e.g. 1234 Sample Ln, Fort Worth, TX 76100" }) +
      inp("k_street", "Your mailing address", K.mailing_street || "", { ph: "Street" }) +
      inp("k_csz", "City, state, ZIP", K.mailing_csz || "", { ph: "e.g. Fort Worth, TX 76100" }) +
      inp("k_phone", "Phone", "", { opt: true, type: "tel" }) +
      inp("k_email", "Email", "", { opt: true, type: "email" }) +
      inp("k_county", "County", K.county || "Tarrant") +
      inp("k_acct", "Appraisal district account number", K.account || "", { ph: "from your notice or tad.org" }) +
      sel("k_hs", "Do you live there?", [["yes", "Yes, it's my home (homestead)"], ["partial", "I live in part of it (duplex side)"], ["no", "No (rental / second home)"]], K.homestead || "yes") +
      sel("k_hsHave", "Homestead exemption on your tax bill?", [["", "Don't know"], ["yes", "Yes"], ["no", "No"]], K.has_homestead || "") +
      '</div><h4 style="margin:8px 0 0">County value</h4><div class="ht-grid">' +
      inp("k_year", "Tax year", ty, { type: "number" }) +
      inp("k_value", "Appraised value that year", fmtN(appraisedFor(ty) || K.appraised), { money: true, ph: "e.g. 418,000" }) +
      inp("k_price", "What you paid", fmtN(K.purchase_price), { money: true, ph: "e.g. 320,000" }) +
      inp("k_pdate", "Closing date", K.purchase_date || "", { type: "date" }) +
      inp("k_appr", "Lender appraisal value", fmtN(K.appraisal_value), { money: true, opt: true }) +
      inp("k_apprDate", "Lender appraisal date", K.appraisal_date || "", { type: "date", opt: true }) +
      inp("k_opinion", "Value you'll ask for in a protest", fmtN(K.purchase_price), { money: true, ph: "your opinion of value" }) +
      inp("k_notice", "Date your appraisal notice was mailed", K.notice_sent || "", { type: "date", opt: true }) +
      inp("k_units", "Taxing units (from your tax bill)", K.taxing_units || "", { wide: true, ph: "e.g. City of Fort Worth; Tarrant County; Fort Worth ISD" }) +
      inp("k_cert", "Roll certified on (Form 50-869)", ROLL_CERTIFIED[ty] || "July 25", { opt: true }) +
      '</div><h4 style="margin:8px 0 0">Escrow letter</h4><div class="ht-grid">' +
      inp("k_servicer", "Mortgage servicer", E.servicer || "", { ph: "name on your letter" }) +
      inp("k_svcAddr", "Servicer's address for written requests / notices of error", "", { wide: true, ph: "from your letter or servicer website (not the payment address)" }) +
      inp("k_loan", "Loan number", "", { ph: "stays on this device" }) +
      inp("k_adate", "Escrow letter date", E.analysis_date || "", { ph: "e.g. 09/15/2026" }) +
      inp("k_old", "Old monthly payment", fmtN(E.total_old), { money: true }) +
      inp("k_new", "New monthly payment", fmtN(E.total_new), { money: true }) +
      inp("k_short", "Shortage on the letter", fmtN(E.shortage), { money: true, opt: true }) +
      inp("k_ptax", "Yearly tax your servicer projects", fmtN(K.projected_tax || E.tax_new), { money: true, opt: true }) +
      inp("k_levy", "Actual yearly tax bill (tax office)", fmtN(K.levy), { money: true, opt: true }) +
      inp("k_ins", "Yearly insurance on the letter", fmtN(E.ins_new), { money: true, opt: true }) +
      inp("k_issues", "Problems the checker found", (E.flags || []).join("; "), { wide: true, area: true }) +
      sel("k_stMonth", "Your escrow statement usually comes in", monthsOpt, stMonth) +
      inp("k_insRenew", "Insurance renews on", "", { type: "date", opt: true }) +
      '</div><div class="ht-actions"><button class="btn" type="button" id="k_clear">Clear my numbers</button><span class="ht-status" id="k_saved" role="status" aria-live="polite"></span></div></div></div>' +

      // 1. Form 50-869
      '<div class="kit-tool" id="tool-50869"><h3><span class="kit-num">1</span> Form 50-869: motion to correct an over-appraisal (Tax Code 25.25(d))</h3>' +
      "<p>For a home you live in that's valued <b>more than 25% above</b> its correct value (one-third for other property), for a year you didn't protest to an ARB order. File before that year's taxes go delinquent (by January 31 of the next year).</p>" +
      '<div id="m_check"></div><label class="ht-form" style="display:grid;gap:6px;font:var(--type-label)">The error, as the form will say it<pre class="kit-pre" id="m_text"></pre></label>' +
      '<div class="ht-actions"><button class="x-cta" type="button" id="m_dl">Download filled Form 50-869 (PDF)</button><span class="ht-status" id="m_st" role="status" aria-live="polite"></span></div>' +
      '<ol class="kit-steps"><li>Sign and date it yourself (left blank on purpose).</li><li>Attach your closing disclosure (and the lender appraisal if you have it).</li><li>Send it by certified mail, return receipt, or hand-deliver it to the ' + esc(ARB) + ". Keep a copy.</li><li>Pay that year's tax on time anyway; a refund follows if the value is corrected.</li><li>If the roll changes, a 10% late-correction penalty on the corrected tax is owed to each taxing unit.</li></ol>" +
      '<p class="kit-note">Blank form: <a class="link" href="https://comptroller.texas.gov/forms/50-869.pdf" target="_blank" rel="noopener">comptroller.texas.gov/forms/50-869.pdf</a></p></div>' +

      // 2. Protest packet
      '<div class="kit-tool" id="tool-protest"><h3><span class="kit-num">2</span> Protest evidence packet</h3>' +
      '<p>For a regular protest (Form 50-132 or online at your appraisal district). Your deadline: <b id="p_deadline"></b>.</p>' +
      '<ul class="kit-checks" id="p_checks">' + [
        "Notice of Appraised Value (or the value printed from the appraisal district site)",
        "Closing disclosure / settlement statement showing what you paid",
        "Lender appraisal report, if it's within a year or two of January 1",
        "3 to 5 comparable sales near you, sold close to January 1, similar size and age",
        "Dated photos of damage, needed repairs or problems (roof, foundation, flooding)",
        "Repair estimates or contractor bids for those problems",
        "The appraisal district's evidence packet (ask for it in writing; Tax Code 41.461)",
        "A one-page summary with the value you're asking for (in this packet)"].map(function (t, i) { return '<li><label><input type="checkbox" id="pc' + i + '"> ' + esc(t) + "</label></li>"; }).join("") + "</ul>" +
      '<p class="kit-note">Comparable sales (Texas doesn\'t publish sale prices; use a realtor, Zillow/Redfin estimates of sold homes, or your appraisal district\'s evidence).</p>' +
      [0, 1, 2, 3, 4].map(function (i) { return '<div class="kit-comp ht-form"><input id="c_a' + i + '" placeholder="Comparable ' + (i + 1) + ' address" aria-label="Comparable ' + (i + 1) + ' address"><input id="c_d' + i + '" placeholder="Sale date" aria-label="Sale date"><input id="c_p' + i + '" inputmode="decimal" placeholder="Sale price" aria-label="Sale price"><input id="c_s' + i + '" inputmode="decimal" placeholder="Sq ft" aria-label="Square feet"></div>'; }).join("") +
      '<label class="ht-form" style="display:grid;gap:6px;font:var(--type-label)">Problems with your home (one per line, optional)<textarea id="p_problems" style="min-height:80px;padding:10px 12px;border-radius:10px;border:1px solid var(--stroke-primary);font:16px/1.4 var(--sans)"></textarea></label>' +
      '<div class="ht-actions"><button class="x-cta" type="button" id="p_dl">Download protest packet (PDF)</button><a class="btn" href="https://comptroller.texas.gov/forms/50-132.pdf" target="_blank" rel="noopener">Blank Form 50-132</a><span class="ht-status" id="p_st" role="status" aria-live="polite"></span></div></div>' +

      // 3. Homestead
      '<div class="kit-tool" id="tool-homestead"><h3><span class="kit-num">3</span> Homestead exemption (Form 50-114)</h3>' +
      '<div id="h_status"></div>' +
      '<ol class="kit-steps"><li>You qualify if you own the home and it\'s your main home, and you don\'t claim a homestead anywhere else. If you bought after January 1, you can still get it for the part of the year after you qualify, if the seller didn\'t have it.</li>' +
      "<li>School districts must exempt $140,000 of a homestead's value; age 65+ or disabled owners get $60,000 more. Cities and counties may add their own.</li>" +
      "<li>Fill in <a class=\"link\" href=\"https://comptroller.texas.gov/forms/50-114.pdf\" target=\"_blank\" rel=\"noopener\">Form 50-114</a> (or file online at your appraisal district, such as tad.org for Tarrant).</li>" +
      "<li>Attach a copy of your Texas driver's license or ID showing this address.</li>" +
      '<li>File before May 1 (by April 30). Missed it? You can usually file late for up to two years after the tax delinquency date; ask your appraisal district.</li>' +
      "<li>Check next year's notice and tax bill to confirm the exemption is listed.</li></ol>" +
      '<div class="ht-actions"><a class="x-cta" href="https://comptroller.texas.gov/forms/50-114.pdf" target="_blank" rel="noopener">Open Form 50-114</a><button class="btn" type="button" id="h_dl">Download homestead guide (PDF)</button><span class="ht-status" id="h_st" role="status" aria-live="polite"></span></div></div>' +

      // 4. Escrow letter
      '<div class="kit-tool" id="tool-letter"><h3><span class="kit-num">4</span> Escrow dispute letter to your servicer</h3>' +
      "<p>A qualified written request (RESPA) that also works as a notice of error and request for information under 12 CFR 1024.35 and 1024.36. Your servicer must acknowledge it within 5 business days and answer within 30 business days. Send it to the servicer's address for written requests, not the payment address.</p>" +
      '<label class="ht-form" style="display:grid;gap:6px;font:var(--type-label)">What to ask for<select id="l_ask"><option value="review">Review and correct the escrow analysis, and recalculate my payment</option><option value="refund">Correct the analysis and refund the overcharge</option><option value="info">Send the escrow account history and worksheet (information only)</option></select></label>' +
      '<pre class="kit-pre" id="l_text"></pre>' +
      '<div class="ht-actions"><button class="x-cta" type="button" id="l_dl">Download letter (PDF)</button><button class="btn" type="button" id="l_copy">Copy the letter</button><span class="ht-status" id="l_st" role="status" aria-live="polite"></span></div>' +
      '<p class="kit-note">Send by certified mail, return receipt, and keep a copy. Keep paying your mortgage while you wait.</p></div>' +

      // 5. Calendar
      '<div class="kit-tool" id="tool-cal"><h3><span class="kit-num">5</span> Your deadline calendar</h3>' +
      '<ul class="kit-checks" id="cal_list"></ul>' +
      '<div class="ht-actions"><button class="x-cta" type="button" id="cal_dl">Download calendar (.ics)</button><span class="ht-status" id="cal_st" role="status" aria-live="polite"></span></div>' +
      '<p class="kit-note">Opens in Apple Calendar, Outlook or Google Calendar (in Google: Settings → Import). Each event has a reminder a week before.</p></div>' +
      '<p class="ht-fine">HomeTally is not a law firm or a licensed property tax consultant; the Fix Kit is a do-it-yourself tool. Check every number against your documents. Deadlines skip weekends but not holidays; confirm them with your appraisal district.</p>';
  }

  /* ------------------------------------------------------------------ read the form */
  function V() {
    var g = function (id) { var el = $(id); return el ? el.value.trim() : ""; };
    return {
      names: g("k_names"), prop: g("k_prop"), street: g("k_street"), csz: g("k_csz"), phone: g("k_phone"), email: g("k_email"),
      county: g("k_county") || "Tarrant", acct: g("k_acct"), hs: g("k_hs"), hsHave: g("k_hsHave"),
      year: parseInt(g("k_year"), 10) || defaultTaxYear(), value: num(g("k_value")), price: num(g("k_price")), pdate: g("k_pdate"),
      appr: num(g("k_appr")), apprDate: g("k_apprDate"), opinion: num(g("k_opinion")), notice: g("k_notice"), units: g("k_units"), cert: g("k_cert"),
      servicer: g("k_servicer"), svcAddr: g("k_svcAddr"), loan: g("k_loan"), adate: g("k_adate"), old: num(g("k_old")), nw: num(g("k_new")),
      short: num(g("k_short")), ptax: num(g("k_ptax")), levy: num(g("k_levy")), ins: num(g("k_ins")), issues: g("k_issues"),
      stMonth: parseInt(g("k_stMonth"), 10) || null, insRenew: g("k_insRenew"), ask: g("l_ask") || "review"
    };
  }
  function isTarrant(v) { return /tarrant/i.test(v.county); }

  /* ------------------------------------------------------------------ 1. Form 50-869 */
  function motion(v) {
    var W = [], ok = [];
    var correct = v.price || v.appr;
    var limit = v.hs === "no" ? 4 / 3 : 1.25;
    var ratio = v.value && correct ? v.value / correct : null;
    var lastDay = new Date(v.year + 1, 0, 31);
    if (today() > lastDay) W.push("The " + v.year + " deadline (January 31, " + (v.year + 1) + ") has passed. Change the tax year if another year is open.");
    else ok.push("Last day to file for " + v.year + ": " + longDate(lastDay) + ".");
    if (ratio == null) W.push("Add the appraised value and what you paid to test the one-fourth rule.");
    else if (ratio <= limit) W.push("Appraised " + money0(v.value) + " is " + ((ratio - 1) * 100).toFixed(1) + "% over " + money0(correct) + ". The motion needs more than " + (v.hs === "no" ? "33.3" : "25") + "%; a regular protest (tool 2) fits better.");
    else ok.push("Appraised " + money0(v.value) + " is " + ((ratio - 1) * 100).toFixed(1) + "% over " + money0(correct) + ": the one-fourth test is met.");
    if (!isTarrant(v)) W.push("The form is filled for the Tarrant Appraisal Review Board. For another county, change the county and send it to that county's ARB.");
    if (!v.names) W.push("Owner name(s) are blank.");
    if (!v.units) W.push("Taxing units are blank: copy them from your tax bill.");
    W.push("Not available for a year you already protested to an ARB order or settled with the appraisal district.");
    var plural = /\band\b|&/i.test(v.names), we = plural ? "We" : "I";
    var pd = pdate(v.pdate);
    var txt = "The " + v.year + " appraised value of " + money0(v.value) + " is more than one-fourth above the correct value. " +
      we + " bought the property in an arm's-length sale for " + money0(v.price) + (pd ? " (closed " + longDate(pd) + ")" : "");
    if (v.appr) txt += ", and the lender's appraisal valued it at " + money0(v.appr) + (v.apprDate ? " as of " + longDate(pdate(v.apprDate)) : "");
    txt += ". The correct appraised value is no more than " + money0(correct) + "; " + money0(v.value) + " exceeds that by " + (ratio ? ((ratio - 1) * 100).toFixed(1) : "?") + "%. ";
    txt += v.hs === "partial" ? "The owner-occupied part of the property receives the residence homestead exemption. " : v.hs === "yes" ? "The property is " + (plural ? "our" : "my") + " residence homestead. " : "";
    txt += "Requested correction: change the " + v.year + " appraised value to " + money0(correct) + ". ";
    txt += "Attached: " + (v.appr ? "final settlement statement (closing disclosure) and appraisal report." : "final settlement statement (closing disclosure).");
    var county = v.county.replace(/\s*county\s*$/i, "") || "Tarrant";
    var fields = {
      "County": county, "County Appraisal Review Board": county, "Movant": "", "Appraisal District": "",
      "County Appraisal District": v.names, "property description": v.prop, "parcel number": v.acct ? "Account " + v.acct : "",
      "Date": v.cert || ROLL_CERTIFIED[v.year] || "July 25", "Year": String(v.year), "Tax Year": String(v.year),
      "Appraisal District 2": county, "taxing units": v.units, "One-fourth over-appraisal error": txt,
      "Date signed": "", "Printed Name of Movant": v.names, "Phone (area code and number)": v.phone,
      "Movant's current mailing address": v.street, "Movant's Email Address": v.email, "Movant's current city. state & zip code": v.csz
    };
    return { fields: fields, text: txt, warnings: W, ok: ok, ratio: ratio, limit: limit };
  }
  var MOTION_FIELDS = ["County", "County Appraisal Review Board", "Movant", "Appraisal District", "County Appraisal District", "property description",
    "parcel number", "Date", "Year", "Tax Year", "Appraisal District 2", "taxing units", "One-fourth over-appraisal error", "Date signed",
    "Printed Name of Movant", "Phone (area code and number)", "Movant's current mailing address", "Movant's Email Address", "Movant's current city. state & zip code"];
  function ansi(s) {
    return String(s || "").replace(/[\u2019\u2018]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, "-").replace(/\u00D7/g, "x").replace(/\u2026/g, "...").replace(/\u2192/g, "->").replace(/[^\x0A\x20-\x7E\u00A0-\u00FF]/g, "");
  }
  async function fillMotion(PDFLib, blank, fields) {
    var doc = await PDFLib.PDFDocument.load(blank);
    var form = doc.getForm();
    var helv = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
    for (var k = 0; k < MOTION_FIELDS.length; k++) {
      var name = MOTION_FIELDS[k];
      var tf; try { tf = form.getTextField(name); } catch (_) { continue; }
      var text = ansi(fields[name]);
      tf.setText(text || undefined);
      var w = tf.acroField.getWidgets()[0].getRectangle();
      if (tf.isMultiline()) {
        var wrap = function (sz) {
          var maxW = w.width - 10, out = [];
          text.split("\n").forEach(function (para) {
            var cur = "";
            para.split(" ").forEach(function (word) { var t = cur ? cur + " " + word : word; if (helv.widthOfTextAtSize(t, sz) > maxW && cur) { out.push(cur); cur = word; } else cur = t; });
            out.push(cur);
          });
          return out;
        };
        var size = 9, lines = wrap(size);
        while (size > 5 && lines.length * size * 1.2 > w.height - 4) { size -= 0.5; lines = wrap(size); }
        tf.setFontSize(size); tf.setText(lines.join("\n") || undefined);
      } else {
        var s2 = 9; while (s2 > 5 && helv.widthOfTextAtSize(text, s2) > w.width - 4) s2 -= 0.5;
        tf.setFontSize(s2);
      }
    }
    form.updateFieldAppearances(helv);
    return await doc.save({ updateFieldAppearances: false });
  }

  /* ------------------------------------------------------------------ text PDFs (pdf-lib, Helvetica) */
  async function textPdf(PDFLib, title, blocks) {
    var doc = await PDFLib.PDFDocument.create();
    doc.setTitle(ansi(title)); doc.setCreator("HomeTally Fix Kit"); doc.setProducer("HomeTally (pdf-lib, made on your device)");
    var F = await doc.embedFont(PDFLib.StandardFonts.Helvetica), B = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
    var rgb = PDFLib.rgb, W = 612, Hh = 792, M = 56, maxW = W - 2 * M;
    var page, y;
    function newPage() { page = doc.addPage([W, Hh]); y = Hh - M; footer(); }
    function footer() { page.drawText(ansi("HomeTally Fix Kit - do-it-yourself tool, not legal or tax advice. Check every number."), { x: M, y: 30, size: 7.5, font: F, color: rgb(0.45, 0.45, 0.47) }); }
    function need(h) { if (y - h < 50) newPage(); }
    function wrapText(t, font, size, width) {
      var out = [];
      ansi(t).split("\n").forEach(function (para) {
        var cur = "";
        para.split(" ").forEach(function (word) { var tt = cur ? cur + " " + word : word; if (font.widthOfTextAtSize(tt, size) > width && cur) { out.push(cur); cur = word; } else cur = tt; });
        out.push(cur);
      });
      return out;
    }
    function para(t, o) {
      o = o || {}; var size = o.size || 10.5, font = o.bold ? B : F, ind = o.indent || 0, lh = size * 1.38;
      var lines = wrapText(t, font, size, maxW - ind);
      lines.forEach(function (ln, i) { need(lh); page.drawText(ln, { x: M + ind + (i && o.hang ? o.hang : 0), y: y - size, size: size, font: font, color: o.color || rgb(0.1, 0.1, 0.12) }); y -= lh; });
      y -= o.after == null ? 6 : o.after;
    }
    newPage();
    page.drawText("HomeTally", { x: M, y: y - 10, size: 10, font: B, color: rgb(0.35, 0.35, 0.38) }); y -= 24;
    para(title, { size: 18, bold: true, after: 10 });
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      if (b.h) { need(40); y -= 6; para(b.h, { size: 13, bold: true, after: 4 }); }
      else if (b.p != null) para(b.p, b);
      else if (b.li) b.li.forEach(function (t, n) { para((b.num ? (n + 1) + ". " : "- ") + t, { indent: 8, after: 3 }); });
      else if (b.check) b.check.forEach(function (c) { need(16); page.drawRectangle({ x: M + 6, y: y - 10, width: 9, height: 9, borderColor: rgb(0.2, 0.2, 0.2), borderWidth: 1 }); if (c[1]) page.drawText("X", { x: M + 7.6, y: y - 8.6, size: 8, font: B }); para(c[0], { indent: 22, after: 3 }); });
      else if (b.table) {
        var cols = b.table.widths, x0 = M, rows = [b.table.head].concat(b.table.rows);
        rows.forEach(function (r, ri) {
          need(18);
          var x = x0;
          r.forEach(function (cell, ci) {
            var txt = ansi(cell); var font = ri === 0 ? B : F, sz = 9.5;
            while (sz > 6 && font.widthOfTextAtSize(txt, sz) > cols[ci] - 6) sz -= 0.5;
            page.drawText(txt, { x: x + 3, y: y - 12, size: sz, font: font });
            x += cols[ci];
          });
          page.drawLine({ start: { x: x0, y: y - 16 }, end: { x: x0 + cols.reduce(function (a, c) { return a + c; }, 0), y: y - 16 }, thickness: ri === 0 ? 1 : 0.4, color: rgb(0.6, 0.6, 0.62) });
          y -= 18;
        });
        y -= 8;
      } else if (b.space) y -= b.space;
      else if (b.sig) { need(60); y -= 26; page.drawLine({ start: { x: M, y: y }, end: { x: M + 220, y: y }, thickness: 0.8 }); page.drawText(ansi(b.sig), { x: M, y: y - 12, size: 9, font: F }); y -= 26; }
    }
    return await doc.save();
  }

  /* ------------------------------------------------------------------ 2. protest */
  function protestDeadline(v) {
    var t = today();
    var yr = t > new Date(t.getFullYear(), 4, 15) ? t.getFullYear() + 1 : t.getFullYear();
    var nd = pdate(v.notice);
    var base = new Date(yr, 4, 15);
    if (nd && nd.getFullYear() === yr) { var n30 = addDays(nd, 30); if (n30 > base) base = n30; }
    return { date: nextBiz(base), year: yr };
  }
  function comps() {
    var out = [];
    for (var i = 0; i < 5; i++) {
      var a = $("c_a" + i).value.trim(); if (!a) continue;
      out.push({ a: a, d: $("c_d" + i).value.trim(), p: num($("c_p" + i).value), s: num($("c_s" + i).value) });
    }
    return out;
  }
  function protestBlocks(v) {
    var dl = protestDeadline(v), cs = comps();
    var ask = v.opinion || v.price;
    var blocks = [
      { p: "Property: " + (v.prop || "[property address]") + (v.acct ? "   Account: " + v.acct : "") },
      { p: "Owner(s): " + (v.names || "[owner names]") + "   County: " + v.county },
      { p: "Protest year: " + dl.year + ".  File by " + longDate(dl.date) + " (May 15, or 30 days after your notice was mailed if later; weekends move to the next business day). File online with your appraisal district or on Form 50-132.", after: 10 },
      { h: "1. Evidence checklist" },
      { check: Array.prototype.map.call(document.querySelectorAll("#p_checks label"), function (l) { return [l.textContent.trim(), l.querySelector("input").checked]; }) },
      { h: "2. Summary of evidence (hand this to the panel)" },
      { p: "Appraisal district value: " + money0(v.value) + "   |   Value I am asking for: " + money0(ask) },
      { p: "Purchase price: " + money0(v.price) + (v.pdate ? " (closed " + longDate(pdate(v.pdate)) + ")" : "") + (v.appr ? "   |   Lender appraisal: " + money0(v.appr) : "") },
      { p: v.value && ask ? "The appraisal district's value is " + money0(v.value - ask) + " (" + (((v.value / ask) - 1) * 100).toFixed(1) + "%) above the value supported by the evidence below." : "Add the appraised value and your requested value." }
    ];
    if (cs.length) {
      blocks.push({ table: { widths: [220, 80, 90, 55, 55], head: ["Comparable sale", "Sale date", "Price", "Sq ft", "$/sq ft"],
        rows: cs.map(function (c) { return [c.a, c.d, money0(c.p), c.s ? fmtN(c.s) : "", c.p && c.s ? money(c.p / c.s, 0) : ""]; }) } });
      var pps = cs.filter(function (c) { return c.p && c.s; }).map(function (c) { return c.p / c.s; });
      if (pps.length) { pps.sort(function (a, b) { return a - b; }); var med = pps[Math.floor(pps.length / 2)]; blocks.push({ p: "Median price per square foot of these sales: " + money(med, 0) + ". Multiply by your home's square footage to compare." }); }
    } else blocks.push({ p: "Comparable sales: [add 3 to 5 nearby sales close to January 1 in the Fix Kit before downloading]" });
    var probs = $("p_problems").value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
    if (probs.length) { blocks.push({ p: "Condition problems (photos and estimates attached):", bold: true, after: 2 }); blocks.push({ li: probs }); }
    blocks.push({ h: "3. Hearing script (about 2 minutes)" });
    blocks.push({ li: [
      "\"My name is " + (v.names || "[name]") + ". I own " + (v.prop || "[address]") + ". I'm asking the panel to set the value at " + money0(ask) + ".\"",
      "\"I bought the home for " + money0(v.price) + (v.pdate ? " on " + longDate(pdate(v.pdate)) : "") + " in an arm's-length sale. My closing disclosure is exhibit A.\"",
      "\"These comparable sales near January 1 support " + money0(ask) + ". They are exhibit B.\"",
      "\"The home also has these problems, shown in the photos and estimates in exhibit C.\" (skip if none)",
      "\"The district's evidence doesn't account for this. I ask the panel to lower the value to " + money0(ask) + ". Thank you.\"",
      "Before the hearing you'll usually be offered an informal meeting with an appraiser. You can accept a settlement there or go on to the panel."], num: true });
    blocks.push({ h: "4. Tips" });
    blocks.push({ li: ["Ask the appraisal district for its evidence at least 14 days before the hearing.", "Bring 4 copies of everything (3 panel members and you).", "Stay on value: the panel can't consider how much your taxes went up, only what the home is worth.", "If you're unhappy with the ARB decision you can appeal (binding arbitration, SOAH, or district court); deadlines are short."] });
    return blocks;
  }

  /* ------------------------------------------------------------------ 3. homestead */
  function homesteadBlocks(v) {
    var t = today(), yr = t.getMonth() >= 4 ? t.getFullYear() + 1 : t.getFullYear();
    return [
      { p: "Property: " + (v.prop || "[property address]") + (v.acct ? "   Account: " + v.acct : "") },
      { p: "Status: " + (v.hsHave === "yes" ? "Your tax bill shows a homestead exemption. Check it again on each new notice." : v.hsHave === "no" ? "No homestead exemption on your bill. If you live there, apply now." : "Check your tax bill or appraisal district page for a homestead exemption."), after: 10 },
      { h: "Who qualifies" },
      { li: ["You own the home (or have an ownership interest) and it's your principal residence.", "You don't claim a homestead on any other home, in Texas or elsewhere.", "Bought after January 1? You can still get it for the part of the year after you qualify, if the seller didn't have it."] },
      { h: "What it's worth" },
      { li: ["School districts must exempt $140,000 of a homestead's value.", "Age 65 or older, or disabled: $60,000 more from school districts, and a school-tax ceiling.", "Cities, counties and other units may add a local exemption of up to 20%.", "A homestead's taxable value can't rise more than 10% a year (Tax Code 23.23)."] },
      { h: "How to apply" },
      { li: ["Get Form 50-114 (comptroller.texas.gov/forms/50-114.pdf) or apply online at your appraisal district" + (isTarrant(v) ? " (tad.org)." : "."),
        "Attach a copy of your Texas driver's license or state ID showing this address.",
        "File before May 1 (by April 30, " + yr + "). You can usually file late for up to two years after the delinquency date; ask your appraisal district.",
        "Keep a copy and your confirmation. Check your next notice and tax bill to make sure it's listed."], num: true },
      { h: "Checklist" },
      { check: [["Form 50-114 filled and signed", false], ["Copy of driver's license / ID with this address", false], ["Age 65+ or disability proof, if it applies", false], ["Filed with the appraisal district, copy kept", false]] }
    ];
  }

  /* ------------------------------------------------------------------ 4. escrow letter */
  function letterText(v) {
    var d = longDate(today());
    var asks = {
      review: "Please review and correct the escrow analysis, recalculate my monthly escrow payment and shortage, and send me the corrected analysis.",
      refund: "Please correct the escrow analysis and refund any amount collected above what RESPA (12 CFR 1024.17) allows, including any surplus of $50 or more.",
      info: "Please send me the information listed below."
    };
    var lines = [];
    lines.push(v.names || "[Your full name]");
    lines.push(v.street || "[Your mailing address]");
    lines.push(v.csz || "[City, State ZIP]");
    if (v.phone) lines.push(v.phone);
    if (v.email) lines.push(v.email);
    lines.push("", d, "", v.servicer || "[Servicer name]", "Attn: Qualified Written Requests / Notices of Error", v.svcAddr || "[Servicer's designated address for written requests and notices of error]", "");
    lines.push("Re: Qualified Written Request, Notice of Error and Request for Information");
    lines.push("Borrower(s): " + (v.names || "[Your full name]"));
    lines.push("Loan number: " + (v.loan || "[Loan number]"));
    lines.push("Property: " + (v.prop || "[Property address]"), "");
    lines.push("To whom it may concern:", "");
    lines.push("This is a qualified written request under Section 6(e) of the Real Estate Settlement Procedures Act (12 U.S.C. 2605(e)), a notice of error under 12 CFR 1024.35 and a request for information under 12 CFR 1024.36, about the escrow account for the loan above.", "");
    var facts = [];
    if (v.adate) facts.push("Your escrow analysis dated " + v.adate + (v.old != null && v.nw != null ? " changed my monthly payment from " + money(v.old) + " to " + money(v.nw) + " (" + (v.nw - v.old >= 0 ? "+" : "") + money(v.nw - v.old) + " a month)." : "."));
    else if (v.old != null && v.nw != null) facts.push("My monthly payment changed from " + money(v.old) + " to " + money(v.nw) + ".");
    if (v.short) facts.push("The analysis shows an escrow shortage of " + money(v.short) + ".");
    if (v.ptax != null && v.levy != null && Math.abs(v.ptax - v.levy) >= 1) facts.push("It projects " + money(v.ptax) + " a year for property tax, but the actual tax bill is " + money(v.levy) + " (a difference of " + money(Math.abs(v.ptax - v.levy)) + ").");
    if (v.ins) facts.push("It projects " + money(v.ins) + " a year for homeowners insurance.");
    if (facts.length) { lines.push("What happened:"); facts.forEach(function (f) { lines.push("- " + f); }); lines.push(""); }
    if (v.ask !== "info") {
      lines.push("The error I believe occurred:");
      var iss = v.issues ? v.issues.split(/;\s*|\n/).filter(Boolean) : [];
      if (iss.length) iss.forEach(function (s) { lines.push("- " + s); });
      else lines.push("- The escrow analysis appears to overstate my escrow payment and/or shortage. [Describe the error in one or two sentences.]");
      lines.push("", asks[v.ask], "");
    }
    lines.push("Please also send me:");
    ["A complete escrow account history for the last 24 months (every deposit and disbursement, with dates).",
      "The escrow analysis worksheet, including the projected low point, the cushion you used and how it was calculated.",
      "The tax bills and insurance premium notices you used for the projected disbursements.",
      "Any escrow analyses done in the last two years."].forEach(function (s) { lines.push("- " + s); });
    lines.push("", "Under 12 CFR 1024.35 and 1024.36, please acknowledge this letter within 5 business days and respond in writing within 30 business days. While this is pending, please do not report any related amount as late to the credit bureaus (12 U.S.C. 2605(e)(3)).", "");
    lines.push("Thank you,", "", "", "______________________________", v.names || "[Your full name]");
    return lines.join("\n");
  }

  /* ------------------------------------------------------------------ 5. calendar */
  function events(v) {
    var t = today(), ev = [];
    var yr = protestDeadline(v).year;
    var m50 = new Date(v.year + 1, 0, 31);
    if (m50 >= t) ev.push({ d: m50, t: "Last day: Form 50-869 for " + v.year + " and pay " + v.year + " property tax", x: "File the 25.25(d) motion (Form 50-869) before " + v.year + " taxes go delinquent on Feb 1, and pay the tax on time anyway." });
    else { var nx = new Date(t.getFullYear() + (t.getMonth() === 0 ? 0 : 1), 0, 31); ev.push({ d: nx, t: "Pay property tax (delinquent after Jan 31)", x: "Last day to pay last year's property tax without penalty. Check your escrow paid it." }); }
    ev.push({ d: new Date(yr, 3, 1), t: "Watch for your Notice of Appraised Value", x: "Homesteads get it by about April 1. Compare the value to what your home would sell for and run the HomeTally checker." });
    if (v.hsHave !== "yes") ev.push({ d: new Date(yr, 3, 30), t: "Homestead exemption deadline (Form 50-114)", x: "Apply before May 1 if your homestead exemption isn't on your bill yet." });
    var pd = protestDeadline(v);
    ev.push({ d: pd.date, t: "Property tax protest deadline", x: "File your protest (online or Form 50-132). May 15 or 30 days after your notice was mailed, whichever is later." });
    if (v.stMonth) { var sm = new Date(t.getFullYear(), v.stMonth - 1, 1); if (sm < t) sm = new Date(t.getFullYear() + 1, v.stMonth - 1, 1); ev.push({ d: sm, t: "Escrow statement due this month", x: "When your yearly escrow analysis arrives, run it through the HomeTally checker." }); }
    var ir = pdate(v.insRenew);
    if (ir) { while (ir < t) ir = new Date(ir.getFullYear() + 1, ir.getMonth(), ir.getDate()); var sh = addDays(ir, -45); if (sh < t) sh = t; ev.push({ d: sh, t: "Shop your homeowners insurance (renews " + longDate(ir) + ")", x: "Get two or three quotes before renewal; a premium jump flows straight into your escrow." }); }
    ev.push({ d: new Date(t.getFullYear() + (t.getMonth() >= 9 ? 1 : 0), 9, 15), t: "Property tax bills arrive", x: "Check the bill and compare it with what your servicer projected." });
    ev.sort(function (a, b) { return a.d - b.d; });
    return ev;
  }
  function ics(ev) {
    var stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    var e = function (s) { return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); };
    var out = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//HomeTally//Fix Kit//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:HomeTally deadlines"];
    ev.forEach(function (x, i) {
      var d0 = ymd(x.d).replace(/-/g, ""), d1 = ymd(addDays(x.d, 1)).replace(/-/g, "");
      out.push("BEGIN:VEVENT", "UID:hometally-" + d0 + "-" + i + "@laurent5127415.github.io", "DTSTAMP:" + stamp, "DTSTART;VALUE=DATE:" + d0, "DTEND;VALUE=DATE:" + d1,
        "SUMMARY:" + e(x.t), "DESCRIPTION:" + e(x.x + "\nFrom your HomeTally Fix Kit. Confirm deadlines with your appraisal district."),
        "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + e("In 7 days: " + x.t), "TRIGGER:-P7D", "END:VALARM", "END:VEVENT");
    });
    out.push("END:VCALENDAR");
    return out.join("\r\n") + "\r\n";
  }

  /* ------------------------------------------------------------------ wiring */
  var libP = null;
  function loadPdfLib() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    if (!libP) libP = new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = PDFLIB_URL; s.integrity = PDFLIB_SRI; s.crossOrigin = "anonymous"; s.referrerPolicy = "no-referrer";
      s.onload = function () { window.PDFLib ? res(window.PDFLib) : rej(new Error("pdf-lib didn't load")); };
      s.onerror = function () { libP = null; rej(new Error("couldn't load the PDF tool")); };
      document.head.appendChild(s);
    });
    return libP;
  }
  function download(bytes, name, type) {
    var url = URL.createObjectURL(new Blob([bytes], { type: type }));
    var a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }
  function st(id, msg, err) { var el = $(id); el.textContent = msg || ""; el.classList.toggle("is-err", !!err); }
  function slug(s) { return (s || "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40); }
  function guard(btnId, stId, fn) {
    $(btnId).addEventListener("click", function () {
      st(stId, "Making it on your device\u2026");
      Promise.resolve().then(fn).then(function (m) { st(stId, m || "Done. Check your downloads."); }, function (e) { st(stId, "Couldn't make it" + (e && e.message ? " (" + e.message + ")" : "") + ". Try again, or open this page in its own browser tab.", true); });
    });
  }

  function save() {
    var keep = {}; document.querySelectorAll("#tool-numbers input, #tool-numbers select, #tool-numbers textarea").forEach(function (el) { keep[el.id] = el.value; });
    try { sessionStorage.setItem("hometally.kitform", JSON.stringify(keep)); } catch (_) {}
  }
  function restore() {
    var keep = null; try { keep = JSON.parse(sessionStorage.getItem("hometally.kitform") || "null"); } catch (_) {}
    if (!keep) return;
    Object.keys(keep).forEach(function (id) { var el = $(id); if (el) el.value = keep[id]; });
  }
  function refresh() {
    var v = V();
    var m = motion(v);
    $("m_check").innerHTML = m.ok.map(function (s) { return '<div class="kit-ok">' + esc(s) + "</div>"; }).join("") + m.warnings.map(function (s) { return '<div class="kit-warn">' + esc(s) + "</div>"; }).join("");
    $("m_text").textContent = m.text;
    var pd = protestDeadline(v); $("p_deadline").textContent = longDate(pd.date) + " (" + pd.date.toLocaleDateString("en-US", { weekday: "long" }) + ")";
    $("h_status").innerHTML = v.hsHave === "yes" ? '<div class="kit-ok">Your bill shows a homestead exemption. Keep checking it each year.</div>'
      : v.hsHave === "no" ? '<div class="kit-warn">No homestead exemption on your bill. If you live there, this alone can cut your school tax a lot. Apply now.</div>'
      : '<div class="kit-warn">Not sure if you have it? Look for "HS" or "Homestead" on your tax bill or appraisal district page.</div>';
    $("l_text").textContent = letterText(v);
    $("cal_list").innerHTML = events(v).map(function (x) { return "<li><b>" + esc(longDate(x.d)) + "</b> \u2014 " + esc(x.t) + "</li>"; }).join("");
    save();
  }
  function wire() {
    restore();
    document.querySelectorAll("#kit-tools input, #kit-tools select, #kit-tools textarea").forEach(function (el) { el.addEventListener("input", refresh); el.addEventListener("change", refresh); });
    $("k_clear").addEventListener("click", function () {
      try { sessionStorage.removeItem("hometally.kitform"); sessionStorage.removeItem("hometally.checker"); } catch (_) {}
      document.querySelectorAll("#kit-tools input:not([type=checkbox]), #kit-tools textarea").forEach(function (el) { el.value = ""; });
      $("k_county").value = "Tarrant"; refresh(); st("k_saved", "Cleared from this tab.");
    });
    guard("m_dl", "m_st", function () {
      var v = V(), m = motion(v);
      return Promise.all([loadPdfLib(), fetch("form_50-869.pdf", { credentials: "omit" }).then(function (r) { if (!r.ok) throw new Error("blank form missing"); return r.arrayBuffer(); })])
        .then(function (a) { return fillMotion(a[0], a[1], m.fields); })
        .then(function (bytes) { download(bytes, "Form_50-869_motion_" + v.year + ".pdf", "application/pdf"); return "Filled Form 50-869 downloaded. Sign it, attach your closing disclosure and send it certified mail."; });
    });
    guard("p_dl", "p_st", function () {
      var v = V();
      return loadPdfLib().then(function (L) { return textPdf(L, "Property tax protest packet - " + protestDeadline(v).year, protestBlocks(v)); })
        .then(function (b) { download(b, "HomeTally_protest_packet" + (v.prop ? "_" + slug(v.prop) : "") + ".pdf", "application/pdf"); return "Protest packet downloaded."; });
    });
    guard("h_dl", "h_st", function () {
      var v = V();
      return loadPdfLib().then(function (L) { return textPdf(L, "Homestead exemption guide (Form 50-114)", homesteadBlocks(v)); })
        .then(function (b) { download(b, "HomeTally_homestead_guide.pdf", "application/pdf"); return "Homestead guide downloaded."; });
    });
    guard("l_dl", "l_st", function () {
      var v = V(), txt = letterText(v);
      return loadPdfLib().then(function (L) { return textPdf(L, "Qualified written request / notice of error", txt.split("\n").map(function (ln) { return { p: ln, after: 0, size: 10.5 }; })); })
        .then(function (b) { download(b, "HomeTally_escrow_dispute_letter.pdf", "application/pdf"); return "Letter downloaded. Fill anything in [brackets], sign it and send it certified mail."; });
    });
    $("l_copy").addEventListener("click", function () {
      var t = letterText(V());
      (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { st("l_st", "Copied."); }, function () { st("l_st", "Copy didn't work here; select the text above and copy it.", true); });
    });
    guard("cal_dl", "cal_st", function () {
      var ev = events(V());
      download(ics(ev), "HomeTally_deadlines.ics", "text/calendar");
      return ev.length + " dates downloaded as a calendar file.";
    });
    refresh();
  }

  function init() {
    var paid = document.documentElement.getAttribute("data-paid") === "fixKit";
    if (paid) { var n = $("kitPaidNote"); if (n) { n.hidden = false; n.textContent = "Payment received. Thank you!"; } }
    showKit();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else setTimeout(init, 0);
})();
