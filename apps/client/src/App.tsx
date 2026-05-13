import { Moon, Sun, Database, Palette } from "lucide-react";
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const themes = [
  { id: "purple", name: "Purple", color: "hsl(270 80% 60%)" },
  { id: "ocean", name: "Ocean", color: "hsl(210 90% 55%)" },
  { id: "sunset", name: "Sunset", color: "hsl(25 95% 55%)" },
  { id: "forest", name: "Forest", color: "hsl(145 70% 40%)" },
  { id: "rose", name: "Rose", color: "hsl(350 80% 60%)" },
  { id: "slate", name: "Slate", color: "hsl(220 15% 35%)" },
] as const;

type ThemeId = (typeof themes)[number]["id"];
type Mode = "light" | "dark";

const getInitialTheme = (): ThemeId => {
  if (typeof window === "undefined") return "purple";
  const stored = localStorage.getItem("color-theme");
  if (themes.some((t) => t.id === stored)) return stored as ThemeId;
  return "purple";
};

const getInitialMode = (): Mode => {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("mode");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

function App() {
  const [theme, setTheme] = useState<ThemeId>(getInitialTheme);
  const [mode, setMode] = useState<Mode>(getInitialMode);

  useEffect(() => {
    const root = document.documentElement;

    // Remove existing theme classes
    themes.forEach((t) => root.classList.remove(`theme-${t.id}`));

    // Add current theme class
    root.classList.add(`theme-${theme}`);
    root.classList.toggle("dark", mode === "dark");

    localStorage.setItem("color-theme", theme);
    localStorage.setItem("mode", mode);
  }, [theme, mode]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <Database className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold gradient-text">TaylorDB</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Picker */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  aria-label="Choose theme"
                >
                  <Palette className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {themes.map((t) => (
                  <DropdownMenuItem
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className={theme === t.id ? "font-medium" : ""}>
                      {t.name}
                    </span>
                    {theme === t.id && (
                      <span className="ml-auto text-xs text-primary">✓</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Dark/Light Mode Toggle */}
            <Button
              variant="outline"
              size="icon"
              aria-label="Toggle dark mode"
              className="rounded-full"
              onClick={() => setMode((m) => (m === "dark" ? "light" : "dark"))}
            >
              {mode === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default App;
