import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Theme store — manages dark/light mode with localStorage persistence.
 */
const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: "light", // "light" or "dark"

      toggleTheme: () => {
        const newTheme = get().theme === "light" ? "dark" : "light";
        set({ theme: newTheme });
        // Apply/remove dark class on document
        if (newTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      },

      initializeTheme: () => {
        const { theme } = get();
        if (theme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      },
    }),
    {
      name: "whatsapp-theme",
    }
  )
);

export default useThemeStore;
