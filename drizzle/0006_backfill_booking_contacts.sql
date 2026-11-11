WITH ranked_bookings AS (
	SELECT
		"host_id",
		lower(btrim("invitee_email")) AS "email",
		"invitee_name" AS "name",
		row_number() OVER (
			PARTITION BY "host_id", lower(btrim("invitee_email"))
			ORDER BY "created_at" DESC, "id" DESC
		) AS "position"
	FROM "booking"
)
INSERT INTO "contact" ("id", "host_id", "name", "email")
SELECT gen_random_uuid()::text, "host_id", "name", "email"
FROM ranked_bookings
WHERE "position" = 1
ON CONFLICT ("host_id", "email") DO NOTHING;
