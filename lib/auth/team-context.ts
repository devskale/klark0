import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/drizzle";
import { teamMembers, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type RequestWithTeam = NextRequest & {
  teamId?: number;
  userId?: number;
};

/**
 * Get team ID from session for API routes
 * Returns the user's current team ID from their session
 */
export async function getTeamIdFromRequest(
  request: NextRequest
): Promise<number | null> {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return null;
    }

    // Get user's team membership (assuming user belongs to one active team)
    const membership = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, session.user.id))
      .limit(1);

    return membership.length > 0 ? membership[0].teamId : null;
  } catch (error) {
    console.error("Failed to get team ID from request:", error);
    return null;
  }
}

/**
 * Middleware wrapper to add team context to API routes
 */
export function withTeamContext(
  handler: (request: RequestWithTeam, context?: any) => Promise<Response>
) {
  return async (request: NextRequest, context?: any) => {
    const teamId = await getTeamIdFromRequest(request);
    const userId = (await getSession())?.user?.id;

    (request as RequestWithTeam).teamId = teamId || undefined;
    (request as RequestWithTeam).userId = userId;

    return handler(request as RequestWithTeam, context);
  };
}
