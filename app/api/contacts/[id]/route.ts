import { getAuth } from "../../../../server/auth";
import { deleteContact, getContact, invalidContactDetailsMessage, updateContact } from "../../../../server/contacts";
import { hasOnlyKeys, readJsonBody } from "../../../../server/scheduling";

type RouteContext = { params: Promise<{ id: string }> };

const contactIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

async function getAuthorizedContactId(request: Request, context: RouteContext) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return { response: Response.json({ error: "Sign in to access contacts." }, { status: 401 }) };
  const { id } = await context.params;
  if (!contactIdPattern.test(id)) return { response: Response.json({ error: "Enter a valid contact ID." }, { status: 400 }) };
  return { hostId: session.user.id, contactId: id };
}

export async function GET(request: Request, context: RouteContext) {
  const authorized = await getAuthorizedContactId(request, context);
  if ("response" in authorized) return authorized.response;
  const contact = await getContact(authorized.hostId, authorized.contactId);
  if (!contact) return Response.json({ error: "Contact not found." }, { status: 404 });
  return Response.json(contact);
}

export async function PUT(request: Request, context: RouteContext) {
  const authorized = await getAuthorizedContactId(request, context);
  if ("response" in authorized) return authorized.response;

  const body = await readJsonBody(request);
  if (!body || !hasOnlyKeys(body, ["name", "email"])) {
    return Response.json({ error: invalidContactDetailsMessage }, { status: 400 });
  }
  try {
    const updated = await updateContact(authorized.hostId, authorized.contactId, body);
    if (!updated) return Response.json({ error: "Contact not found." }, { status: 404 });
    return Response.json(updated);
  } catch (error) {
    if (isUniqueViolation(error)) return Response.json({ error: "A contact with this email already exists." }, { status: 409 });
    return Response.json({ error: "Unable to update this contact." }, { status: 500 });
  }
}

export const PATCH = PUT;

export async function DELETE(request: Request, context: RouteContext) {
  const authorized = await getAuthorizedContactId(request, context);
  if ("response" in authorized) return authorized.response;
  const deleted = await deleteContact(authorized.hostId, authorized.contactId);
  if (!deleted) return Response.json({ error: "Contact not found." }, { status: 404 });
  return Response.json({ id: authorized.contactId });
}
