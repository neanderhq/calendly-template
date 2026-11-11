import { getAuth } from "../../../server/auth";
import { createContact, invalidContactDetailsMessage, listContacts } from "../../../server/contacts";
import { hasOnlyKeys, readJsonBody } from "../../../server/scheduling";

const maxSearchLength = 100;

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export async function GET(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to view contacts." }, { status: 401 });

  const url = new URL(request.url);
  const searchParams = url.searchParams;
  if ([...searchParams.keys()].some((key) => key !== "search") || searchParams.getAll("search").length > 1) {
    return Response.json({ error: "Enter a valid contact search." }, { status: 400 });
  }
  const rawSearch = searchParams.get("search");
  if (rawSearch !== null && rawSearch.length > maxSearchLength) {
    return Response.json({ error: "Contact search must be 100 characters or fewer." }, { status: 400 });
  }

  const contacts = await listContacts(session.user.id, rawSearch?.trim());
  return Response.json({ contacts });
}

export async function POST(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Sign in to add contacts." }, { status: 401 });

  const body = await readJsonBody(request);
  if (!body || !hasOnlyKeys(body, ["name", "email"])) {
    return Response.json({ error: invalidContactDetailsMessage }, { status: 400 });
  }
  try {
    const result = await createContact(session.user.id, body);
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    return Response.json(result.value, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) return Response.json({ error: "A contact with this email already exists." }, { status: 409 });
    return Response.json({ error: "Unable to add this contact." }, { status: 500 });
  }
}
