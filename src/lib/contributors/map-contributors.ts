import type { Contributor } from "@/lib/data/contributors";

type ProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

type ContributorRow = {
  id: string;
  contributions: number;
  accuracy: number;
  verified: boolean;
  institution: string;
  tier: Contributor["tier"];
};

export function contributorAvatarUrl(userId: string, avatarUrl: string | null | undefined): string {
  if (avatarUrl?.trim()) return avatarUrl.trim();
  return `https://i.pravatar.cc/240?u=${encodeURIComponent(userId)}`;
}

export function mapContributorRows(
  rows: ContributorRow[],
  profiles: ProfileRow[]
): Contributor[] {
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  return rows.map((r) => {
    const profile = profileById.get(r.id);
    const name =
      profile?.display_name?.trim() ||
      profile?.email?.split("@")[0] ||
      "Contributor";

    return {
      id: r.id,
      name,
      contributions: r.contributions,
      accuracy: Number(r.accuracy),
      verified: r.verified,
      inst: r.institution,
      tier: r.tier,
      avatarUrl: contributorAvatarUrl(r.id, profile?.avatar_url),
    };
  });
}
