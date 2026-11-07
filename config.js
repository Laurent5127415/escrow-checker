/* HomeTally site settings. This is the ONE file to edit for payments and lead logging.
 *
 * PAYMENT_LINKS: paste a Stripe Payment Link (https://buy.stripe.com/...) for each plan.
 *   - While a link is "" (empty), its buy button opens a short form instead and logs the person
 *     as a buyer-intent lead in the "HomeTally Leads" Google Sheet. No card is ever collected here.
 *   - Once a link is set, the buy button sends people straight to Stripe Checkout; Stripe records
 *     who paid (Stripe Dashboard > Payments / Customers).
 *   - In Stripe, set each Payment Link's "After payment" redirect to:
 *       Fix Kit:       https://laurent5127415.github.io/escrow-checker/fix-kit/?paid=fixKit
 *       Payment Watch: https://laurent5127415.github.io/escrow-checker/plans/?paid=watch#payment-watch
 *     The return page logs a "paid_return" row in the Sheet and unlocks the Fix Kit on that device.
 *
 * KIT_UNLOCK_WITHOUT_PAYMENT: while the Fix Kit payment link is empty, should a person who fills
 *   the buyer-intent form get the kit tools right away (early-tester access, no charge)?
 *   true  = yes (lets testers use the kit and give feedback)
 *   false = no (they only see "payment opens soon, we'll email you")
 *   Once PAYMENT_LINKS.fixKit is set, this setting is ignored and only ?paid=fixKit unlocks.
 *   Note: this is a static site, so the unlock is a convenience gate, not hard security.
 */
window.HOMETALLY_CONFIG = {
  BRAND: "HomeTally",
  PAYMENT_LINKS: {
    fixKit: "https://buy.stripe.com/9B6dRb4MhahlfQR1ao1gs00",
    watch: "https://buy.stripe.com/00w4gB92xblpbAB8CQ1gs01"
  },
  PRICES: {
    fixKit: { amount: "$39", label: "$39 one-time" },
    watch: { amount: "$49", label: "$49 a year" }
  },
  KIT_UNLOCK_WITHOUT_PAYMENT: true,
  FEEDBACK_EMAIL: "laurent@kuumba.app",

  /* Every form on the site posts here: a Google Form owned by laurent@kuumba.app whose responses
     land in the private Google Sheet "HomeTally Leads" (tab "Form Responses 1").
     The entry ids map site fields to the Form's questions; don't change them unless the Form changes. */
  LEADS: {
    action: "https://docs.google.com/forms/d/e/1FAIpQLSdvS25igqhmgZjqoMGG1SAsDji8ItYPOtCcEOoTKlremqi3WQ/formResponse",
    fields: {
      form: "entry.963232962",
      plan: "entry.842464783",
      name: "entry.1100551136",
      email: "entry.1127579839",
      phone: "entry.1655014450",
      county: "entry.714111716",
      organization: "entry.1555706190",
      role: "entry.1301993087",
      details: "entry.1658575652",
      page: "entry.765684679",
      test: "entry.282992001"
    }
  }
};
