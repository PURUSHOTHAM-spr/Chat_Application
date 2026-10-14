/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ChatSphere slate blue palette
        chatsphere: {
          50: "#E3EAF3",
          100: "#E3EAF3",
          200: "#C8D5E6",
          300: "#8198BB",
          400: "#8198BB",
          500: "#526F99",
          600: "#455F85",
          700: "#3D526F",
          800: "#3D526F",
          900: "#3D526F",
        },
        // Dark mode surfaces
        dark: {
          1: "#171B22",
          2: "#202631",
          3: "#2A3240",
          4: "#363F4D",
          5: "#363F4D",
        },
        // Light mode surfaces
        light: {
          1: "#FFFFFF",
          2: "#ECEFF3",
          3: "#E6EAF0",
          4: "#D9DEE6",
        },
        // Chat bubble colors
        bubble: {
          out: "#E3EAF3",
          outDark: "#263B56",
          in: "#FFFFFF",
          inDark: "#2A3240",
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
        "slide-down": "slideDown 0.2s ease-out",
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
        slideDown: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
