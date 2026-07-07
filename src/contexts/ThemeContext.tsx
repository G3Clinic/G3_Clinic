import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeConfig = {
  primaryColor: string;
  sidebarColor: string;
  topbarColor: string;
  logoFullUrl: string;
  logoIconUrl: string;
  companyName: string;
};

const defaultTheme: ThemeConfig = {
  primaryColor: '#10B981',
  sidebarColor: '#FFFFFF',
  topbarColor: '#FFFFFF',
  logoFullUrl: '',
  logoIconUrl: '',
  companyName: 'Clínica da Família',
};

interface ThemeContextType {
  theme: ThemeConfig;
  updateTheme: (newTheme: Partial<ThemeConfig>) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper to decide text color based on background
function getContrastTextColor(hexColor: string) {
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  // If yiq >= 128, the background is light, so text should be dark.
  // Otherwise, background is dark, text should be white.
  return yiq >= 128 ? '#475569' : '#FFFFFF';
}

function adjustColor(color: string, amount: number) {
    const safeColor = color.startsWith('#') ? color : '#' + color;
    return '#' + safeColor.replace(/^#/, '').replace(/../g, color => {
      const parsed = parseInt(color, 16);
      if (isNaN(parsed)) return '00';
      return ('0'+Math.min(255, Math.max(0, parsed + amount)).toString(16)).substr(-2);
    });
}

function hexToRgb(hex: string) {
  const safeColor = hex.startsWith('#') ? hex : '#' + hex;
  const h = safeColor.replace('#', '');
  if (h.length !== 6) return '0 0 0'; // fallback
  const r = parseInt(h.substr(0, 2), 16);
  const g = parseInt(h.substr(2, 2), 16);
  const b = parseInt(h.substr(4, 2), 16);
  return `${r} ${g} ${b}`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(() => {
    const saved = localStorage.getItem('@clinica/theme');
    return saved ? { ...defaultTheme, ...JSON.parse(saved) } : defaultTheme;
  });

  useEffect(() => {
    localStorage.setItem('@clinica/theme', JSON.stringify(theme));
    
    const root = document.documentElement;
    
    const safePrimary = theme.primaryColor.startsWith('#') ? theme.primaryColor : '#' + theme.primaryColor;
    const safeSidebar = theme.sidebarColor.startsWith('#') ? theme.sidebarColor : '#' + theme.sidebarColor;
    const safeTopbar = theme.topbarColor.startsWith('#') ? theme.topbarColor : '#' + theme.topbarColor;

    // Primary Colors
    root.style.setProperty('--color-brand-primary', safePrimary);
    root.style.setProperty('--color-brand-primary-rgb', hexToRgb(safePrimary));
    root.style.setProperty('--color-brand-dark', adjustColor(safePrimary, -20));
    root.style.setProperty('--color-brand-light', safePrimary + '1A'); // 10% opacity

    // Sidebar
    root.style.setProperty('--color-sidebar-bg', safeSidebar);
    root.style.setProperty('--color-sidebar-text', getContrastTextColor(safeSidebar));

    // Topbar
    root.style.setProperty('--color-topbar-bg', safeTopbar);
    root.style.setProperty('--color-topbar-text', getContrastTextColor(safeTopbar));

    // Favicon and Title
    document.title = theme.companyName || 'Clínica Dashboard';
    if (theme.logoIconUrl || theme.logoFullUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = theme.logoIconUrl || theme.logoFullUrl;
    }

  }, [theme]);

  const updateTheme = (newTheme: Partial<ThemeConfig>) => {
    setTheme(prev => ({ ...prev, ...newTheme }));
  };

  const resetTheme = () => setTheme(defaultTheme);

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
