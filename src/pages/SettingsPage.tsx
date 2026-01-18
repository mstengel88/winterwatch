import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Settings, Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

export default function SettingsPage() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    // Get the current theme from localStorage or default to dark
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Check if user prefers dark mode
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    const root = document.documentElement;
    
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } else if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-2xl py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-primary/10 rounded-full">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your app preferences</p>
          </div>
        </div>

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize how the app looks on your device
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Label className="text-base">Theme</Label>
              <RadioGroup
                value={theme}
                onValueChange={(value) => applyTheme(value as Theme)}
                className="grid grid-cols-3 gap-4"
              >
                <Label
                  htmlFor="light"
                  className={`flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                    theme === 'light'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <RadioGroupItem value="light" id="light" className="sr-only" />
                  <Sun className={`h-6 w-6 mb-2 ${theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${theme === 'light' ? 'text-primary' : ''}`}>
                    Light
                  </span>
                </Label>

                <Label
                  htmlFor="dark"
                  className={`flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                    theme === 'dark'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <RadioGroupItem value="dark" id="dark" className="sr-only" />
                  <Moon className={`h-6 w-6 mb-2 ${theme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-primary' : ''}`}>
                    Dark
                  </span>
                </Label>

                <Label
                  htmlFor="system"
                  className={`flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                    theme === 'system'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <RadioGroupItem value="system" id="system" className="sr-only" />
                  <Monitor className={`h-6 w-6 mb-2 ${theme === 'system' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${theme === 'system' ? 'text-primary' : ''}`}>
                    System
                  </span>
                </Label>
              </RadioGroup>
              <p className="text-sm text-muted-foreground">
                {theme === 'system' 
                  ? 'Theme will automatically match your system settings' 
                  : `Using ${theme} mode`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
