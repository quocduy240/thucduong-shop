import {
  resolveDisclaimerContent,
  type MedicalDisclaimerConfig,
} from "@/lib/medical-disclaimer";

export default function MedicalDisclaimerBlock({
  config,
  compact = false,
  className = "",
}: {
  config?: MedicalDisclaimerConfig | null;
  compact?: boolean;
  className?: string;
}) {
  const { title, body, badge } = resolveDisclaimerContent(config);

  return (
    <aside
      aria-label={title}
      className={`rounded-xl border border-amber-200/90 bg-amber-50/70 text-amber-950 print:break-inside-avoid ${
        compact ? "p-3 text-xs" : "p-4 text-xs sm:text-[13px]"
      } ${className}`}
    >
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-extrabold text-amber-900">
          <span aria-hidden="true">⚕️</span>
          <span>{title}</span>
        </div>
        <span className="rounded-full border border-amber-300/80 bg-white/80 px-2 py-0.5 text-[10px] font-bold text-amber-800 print:hidden">
          {badge}
        </span>
      </div>
      <p className="leading-relaxed text-amber-900/90">{body}</p>
    </aside>
  );
}
