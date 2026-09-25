"use client";

import { useSyncExternalStore } from "react";
import type { EmailAddress } from "../../../content/lobby";

interface EmailPlateProps {
  address: EmailAddress;
  label: string;
  className: string;
}

const subscribeNoop = () => () => {};

/** true once hydrated on the client, false in server-rendered markup. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

/**
 * Email hot plate whose mailto exists only after hydration.
 *
 * The joined address never appears in the server-rendered HTML or in a static
 * href, so crawlers that read markup without running scripts do not harvest
 * it. Visitors see and use exactly the same button. Bots that execute
 * JavaScript can still read it; that is the accepted trade-off for a contact
 * button that must work without a form or a captcha.
 */
export function EmailPlate({ address, label, className }: EmailPlateProps) {
  const hydrated = useHydrated();
  const href = hydrated
    ? `mailto:${address.user}@${address.domain}`
    : undefined;

  return (
    <a href={href} className={className}>
      <span>{label}</span>
      <span aria-hidden="true">→</span>
    </a>
  );
}
