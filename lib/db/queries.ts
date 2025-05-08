import { desc, and, eq, isNull } from 'drizzle-orm';
import { db } from './drizzle';
import { activityLogs, teamMembers, teams, users, appSettings } from './schema';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/session';

export async function getUser() {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  const sessionData = await verifyToken(sessionCookie.value);
  if (
    !sessionData ||
    !sessionData.user ||
    typeof sessionData.user.id !== 'number'
  ) {
    return null;
  }

  if (new Date(sessionData.expires) < new Date()) {
    return null;
  }

  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
    .limit(1);

  if (user.length === 0) {
    return null;
  }

  return user[0];
}

export async function getTeamByStripeCustomerId(customerId: string) {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.stripeCustomerId, customerId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateTeamSubscription(
  teamId: number,
  subscriptionData: {
    stripeSubscriptionId: string | null;
    stripeProductId: string | null;
    planName: string | null;
    subscriptionStatus: string;
  }
) {
  await db
    .update(teams)
    .set({
      ...subscriptionData,
      updatedAt: new Date()
    })
    .where(eq(teams.id, teamId));
}

export async function getUserWithTeam(userId: number) {
  const result = await db
    .select({
      user: users,
      teamId: teamMembers.teamId
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .where(eq(users.id, userId))
    .limit(1);

  return result[0];
}

export async function getActivityLogs() {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(10);
}

export async function getTeamForUser() {
  const user = await getUser();
  if (!user) {
    return null;
  }

  const result = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    with: {
      team: {
        with: {
          teamMembers: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      }
    }
  });

  return result?.team || null;
}

// Function to get a specific app setting for a team
export async function getAppSetting(teamId: number, settingKey: string) {
  const result = await db
    .select()
    .from(appSettings)
    .where(and(eq(appSettings.teamId, teamId), eq(appSettings.settingKey, settingKey)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

// Function to update (or insert if not exists) a specific app setting for a team
export async function updateAppSetting(teamId: number, settingKey: string, value: any) {
  return await db
    .insert(appSettings)
    .values({
      teamId,
      settingKey,
      value,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [appSettings.teamId, appSettings.settingKey],
      set: {
        value,
        updatedAt: new Date(),
      },
    })
    .returning();
}

// Function to get info settings for a team
export async function getInfoSettings(teamId: number) {
  return await getAppSetting(teamId, "info");
}

// Function to update info settings for a team
export async function updateInfoSettings(teamId: number, value: any) {
  return await updateAppSetting(teamId, "info", value);
}

// Function to get external websites settings for a team
export async function getExternalWebsitesSettings(teamId: number) {
  return await getAppSetting(teamId, "externalWebsites");
}

// Function to update external websites settings for a team
export async function updateExternalWebsitesSettings(
  teamId: number,
  value: any
) {
  return await updateAppSetting(teamId, "externalWebsites", value);
}
