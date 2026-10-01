# Sequence Patterns

Five lifecycle patterns cover ~95% of programs. Each one has a distinct trigger, audience, length, timing, and goal — pick the pattern first, then map it to your provider in [`provider-mechanics.md`](./provider-mechanics.md).

The copy below is a *skeleton*, not a template. Fill in the brand voice, swap the proof point, but keep the sentence shape — these patterns work because they're concise, single-purpose, and matched to where the recipient is in their lifecycle.

## Pattern 1 — Welcome / onboarding

Highest-engagement window in the entire lifecycle. People who just signed up *want* to hear from you. Don't waste it.

### Audience

- **Trigger:** opt-in event (newsletter signup, free trial start, account creation, first download).
- **Filter:** opted in within the last 24h. Not already a paying / converted customer.
- **Suppress:** anyone who has already hit the conversion goal of this flow (e.g., already purchased).

### Cadence (3–5 emails over 7–10 days)

| Email | Day | Job |
| --- | --- | --- |
| 1 — Welcome | 0 | Confirm signup. Set expectations. Deliver promised value (lead magnet, trial credentials, first-purchase code). |
| 2 — The one thing | +2 | Get them to take the *single most important* first action. (Set up integration, add first product to cart, complete profile.) |
| 3 — Why us / proof | +5 | Customer story or product moment. Address the obvious objection. |
| 4 — Soft CTA *(optional)* | +7 | Direct ask. "Ready to upgrade?" / "Use code WELCOME10 by Friday." |
| 5 — Open door / ask *(optional)* | +10 | One-liner from a real person. "What brought you in? Reply if there's anything I can help with." Replies here are gold. |

### Skeleton

```
Subject (1): you're in

Hi {{first_name|"there"}},

Welcome — glad you're here. {{Promised_value_delivery}}.

A couple things to expect:
  - {{Cadence promise}}
  - {{Value promise}}

If you ever want to reach me directly, just reply.

— {{Sender name}}
```

```
Subject (2): start with this

Hi {{first_name|"there"}},

The single most useful thing to do first is {{The_One_Thing}}.

{{Why_it_matters_in_one_sentence}}.

{{CTA — link to the action}}

— {{Sender name}}
```

### What kills welcome flows

- **Sending the welcome 6 hours after signup.** Send within 5 minutes. Engagement falls off a cliff after the first hour.
- **Skipping email 1 because the signup form already showed a confirmation.** A confirmation page is not a welcome email. People don't keep the page open.
- **Branded marketing template on email 1.** The welcome should look like a 1:1 message from a person, not a launch announcement.

### Benchmarks (rough — varies hugely by industry)

- Open rate: 40–60% (highest of any lifecycle program)
- Click rate: 8–15%
- Conversion to goal: 3–10% (if the goal is well-aligned with the trigger)

If your welcome converts under 1%, the trigger or audience is wrong, not the copy.

## Pattern 2 — Nurture

Lower-intent than welcome. The recipient signed up for *content*, not your product. Goal is to bridge from content interest to product interest over weeks.

### Audience

- **Trigger:** lead magnet download, content opt-in, gated resource access.
- **Filter:** opted in via content channel (not a product signup). Hasn't taken a product action.
- **Suppress:** product signups, paying customers, anyone in another active sequence.

### Cadence (4–7 emails over 3–6 weeks)

| Email | Day | Job |
| --- | --- | --- |
| 1 — Deliver | 0 | Send the lead magnet. Set expectations for what's next. |
| 2 — Follow-on value | +3 | Related piece of content. Useful regardless of whether they buy. |
| 3 — Customer story | +7 | Specific outcome a similar customer got — frames the product without selling it. |
| 4 — Frame the problem | +14 | Educate on the *why* behind the product category. |
| 5 — Soft product intro | +21 | First explicit product mention. Low-pressure: "Here's how we approach this." |
| 6 — Direct ask | +28 | "Worth a 15-min call?" or "Try the free plan." |
| 7 — Breakup | +35 | "Going to pause sending unless you want more — let me know." |

### What kills nurture flows

- **Pitching the product on email 1.** They opted in for *content*. Selling immediately violates the implicit deal and tanks engagement.
- **Long gaps with no value.** "Just checking in" between content emails reads as filler.
- **Forgetting to suppress when they convert.** A nurture flow continuing to send after the recipient becomes a customer is the most common embarrassing lifecycle bug.

## Pattern 3 — Abandoned cart *(ecom only)*

Highest-ROI lifecycle program for ecommerce. Often runs through Klaviyo with native Shopify event listeners.

### Audience

- **Trigger:** Started Checkout event with cart value > threshold (often $30–50).
- **Filter:** No Placed Order event in the next 24h.
- **Suppress:** anyone who completed the purchase between trigger and send.

### Cadence (2–3 emails over 24–72 hours)

| Email | Time after abandon | Job |
| --- | --- | --- |
| 1 — Reminder | +1 hour | Show the cart contents. No discount yet. "Still thinking it over?" |
| 2 — Soft incentive | +24 hours | Free shipping, free returns, gift with purchase — not a discount. |
| 3 — Discount *(optional)* | +48–72 hours | Last touch with a real discount, expiring. Use sparingly — trains people to abandon for the discount. |

### What kills abandoned-cart flows

- **Discounting on email 1.** Trains repeat behavior — people start abandoning intentionally to wait for the email.
- **Showing the wrong cart.** Klaviyo's cart-content variables can stale-cache. Test thoroughly.
- **Suppression bug — sending the cart email after the order completes.** Embarrassing and damages trust. Suppression is non-negotiable.

### Benchmarks

- Open rate: 30–45%
- Click rate: 6–10%
- Recovery rate: 8–15% of abandoned carts

## Pattern 4 — Re-engagement

Audience: people who used to engage and stopped. The goal is *re-open*, not conversion. If they re-open, the regular lifecycle programs take over.

### Audience

- **Trigger:** lapsed engagement signal — no opens in 60 days, no site visits in 90 days, no app sessions in 30 days. Set the threshold per product.
- **Filter:** still subscribed (haven't unsubscribed). Not a paying customer (they get win-back instead).
- **Suppress:** anyone who opened or engaged in the last 7 days.

### Cadence (2–3 emails over 7–14 days)

| Email | Day | Job |
| --- | --- | --- |
| 1 — Pattern interrupt | 0 | Different from your usual sends. Short, conversational, asks a question. "Are these emails still useful?" |
| 2 — Best of | +5 | Roundup of the most-engaged content / launches they missed. |
| 3 — Decision | +12 | "Going to pause your subscription unless you click here." Explicit. |

After the cadence: anyone who didn't engage gets *suppressed* (not unsubscribed — kept on the list, just not sent to). Re-evaluate in 90 days.

### What kills re-engagement flows

- **Marketing-templated emails.** A lapsed subscriber's eye filters them out. Use plain-text or near-plain-text.
- **Asking them to update preferences.** They won't. The decision is binary: re-engage or pause.
- **Not pausing after the sequence.** Sending to people who explicitly didn't engage with the re-engagement flow tanks deliverability for everyone else on the list.

## Pattern 5 — Win-back *(for lapsed customers)*

Different from re-engagement: this is for *paying customers* who stopped purchasing or canceled.

### Audience

- **Trigger:** no purchase in 180+ days (ecom), canceled subscription / no login in 60+ days (SaaS).
- **Filter:** customer has historical revenue / engagement.
- **Suppress:** active customers, anyone in cancellation / churn-prevention flow.

### Cadence (2–3 emails over 14–21 days)

| Email | Day | Job |
| --- | --- | --- |
| 1 — Acknowledge | 0 | "Haven't seen you in a while" — no pressure, no discount. Acknowledges the relationship. |
| 2 — What's new | +7 | Genuine product / catalog update relevant to *what they bought before*. Personalize from order history. |
| 3 — Offer | +14 | A real reason to come back — exclusive product, customer discount, early access. Time-bounded. |

### What kills win-back flows

- **Generic "We miss you!" with a 10% off coupon.** Treats them like a stranger. Win-back has to acknowledge they were a customer.
- **No personalization.** A win-back without "since you bought X" personalization is indistinguishable from re-engagement.
- **Discount-only thinking.** A discount is the *last* lever. Better is "here's the new thing in the category you cared about."

## Cross-pattern measurement

For all five patterns, the only real metric is *conversion to goal* — defined per program.

| Pattern | Goal metric |
| --- | --- |
| Welcome | First conversion (purchase / activation / paid signup) within sequence + 7d |
| Nurture | Product-qualified action (signup, demo request, paid trial start) within sequence + 14d |
| Abandoned cart | Placed Order within 72h of trigger, attributed to the flow |
| Re-engagement | Opens / clicks within sequence + 7d (re-engagement floor) |
| Win-back | Repeat purchase / re-subscription within sequence + 30d |

Open rate is diagnostic. Click rate is diagnostic. Conversion is the only number that matters for whether the program ships value.
