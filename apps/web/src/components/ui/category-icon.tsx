import {
  ShoppingCart,
  Car,
  House,
  Pill,
  Gamepad2,
  GraduationCap,
  ShoppingBag,
  Wallet,
  Laptop,
  Pin,
  Package,
  Target,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  alimentacao: ShoppingCart,
  transporte: Car,
  moradia: House,
  saude: Pill,
  lazer: Gamepad2,
  educacao: GraduationCap,
  compras: ShoppingBag,
  salario: Wallet,
  freelance: Laptop,
  outros: Pin,
};

interface CategoryIconProps {
  slug?: string | null;
  className?: string;
  size?: number;
}

export function CategoryIcon({ slug, className, size = 16 }: CategoryIconProps) {
  const Icon = (slug && iconMap[slug]) || Package;
  return <Icon size={size} className={cn("shrink-0", className)} />;
}

export function CategoryIconWithBg({
  slug,
  colorBg,
  colorText,
  size = 16,
}: CategoryIconProps & { colorBg?: string; colorText?: string }) {
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
      style={{ backgroundColor: colorBg, color: colorText }}
    >
      <CategoryIcon slug={slug} size={size} />
    </div>
  );
}

export function GoalIcon({ className, size = 16 }: { className?: string; size?: number }) {
  return <Target size={size} className={cn("shrink-0", className)} />;
}
