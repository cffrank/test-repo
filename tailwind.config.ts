import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                // FOCUS Dashboard color palette
                primary: {
                    DEFAULT: "#1E3B46",
                    50: "#E8EDEF",
                    100: "#D1DBDF",
                    200: "#A3B7BF",
                    300: "#75939F",
                    400: "#476F7F",
                    500: "#1E3B46",
                    600: "#182F38",
                    700: "#12232A",
                    800: "#0C171C",
                    900: "#060B0E",
                },
                accent: {
                    DEFAULT: "#EA994A",
                    50: "#FDF5EE",
                    100: "#FBEBDD",
                    200: "#F7D7BB",
                    300: "#F3C399",
                    400: "#EFAF77",
                    500: "#EA994A",
                    600: "#E07D1E",
                    700: "#AB5F17",
                    800: "#764110",
                    900: "#412309",
                },
                surface: {
                    DEFAULT: "#E6E7E8",
                    dark: "#1E3B46",
                },
            },
            fontFamily: {
                montserrat: ["Montserrat", "sans-serif"],
            },
        },
    },
    plugins: [],
};
export default config;
