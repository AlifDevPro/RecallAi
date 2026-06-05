// Data-access layer for contributors.
// TODO(backend): replace fixtures with `GET /api/public/contributors`.

export type Contributor = {
  id: string;
  name: string;
  contributions: number;
  accuracy: number;
  verified: boolean;
  inst: string;
  tier: "Diamond" | "Gold" | "Silver" | "Bronze" | "New";
  avatarUrl: string;
};

// Demo portraits via pravatar (deterministic by img index)
const av = (n: number) => `https://i.pravatar.cc/240?img=${n}`;

export const CONTRIBUTORS: Contributor[] = [
  { id: "u1", name: "Asha Mehta", contributions: 412, accuracy: 98, verified: true, inst: "IIT Bombay", tier: "Diamond", avatarUrl: av(47) },
  { id: "u2", name: "Ravi Kumar", contributions: 287, accuracy: 96, verified: true, inst: "NIT Trichy", tier: "Diamond", avatarUrl: av(12) },
  { id: "u3", name: "Lin Wei", contributions: 196, accuracy: 94, verified: true, inst: "IIT Delhi", tier: "Gold", avatarUrl: av(32) },
  { id: "u4", name: "Sara Patel", contributions: 142, accuracy: 92, verified: true, inst: "BITS Pilani", tier: "Gold", avatarUrl: av(45) },
  { id: "u5", name: "Diego Ortiz", contributions: 88, accuracy: 91, verified: false, inst: "IIT Madras", tier: "Silver", avatarUrl: av(15) },
  { id: "u6", name: "Hana Tan", contributions: 64, accuracy: 89, verified: false, inst: "NUS", tier: "Silver", avatarUrl: av(49) },
  { id: "u7", name: "Aman Joshi", contributions: 41, accuracy: 86, verified: false, inst: "IIIT Hyderabad", tier: "Bronze", avatarUrl: av(7) },
  { id: "u8", name: "Priya R.", contributions: 27, accuracy: 84, verified: false, inst: "Anna Univ.", tier: "Bronze", avatarUrl: av(44) },
  { id: "u9", name: "Marcus L.", contributions: 18, accuracy: 80, verified: false, inst: "DTU", tier: "Bronze", avatarUrl: av(60) },
  { id: "u10", name: "Nida F.", contributions: 9, accuracy: 78, verified: false, inst: "Jadavpur", tier: "New", avatarUrl: av(36) },
  { id: "u11", name: "Eli Chen", contributions: 4, accuracy: 75, verified: false, inst: "VIT", tier: "New", avatarUrl: av(33) },
];

export const TIER_GRADIENT: Record<Contributor["tier"], string> = {
  Diamond: "from-[oklch(0.85_0.18_195)] to-[oklch(0.75_0.2_255)]",
  Gold: "from-[oklch(0.85_0.16_85)] to-[oklch(0.7_0.18_55)]",
  Silver: "from-[oklch(0.85_0.02_264)] to-[oklch(0.65_0.02_264)]",
  Bronze: "from-[oklch(0.7_0.12_45)] to-[oklch(0.55_0.14_30)]",
  New: "from-[oklch(0.55_0.05_264)] to-[oklch(0.4_0.03_264)]",
};

export function initialsOf(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("");
}

export function avatarSize(contributions: number, max: number) {
  const ratio = Math.log(contributions + 1) / Math.log(max + 1);
  return Math.round(48 + ratio * 90);
}

// ---- Async data-access seam (swap these internals in the backend phase) ----
export async function getContributors(): Promise<Contributor[]> {
  return CONTRIBUTORS;
}

export async function getContributorById(id: string): Promise<Contributor | undefined> {
  return CONTRIBUTORS.find((c) => c.id === id);
}
