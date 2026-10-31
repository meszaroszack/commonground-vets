/**
 * Educational summaries of public rating criteria.
 * Sources: 38 CFR Part 4 (eCFR) and VA.gov veteran compensation rates
 * effective December 1, 2025 (2026 COLA), published under 38 U.S.C. § 1114.
 * The eCFR and the decision VA issues control. This is not a rating decision.
 */

export type RatingLevel = {
  percent: number;
  criteria: string;
};

export type CfrCondition = {
  diagnosticCode: string;
  name: string;
  bodySystem: "musculoskeletal" | "mental-health" | "neurological" | "respiratory" | "auditory" | "presumptive";
  citation: string;
  summary: string;
  ratings: RatingLevel[];
  interviewPrompts: string[];
  examMeasurements: string[];
  notes: string[];
};

export type CombinedRating = {
  exact: number;
  whole: number;
  rounded: number;
  steps: string[];
  bilateralFactorApplied: false;
};

export type CompensationRow = {
  rating: number;
  veteranAlone: number;
  withSpouse: number | null;
  /** Added once per dependent parent. Null below 30%. */
  perParent: number | null;
  /** First child under 18 with no spouse. The with-spouse amount is different. */
  firstChildUnder18: number | null;
  firstChildUnder18WithSpouse: number | null;
  /** Each child under 18 after the first. */
  additionalChildUnder18: number | null;
  /** Each child 18–23 in a qualifying school program. Added on top; not the first-child slot. */
  childInSchool: number | null;
  /** Added when a spouse receives Aid and Attendance. Requires a spouse. */
  spouseAidAndAttendance: number | null;
};

/**
 * Veteran compensation basic rates, effective December 1, 2025.
 * Source: VA.gov veteran rates tables. 10% and 20% do not increase for dependents.
 * The first child under 18 is the "with 1 child" row. Further children use the added-amounts row.
 */
export const VA_COMPENSATION_2026: CompensationRow[] = [
  { rating: 10, veteranAlone: 180.42, withSpouse: null, perParent: null, firstChildUnder18: null, firstChildUnder18WithSpouse: null, additionalChildUnder18: null, childInSchool: null, spouseAidAndAttendance: null },
  { rating: 20, veteranAlone: 356.66, withSpouse: null, perParent: null, firstChildUnder18: null, firstChildUnder18WithSpouse: null, additionalChildUnder18: null, childInSchool: null, spouseAidAndAttendance: null },
  { rating: 30, veteranAlone: 552.47, withSpouse: 617.47, perParent: 52, firstChildUnder18: 44, firstChildUnder18WithSpouse: 49, additionalChildUnder18: 32, childInSchool: 105, spouseAidAndAttendance: 61 },
  { rating: 40, veteranAlone: 795.84, withSpouse: 882.84, perParent: 70, firstChildUnder18: 58, firstChildUnder18WithSpouse: 65, additionalChildUnder18: 43, childInSchool: 140, spouseAidAndAttendance: 81 },
  { rating: 50, veteranAlone: 1132.9, withSpouse: 1241.9, perParent: 88, firstChildUnder18: 73, firstChildUnder18WithSpouse: 81, additionalChildUnder18: 54, childInSchool: 176, spouseAidAndAttendance: 101 },
  { rating: 60, veteranAlone: 1435.02, withSpouse: 1566.02, perParent: 105, firstChildUnder18: 88, firstChildUnder18WithSpouse: 97, additionalChildUnder18: 65, childInSchool: 211, spouseAidAndAttendance: 121 },
  { rating: 70, veteranAlone: 1808.45, withSpouse: 1961.45, perParent: 123, firstChildUnder18: 102, firstChildUnder18WithSpouse: 113, additionalChildUnder18: 76, childInSchool: 246, spouseAidAndAttendance: 141 },
  { rating: 80, veteranAlone: 2102.15, withSpouse: 2277.15, perParent: 140, firstChildUnder18: 117, firstChildUnder18WithSpouse: 129, additionalChildUnder18: 87, childInSchool: 281, spouseAidAndAttendance: 161 },
  { rating: 90, veteranAlone: 2362.3, withSpouse: 2559.3, perParent: 158, firstChildUnder18: 132, firstChildUnder18WithSpouse: 145, additionalChildUnder18: 98, childInSchool: 317, spouseAidAndAttendance: 181 },
  { rating: 100, veteranAlone: 3938.58, withSpouse: 4158.17, perParent: 176.24, firstChildUnder18: 146.85, firstChildUnder18WithSpouse: 160.82, additionalChildUnder18: 109.11, childInSchool: 352.45, spouseAidAndAttendance: 201.41 },
];

export const RATE_TABLE_NOTE =
  "2026 basic rates, effective December 1, 2025. A rating under 30% does not increase for dependents. One child under 18 is included in the basic row; each further child under 18, each child 18–23 in school, and a spouse's Aid and Attendance are added from VA's added-amounts table. This is not SMC and not a VA decision. Confirm the row on VA.gov.";

export type DependentScenario = {
  spouse?: boolean;
  dependentParents?: number;
  childrenUnder18?: number;
  childrenInSchool?: number;
  spouseAidAndAttendance?: boolean;
};

export function roundToVaTen(whole: number): number {
  if (whole <= 0) return 0;
  if (whole >= 100) return 100;
  const mod = whole % 10;
  if (mod === 0) return whole;
  if (mod >= 5) return Math.min(100, whole + (10 - mod));
  return whole - mod;
}

/**
 * 38 CFR § 4.25 combined ratings. Highest rating first. Each later rating
 * applies only to the remaining efficiency, rounded to the nearest whole
 * number at each step. The final whole number rounds to the nearest 10,
 * and a value ending in 5 rounds up. The bilateral factor is not applied.
 */
export function calculateCombinedRating(ratings: number[]): CombinedRating {
  const sorted = ratings.filter((rating) => rating > 0 && rating <= 100).sort((a, b) => b - a);
  if (sorted.length === 0) {
    return { exact: 0, whole: 0, rounded: 0, steps: ["No compensable ratings were entered."], bilateralFactorApplied: false };
  }

  let current = sorted[0];
  const steps = [`Started with the highest rating, ${current}%.`];

  for (let index = 1; index < sorted.length; index += 1) {
    const rating = sorted[index];
    const remaining = 100 - current;
    const raw = remaining * (rating / 100);
    const increment = Math.round(raw);
    const next = current + increment;
    steps.push(
      `Added ${rating}% of the remaining ${remaining}% (${raw.toFixed(2)}, rounded to ${increment}). Combined value is ${next}%.`,
    );
    current = next;
  }

  const whole = Math.min(100, current);
  const rounded = roundToVaTen(whole);
  steps.push(`Rounded ${whole}% to the nearest 10% under 38 CFR § 4.25. Values ending in 5 round up. Result: ${rounded}%.`);
  steps.push("The bilateral factor in 38 CFR § 4.26 is not included. Use VA.gov if both arms, both legs, or paired skeletal muscles are involved.");

  return {
    exact: Number(whole.toFixed(2)),
    whole,
    rounded,
    steps,
    bilateralFactorApplied: false,
  };
}

function money(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function compensationBreakdown(
  rating: number,
  options?: DependentScenario,
): { monthly: number; summary: string } | null {
  if (rating === 0) return { monthly: 0, summary: "A 0% rating has no monthly compensation in this table." };
  const row = VA_COMPENSATION_2026.find((item) => item.rating === rating);
  if (!row) return null;

  const spouse = Boolean(options?.spouse);
  const parents = Math.min(2, Math.max(0, Math.floor(options?.dependentParents ?? 0)));
  const childrenUnder18 = Math.min(12, Math.max(0, Math.floor(options?.childrenUnder18 ?? 0)));
  const childrenInSchool = Math.min(12, Math.max(0, Math.floor(options?.childrenInSchool ?? 0)));
  const spouseAid = Boolean(options?.spouseAidAndAttendance && spouse);

  if (row.withSpouse == null) {
    return {
      monthly: row.veteranAlone,
      summary: `${rating}% does not increase for a spouse, parents, or children.`,
    };
  }

  let monthly = row.veteranAlone;
  const parts = [`${rating}% veteran alone`];
  if (spouse && row.withSpouse != null) {
    monthly = row.withSpouse;
    parts[0] = `${rating}% with spouse`;
  }
  if (parents > 0 && row.perParent != null) {
    monthly += parents * row.perParent;
    parts.push(parents === 1 ? "1 dependent parent" : "2 dependent parents");
  }
  if (childrenUnder18 > 0 && row.firstChildUnder18 != null) {
    monthly += spouse && row.firstChildUnder18WithSpouse != null ? row.firstChildUnder18WithSpouse : row.firstChildUnder18;
    const extra = childrenUnder18 - 1;
    if (extra > 0 && row.additionalChildUnder18 != null) monthly += extra * row.additionalChildUnder18;
    parts.push(childrenUnder18 === 1 ? "1 child under 18" : `${childrenUnder18} children under 18`);
  }
  if (childrenInSchool > 0 && row.childInSchool != null) {
    monthly += childrenInSchool * row.childInSchool;
    parts.push(childrenInSchool === 1 ? "1 child 18–23 in school" : `${childrenInSchool} children 18–23 in school`);
  }
  if (spouseAid && row.spouseAidAndAttendance != null) {
    monthly += row.spouseAidAndAttendance;
    parts.push("spouse Aid and Attendance");
  }

  return { monthly: money(monthly), summary: parts.join(", ") };
}

export function monthlyCompensation(rating: number, options?: DependentScenario): number | null {
  return compensationBreakdown(rating, options)?.monthly ?? null;
}

const SPINE: CfrCondition = {
  diagnosticCode: "5237",
  name: "Lumbosacral or cervical strain",
  bodySystem: "musculoskeletal",
  citation: "38 CFR § 4.71a, General Rating Formula for Diseases and Injuries of the Spine (DC 5235–5243, including 5237).",
  summary:
    "Most spine conditions are rated on range of motion, ankylosis, or muscle spasm and guarding — not on how much it hurts by itself. Painful motion, weakness, and flare-ups still matter under 38 CFR §§ 4.40, 4.45, and 4.59. Associated nerve problems are rated separately.",
  ratings: [
    { percent: 100, criteria: "Unfavorable ankylosis of the entire spine." },
    { percent: 50, criteria: "Unfavorable ankylosis of the entire thoracolumbar spine." },
    {
      percent: 40,
      criteria:
        "Unfavorable ankylosis of the entire cervical spine; or forward flexion of the thoracolumbar spine 30 degrees or less; or favorable ankylosis of the entire thoracolumbar spine.",
    },
    { percent: 30, criteria: "Forward flexion of the cervical spine 15 degrees or less; or favorable ankylosis of the entire cervical spine." },
    {
      percent: 20,
      criteria:
        "Thoracolumbar forward flexion greater than 30 degrees but not greater than 60; or cervical forward flexion greater than 15 but not greater than 30; or combined thoracolumbar motion not greater than 120 degrees; or combined cervical motion not greater than 170; or muscle spasm or guarding severe enough to cause an abnormal gait or spinal contour.",
    },
    {
      percent: 10,
      criteria:
        "Thoracolumbar forward flexion greater than 60 degrees but not greater than 85; or cervical forward flexion greater than 30 but not greater than 40; or combined thoracolumbar motion greater than 120 but not greater than 235; or combined cervical motion greater than 170 but not greater than 335; or muscle spasm, guarding, or localized tenderness that does not change gait or contour; or a vertebral body fracture with loss of 50 percent or more of the height.",
    },
  ],
  interviewPrompts: [
    "When did your back pain start, and what was going on in your life or service around then?",
    "In a typical week, how many days does your back limit you, and what does a harder day feel like?",
    "When it flares, which specific tasks at home or at work become impossible, and how long does it take to recover?",
    "How far can you bend, sit, stand, lift, or walk before you have to stop?",
    "What have the people around you actually seen you change — sleep, driving, chores, or time with family?",
  ],
  examMeasurements: [
    "Forward flexion, extension, left and right lateral flexion, and left and right rotation, measured with a goniometer.",
    "Where pain begins on motion, including after repetitive use.",
    "Muscle spasm, guarding, gait, and spinal contour.",
    "Flare-up frequency, duration, and additional functional loss during a flare.",
    "Any separate neurologic findings, such as radiculopathy, which are not part of the spine formula.",
  ],
  notes: [
    "Normal thoracolumbar forward flexion is 90 degrees. Combined thoracolumbar motion is 240 degrees. Normal cervical forward flexion is 45 degrees. Combined cervical motion is 340 degrees.",
    "Unfavorable ankylosis means the spine is fixed in flexion or extension and you lose at least one range-of-motion movement entirely.",
    "Intervertebral disc syndrome (DC 5243) can instead be rated on incapacitating episodes that require physician-prescribed bed rest.",
  ],
};

const MENTAL: CfrCondition = {
  diagnosticCode: "9411",
  name: "Posttraumatic stress disorder",
  bodySystem: "mental-health",
  citation: "38 CFR § 4.130, General Rating Formula for Mental Disorders (DC 9411 and the other mental-disorder codes that use this formula).",
  summary:
    "VA rates the level of occupational and social impairment. The symptoms in the formula are examples, not a checklist you have to match one-for-one. This journal is not crisis care.",
  ratings: [
    {
      percent: 100,
      criteria:
        "Total occupational and social impairment, due to such symptoms as: gross impairment in thought processes or communication; persistent delusions or hallucinations; grossly inappropriate behavior; persistent danger of hurting self or others; intermittent inability to perform activities of daily living, including minimal personal hygiene; disorientation to time or place; memory loss for names of close relatives, own occupation, or own name.",
    },
    {
      percent: 70,
      criteria:
        "Occupational and social impairment with deficiencies in most areas, such as work, school, family relations, judgment, thinking, or mood, due to such symptoms as: suicidal ideation; obsessional rituals that interfere with routine activities; speech intermittently illogical, obscure, or irrelevant; near-continuous panic or depression affecting the ability to function independently, appropriately, and effectively; impaired impulse control; spatial disorientation; neglect of personal appearance and hygiene; difficulty adapting to stressful circumstances, including work; inability to establish and maintain effective relationships.",
    },
    {
      percent: 50,
      criteria:
        "Occupational and social impairment with reduced reliability and productivity due to such symptoms as: flattened affect; circumstantial, circumlocutory, or stereotyped speech; panic attacks more than once a week; difficulty understanding complex commands; impairment of short- and long-term memory; impaired judgment; impaired abstract thinking; disturbances of motivation and mood; difficulty establishing and maintaining effective work and social relationships.",
    },
    {
      percent: 30,
      criteria:
        "Occupational and social impairment with occasional decrease in work efficiency and intermittent periods of inability to perform occupational tasks, although generally functioning satisfactorily, due to such symptoms as: depressed mood, anxiety, suspiciousness, panic attacks weekly or less often, chronic sleep impairment, mild memory loss such as forgetting names, directions, or recent events.",
    },
    {
      percent: 10,
      criteria:
        "Occupational and social impairment due to mild or transient symptoms that decrease work efficiency and ability to perform occupational tasks only during periods of significant stress, or symptoms controlled by continuous medication.",
    },
    {
      percent: 0,
      criteria:
        "A mental condition has been formally diagnosed, but symptoms are not severe enough either to interfere with occupational and social functioning or to require continuous medication.",
    },
  ],
  interviewPrompts: [
    "When did this start for you, and what does an ordinary week look like now?",
    "How does it show up at work or school — attendance, focus, conflict, or needing to leave?",
    "How has it changed relationships at home or with friends? What do they see that you might downplay?",
    "How is sleep, panic, memory, or motivation on a hard week, in concrete terms?",
    "What can you still do reliably, and what falls apart when the week gets stressful?",
  ],
  examMeasurements: [
    "Occupational impairment: attendance, reliability, conflicts, and whether tasks get finished.",
    "Social impairment: relationships with partner, family, friends, and the public.",
    "Frequency of panic, sleep loss, memory trouble, and mood episodes, using the veteran's own examples.",
    "Any diagnosis already in the record. The examiner, not this app, assigns a diagnosis.",
  ],
  notes: [
    "If you are in crisis or thinking about hurting yourself, call or text 988, then press 1. Do not wait on a claim journal.",
    "DC 9400 (generalized anxiety) and DC 9434 (major depressive disorder) use this same formula. VA generally does not stack separate percentages for overlapping mental-health symptoms; tell the truth once, clearly.",
  ],
};

const MIGRAINE: CfrCondition = {
  diagnosticCode: "8100",
  name: "Migraine",
  bodySystem: "neurological",
  citation: "38 CFR § 4.124a, Diagnostic Code 8100.",
  summary:
    "Migraine ratings turn on whether attacks are prostrating, how often they happen, and whether very frequent prolonged attacks produce severe economic inadaptability. 'Prostrating' means the attack is so severe you have to stop and lie down.",
  ratings: [
    { percent: 50, criteria: "With very frequent completely prostrating and prolonged attacks productive of severe economic inadaptability." },
    { percent: 30, criteria: "With characteristic prostrating attacks occurring on an average once a month over the last several months." },
    { percent: 10, criteria: "With characteristic prostrating attacks averaging one in 2 months over the last several months." },
    { percent: 0, criteria: "With less frequent attacks." },
  ],
  interviewPrompts: [
    "When did the headaches start, and what do people around you notice when one is coming on?",
    "In the last several months, how many attacks made you stop what you were doing and lie down?",
    "How long does a bad attack last, and what symptoms come with it — light, sound, nausea, vision?",
    "What specific work, driving, childcare, or household tasks become impossible during an attack?",
    "Have you missed work, left early, or been unable to keep a normal schedule because of them? How often, in real weeks?",
  ],
  examMeasurements: [
    "Number of prostrating attacks over the last several months, not a lifetime average.",
    "Duration of attacks and whether they are completely prostrating.",
    "Economic impact: missed work, lost shifts, or inability to keep a schedule. Only if that is actually true.",
    "Associated symptoms: photophobia, phonophobia, nausea, aura.",
  ],
  notes: [
    "A headache that you can push through is not the same thing as a prostrating attack. Describe which is which.",
    "Frequency should come from your calendar or memory of real months, not from a target percentage.",
  ],
};

const TINNITUS: CfrCondition = {
  diagnosticCode: "6260",
  name: "Tinnitus",
  bodySystem: "auditory",
  citation: "38 CFR § 4.87, Diagnostic Code 6260.",
  summary: "Recurrent tinnitus is rated at a single 10 percent, whether the sound is in one ear, both ears, or the head.",
  ratings: [{ percent: 10, criteria: "Recurrent tinnitus." }],
  interviewPrompts: [
    "When did the sound start, and is it in one ear, both, or your head?",
    "How often is it there — constant, daily, or in spells?",
    "How does it affect sleep, conversation, or concentration on a real day?",
  ],
  examMeasurements: [
    "Whether tinnitus is recurrent.",
    "A single 10% evaluation covers one ear, both ears, or the head. It is not rated twice.",
  ],
  notes: ["Hearing loss is a different diagnostic code and needs audiometric testing. Do not fold hearing-loss numbers into a tinnitus story unless you have them from a test."],
};

const SLEEP_APNEA: CfrCondition = {
  diagnosticCode: "6847",
  name: "Sleep apnea syndromes",
  bodySystem: "respiratory",
  citation: "38 CFR § 4.97, Diagnostic Code 6847.",
  summary:
    "Sleep apnea is rated on the medical picture: documented sleep-disordered breathing, persistent daytime sleepiness, a required breathing-assistance device such as CPAP, or respiratory failure. A sleep study and a clinician establish the diagnosis. This app does not.",
  ratings: [
    { percent: 100, criteria: "Chronic respiratory failure with carbon dioxide retention or cor pulmonale, or; requires tracheostomy." },
    { percent: 50, criteria: "Requires use of a breathing assistance device such as a continuous airway pressure (CPAP) machine." },
    { percent: 30, criteria: "Persistent daytime hypersomnolence." },
    { percent: 0, criteria: "Asymptomatic but with documented sleep disorder breathing." },
  ],
  interviewPrompts: [
    "Has a clinician diagnosed a sleep disorder, and do you have a sleep study? Say only what the record actually says.",
    "What does daytime sleepiness look like on a workday — driving, meetings, needing to nap?",
    "If you use a breathing device, who prescribed it, and what happens on nights you cannot use it?",
  ],
  examMeasurements: [
    "Sleep-study diagnosis, if one exists.",
    "Whether a breathing-assistance device is required, not merely discussed.",
    "Persistent daytime hypersomnolence, with concrete examples.",
    "Any finding of respiratory failure, carbon dioxide retention, cor pulmonale, or tracheostomy — only if it is in the medical record.",
  ],
  notes: [
    "As of 2026, VA decisions continue to apply this DC 6847 formula, including 50% when a breathing-assistance device such as CPAP is required. Confirm the current eCFR text before you rely on it.",
  ],
};

const KNEE: CfrCondition = {
  diagnosticCode: "5260",
  name: "Knee, limitation of flexion",
  bodySystem: "musculoskeletal",
  citation: "38 CFR § 4.71a, Diagnostic Codes 5260 (flexion) and 5261 (extension). Normal knee flexion is 140 degrees and normal extension is 0 degrees.",
  summary:
    "Knees can be rated on limited flexion, limited extension, instability, or meniscus findings. Flexion and extension can both be rated when each meets its own criterion. Painful motion is considered under 38 CFR §§ 4.40, 4.45, and 4.59.",
  ratings: [
    { percent: 30, criteria: "Flexion limited to 15 degrees (DC 5260)." },
    { percent: 20, criteria: "Flexion limited to 30 degrees (DC 5260)." },
    { percent: 10, criteria: "Flexion limited to 45 degrees (DC 5260)." },
    { percent: 0, criteria: "Flexion limited to 60 degrees (DC 5260)." },
    { percent: 50, criteria: "Extension limited to 45 degrees (DC 5261)." },
    { percent: 40, criteria: "Extension limited to 30 degrees (DC 5261)." },
    { percent: 30, criteria: "Extension limited to 20 degrees (DC 5261)." },
    { percent: 20, criteria: "Extension limited to 15 degrees (DC 5261)." },
    { percent: 10, criteria: "Extension limited to 10 degrees (DC 5261)." },
    { percent: 0, criteria: "Extension limited to 5 degrees (DC 5261)." },
  ],
  interviewPrompts: [
    "Which knee, and when did it start limiting you?",
    "What everyday motions stop you — stairs, squatting, kneeling, standing up, walking a store?",
    "Does it give way, lock, or swell, and how often in a real month?",
    "On a flare, what can you not do, and how long until it settles?",
  ],
  examMeasurements: [
    "Flexion and extension in degrees with a goniometer, including where pain starts.",
    "Instability testing if giving-way is part of the story (a separate code, such as DC 5257).",
    "Repetitive-use and flare-up functional loss.",
  ],
  notes: ["Do not guess degree measurements. If you have not been measured, say what you cannot do instead of inventing an angle."],
};

const SCIATIC: CfrCondition = {
  diagnosticCode: "8520",
  name: "Sciatic nerve, paralysis",
  bodySystem: "neurological",
  citation: "38 CFR § 4.124a, Diagnostic Code 8520.",
  summary:
    "Sciatica and radiculopathy are rated on nerve impairment: mild, moderate, moderately severe, severe with marked muscular atrophy, or complete paralysis. Mild incomplete paralysis is the starting point when symptoms exist but function remains mostly intact.",
  ratings: [
    {
      percent: 80,
      criteria:
        "Complete paralysis: the foot dangles and drops, no active movement of the muscles below the knee is possible, and flexion of the knee is weakened or lost.",
    },
    { percent: 60, criteria: "Severe incomplete paralysis, with marked muscular atrophy." },
    { percent: 40, criteria: "Moderately severe incomplete paralysis." },
    { percent: 20, criteria: "Moderate incomplete paralysis." },
    { percent: 10, criteria: "Mild incomplete paralysis." },
  ],
  interviewPrompts: [
    "Where does the pain, numbness, or weakness travel — back, buttock, leg, foot?",
    "What gives out or goes numb, and how often does that happen in a normal week?",
    "What activities stop because of the leg: driving, standing, stairs, sleep?",
  ],
  examMeasurements: [
    "Sensory changes, reflex changes, and strength in the affected leg.",
    "Whether there is muscle atrophy. Do not assert atrophy unless a clinician has documented it.",
    "Which side, and whether the spine condition is being rated separately.",
  ],
  notes: ["Nerve ratings are separate from the spine formula when the neurologic findings are objective. Describe what you feel; let the exam document the nerve."],
};

const SINUSITIS: CfrCondition = {
  diagnosticCode: "6510",
  name: "Chronic sinusitis",
  bodySystem: "respiratory",
  citation: "38 CFR § 4.97, General Rating Formula for Sinusitis (DC 6510 through 6514).",
  summary:
    "Chronic sinusitis is rated on incapacitating episodes that need prolonged antibiotics, and on non-incapacitating episodes with headaches, pain, and purulent discharge or crusting. It is also one of the PACT Act particulate-matter presumptives when the service requirements are met.",
  ratings: [
    {
      percent: 50,
      criteria:
        "Following radical surgery with chronic osteomyelitis, or; near-constant sinusitis characterized by headaches, pain and tenderness of the affected sinus, and purulent discharge or crusting after repeated surgeries.",
    },
    {
      percent: 30,
      criteria:
        "Three or more incapacitating episodes per year requiring prolonged (four to six weeks) antibiotic treatment, or; more than six non-incapacitating episodes per year of headaches, pain, and purulent discharge or crusting.",
    },
    {
      percent: 10,
      criteria:
        "One or two incapacitating episodes per year requiring prolonged antibiotic treatment, or; three to six non-incapacitating episodes per year of headaches, pain, and purulent discharge or crusting.",
    },
    { percent: 0, criteria: "Detected by X-ray only." },
  ],
  interviewPrompts: [
    "How many times in the last year did sinus symptoms stop your normal day, and did a clinician prescribe antibiotics?",
    "What do the episodes look like — pain, headache, discharge, crusting — and how long do they last?",
    "Did you serve in a location or era VA treats as a burn-pit or particulate-matter exposure? Say where and when, not a legal conclusion.",
  ],
  examMeasurements: [
    "Number of incapacitating episodes in the past year and whether antibiotics were prescribed for four to six weeks.",
    "Number of non-incapacitating episodes with headaches, pain, and purulent discharge or crusting.",
    "Imaging or ENT findings already in the record.",
  ],
  notes: [
    "An incapacitating episode for this formula means one that requires bed rest and treatment by a physician. Do not relabel an ordinary cold as bed rest unless that is what happened.",
  ],
};

const PACT: CfrCondition = {
  diagnosticCode: "PACT",
  name: "PACT Act presumptive exposure",
  bodySystem: "presumptive",
  citation: "38 U.S.C. § 1120 and 38 CFR § 3.320. Confirm the current presumptive list at VA.gov/resources/the-pact-act-and-your-va-benefits.",
  summary:
    "The PACT Act is about whether service connection can be presumed for certain toxic exposures. It is not, by itself, a percentage. Each diagnosed condition is still rated under its own diagnostic code. Presumptives include many respiratory conditions and cancers for covered service. Hypertension is not automatically a burn-pit presumptive.",
  ratings: [
    {
      percent: 0,
      criteria:
        "There is no single PACT percentage. Examples of particulate-matter presumptives include asthma, chronic rhinitis, chronic sinusitis, chronic bronchitis, COPD, constrictive bronchiolitis or obliterative bronchiolitis, emphysema, and several interstitial and granulomatous lung diseases, plus specified cancers. The condition you actually have is rated under its own code.",
    },
  ],
  interviewPrompts: [
    "Where and when did you serve, in plain language (base, country, years)?",
    "What diagnosis has a clinician actually given you, and when was it diagnosed?",
    "How does that diagnosed condition limit work, sleep, breathing, or daily tasks?",
  ],
  examMeasurements: [
    "Deployment locations and dates from your own memory or records.",
    "The diagnosed condition, so the right rating formula can be opened.",
    "Current treatment and functional limits of that condition.",
  ],
  notes: [
    "Use the sinusitis, asthma, or other condition entry for the percentage formula once you know the diagnosis.",
    "This overview is not a determination that your service qualifies. VA decides presumptive eligibility.",
  ],
};

export const CFR_CONDITIONS: CfrCondition[] = [
  SPINE,
  { ...SPINE, diagnosticCode: "5238", name: "Spinal stenosis" },
  { ...SPINE, diagnosticCode: "5242", name: "Degenerative arthritis of the spine" },
  MENTAL,
  { ...MENTAL, diagnosticCode: "9400", name: "Generalized anxiety disorder" },
  { ...MENTAL, diagnosticCode: "9434", name: "Major depressive disorder" },
  MIGRAINE,
  TINNITUS,
  SLEEP_APNEA,
  KNEE,
  { ...KNEE, diagnosticCode: "5261", name: "Knee, limitation of extension" },
  SCIATIC,
  SINUSITIS,
  { ...SINUSITIS, diagnosticCode: "6522", name: "Allergic or vasomotor rhinitis", citation: "38 CFR § 4.97, Diagnostic Code 6522. Rhinitis is also a PACT Act particulate-matter presumptive when service requirements are met. DC 6522 rates polyps at 30% and rhinitis without polyps but with greater than 50 percent obstruction of both nasal passages, or complete obstruction of one passage, at 10%." },
  PACT,
];

export const GENERIC_CRITERION: CfrCondition = {
  diagnosticCode: "UNMAPPED",
  name: "Condition not in the local rubric",
  bodySystem: "musculoskeletal",
  citation: "Look up the current diagnostic code in 38 CFR Part 4.",
  summary:
    "This diagnostic code is not in the local Common Ground rubric. You can still journal onset, frequency, severity, flare-ups, and functional impact. Do not guess a percentage from an unlisted code.",
  ratings: [],
  interviewPrompts: [
    "What is the condition called in your records, and when did it start?",
    "How often does it limit you in a typical month?",
    "What does a hard day stop you from doing at work or at home, and for how long?",
  ],
  examMeasurements: ["Diagnosis name and diagnostic code from your records.", "Functional limits in your own examples."],
  notes: ["Add the diagnostic code on the condition so the matching rubric can load. Until then, the readiness meter only tracks whether your account covers the basic topics."],
};

export function lookupCriteria(query: { diagnosticCode?: string | null; name?: string | null }): CfrCondition {
  const code = query.diagnosticCode?.trim();
  if (code) {
    const byCode = CFR_CONDITIONS.find((item) => item.diagnosticCode.toLowerCase() === code.toLowerCase());
    if (byCode) return byCode;
  }
  const name = query.name?.trim().toLowerCase() ?? "";
  if (name) {
    const byName = CFR_CONDITIONS.find(
      (item) => name.includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(name),
    );
    if (byName) return byName;
    if (name.includes("ptsd") || name.includes("anxiety") || name.includes("depress")) return MENTAL;
    if (name.includes("migraine") || name.includes("headache")) return MIGRAINE;
    if (name.includes("tinnitus") || name.includes("ringing")) return TINNITUS;
    if (name.includes("apnea") || name.includes("cpap")) return SLEEP_APNEA;
    if (name.includes("back") || name.includes("lumbar") || name.includes("spine")) return SPINE;
    if (name.includes("knee")) return KNEE;
    if (name.includes("sciatic") || name.includes("radicul")) return SCIATIC;
    if (name.includes("sinus")) return SINUSITIS;
    if (name.includes("pact") || name.includes("burn pit")) return PACT;
  }
  return { ...GENERIC_CRITERION, name: query.name?.trim() || GENERIC_CRITERION.name, diagnosticCode: code || "UNMAPPED" };
}

export function applicableMetricKeys(criterion: CfrCondition): Array<keyof Omit<import("@/db/types").ExtractedMetrics, "readinessScore">> {
  const base = ["onset", "frequency", "severity", "functionalImpact", "flareUps"] as const;
  if (criterion.bodySystem === "musculoskeletal") return [...base, "romLimitations"];
  return [...base];
}
