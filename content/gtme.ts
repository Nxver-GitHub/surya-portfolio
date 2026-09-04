/**
 * Special Stage: GTM engineering case studies (the AlphaForge arc).
 * One continuous three-week build against a single audience, presented as
 * one rally in three stages: Recon (detection), Pace Notes (segmentation),
 * The Stage (outbound). Hand-check board data lives in gtme-handcheck.ts.
 *
 * Voice rules for every string in this file (enforced by tests):
 * no em dashes, no "it's not X, it's Y" constructions, first person,
 * plain language, failures reported in the same voice as wins.
 *
 * Provenance: "artifact" numbers are stated in the build files on disk;
 * "session" numbers come from the working session and its published posts.
 * The UI marks session numbers so a skeptical reader can tell them apart.
 */

export type StageSlug = "recon" | "pace-notes" | "the-stage";

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
    "Everything below is one continuous three-week build against a single audience, Stripe's startup partnerships pool over the YC company universe. 2,932 companies loaded. 909 scored. 12 emails sent, each signed with my real name. The failures are reported in the same voice as the wins, because catching a wrong number before it ships is worth more than the pipeline the wrong number would have produced.",
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

export const throughLine =
  "Every build in this arc contains the same shape of finding: a thing that did not happen presenting as a thing that did. A null read as a zero. An absence read as unset. A blind instrument read as a market signal. The work is telling those apart, and that part is mine rather than the tool's.";

export const ethicsStory: StageSection = {
  heading: "Where the line is",
  chrome: "STEWARDS' NOTE",
  body: [
    "The best-researched contact in the build was a maintainer at a company that sells subscription billing infrastructure. Top contributor to their public docs repo. Personally wrote the checkout documentation I would have been asking about. Their working email was sitting in git commit author metadata on a personal domain.",
    "I did not send, for two reasons. The company runs on the processor I was writing about, so the claim in my email would have been wrong, and wrong in a way that gets forwarded. And the address was never published as a contact channel. It leaked as a side effect of committing code. The same pattern came up twice more in the build, and I never used it.",
    "Reading someone's commit history to find out what they built is fine. Reading it to find out where to reach them is something else, and both start with the same git log. The line is not in the data. It is in what you do next with it.",
  ],
};

export const caseStudies: readonly CaseStudy[] = [
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
      },
    ],
    failures: {
      heading: "What broke",
      chrome: "INCIDENT REPORT",
      body: [
        "Zero replies against a pre-registered expectation of 2 to 4. At twelve sends the sample is built to produce labelled corrections rather than pipeline, and a zero still gets published, in the same voice as everything else, because the alternative is a portfolio of only the runs that flattered me.",
      ],
    },
    debrief: {
      heading: "Debrief",
      chrome: "STAGE END",
      body: [
        "The primary metric of the whole build is corrections received: a reply naming the actual billing stack is a labelled correction to the detection method. That is why the classifier machine-detects vendor names. And it is why opt-out is checked first anyway. Getting a data point does not override someone asking you to stop.",
      ],
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

export const stageOrder: readonly StageSlug[] = ["recon", "pace-notes", "the-stage"];
