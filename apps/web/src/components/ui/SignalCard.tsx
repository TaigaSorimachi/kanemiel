import Signal from "@/components/ui/Signal";

interface SignalCardProps {
  month: string;
  signal: "green" | "yellow" | "red";
  amount: string;
  selected?: boolean;
}

export default function SignalCard({
  month,
  signal,
  amount,
  selected = false,
}: SignalCardProps) {
  return (
    <div
      className={`bg-white rounded-xl p-4 flex flex-col items-center gap-2 min-w-[90px] shadow-sm transition-all ${
        selected ? "ring-2 ring-gold" : ""
      }`}
    >
      <span className="text-xs text-sub font-medium">{month}</span>
      <Signal status={signal} size="md" />
      <span className="text-sm font-bold text-navy">{amount}</span>
    </div>
  );
}
