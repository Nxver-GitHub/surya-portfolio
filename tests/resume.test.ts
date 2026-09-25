import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resume } from "../content/resume";
import { emailAddress, joinControls } from "../content/lobby";

const ROOT = join(__dirname, "..");

describe("driver profile résumé", () => {
  it("ships the PDF the content entry points at", () => {
    const file = join(ROOT, "public", resume.href);
    expect(existsSync(file), `${resume.href} missing from public/`).toBe(true);
    const head = readFileSync(file).subarray(0, 5).toString("latin1");
    expect(head).toBe("%PDF-");
  });

  it("keeps the phone number out of the committed LaTeX source", () => {
    const tex = readFileSync(join(ROOT, "assets-src/resume/main.tex"), "utf8");
    expect(tex).not.toMatch(/\b\d{3}-\d{3}-\d{4}\b/);
    expect(tex).not.toMatch(/\(\d{3}\)\s*\d{3}-\d{4}/);
  });

  it("names the download after the content entry", () => {
    expect(resume.href.endsWith(`/${resume.filename}`)).toBe(true);
    expect(resume.pages).toBeGreaterThan(0);
  });
});

describe("lobby email is never a joined literal in content", () => {
  it("gives the email control no static href", () => {
    const email = joinControls.find((c) => c.channel === "email");
    expect(email).toBeDefined();
    expect(email?.href).toBeUndefined();
  });

  it("keeps the address split into user and domain", () => {
    expect(emailAddress.user).not.toContain("@");
    expect(emailAddress.domain).not.toContain("@");
    const joined = `${emailAddress.user}@${emailAddress.domain}`;
    const lobbySource = readFileSync(join(ROOT, "content/lobby.ts"), "utf8");
    expect(lobbySource).not.toContain(joined);
  });

  it("points the lobby résumé plate at the same PDF as the Driver Profile", () => {
    const control = joinControls.find((c) => c.channel === "resume");
    expect(control?.href).toBe(resume.href);
  });
});
