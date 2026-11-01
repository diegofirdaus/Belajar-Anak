export function Pipo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const cls = size === "md" ? "pipo" : `pipo ${size}`;
  return <span className={cls} aria-hidden="true" />;
}
