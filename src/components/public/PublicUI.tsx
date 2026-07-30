import * as React from "react";
import { cn } from "@/lib/utils";

type PublicButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
};

const publicButtonVariants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground",
};

const publicButtonSizes = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3 text-sm",
  lg: "h-11 px-8",
  icon: "h-10 w-10",
};

export function publicButtonClass({
  className,
  variant = "default",
  size = "default",
}: {
  className?: string;
  variant?: PublicButtonProps["variant"];
  size?: PublicButtonProps["size"];
}) {
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    publicButtonVariants[variant],
    publicButtonSizes[size],
    className,
  );
}

export function PublicButton({
  className,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}: PublicButtonProps) {
  return (
    <button
      type={type}
      className={publicButtonClass({ className, variant, size })}
      {...props}
    />
  );
}

export const PublicLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className,
    )}
    {...props}
  />
));

PublicLabel.displayName = "PublicLabel";
