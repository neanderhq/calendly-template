import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { betterAuth } from "better-auth";
import { getDb } from "./db";
import { invalidEmailMessage, invalidNameMessage, invalidTimezoneMessage, normalizeEmail, normalizeUserName } from "./profile-validation";
import { isIanaTimezone } from "./timezone";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function createAuth() {
  const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3000";
  const trustedOrigins = process.env.BETTER_AUTH_URL
    ? [new URL(baseURL).origin]
    : ["http://localhost:3000", "http://127.0.0.1:3000"];

  return betterAuth({
    baseURL,
    trustedOrigins,
    secret: process.env.BETTER_AUTH_SECRET || (process.env.NODE_ENV !== "production" ? "local-only-daymark-fiddle-zephyr-secret-change-me" : required("BETTER_AUTH_SECRET")),
    database: drizzleAdapter(getDb(), { provider: "pg" }),
    emailAndPassword: { enabled: true, requireEmailVerification: false },
    user: {
      additionalFields: {
        timezone: { type: "string", required: true, defaultValue: "UTC", input: true },
        username: { type: "string", required: false, unique: true, input: false },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (context) => {
        const isSignUp = context.path === "/sign-up/email";
        const isUserUpdate = context.path === "/update-user";
        if (!isSignUp && !isUserUpdate) return;

        const body = context.body as Record<string, unknown>;
        if (isSignUp || Object.hasOwn(body, "name")) {
          const name = normalizeUserName(body.name);
          if (name === null) {
            throw new APIError("BAD_REQUEST", { message: invalidNameMessage });
          }
          body.name = name;
        }

        if (isSignUp) {
          const email = normalizeEmail(body.email);
          if (email === null) {
            throw new APIError("BAD_REQUEST", { message: invalidEmailMessage });
          }
          body.email = email;
        }

        if ((isSignUp || Object.hasOwn(body, "timezone")) && !isIanaTimezone(body.timezone)) {
          throw new APIError("BAD_REQUEST", { message: invalidTimezoneMessage });
        }
      }),
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

let auth: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  return (auth ??= createAuth());
}
