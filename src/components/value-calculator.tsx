"use client";

import { useMemo, useState } from "react";
import { compensationBreakdown, type DependentScenario, VA_COMPENSATION_2026, RATE_TABLE_NOTE } from "@/lib/ai/cfr-criteria";
import { formatUsd } from "@/lib/format";

const ratings = VA_COMPENSATION_2026.map((row) => row.rating);

const emptyHousehold: Required<DependentScenario> = {
  spouse: false,
  dependentParents: 0,
  childrenUnder18: 0,
  childrenInSchool: 0,
  spouseAidAndAttendance: false,
};

export function ValueCalculator() {
  const [current, setCurrent] = useState(40);
  const [target, setTarget] = useState(70);
  const [household, setHousehold] = useState(emptyHousehold);
  const numbers = useMemo(() => {
    const now = compensationBreakdown(current, household);
    const next = compensationBreakdown(target, household);
    const nowMonthly = now?.monthly ?? 0;
    const nextMonthly = next?.monthly ?? 0;
    return {
      now: nowMonthly,
      next: nextMonthly,
      annual: Math.max(0, nextMonthly - nowMonthly) * 12,
      summary: next?.summary ?? now?.summary ?? "",
    };
  }, [current, target, household]);

  function setCount(key: "dependentParents" | "childrenUnder18" | "childrenInSchool", value: number) {
    const max = key === "dependentParents" ? 2 : 10;
    setHousehold((currentHousehold) => ({
      ...currentHousehold,
      [key]: Math.min(max, Math.max(0, value)),
    }));
  }

  return (
    <div className="rounded-3xl border border-sand bg-white p-6 shadow-card">
      <p className="font-mono text-[11px] uppercase tracking-widest text-terracotta">2026 rate table · veteran keeps 100%</p>
      <h2 className="mt-2 font-serif text-4xl">$0 here. Up to $12,500 elsewhere.</h2>
      <p className="mt-3 text-sm leading-6 text-forest/70">
        Some unaccredited companies have sold claim packages reported around $12,500. Accredited representatives who charge at all must follow 38 U.S.C. § 5904. Common Ground charges nothing. The figures below are public VA math, not a promise of a decision.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="text-sm">Current combined rating
          <select className="mt-2 h-11 w-full rounded-2xl border border-sand px-3" value={current} onChange={(event) => setCurrent(Number(event.target.value))}>
            {ratings.map((rating) => <option key={rating} value={rating}>{rating}%</option>)}
          </select>
        </label>
        <label className="text-sm">Illustration at
          <select className="mt-2 h-11 w-full rounded-2xl border border-sand px-3" value={target} onChange={(event) => setTarget(Number(event.target.value))}>
            {ratings.map((rating) => <option key={rating} value={rating}>{rating}%</option>)}
          </select>
        </label>
      </div>

      <fieldset className="mt-5 space-y-4">
        <legend className="text-sm font-medium">Who is on the award</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={household.spouse}
              onChange={(event) => setHousehold((currentHousehold) => ({
                ...currentHousehold,
                spouse: event.target.checked,
                spouseAidAndAttendance: event.target.checked ? currentHousehold.spouseAidAndAttendance : false,
              }))}
            />
            Spouse
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={household.spouseAidAndAttendance}
              disabled={!household.spouse}
              onChange={(event) => setHousehold((currentHousehold) => ({ ...currentHousehold, spouseAidAndAttendance: event.target.checked }))}
            />
            Spouse receives Aid and Attendance
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <CountField label="Dependent parents" value={household.dependentParents} max={2} onChange={(value) => setCount("dependentParents", value)} />
          <CountField label="Children under 18" value={household.childrenUnder18} max={10} onChange={(value) => setCount("childrenUnder18", value)} />
          <CountField label="Children 18–23 in school" value={household.childrenInSchool} max={10} onChange={(value) => setCount("childrenInSchool", value)} />
        </div>
      </fieldset>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Monthly now" value={formatUsd(numbers.now)} />
        <Stat label="Monthly at illustration" value={formatUsd(numbers.next)} />
        <Stat label="Difference per year" value={formatUsd(numbers.annual)} />
      </div>
      <p className="mt-3 text-sm leading-6 text-forest/70">{numbers.summary}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-sage/10 p-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-sage">Common Ground</p>
          <p className="mt-2 font-serif text-4xl">$0</p>
          <p className="mt-2 text-sm">You file it. You keep the compensation.</p>
        </div>
        <div className="rounded-2xl bg-[#f8efe8] p-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-terracotta">Example package fee</p>
          <p className="mt-2 font-serif text-4xl">$12,500</p>
          <p className="mt-2 text-sm">An illustration of a high flat fee. Not a quote from a named company.</p>
        </div>
      </div>
      <p className="mt-4 text-xs leading-5 text-forest/50">{RATE_TABLE_NOTE}</p>
    </div>
  );
}

function CountField({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (value: number) => void }) {
  return (
    <label className="text-sm">
      {label}
      <input
        className="mt-2 h-11 w-full rounded-2xl border border-sand px-3"
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-sand p-4">
      <p className="text-xs text-forest/60">{label}</p>
      <p className="mt-1 font-serif text-2xl">{value}</p>
    </div>
  );
}
