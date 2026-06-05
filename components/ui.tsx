import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-white/50 bg-primary/90 text-primary-foreground shadow-lg shadow-lime-300/30 backdrop-blur-xl hover:-translate-y-0.5 hover:bg-primary",
        secondary: "border-white/50 bg-accent/90 text-accent-foreground shadow-lg shadow-pink-300/30 backdrop-blur-xl hover:-translate-y-0.5 hover:bg-accent",
        outline: "border-white/60 bg-white/45 text-foreground backdrop-blur-xl hover:bg-white/70",
        ghost: "border-transparent hover:border-white/50 hover:bg-white/35 hover:backdrop-blur-xl",
        destructive: "border-white/50 bg-destructive text-destructive-foreground shadow-lg shadow-red-300/30 hover:-translate-y-0.5"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-6",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-3xl border border-white/70 bg-white/62 text-card-foreground shadow-xl shadow-slate-900/10 backdrop-blur-2xl", className)} {...props} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-11 w-full rounded-2xl border bg-background px-4 text-sm outline-none transition focus:ring-2 focus:ring-ring disabled:opacity-50",
        "border-white/60 bg-white/45 backdrop-blur-xl focus:bg-white/75",
        props.className
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-32 w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-ring disabled:opacity-50",
        "border-white/60 bg-white/45 backdrop-blur-xl focus:bg-white/75",
        props.className
      )}
    />
  );
}

export function Label(props: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={cn("text-sm font-medium text-foreground", props.className)} />;
}
