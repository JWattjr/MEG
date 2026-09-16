export const BASIS_POINTS = 100n;
export const MINIMUM_STAKE_WEI = 1_000_000_000_000_000_000n;
export const MAXIMUM_STAKE_WEI = 100_000_000_000_000_000_000n;

export type StakeAllocation = {
  stake: bigint;
  commonPerCell: bigint;
  mediumPerCell: bigint;
  rarePerCell: bigint;
  common: bigint;
  medium: bigint;
  rare: bigint;
  jackpot: bigint;
  platform: bigint;
  total: bigint;
};

export function allocateStake(stake: bigint): StakeAllocation {
  if (stake < MINIMUM_STAKE_WEI) throw new Error("MEG stakes start at 1 test GEN.");
  if (stake > MAXIMUM_STAKE_WEI) throw new Error("MEG testnet stakes are capped at 100 GEN per entry.");
  const commonPerCell = stake * 5n / BASIS_POINTS;
  const mediumPerCell = stake * 10n / BASIS_POINTS;
  const rarePerCell = stake * 15n / BASIS_POINTS;
  const common = commonPerCell * 3n;
  const medium = mediumPerCell * 3n;
  const rare = rarePerCell * 3n;
  const jackpot = stake * 5n / BASIS_POINTS;
  const platform = stake - common - medium - rare - jackpot;
  return { stake, commonPerCell, mediumPerCell, rarePerCell, common, medium, rare, jackpot, platform, total: common + medium + rare + jackpot + platform };
}

export function formatGenWei(value: bigint, maximumFractionDigits = 4): string {
  const whole = value / MINIMUM_STAKE_WEI;
  const remainder = value % MINIMUM_STAKE_WEI;
  if (remainder === 0n) return whole.toString();
  const fraction = remainder.toString().padStart(18, "0").slice(0, maximumFractionDigits).replace(/0+$/, "");
  return `${whole.toString()}.${fraction}`;
}
