import { Saira, Source_Serif_4 } from "next/font/google";
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

/**
 * Era "speed type": Saira variable with the width axis; display roles
 * condense it via font-stretch and lean on true italics.
 */
export const saira = Saira({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["wdth"],
  variable: "--font-saira",
  display: "swap",
});

/** GT2 page titles are a heavy drop-shadowed serif ("License Test"). */
export const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-serif-title",
  display: "swap",
});
