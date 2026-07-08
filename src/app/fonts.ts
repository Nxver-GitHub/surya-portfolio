import { Archivo } from "next/font/google";
import localFont from "next/font/local";

export const satoshi = localFont({
  src: [
    {
      path: "../fonts/Satoshi-Variable.woff2",
      weight: "300 900",
      style: "normal",
    },
    {
      path: "../fonts/Satoshi-VariableItalic.woff2",
      weight: "300 900",
      style: "italic",
    },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

export const archivo = Archivo({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-archivo",
  display: "swap",
});
