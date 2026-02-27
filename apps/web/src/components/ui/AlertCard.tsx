type AlertType = "danger" | "warning" | "info";

interface AlertCardProps {
  type: AlertType;
  title: string;
  description: string;
}

const borderColorClasses: Record<AlertType, string> = {
  danger: "border-l-danger",
  warning: "border-l-warning",
  info: "border-l-blue-500",
};

const iconColors: Record<AlertType, string> = {
  danger: "text-danger",
  warning: "text-warning",
  info: "text-blue-500",
};

export default function AlertCard({ type, title, description }: AlertCardProps) {
  return (
    <div
      className={`bg-white rounded-xl p-4 border-l-4 ${borderColorClasses[type]} shadow-sm`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 ${iconColors[type]}`}>
          {type === "danger" && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
            </svg>
          )}
          {type === "warning" && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
            </svg>
          )}
          {type === "info" && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
          )}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-navy">{title}</p>
          <p className="text-xs text-sub mt-1 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
