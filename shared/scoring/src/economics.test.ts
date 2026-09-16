import { describe, expect, it } from "vitest";
import { MINIMUM_STAKE_WEI, allocateStake } from "./economics";

describe("MEG economics", () => {
  it("allocates one GEN exactly across nine pools, jackpot, and platform", () => {
    const allocation = allocateStake(MINIMUM_STAKE_WEI);
    expect(allocation.commonPerCell).toBe(50_000_000_000_000_000n);
    expect(allocation.mediumPerCell).toBe(100_000_000_000_000_000n);
    expect(allocation.rarePerCell).toBe(150_000_000_000_000_000n);
    expect(allocation.jackpot).toBe(50_000_000_000_000_000n);
    expect(allocation.platform).toBe(50_000_000_000_000_000n);
    expect(allocation.total).toBe(MINIMUM_STAKE_WEI);
  });

  it("keeps deterministic remainder in the platform bucket", () => {
    const allocation = allocateStake(MINIMUM_STAKE_WEI + 1n);
    expect(allocation.total).toBe(MINIMUM_STAKE_WEI + 1n);
    expect(allocation.platform).toBe(50_000_000_000_000_001n);
  });
});
