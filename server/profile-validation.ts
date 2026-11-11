export const invalidNameMessage = "Name must be between 1 and 80 characters.";
export const invalidEmailMessage = "Enter a valid email address.";
export const reservedUsernameMessage = "That username is reserved for app pages. Choose another.";
export const invalidTimezoneMessage = "Enter a valid IANA timezone.";
export const invalidSlugMessage = "Use 1–64 lowercase letters, numbers, or hyphens. Start and end with a letter or number.";

const reservedUsernames = new Set(["api", "booking", "booking-links", "dashboard", "link", "login", "polls", "settings", "signup"]);

export function normalizeUserName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name.length >= 1 && name.length <= 80 ? name : null;
}

export function isReservedUsername(value: string): boolean {
  return reservedUsernames.has(value);
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/.test(email) && email.length >= 1 && email.length <= 254 ? email : null;
}

export function normalizeSlug(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const slug = value.trim();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 64 ? slug : null;
}
