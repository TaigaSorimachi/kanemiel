import Signal from "@/components/ui/Signal";
import { formatYen } from "@/components/format";

interface ProjectCardProps {
  name: string;
  signal: "green" | "yellow" | "red";
  balance: number;
  contractAmount: number;
  incomeTotal: number;
  onClick?: () => void;
}

export default function ProjectCard({
  name,
  signal,
  balance,
  contractAmount,
  incomeTotal,
  onClick,
}: ProjectCardProps) {
  const progress =
    contractAmount > 0
      ? Math.min((incomeTotal / contractAmount) * 100, 100)
      : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full bg-white rounded-xl p-4 shadow-sm text-left transition-all active:scale-[0.98] cursor-pointer"
    >
      <div className="flex items-center gap-2 mb-2">
        <Signal status={signal} size="sm" />
        <span className="text-sm font-bold text-navy truncate">{name}</span>
      </div>

      <p className="text-lg font-bold text-navy mb-3">{formatYen(balance)}</p>

      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-sub">
          <span>入金進捗</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gold rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-sub">
          <span>{formatYen(incomeTotal)}</span>
          <span>{formatYen(contractAmount)}</span>
        </div>
      </div>
    </button>
  );
}
