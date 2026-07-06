export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        mint: "#2fbf9b",
        coral: "#ec6f66",
        steel: "#5b7285",
        healthcare: {
          blue: "#1d4ed8",
          "blue-light": "#3b82f6",
          "blue-dark": "#1e3a8a",
          emerald: "#10b981",
          "emerald-light": "#34d399",
          "emerald-dark": "#059669",
          surface: "#f0f9ff",
        },
      },
      boxShadow: {
        soft: "0 4px 24px -4px rgba(29, 78, 216, 0.12)",
        card: "0 8px 30px -6px rgba(15, 23, 42, 0.08)",
        "card-hover": "0 16px 40px -8px rgba(29, 78, 216, 0.18)",
      },
    },
  },
  plugins: [],
};

