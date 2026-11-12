import "server-only";

import { auth } from "@repo/auth";
import { headers } from "next/headers";
import { cache } from "react";

/** The Better Auth session for this request, read once per render. */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));
