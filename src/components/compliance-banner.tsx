import { COMPLIANCE_BANNER } from "@/lib/compliance";

export function ComplianceBanner() {
  return (
    <div className="border-b border-sand bg-[#f6f1e8] px-4 py-2 text-center text-xs leading-5 text-forest/80">
      {COMPLIANCE_BANNER}
    </div>
  );
}
