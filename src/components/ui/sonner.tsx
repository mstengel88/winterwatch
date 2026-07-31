/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from "react";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const [theme, setTheme] = useState<ToasterProps["theme"]>("dark");

  useEffect(() => {
    const updateTheme = () => {
      const root = document.documentElement;
      const savedTheme = localStorage.getItem("theme");

      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
        return;
      }

      if (savedTheme === "system") {
        setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        return;
      }

      setTheme(root.classList.contains("dark") ? "dark" : "light");
    };

    updateTheme();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = () => updateTheme();
    const observer = new MutationObserver(() => updateTheme());

    mediaQuery.addEventListener("change", handleMediaChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
      observer.disconnect();
    };
  }, []);

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
