/**
 * Special Stage: GTM engineering case studies (the AlphaForge arc).
 * The spine is thesis plus proofs: Reason Codes states the claim, and the
 * rally beneath it is one continuous three-week build against a single
 * audience, presented in three stages: Recon (detection), Pace Notes
 * (segmentation), The Stage (outbound). Two further proofs sit outside the
 * Stripe arc: the San Francisco SMB build and Proximize Scout. Hand-check
 * board data lives in gtme-handcheck.ts.
 *
 * Voice rules for every string in this file (enforced by tests):
 * no em dashes, no "it's not X, it's Y" constructions, first person,
 * plain language, failures reported in the same voice as wins.
 *
 * Provenance: "artifact" numbers are stated in the build files on disk;
 * "session" numbers come from the working session and its published posts.
 * The UI marks session numbers so a skeptical reader can tell them apart.
 */

export type StageSlug = "reason-codes" | "recon" | "pace-notes" | "the-stage";

export type Provenance = "artifact" | "session";

export interface StageMetric {
  label: string;
  value: string;
  detail?: string;
  provenance: Provenance;
}

export interface BuildLogEntry {
  date: string;
  title: string;
  body: string;
}

export interface StageVideo {
  /** External share link (Cursorful); opens in a new tab */
  href: string;
  label: string;
  /** Plain-language line under the label */
  note?: string;
}

export interface StageFigure {
  /** Public path under /gtme */
  src: string;
  alt: string;
  caption: string;
}

export interface StageLink {
  href: string;
  label: string;
  /** External links open in a new tab; internal ones use the site's wipes */
  external?: boolean;
}

export interface StageSection {
  heading: string;
  /** Optional rally-chrome caption over the plain heading */
  chrome?: string;
  body: readonly string[];
  /** Verbatim lines from the build writeups, rendered as pull quotes */
  quotes?: readonly string[];
  /** Screen recording that walks through this section's build */
  video?: StageVideo;
  /** Workspace screenshot placed inline, after the body */
  figure?: StageFigure;
  /** Cross-references rendered as plate links after the section */
  links?: readonly StageLink[];
}

export interface StageArtifact {
  label: string;
  kind: "image" | "code";
  /** Public path for images */
  src?: string;
  /** Verbatim code for code artifacts */
  code?: string;
  caption: string;
}

export interface CaseStudy {
  slug: StageSlug;
  /** Rally chrome, e.g. "SS1 · RECON" */
  chrome: string;
  /** Plain-English title */
  title: string;
  /** Published title assertion, where one exists */
  assertion?: string;
  window: string;
  lede: readonly string[];
  pullQuote?: string;
  /** Screen recording of the stage's build, linked from under the lede */
  video?: StageVideo;
  buildLog: readonly BuildLogEntry[];
  metrics: readonly StageMetric[];
  sections: readonly StageSection[];
  failures: StageSection;
  debrief: StageSection;
  artifacts: readonly StageArtifact[];
  careerEventSlug?: string;
}

export const specialStage = {
  chrome: "SPECIAL STAGE",
  caption: "GTM engineering case studies",
  headline: "The map ends where this work starts.",
  wedge: [
    "Circuit racing runs on a map every driver shares. Rally runs on pace notes the driver wrote during recon. I build go-to-market systems for the second kind of market: buyers no enrichment tool can see, signals that only exist as an absence, and claims I will only publish once two independent sources agree.",
    "The centrepiece below is one continuous three-week build against a single audience, Stripe's startup partnerships pool over the YC company universe. 2,932 companies loaded. 909 scored. 12 emails sent, each signed with my real name. Around it sit two more builds that prove the same claim: a week against San Francisco restaurants where the standard tools could not even be invoked, and Proximize Scout, built before the course started, which scores local businesses on how badly they are missing from AI search answers. The failures are reported in the same voice as the wins, because catching a wrong number before it ships is worth more than the pipeline the wrong number would have produced.",
  ],
  provenanceNote:
    "Numbers marked with a dot come from the working session and its published posts. Unmarked numbers are stated in the build artifacts on disk, with file and line.",
  /** Every screen recording from the arc, listed once on the index */
  footage: [
    {
      href: "https://cursorful.com/share/xQc6NQ6tmCPG",
      label: "P5, an earlier build",
      note: "Recorded before this arc started.",
    },
    {
      href: "https://cursorful.com/share/fOxWpi6D1N3r",
      label: "P6, the memory layer",
      note: "The snapshot layer that gives Clay a clock.",
    },
    {
      href: "https://cursorful.com/share/syYaoX9UCLOf",
      label: "P8, segmentation",
      note: "The cut, the gate, and the rename.",
    },
    {
      href: "https://cursorful.com/share/bxlhgXZrc8Pj",
      label: "P9, the outbound run",
      note: "Twelve sends and the reply loop.",
    },
  ],
} as const;

/**
 * The five reason codes, the teaching artifact of the Reason Codes stage.
 * Rendered by ReasonCodeBoard as a real table that stacks on mobile.
 */
export interface ReasonCode {
  code: "DNS" | "DNF" | "BLIND" | "NIL" | "OFF";
  means: string;
  tell: string;
}

export const reasonCodes: readonly ReasonCode[] = [
  {
    code: "DNS",
    means: "Did not start. The question was never asked.",
    tell: "The row was skipped rather than answered, usually because an input was missing, or was an absence the platform refused to run.",
  },
  {
    code: "DNF",
    means: "Started, and the instrument broke.",
    tell: "Something threw, which makes this the honest one.",
  },
  {
    code: "BLIND",
    means: "Asked, and the instrument structurally cannot see this class of thing.",
    tell: "Returns clean, confident and empty. Looks exactly like NIL, and is not NIL.",
  },
  {
    code: "NIL",
    means: "Asked, looked, and there is genuinely nothing there.",
    tell: "The valuable one. Unfalsifiable without a denominator.",
  },
  {
    code: "OFF",
    means: "Asked, and got confident, well formed, wrong output.",
    tell: "Nothing errors. Only independent verification catches it.",
  },
] as const;

export const reasonCodesNote =
  "BLIND and OFF are the two that cost you, because both return successfully. NIL is the one worth the most, because presence is what everyone else is already selling to.";

export const throughLine =
  "Every build in this arc contains the same shape of finding: a thing that did not happen presenting as a thing that did. A null read as a zero. An absence read as unset. A blind instrument read as a market signal. The work is telling those apart, and that part is mine rather than the tool's.";

export const ethicsStory: StageSection = {
  heading: "Where the line is",
  chrome: "STEWARDS' NOTE",
  body: [
    "The best-researched contact in the build was an engineer at a company that sells subscription billing infrastructure. Their working email was sitting in git commit author metadata on a personal domain, and their public work was exactly what I would have been asking about.",
    "I did not send, for two reasons. The company runs on the processor I was writing about, so the claim in my email would have been wrong, and wrong in a way that gets forwarded. And the address was never published as a contact channel. It leaked as a side effect of committing code. The same pattern came up twice more in the build, and I never used it.",
    "Reading someone's commit history to find out what they built is fine. Reading it to find out where to reach them is something else, and both start with the same git log. The line is not in the data. It is in what you do next with it.",
  ],
};

export const caseStudies: readonly CaseStudy[] = [
  {
    slug: "reason-codes",
    chrome: "REASON CODES",
    title: "Reason Codes: five kinds of nothing, and the one worth 40 points",
    assertion: "A DNS is not a DNF. Your enrichment table thinks it is.",
    window: "Aug 16 to Sep 6",
    careerEventSlug: "alphaforge-gtme",
    lede: [
      "Every empty cell in your table means one of five different things. Rally scores all five separately. Clay scores them identically, and the one it cannot see was worth 40 points across 909 companies.",
      "This page is the thesis. The three stages below are its proofs.",
    ],
    pullQuote: "A missing signal is not a weak signal.",
    buildLog: [
      {
        date: "Earlier",
        title: "Proximize Scout",
        body: "Built before the course started: a prospecting tool for physical local businesses that ranks them on how badly they are missing from the answers AI search engines give. The score is the absence. I did not yet know that was a pattern.",
      },
      {
        date: "Aug 16",
        title: "The San Francisco control",
        body: "Twenty owner operated restaurants and bars, prospected from the city's business registry. The conventional path produced zero named humans across all twenty, the registry path produced 8 of 10, and the build log recorded three different kinds of blank to keep that comparison honest.",
      },
      {
        date: "Aug 25 to 31",
        title: "The Stripe arc",
        body: "The three stages below this card: 2,932 companies loaded, 909 scored, 12 signed sends. The top scoring tier fires on a confirmed absence, and 609 rows sit in it.",
      },
      {
        date: "Sep 6",
        title: "The write up",
        body: "Put the builds side by side to teach the pattern, and found I had built the same column twice in two markets without noticing. The taxonomy on this page is the result.",
      },
    ],
    metrics: [
      {
        label: "Kinds of nothing",
        value: "5",
        detail: "DNS, DNF, BLIND, NIL and OFF. With FOUND, six states in one column.",
        provenance: "session",
      },
      {
        label: "Rows at max score on an absence",
        value: "609 of 909",
        detail: "Metered pricing present, zero processors detected. The 40 point component.",
        provenance: "artifact",
      },
      {
        label: "Qualification rate, one instrument vs two",
        value: "6% vs 32%",
        detail: "The same question asked of the same segment. The gap is the BLIND audit.",
        provenance: "artifact",
      },
      {
        label: "Registry lookups returning a named human",
        value: "8 of 10",
        detail: "Against 0 of 20 on the conventional path. Trustworthy because one scraper artifact was excluded from the denominator on purpose.",
        provenance: "artifact",
      },
      {
        label: "Rows the platform refused to run",
        value: "35",
        detail: "The error was Some inputs missing. For every one of those rows, empty was the value.",
        provenance: "artifact",
      },
    ],
    sections: [
      {
        heading: "The board",
        chrome: "OK / SOS",
        body: [
          "Every car on a rally stage carries two boards. Red says SOS, send help. Green says OK, we are fine, keep going. If you go off, you display one where the next crew can see it, and the following car is obliged to act on what it sees.",
          "Then the rule that matters: a crew that has gone off and displays nothing at all. The regulation does not leave that to judgement. No board is treated as SOS. Stop, deploy your own red board, and the cars behind you stop too, until the stage is halted and medical reaches the scene.",
          "Rally wrote that down because nobody displays OK from under an upside down car. Silence is the most likely shape an emergency takes, and a sport that read it as probably fine would kill people at a predictable rate.",
          "Your enrichment table has the opposite rule.",
        ],
      },
      {
        heading: "The turn",
        chrome: "RESULTS SHEET",
        body: [
          "A DNS never started. A DNF started and broke. On a results sheet both score zero points, and timing records them separately anyway, because why you scored nothing is the most important fact about your run.",
          "Your table does not do this. A row never enriched, a row where the API timed out, a row where the vendor cannot see the thing you asked about, a row where there is genuinely nothing there, and a row of confident well formed garbage all arrive as the same empty cell. Then a filter reads that cell as a zero, the zero becomes a segment, and the segment becomes a send.",
          "Four weeks of building GTM systems across three unrelated markets on three unrelated toolchains, and this was the failure in every one. Not the biggest. The only one that recurred.",
        ],
      },
      {
        heading: "The five reason codes",
        chrome: "TIME CARD",
        body: ["So here are the five, named, with what each cost me."],
      },
      {
        heading: "OFF: twenty restaurants and nine wrong companies",
        chrome: "OFF THE ROAD",
        body: [
          "Before the Stripe build I spent a week on twenty San Francisco restaurants and bars, pulled from the city's Registered Business Locations dataset. There is no Head of RevOps at a taqueria, and that is the whole problem: these businesses produce almost none of the digital exhaust prospecting tools are built on.",
          "I ran the conventional path first, as a control. It produced four usable domains, two company records, and zero named humans. Clay's company tools want a domain or a LinkedIn URL. A legal entity name, a street address and a tax certificate number are not accepted inputs, so the conventional path could not even be invoked. That failure was at least legible. The next one was not.",
          "Naive domain discovery appeared to find websites for fourteen of twenty. Validated against the real street address on file, four were correct, nine belonged to entirely unrelated companies, and all nine cells looked identical to the four that were right.",
          "Then the registry. California's Secretary of State search is keyword based, so querying Mili Inc returned !PERFECTO! MILITARY FAMILIES UNITED, INC. Without validating the returned entity name against the query, I would have attached LegalZoom to a ramen shop as its registered owner and written an email to it.",
          "Three failures, one shape. None threw an error. Each produced confident, well formed, wrong output, and only verification against something independent caught any of them. This is OFF, and it is why the other four codes exist. Once a returned value proves nothing about the lookup behind it, you have to say what each cell actually is.",
          "The build log for that week records three outcomes distinctly: WRONG_ENTITY for the LegalZoom match, NO_RESULT for an entity that genuinely returns nothing, and NOT_ATTEMPTED for one row where my own scraper misfired, excluded from the denominator on purpose so a tooling failure would never count as evidence against the data source.",
          "That is DNF kept out of NIL's denominator, four weeks before either had a name. The registry path returned a named human on 8 of 10 valid lookups against the control's 0 of 20, and that 80 percent is only trustworthy because the eleventh row was thrown out. Above those outcomes, without knowing I was writing the thesis of anything, I had put one sentence:",
        ],
        quotes: [
          "Not every blank is the same blank. Collapsing them would misstate the result.",
        ],
      },
      {
        heading: "BLIND: the artifact that nearly deleted the right segment",
        chrome: "BLIND CREST",
        body: [
          "BLIND is harder than OFF, because BLIND returns nothing and nothing is exactly what you were willing to believe.",
          "Building the Stripe audience, I ran a technographic scan and asked what fraction of my first segment showed an open payments architecture signal. It came back at 6 percent. My pre-written kill threshold said below 10 percent, delete the segment. It was one command from deletion.",
          "I added a second instrument first, a read of the company's actual pricing page, and the same question came back at 32 percent.",
          "The difference was usage based billing. A technology scan detects installed vendors. A company that meters usage and invoices for it on internal tooling has no vendor to detect, so the scan returns clean and empty, and clean and empty reads as no signal here. A keyword pass over company descriptions had predicted usage based billing at 0.7 percent where the truth was 28 percent, wrong by a factor of forty, because metered billing is exactly the thing a description never mentions.",
          "I did not nearly kill a bad segment. I nearly killed the correct segment, on a number that described my instrument rather than my market.",
          "A week later the same detector, pointed at billing vendors, returned an exciting 49.3 percent rate of payments closed but billing open. Zero billing vendors were detected across all 73 domains, and Chargebee, Recurly and Paddle returned zero across 300 domains through the same mechanism that found Stripe 56 times, so a blank in that category was structurally guaranteed before the run started. The number measured the instrument at full confidence.",
          "A BLIND row is one your vendor was never going to see. It does not belong in a denominator, and it stays invisible until you ask what your instrument is constitutionally unable to detect, a question no tool will volunteer.",
        ],
        figure: {
          src: "/gtme/clay-two-instruments.png",
          alt: "Five Clay columns on tier A rows: Fn State reading NONE, Fn Tech empty, Fn Activity Confirmed reading YES, and sig2_metered_gap and signal_score both reading 40",
          caption:
            "Two instruments disagreeing in public. The scan reads NONE with an empty processor list, the pricing read confirms metered charging, and the 40 point component fires only on that intersection.",
        },
      },
      {
        heading: "NIL: 609 companies scoring maximum on nothing",
        chrome: "THE 40 POINTS",
        body: [
          "Here is the payoff, and the reason this is more than a hygiene post.",
          "The final build loaded every active YC company with a website, Winter 2021 through Spring 2026: 2,932 rows, no headcount filter. One was dropped for an invalid domain, six were disqualified as unscannable after returning zero technologies on scan, and 909 scored above zero to become the deliverable.",
          "Fit is scored nowhere in that table: every row is YC and YC is a Stripe partner, so fit lives in the pool definition. The entire score is about window, the brief period when a payments architecture decision is open.",
          "The highest weighted component in the model is worth 40 points, and it fires on a confirmed absence: metered pricing present, zero payment processors detected. They are charging per unit consumed, and there is nothing on the site that could be collecting the money. They are invoicing by hand or on something they built, which is the single condition Stripe Billing exists to end. 609 of the 909 rows sit in that state, the top tier of the deliverable, scoring maximum on a thing that is missing.",
          "But a claim of absence is unfalsifiable on sight, so every row carries its denominator. Never just no processor detected, always zero processors among 154 detected technologies. One is a claim a rep can check in ten seconds, the other a shrug in a cell. The denominator converts NIL from an empty result into evidence, and it is the cheapest column in the entire build.",
        ],
        quotes: [
          "An absence is only a signal when it comes with the size of the search that failed to find anything.",
        ],
        figure: {
          src: "/gtme/clay-tier-a-rows.png",
          alt: "Clay table filtered to tier A, 609 of 2,932 rows in the toolbar, with tier reading A and signal_score reading 40 on every row, Fn State reading NONE, and Fn Ntech carrying denominator counts",
          caption:
            "The top tier, live in the workspace: 609 of 2,932 rows at the maximum score, every state cell reading NONE. The score sits on a confirmed absence, and the toolbar carries the count.",
        },
      },
      {
        heading: "DNS: when empty is the answer and the platform will not run",
        chrome: "DID NOT START",
        body: [
          "The last code is the one that broke the build, and the most specific thing I learned about the tool itself.",
          "I extracted the logic above into a reusable function that takes the question as an input, a category label, a vendor list and an activity claim, so it does not know what it is looking for until someone tells it. Pointed at payments, it asks whether a company shows evidence of charging metered rates while showing no evidence of having bought a processor.",
          "Thirty five rows refused to run. The error was Some inputs missing.",
          "Clay will not execute a row when a mapped column is empty. That is a sensible default for almost every enrichment anyone has ever built. It was fatal here, because for those thirty five rows empty was the value. The detected processor list was empty precisely because no processor was detected, which is the finding, and the platform's type system cannot tell we looked and found nothing apart from this input is unset.",
          "That is the whole essay in one error message. The signal I care most about is an absence, and the absence was being read as a DNS.",
          "The fix is a sentinel: the caller substitutes a marker string where the value is a genuine empty, the function translates it back at the boundary, and storage records a real empty string rather than a null. Five minutes of work, and it exists only because I knew the difference between the two states before I saw the error.",
        ],
      },
      {
        heading: "The recipe",
        chrome: "SERVICE PARK",
        body: [
          "Five columns. Any tool, any market, about fifteen minutes.",
          "1. Make the state a column rather than an inference. An enum, DNS / DNF / BLIND / NIL / OFF / FOUND, with a default of DNS and never blank. If the cell is empty you have already lost the distinction.",
          "2. Give every NIL a denominator. Record what was seen. Zero of 154 is checkable. Zero alone is a shrug.",
          "3. Record provenance. Which source produced this value. Never overwrite a conflicting value from a different source; add a column and let them disagree in public.",
          "4. Record the failure mode. One short string saying why this cell is blank. This is where DNF and BLIND get separated from NIL, and it is the column that makes the other four trustworthy.",
          "5. Sentinel your empties. Where the platform refuses empty inputs, substitute a marker at the caller and translate it back at the function boundary.",
          "Then run the audit that catches BLIND, the only one of the five you cannot find by looking at a row: compute your qualification rate twice, once with BLIND rows in the denominator and once with them excluded. If the two numbers differ materially, you have been reporting on your instrument. My two numbers were 6 percent and 32 percent.",
        ],
        figure: {
          src: "/gtme/clay-ntech-denominator.png",
          alt: "Four Clay columns: Fn State reading NONE, infra_absence_check reading Success, Fn Tech empty, and Fn Ntech recording counts, with 154 on the second row",
          caption:
            "Step 2 on screen. The run succeeded, the processor column is empty, and Fn Ntech records how many technologies the scan did see. The second row is the zero among 154.",
        },
      },
      {
        heading: "The sixth code, and where the platform ends",
        chrome: "THE CLOCK",
        body: [
          "There is one I could not build inside the tool at all. My second strongest signal was a payment processor that was invisible ninety days earlier, a decision that just resolved, caught while switching costs are still low. Call the code CHANGED. It is a property of two observations, and Clay holds one observation from one day. Every column answers what is true now, and nothing in the platform answers what changed.",
          "So I left the platform for a Supabase edge function that diffs each vendor fingerprint against its prior snapshot and POSTs the classified change back into a Clay webhook table. Its two guards are reason codes: a failed scan is never stored, so a DNF cannot masquerade as a removal, and a first observation never fires an event, so a DNS cannot masquerade as an adoption. The layer is documented in the recon stage; what matters here is why I needed it, a distinction the table could not hold.",
        ],
        links: [
          { href: "/special-stage/recon", label: "SS1 · Recon: the memory layer" },
        ],
      },
    ],
    failures: {
      heading: "What I am not sure about",
      chrome: "SCRUTINEERING",
      body: [
        "The 199 tier A rows with no clickable citation are the weakest part of the deliverable. Evidence URL coverage across the delivered set is 620 of 909, or 68 percent, so a rep can glance at a top tier score and find no source underneath about a third of the time. A second scraping source added specifically to close that gap rescued 0 of 10, because these companies do not publish prices at all, and on one attempt it produced a price quote from a page returning HTTP 404. That is OFF one layer further down, inside the fix.",
        "BLIND may be a false category. I am uncertain it is distinct from DNF rather than being DNF at the level of the vendor instead of the level of the call. I lean distinct, because a retry fixes a DNF and never fixes a BLIND, so one remedy is a retry queue and the other is a second instrument. I have not stress tested that boundary and would not defend it hard.",
        "And the strongest signal available to this buyer is one I cannot compute at all: a company that incorporated through Stripe Atlas six months ago and never activated payments. That is a partnership that half worked, invisible from outside, and the record belongs to Stripe. Sometimes the best available absence is one only the customer can see.",
      ],
    },
    debrief: {
      heading: "Debrief",
      chrome: "STAGE END",
      body: [
        "I started on this before any of it had a name. The first version was Proximize Scout, which ranks physical local businesses, the ones with no domain, no LinkedIn and no digital exhaust, on how badly they are missing from the answers AI search engines give. The score is the absence. I built the same thing twice in two markets before I noticed.",
        "The three stages below are the proofs. Recon is NIL earning its denominator, Pace Notes is a segment renamed when its name claimed more than the instrument saw, and The Stage is what a claim of absence must survive before someone signs their name under it.",
      ],
      links: [
        {
          href: "https://proximize-scout.vercel.app",
          label: "Proximize Scout",
          external: true,
        },
      ],
    },
    artifacts: [],
  },
  {
    slug: "recon",
    chrome: "SS1 · RECON",
    title: "Detection: 2,932 companies scanned for a signal that is an absence",
    window: "Aug 25 to 26",
    careerEventSlug: "alphaforge-gtme",
    lede: [
      "The companies a Stripe partner manager most needs to reach are invisible in the CRM, because nobody has integrated them yet. The signal I wanted is a company with real traction and no visible payment processor. That signal is an absence, and an absence is the easiest thing in GTM data to get wrong.",
    ],
    pullQuote:
      "A confirmed absence is worth more than a confirmed presence, because presence is what everyone else is already selling to.",
    buildLog: [
      {
        date: "Aug 25",
        title: "Pre-flight against the live table",
        body: "Audited the inherited table against its live state instead of the handoff. Found eight action columns with no run condition, one company whose website field has no TLD, and a latent scoring bug that would matter later.",
      },
      {
        date: "Aug 25",
        title: "Load, with the pre-filter dropped",
        body: "Pulled every Active YC company with a website, Winter 2021 through Spring 2026. 2,932 rows. The previous build pre-filtered on headcount as a maturity proxy; I dropped it so disqualifiers in the table would do the cutting, instead of a filter deciding in advance what could qualify.",
      },
      {
        date: "Aug 25",
        title: "300-row sample, predictions registered first",
        body: "Stratified on headcount by batch era with a fixed seed, and cost predictions written down before the run. Measured 2.0 executions and 4.0 credits per row. I also called the rate at 3.0 mid-run before the last row landed, which taught me that executions are charged at dispatch, so reading cost off a part-complete run overstates it.",
      },
      {
        date: "Aug 25",
        title: "The fallback scraper, tested and rejected",
        body: "Tested Firecrawl before wiring it in. It cost 4 to 6 credits per domain against a planned 1, failed 5 of 15 serial calls, flipped verdicts with prompt phrasing, and invented a price quote from a page that returns a 404. Rescue rate after a self-consistency rule: 0 of 10. It did not ship.",
      },
      {
        date: "Aug 26",
        title: "Full run, predicted before bought",
        body: "2,881 rows enriched through the table. Predicted 11,524 credits and 5,762 executions. Actual: 11,518 and 5,756. The signal model landed within five rows of a pre-registered prediction on a 2,881-row run.",
      },
      {
        date: "Aug 26",
        title: "The bug I called unreachable fired once",
        body: "In the sample I wrote that a scoring bug was real as written but unreachable in practice. At 2,931 rows it fired exactly once: maximum weight, on a domain that is not the company's website, from a scan that returned nothing. Fixed to zero, and the superseding note is written back into the original results file.",
      },
    ],
    metrics: [
      { label: "YC companies loaded", value: "2,932", provenance: "artifact" },
      {
        label: "Scored above zero, the deliverable",
        value: "909",
        provenance: "artifact",
      },
      {
        label: "Credits, predicted vs actual",
        value: "11,524 vs 11,518",
        detail: "5,762 vs 5,756 executions. Cost was predicted before it was spent.",
        provenance: "artifact",
      },
      {
        label: "UNCLEAR rate, full run",
        value: "59.2%",
        detail:
          "Reported, and it rises with company youth. The instrument is weakest where the thesis is strongest.",
        provenance: "artifact",
      },
      {
        label: "Evidence URL coverage",
        value: "620 of 909",
        detail:
          "199 of the 609 top-scoring rows carry an absence claim with no clickable citation. Named in the writeup as the weakest part of the deliverable.",
        provenance: "artifact",
      },
      {
        label: "Stripe-only companies showing metered pricing",
        value: "201 of 433",
        detail:
          "The first draft said 24 of 51. Those were sample numbers carried into a full-pool claim without being recomputed. The draft was wrong; this is the corrected pair.",
        provenance: "session",
      },
    ],
    sections: [
      {
        heading: "The memory layer",
        chrome: "CO-DRIVER'S NOTEBOOK",
        body: [
          "So the scan writes snapshots to Supabase through a Deno edge function, and change becomes an event with a date attached instead of an untestable claim. The seeded test produced exactly three change events, at 90, 11 and 45 days, and zero events on 28 first observations, which is the least interesting result to look at and the most important one to get right. Five days of live drift moved 14 of 50 rows.",
        ],
        quotes: [
          "Clay could not remember. It holds one observation from one day, so it answers what is true now and never what changed. My second-strongest signal is a processor that was not detectable ninety days ago, which is not a property of a company. It is a property of two observations.",
        ],
        video: {
          href: "https://cursorful.com/share/fOxWpi6D1N3r",
          label: "Onboard: building the memory layer",
          note: "A screen recording made during the build.",
        },
      },
    ],
    failures: {
      heading: "What broke",
      chrome: "INCIDENT REPORT",
      body: [
        "A billing-category run returned a 49.3% opportunity rate: 36 of 73 companies read as payments-closed but billing-open. Then I killed my own number. Zero billing vendors detected across 73 domains whose scans succeeded, and zero detections of Paddle, Chargebee or Recurly across 300 domains, through the same mechanism that found Stripe 56 times. The scanner reads the client side. Server-side billing never renders there, so a NONE for that category was structurally guaranteed. The 49.3% measured BuiltWith's blindness rather than the market.",
        "The guard I wrote afterward is the reusable lesson: run the vendor list against companies known to use those vendors first. If detection is zero, the category is unmeasurable and NONE means nothing. That check is cheap, and it would have caught this before 146 executions.",
        "Two of the model's five signals were cut, and the cuts are named in the deliverable. Hiring intensity died because the jobs provider returned zero across 71 attempts; a controlled retest showed the zero was the instrument, a title filter matching 8.4% of postings. Capital window was cut on budget rather than evidence, which is the honest reason.",
      ],
      quotes: ["The number measures the instrument."],
    },
    debrief: {
      heading: "Debrief",
      chrome: "STAGE END",
      body: [
        "Every failure in this stage had the same shape: a thing that did not happen presenting as a thing that did. The four-state detection design exists because Clay cannot tell we looked and found nothing apart from this input is unset, and the signal I care most about is an absence.",
      ],
      quotes: [
        "What broke taught me more than what worked.",
        "Named rather than hidden, because a list you can defend includes the parts you could not build.",
      ],
    },
    artifacts: [],
  },
  {
    slug: "pace-notes",
    chrome: "SS2 · PACE NOTES",
    title: "Segmentation: 199 accounts, and a name that had to change",
    assertion: "Segments need a clock to operate on",
    window: "Aug 27",
    careerEventSlug: "alphaforge-gtme",
    lede: [
      "The 909 scored companies cut into three segments and three exclusions, driven by one formula column. A segment without a time dimension is a filter. The clock is what makes it operable: who enters, who leaves, and when.",
    ],
    video: {
      href: "https://cursorful.com/share/syYaoX9UCLOf",
      label: "Onboard: the segmentation pass",
      note: "A screen recording made during the build.",
    },
    buildLog: [
      {
        date: "Aug 27",
        title: "The cut",
        body: "Six buckets, summing exactly to the pool: 199 with no visible processor, 220 scaling, 201 expansion, 190 excluded as too early, 99 excluded as displacement risks, 2,023 unscored. Send seeds of 50 drawn per segment.",
      },
      {
        date: "Week 2",
        title: "The rename",
        body: "The segment shipped as SEG1_INHOUSE, and that name was wrong. It asserted a build-versus-buy decision the scan never observed. All the scan saw was that no processor was visible on the marketing surface, so the segment became SEG1_NO_VISIBLE_PROCESSOR. A segment name is a claim, and every downstream email inherits it.",
      },
    ],
    metrics: [
      {
        label: "SEG1_NO_VISIBLE_PROCESSOR",
        value: "199",
        provenance: "artifact",
      },
      {
        label: "Automated gate survivors",
        value: "57 of 199",
        detail: "Live evidence URL, numeric prices, self-serve path, and no payments companies.",
        provenance: "artifact",
      },
      {
        label: "Other cuts",
        value: "220 / 201 / 190 / 99",
        detail: "Scaling, expansion, and the two scored exclusions. With 2,023 unscored, the six buckets sum to 2,932.",
        provenance: "session",
      },
      {
        label: "signal_score across all 199 rows",
        value: "40 of 40, a constant",
        detail: "A two-condition boolean filter wearing a score's clothing. Saying so is the point.",
        provenance: "session",
      },
    ],
    sections: [
      {
        heading: "The constant, on screen",
        chrome: "TELEMETRY",
        body: [
          "The metrics above call the score a constant. Here it is on screen: signal_score reads 40 on every row, why_this_score repeats one sentence, and the evidence URL is the only column that varies. Some rows carry none, which is the citation gap named in the recon stage.",
        ],
        figure: {
          src: "/gtme/clay-pool-scoring.png",
          alt: "Clay table view of yc-tam-pool-2932 with four columns visible, where every signal_score cell reads 40 and several evidence URL cells are empty",
          caption:
            "Four columns from the scored pool: the state, the constant, the reason, and the evidence when there is one.",
        },
      },
      {
        heading: "The finding given away free",
        chrome: "SPLIT TIMES",
        body: [
          "Computed from the scored pool and included in every email: 40% of the 2021 to 2022 batches show no visible processor, 30% for 2023 to 2024, 28% for 2025 to 2026. A twelve-point gap, roughly three standard errors.",
          "The caveat travels with it everywhere it appears: older companies have more public surface, and the scan's UNCLEAR rate rises with company youth in the same direction as the curve, 49.5% to 57.7% to 63.7%. Part of the gap is the instrument rather than behavior. The caveat is load-bearing, because the measurement instrument is weakest where the thesis is strongest.",
        ],
      },
      {
        heading: "Thirty accounts, checked by hand",
        chrome: "RECCE PASS",
        body: [
          "Before anything got sent, I hand-checked 30 SEG1 accounts against the claim the segment name makes. The in-house hypothesis survived contact with 7 of them. The other 23 broke it in four catalogued ways: sales-led funnels with no checkout to inspect, checkouts behind authentication, marketing and product living on different domains, and dead template scaffolding wired to nothing.",
          "The board below holds every account whose finding survived to a file, and it says plainly how many did not.",
        ],
      },
    ],
    failures: {
      heading: "What broke",
      chrome: "INCIDENT REPORT",
      body: [
        "The segment's name asserted a conclusion the instrument could not reach, and it took a week to notice. The score driving it turned out to be a constant. And the hand-check put the headline claim at 7 of 30. All three are in the deliverable, in the same voice as the counts.",
      ],
      figure: {
        src: "/gtme/clay-segment-formula.png",
        alt: "Clay formula editor open on the segment column, whose code files tier A accounts from the 2021 to 2022 batch windows as SEG1_NO_VISIBLE_PROCESSOR",
        caption:
          "The segment formula, live in the workspace. The name in the code is the corrected one.",
      },
    },
    debrief: {
      heading: "Debrief",
      chrome: "STAGE END",
      body: [
        "A filter answers who qualifies today. A segment has to answer who entered since last week, and that needs two observations and a clock. The snapshot layer from the recon stage is what makes the clock real.",
      ],
    },
    artifacts: [],
  },
  {
    slug: "the-stage",
    chrome: "SS3 · THE STAGE",
    title: "Outbound: 12 emails, one per person, no follow-up, no tracking pixels",
    assertion: "Nothing audits a pipeline like having to sign your name to it",
    window: "Aug 30 to 31",
    careerEventSlug: "alphaforge-gtme",
    lede: [
      "The last mile of GTM engineering is not delivery. It is the point where you stop trusting your own output because someone else is about to read it. Errors in a pipeline built for yourself cost nothing. Errors sent under your real name have a name and an inbox attached.",
    ],
    video: {
      href: "https://cursorful.com/share/bxlhgXZrc8Pj",
      label: "Onboard: the outbound run",
      note: "A screen recording made during the build.",
    },
    buildLog: [
      {
        date: "Aug 30",
        title: "The reply loop",
        body: "217 lines of Google Apps Script. A labelled Gmail thread is found, stripped of quoted text, classified, and POSTed to a Clay webhook table in under 60 seconds on a one-minute trigger. The webhook URL lives in Script Properties and never appears in the file, because that URL is a secret and gets treated like a key.",
      },
      {
        date: "Aug 30",
        title: "The seed",
        body: "12 rows, one per person. The seed carries no email column at all; addresses stay in the send system. Five guardrail states sit ahead of every send, including a personalization block that refuses anything under 40 characters of account-specific finding. The guardrail reports rather than locks, and SEND_OK is required.",
      },
      {
        date: "Aug 31",
        title: "Verified end to end",
        body: "A labelled thread was found, parsed, classified and written to Clay with no human in the path. The architecture diagram below records the date.",
      },
    ],
    metrics: [
      { label: "Sends", value: "12", detail: "One message per person. No follow-up, no tracking pixels.", provenance: "artifact" },
      {
        label: "Work email coverage",
        value: "12 of 12",
        detail: "All resolved by the first provider in an 11-provider waterfall, so ten providers never fired. About 7 credits against an estimate of 13 to 25.",
        provenance: "session",
      },
      {
        label: "Total spend across the stage",
        value: "~508 credits",
        detail: "126 HTTP, about 375 agent research, about 7 email.",
        provenance: "session",
      },
      {
        label: "Reply latency",
        value: "under 60 seconds",
        detail: "Capture is automatic. The join back onto the send row is manual, and the diagram says so.",
        provenance: "artifact",
      },
      {
        label: "Replies",
        value: "0",
        detail: "Pre-registered expectation: 2 to 4 replies, 1 to 3 corrections, 0 to 1 meetings, 0 to 1 opt-outs. Zero is the actual outcome, so zero is the number on this page.",
        provenance: "session",
      },
    ],
    sections: [
      {
        heading: "The gate lost to hand research",
        chrome: "TELEMETRY VS DRIVER",
        body: [
          "The automated gate passed 57 of 199 accounts. Five of the twelve accounts I actually sent had been filed EXCL_SALES_LED by that gate, and every one of the five had verified in-house billing work anyway. The gate measured self-serve checkout. The research measured in-house metering. Run unsupervised, the gate would have cost five of the twelve best accounts, including one of the two high-confidence builders.",
        ],
        figure: {
          src: "/gtme/clay-seg1-gate.png",
          alt: "Clay formula editor open on the seg1_gate column, with verdict cells reading SELF_SERVE_METERED, EXCL_SALES_LED, and EXCL_PAYMENTS_CO",
          caption:
            "The gate itself: one formula reading the evidence status and the checkout audit, filing each account as SELF_SERVE_METERED or an exclusion.",
        },
      },
      {
        heading: "Twelve, when the brief allowed twenty-five",
        chrome: "PARC FERMÉ",
        body: [
          "The volume cut came from the personalization bar rather than capacity. Only 12 accounts produced a finding specific enough to justify a send. One of the twelve findings is a bug report about my own scan, sent to the company anyway:",
        ],
        quotes: [
          "My crawler only ever saw useagave.com while the product, docs and login all live on agaveapi.com, so it never reached the surface where billing would be. That is a bug in my scan rather than a finding about Agave.",
        ],
      },
      ethicsStory,
      {
        heading: "The seams, stated",
        chrome: "SCRUTINEERING",
        body: [
          "Two things the tooling gets wrong about this build, published here because the paper trail should be better than the tool's. The reply join is manual: capture lands in Clay in under 60 seconds, but a Clay enrichment fires on changes to its own row and never on changes in the table it reads from, so the lookup back onto the send row is refreshed by hand. And Clay's lineage graph shows the send seed parented to a CSV rather than the source table. Every field traces back to the segment, and the lineage does not know that.",
        ],
        figure: {
          src: "/gtme/clay-lineage.png",
          alt: "Clay workspace lineage graph: CSV imports and webhooks feeding yc-tam-pool-2932, the people segment tables, and the P9 send and reply tables",
          caption:
            "The workspace lineage. P9-send-seed hangs off a CSV import rather than the segment that produced it, which is the seam this section is about.",
        },
      },
    ],
    failures: {
      heading: "What broke",
      chrome: "INCIDENT REPORT",
      body: [
        "Zero replies against a pre-registered expectation of 2 to 4. At twelve sends the sample is built to produce labelled corrections rather than pipeline, and a zero still gets published, in the same voice as everything else, because the alternative is a portfolio of only the runs that flattered me.",
      ],
      figure: {
        src: "/gtme/clay-p9-replies.png",
        alt: "The p9-replies Clay table with its webhook column waiting for events and zero rows of data",
        caption: "The webhook table, waiting. Zero rows is the published outcome.",
      },
    },
    debrief: {
      heading: "Debrief",
      chrome: "STAGE END",
      body: [
        "The primary metric of the whole build is corrections received: a reply naming the actual billing stack is a labelled correction to the detection method. That is why the classifier machine-detects vendor names. And it is why opt-out is checked first anyway. Getting a data point does not override someone asking you to stop.",
      ],
      figure: {
        src: "/gtme/apps-script-reply-loop.png",
        alt: "Google Apps Script editor showing the reply loop's testConnection and installTrigger functions",
        caption:
          "The loop's setup helpers in Apps Script: installTrigger wires the one-minute trigger, and testConnection posts a fake reply from a placeholder address to prove a row lands in Clay.",
      },
    },
    artifacts: [
      {
        label: "System architecture",
        kind: "image",
        src: "/gtme/p9-architecture.svg",
        caption:
          "Three bands: Clay as system of record, the channel, and the reply loop. The footer records the end-to-end verification date. Verified on 2026-08-31 with no human in the path.",
      },
      {
        label: "classify_(), from the reply loop",
        kind: "code",
        code: `/**
 * First-pass classification. A human confirms it in Clay; this only
 * saves the sorting. Order matters: opt-out beats everything.
 */
function classify_(lowerBody, lowerSubject, named) {
  if (matchesAny_(lowerBody, OPTOUT_PATTERNS)) return 'opt_out';
  if (matchesAny_(lowerSubject, OOO_PATTERNS) || matchesAny_(lowerBody, OOO_PATTERNS)) return 'auto_reply';
  if (lowerSubject.indexOf('undeliverable') !== -1 ||
      lowerSubject.indexOf('delivery status notification') !== -1 ||
      lowerSubject.indexOf('mail delivery failed') !== -1 ||
      lowerBody.indexOf('address not found') !== -1) return 'bounce';
  if (named.length > 0) return 'correction';
  return 'needs_review';
}`,
        caption:
          "Opt-out is checked first. A reply reading no thanks, but we are on Paddle files as an opt-out and never as a correction, even though corrections are the primary metric of the build.",
      },
    ],
  },
] as const;

export const caseStudyBySlug = new Map(caseStudies.map((s) => [s.slug, s] as const));

export const stageOrder: readonly StageSlug[] = [
  "reason-codes",
  "recon",
  "pace-notes",
  "the-stage",
];
