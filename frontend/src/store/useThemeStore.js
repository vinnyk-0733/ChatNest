import { create } from "zustand";

export const useThemeStore = create((set) => ({
  theme: "light",
  loadTheme: () => {
    const saved = localStorage.getItem("chat-theme") || "light";
    set({ theme: saved });
    document.documentElement.setAttribute("data-theme", saved);
  },
  setTheme: (theme) => {
    set({ theme });
    localStorage.setItem("chat-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  },
}));
