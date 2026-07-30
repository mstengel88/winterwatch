import * as React from "react";
import { toast as sonnerToast } from "sonner";

type ToastVariant = "default" | "destructive";

type ToastAction = {
  label: string;
  onClick: () => void;
};

type ToastOptions = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  action?: ToastAction;
};

function toast({ title, description, variant = "default", action }: ToastOptions) {
  const message = title == null ? "" : String(title);
  const detail = description == null ? undefined : String(description);
  const commonOptions = {
    description: detail,
    action,
  };

  if (variant === "destructive") {
    return sonnerToast.error(message || "Something went wrong", commonOptions);
  }

  if (message) {
    return sonnerToast(message, commonOptions);
  }

  return sonnerToast(detail || "Done");
}

function useToast() {
  return {
    toast,
    dismiss: (toastId?: string | number) => sonnerToast.dismiss(toastId),
    toasts: [],
  };
}

export { useToast, toast };
