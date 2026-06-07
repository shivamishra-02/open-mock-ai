/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0f4ff",
          100: "#e0e9ff",
          400: "#6b8cff",
          500: "#4f6ef7",
          600: "#3a56e8",
          900: "#1a2366",
        },
        surface: {
          900: "#0a0a0f",
          800: "#111118",
          700: "#18181f",
          600: "#1e1e28",
          500: "#252530",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-slow":   "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in":      "fadeIn 0.4s ease forwards",
        "slide-up":     "slideUp 0.4s ease forwards",
        "glow-pulse":   "glowPulse 2s ease-in-out infinite",
        "wave":         "wave 1.2s linear infinite",
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: "translateY(16px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        glowPulse: { "0%,100%": { boxShadow: "0 0 20px rgba(79,110,247,0.3)" }, "50%": { boxShadow: "0 0 40px rgba(79,110,247,0.7)" } },
        wave:      { "0%": { transform: "scaleY(0.3)" }, "50%": { transform: "scaleY(1)" }, "100%": { transform: "scaleY(0.3)" } },
      },
      backdropBlur: { xs: "2px" },
    },
  },
  plugins: [],
};