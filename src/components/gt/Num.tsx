import { Fragment } from "react";
import { splitNumerals } from "@/lib/numerals";

/**
 * Sets every number inside a line of text in the numeric face (`.num`, Saira),
 * leaving the words around it in whatever face the parent uses.
 *
 * Use it where a number sits inside Pixelify lettering — a heading sentence, a
 * season period, a mission date — because Pixelify's digits misread (2 as 8,
 * 5 as S). Short codes (SS1, 01A, S3) are left as lettering by the splitter.
 * Only the digits are wrapped, so the accessible text is unchanged.
 */
export function Num({ children }: { children: string }) {
  const parts = splitNumerals(children);
  if (parts.length === 1 && !parts[0].numeric) return <>{children}</>;
  return (
    <>
      {parts.map((part, i) =>
        part.numeric ? (
          <span key={i} className="num">
            {part.text}
          </span>
        ) : (
          <Fragment key={i}>{part.text}</Fragment>
        ),
      )}
    </>
  );
}
