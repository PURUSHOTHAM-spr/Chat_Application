/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // WhatsApp green palette
        whatsapp: {
          50: "#e8f5e9",
          100: "#c8e6c9",
          200: "#a5d6a7",
          300: "#81c784",
          400: "#66bb6a",
          500: "#25D366", // Primary WhatsApp green
          600: "#128C7E", // WhatsApp teal
          700: "#075E54", // Dark teal
          800: "#054D44",
          900: "#023D36",
        },
        // Dark mode surfaces
        dark: {
          1: "#111B21",   // Deepest background
          2: "#1F2C34",   // Sidebar bg
          3: "#233138",   // Chat bg
          4: "#2A3942",   // Input bg
          5: "#3B4A54",   // Hover state
        },
        // Light mode surfaces
        light: {
          1: "#FFFFFF",
          2: "#F0F2F5",
          3: "#E9EDEF",
          4: "#D1D7DB",
        },
        // Chat bubble colors
        bubble: {
          out: "#D9FDD3",      // Outgoing (light)
          outDark: "#005C4B",  // Outgoing (dark)
          in: "#FFFFFF",       // Incoming (light)
          inDark: "#1F2C34",   // Incoming (dark)
        },
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "Roboto", "Helvetica Neue", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-in-left": "slideInLeft 0.3s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "pulse-dot": "pulseDot 1.5s infinite",
        "bounce-in": "bounceIn 0.5s ease-out",
        "typing": "typing 1.4s infinite",
        "call-pulse-ring": "callPulseRing 2s ease-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideInLeft: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        bounceIn: {
          "0%": { transform: "scale(0.3)", opacity: "0" },
          "50%": { transform: "scale(1.05)" },
          "70%": { transform: "scale(0.9)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        typing: {
          "0%": { transform: "translateY(0)" },
          "28%": { transform: "translateY(-6px)" },
          "44%": { transform: "translateY(0)" },
        },
        callPulseRing: {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(1.8)", opacity: "0" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
