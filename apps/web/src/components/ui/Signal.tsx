type SignalStatus = "green" | "yellow" | "red";
type SignalSize = "sm" | "md" | "lg";

interface SignalProps {
  status: SignalStatus;
  size?: SignalSize;
}

const sizeClasses: Record<SignalSize, string> = {
  sm: "w-3 h-3",
  md: "w-6 h-6",
  lg: "w-10 h-10",
};

const colorClasses: Record<SignalStatus, string> = {
  green: "bg-success",
  yellow: "bg-warning",
  red: "bg-danger",
};

export default function Signal({ status, size = "md" }: SignalProps) {
  return (
    <span
      className={`inline-block rounded-full ${sizeClasses[size]} ${colorClasses[status]}`}
      role="img"
      aria-label={`${status} signal`}
    />
  );
}
