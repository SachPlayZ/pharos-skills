import { describe, it, expect } from "vitest";
import { resolveDependencies, SKILLS } from "../src/registry.js";

describe("resolveDependencies", () => {
  it("returns single skill with no deps", () => {
    const order = resolveDependencies("pharos-contract-verify");
    expect(order).toEqual(["pharos-contract-verify"]);
  });

  it("returns deps before skill (deploy-kit)", () => {
    const order = resolveDependencies("pharos-deploy-kit");
    expect(order.indexOf("pharos-contract-verify")).toBeLessThan(
      order.indexOf("pharos-deploy-kit")
    );
    expect(order[order.length - 1]).toBe("pharos-deploy-kit");
  });

  it("token-factory: both deploy-kit and contract-verify come before it", () => {
    const order = resolveDependencies("pharos-token-factory");
    const tfIdx = order.indexOf("pharos-token-factory");
    const dkIdx = order.indexOf("pharos-deploy-kit");
    const cvIdx = order.indexOf("pharos-contract-verify");
    expect(cvIdx).toBeLessThan(tfIdx);
    expect(dkIdx).toBeLessThan(tfIdx);
  });

  it("x402-payments: agent-wallet comes before it", () => {
    const order = resolveDependencies("pharos-x402-payments");
    expect(order.indexOf("pharos-agent-wallet")).toBeLessThan(
      order.indexOf("pharos-x402-payments")
    );
  });

  it("no-dep skills resolve to single element", () => {
    for (const name of ["pharos-safe-multisig", "pharos-agent-wallet"]) {
      const order = resolveDependencies(name);
      expect(order).toEqual([name]);
    }
  });

  it("throws on unknown skill", () => {
    expect(() => resolveDependencies("nonexistent-skill")).toThrow(
      'Unknown skill: "nonexistent-skill"'
    );
  });

  it("no duplicates in resolved order", () => {
    const order = resolveDependencies("pharos-token-factory");
    const unique = new Set(order);
    expect(unique.size).toBe(order.length);
  });

  it("all skills resolve without error", () => {
    for (const name of Object.keys(SKILLS)) {
      expect(() => resolveDependencies(name)).not.toThrow();
    }
  });
});
