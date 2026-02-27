import { formatYen } from "@/components/format";

interface BalanceCardProps {
  balance: number;
  label: string;
  date: string;
}

export default function BalanceCard({ balance, label, date }: BalanceCardProps) {
  return (
    <div className="bg-gradient-to-br from-navy to-navy-mid rounded-2xl p-5 text-white shadow-md">
      <p className="text-sm text-white/60 mb-1">{label}</p>
      <p className="text-3xl font-bold tracking-tight">{formatYen(balance)}</p>
      <p className="text-xs text-white/50 mt-2">{date}</p>
    </div>
  );
}
