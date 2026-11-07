# HomeTally (repo: escrow-checker)
"Why did my mortgage payment go up — and can I fix it?" Free Tarrant County escrow & property-tax checker, plus a do-it-yourself Fix Kit. Documents are read in the browser and never uploaded. The repo keeps its old name so the GitHub Pages URL stays the same.

## Pages
- `/` (index.html): the guide. Narrated video opens in a pop-up (loads only when opened). Pricing section, FAQ, deadlines + .ics.
- `/check/` (check/index.html): the free checker (escrow letter, scans/photos via on-device OCR, TAD lookup, county check, Form 50-869). After results, a "Fix it" panel; the numbers are saved in `sessionStorage` (this tab only) for the Fix Kit. Built from `static_app/` (`python3 build.py`).
- `/fix-kit/`: the $39 Fix Kit (unlocks after Stripe checkout returns to `/fix-kit/?paid=fixKit`): pre-filled Form 50-869 (official blank `fix-kit/form_50-869.pdf`), protest evidence packet PDF, homestead guide (Form 50-114) PDF, RESPA qualified written request / notice of error letter PDF, deadline calendar .ics. PDFs made with pdf-lib 1.17.1 from jsDelivr (SRI).
- `/plans/`: pricing, Payment Watch ($49/yr), insurance-agent match (interest form), done-for-you protest waitlist (coming soon; needs TDLR property tax consultant registration first), FAQ.
- `/partners/`: realtors, lenders, credit unions, housing counselors: white-label / referral contact form.

## Payments and leads: edit `config.js` only
- `PAYMENT_LINKS.fixKit` / `PAYMENT_LINKS.watch`: Stripe Payment Links. Empty = the buy button opens a short buyer-intent form instead.
- Stripe "after payment" redirects: `…/fix-kit/?paid=fixKit` and `…/plans/?paid=watch#payment-watch` (log a `paid_return` row; the first one unlocks the kit on that device).
- `LEADS`: every form (and each checkout click) posts to a private Google Form owned by laurent@kuumba.app; responses land in the Sheet "HomeTally Leads". No card numbers are ever collected on the site; add `?test=1` to a page URL to flag test rows "TEST".
- Shared code: `hometally.js` (buy buttons, forms, fine print), `ht.css` (styles), `ht-nav.css` (the guide's header for the checker). Theme choice is shared across pages via `localStorage["hark-theme"]`.

## CSP
Guide/plans/partners: `connect-src https://docs.google.com` only. Fix Kit: adds `'self'` (blank form) and jsDelivr scripts. Checker: jsDelivr + tad.newedgeservices.com + docs.google.com.

Not legal or tax advice. HomeTally is not a law firm or a licensed property tax consultant. Feedback: laurent@kuumba.app
