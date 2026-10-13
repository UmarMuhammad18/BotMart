/** Agents created without a login (seed data, demo users) belong to everyone. */
export function isDemoOwner(ownerId: string | null | undefined) {
  return !ownerId || ownerId === "hackathon-user";
}
