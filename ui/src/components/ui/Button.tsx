import { Link } from "react-router-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "gold" | "outline" | "dark";

interface CommonProps {
  variant?: Variant;
  className?: string;
  children: ReactNode;
}

const styles: Record<Variant, string> = {
  primary: "bg-paddy text-white hover:bg-paddy-soft",
  gold: "bg-amber text-white hover:brightness-95",
  dark: "bg-black text-white hover:bg-paddy",
  outline: "border border-paddy text-paddy hover:bg-paddy hover:text-white",
};
const base =
  "inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-50";

interface LinkButtonProps extends CommonProps { to: string }
export function LinkButton({ to, variant = "primary", className = "rounded-[18px]", children }: LinkButtonProps) {
  return <Link to={to} className={`${base} ${styles[variant]} ${className}`}>{children}</Link>;
}

interface ButtonProps extends CommonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> {}
export default function Button({ variant = "primary", className = "", children, ...rest }: ButtonProps) {
  return <button className={`${base} ${styles[variant]} ${className}`} {...rest}>{children}</button>;
}
