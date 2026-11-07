# escrow-checker
Free Tarrant County escrow & property-tax checker. Everything runs in your browser.

- `/` (index.html): the guide. Explains escrow, county values and deadlines; calendar links and .ics files; notice-date calculator. No network beyond this site.
- `/check/` (check/index.html): the checker app (escrow letter check, TAD address lookup, county check, Form 50-869 pre-fill). Single self-contained file built from `static_app/` (`python3 build.py`). Its CSP allows only cdn.jsdelivr.net (pdf.js, pdf-lib) and tad.newedgeservices.com (TAD public map).

Narrated video: drop `explainer.mp4` + `explainer_poster.jpg` (+ optional `explainer.vtt`) next to index.html and rebuild the guide with `build_guide.py`.

Not legal or tax advice. Free test. Feedback: laurent@kuumba.app
