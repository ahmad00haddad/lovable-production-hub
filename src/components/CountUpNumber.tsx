import { useCountUp } from "@/hooks/useCountUp";

export function CountUpNumber({
  value,
  decimals = 0,
  className,
}: {
  value: number;
  decimals?: number;
  className?: string;
}) {
  const v = useCountUp(value);
  return (
    <span className={className}>
      {v.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </span>
  );
}
