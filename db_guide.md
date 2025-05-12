# Klark0 Database Handling Guide for Developer Agents

This guide provides instructions for interacting with the Klark0 application's database. It covers the database setup, schema management, querying data, and handling data in server and client components, with a focus on Drizzle ORM and existing patterns.

## 1. Overview of Database Setup

Klark0 uses **Drizzle ORM** with a **PostgreSQL** database.

- **Connection Setup**: The database connection is configured in <mcfile name="drizzle.ts" path="lib/db/drizzle.ts"></mcfile>. It uses the `postgres` library to connect to the database specified by the `POSTGRES_URL` environment variable.
- **Environment Variable**: Ensure the `POSTGRES_URL` environment variable is correctly set in your `.env` file (based on `.env.example`).
- **Drizzle Client**: The `db` object exported from <mcfile name="drizzle.ts" path="lib/db/drizzle.ts"></mcfile> is the primary interface for database interactions.

```typescript
// lib/db/drizzle.ts (Simplified)
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error("POSTGRES_URL environment variable is not set");
}

export const client = postgres(process.env.POSTGRES_URL);
export const db = drizzle(client, { schema });
```

## 2. Schema Management

The database schema is defined in <mcfile name="schema.ts" path="lib/db/schema.ts"></mcfile>.

- **Table Definitions**: Tables are defined using `pgTable` from `drizzle-orm/pg-core`. Common column types include `serial` (for auto-incrementing IDs), `varchar`, `text`, `timestamp`, `integer`, and `jsonb` (for storing JSON data).
  Example: `users`, `teams`, `appSettings`.
- **Relations**: Relationships between tables (e.g., one-to-many, many-to-one) are defined using the `relations` function from `drizzle-orm` at the bottom of <mcfile name="schema.ts" path="lib/db/schema.ts"></mcfile>.
- **TypeScript Types**: For type safety, select (`$inferSelect`) and insert (`$inferInsert`) types are exported for each table (e.g., `export type User = typeof users.$inferSelect;`).

### Modifying the Schema (Adding/Updating Tables)

Follow these steps (as outlined in <mcfile name="README.md" path="README.md"></mcfile>):

1.  **Edit Schema File**: Open <mcfile name="schema.ts" path="lib/db/schema.ts"></mcfile> and define your new table or modify an existing one.
    ```typescript
    // Example: Adding a new table
    export const myNewTable = pgTable("my_new_table", {
      id: serial("id").primaryKey(),
      description: text("description"),
      teamId: integer("team_id").references(() => teams.id), // Foreign key example
      createdAt: timestamp("created_at").notNull().defaultNow(),
    });
    ```
2.  **Define Relations (Optional)**: If your new table has relationships, define them.
    ```typescript
    export const myNewTableRelations = relations(myNewTable, ({ one }) => ({
      team: one(teams, {
        fields: [myNewTable.teamId],
        references: [teams.id],
      }),
    }));
    ```
3.  **Export Types**: Add type exports for your new table.
    ```typescript
    export type MyNewTable = typeof myNewTable.$inferSelect;
    export type NewMyNewTable = typeof myNewTable.$inferInsert;
    ```
4.  **Generate Migration**: Run the following command in your terminal to generate migration files:
    ```bash
    pnpm db:generate
    ```
5.  **Apply Migration**: (This step might be part of your deployment process or a separate command like `pnpm db:migrate` if configured).

## 3. Database Queries

Database query functions are primarily located in <mcfile name="queries.ts" path="lib/db/queries.ts"></mcfile>. These functions encapsulate Drizzle ORM logic to interact with the database.

### Key Query Functions & Patterns:

- **`getUser()`**: Retrieves the currently authenticated user based on session cookies. This is fundamental for most user-specific operations.
- **`getTeamForUser()`**: Fetches the team associated with the current user, including team members and their details.
- **`getAppSetting(teamId: number, settingKey: string)`**: Retrieves a specific application setting for a given team. Settings are stored in the `appSettings` table as key-value pairs, where `value` is a `jsonb` type.
- **`updateAppSetting(teamId: number, settingKey: string, value: any)`**: Creates or updates (upserts) an application setting for a team. This is the primary mechanism for saving configurations like file system settings.
- **Specialized Setting Helpers**: Functions like `getInfoSettings`, `updateInfoSettings`, `getExternalWebsitesSettings`, `updateExternalWebsitesSettings` are wrappers around `getAppSetting` and `updateAppSetting` for specific `settingKey`s.
- **Other Queries**: Functions for fetching activity logs (`getActivityLogs`), team data by Stripe ID (`getTeamByStripeCustomerId`), etc.

### Drizzle ORM Usage:

Queries typically use Drizzle ORM's fluent API:

- `db.select().from(table)...`
- `db.insert(table).values(...).onConflictDoUpdate(...).returning()`
- `db.update(table).set(...).where(...)`
- Conditionals: `eq()`, `and()`, `isNull()`, `desc()` from `drizzle-orm`.

## 4. Data Handling in Server Components & Actions

Server Actions (defined with `"use server";`) and Route Handlers in Next.js are used to perform database operations on the server side.

- **Example: `updateFileSystemSettings` in <mcfile name="actions.ts" path="app/(dashboard)/dashboard/einstellungen/actions.ts"></mcfile>**

  - This action receives form data, validates it using Zod (<mcsymbol name="FileSystemSettingsSchema" filename="actions.ts" path="app/(dashboard)/dashboard/einstellungen/actions.ts" startline="5" type="class"></mcsymbol>).
  - **To persist settings**: It _should_ use <mcsymbol name="updateAppSetting" filename="queries.ts" path="lib/db/queries.ts" startline="133" type="function"></mcsymbol> from <mcfile name="queries.ts" path="lib/db/queries.ts"></mcfile>.
    - The `teamId` needs to be obtained, typically by first calling <mcsymbol name="getUser" filename="queries.ts" path="lib/db/queries.ts" startline="5" type="function"></mcsymbol> and then <mcsymbol name="getTeamForUser" filename="queries.ts" path="lib/db/queries.ts" startline="100" type="function"></mcsymbol> (or a similar function to get the team ID for the current user).
    - The `settingKey` would be a string like `"fileSystem"`.
    - The `value` would be the validated `settings` object.

  ```typescript
  // Inside updateFileSystemSettings in einstellungen/actions.ts (Conceptual)
  // ... validation ...
  // const user = await getUser(); // You'll need to import and call this
  // if (!user) { return { error: "User not authenticated" }; }
  // const teamData = await getTeamForUser(); // Or get teamId differently
  // if (!teamData) { return { error: "Team not found" }; }
  // const teamId = teamData.id;

  // await updateAppSetting(teamId, "fileSystem", settings);
  ```

- **Authentication**: Server-side operations that modify or access user/team-specific data must ensure the user is authenticated and authorized, typically by calling <mcsymbol name="getUser" filename="queries.ts" path="lib/db/queries.ts" startline="5" type="function"></mcsymbol> at the beginning of the action/handler.

## 5. Data Handling in Client Components

Client components (<mcfile name="page.tsx" path="app/(dashboard)/dashboard/einstellungen/page.tsx"></mcfile>, <mcfile name="page.tsx" path="app/(dashboard)/dashboard/konto/page.tsx"></mcfile>) primarily fetch data using SWR via API routes.

- **API Routes**: These routes (e.g., `/api/settings`, `/api/user`) are responsible for calling the query functions from <mcfile name="queries.ts" path="lib/db/queries.ts"></mcfile> and returning data.
  - For example, `/api/settings?key=fileSystem` would likely call <mcsymbol name="getUser" filename="queries.ts" path="lib/db/queries.ts" startline="5" type="function"></mcsymbol>, then <mcsymbol name="getTeamForUser" filename="queries.ts" path="lib/db/queries.ts" startline="100" type="function"></mcsymbol> to get `teamId`, and finally <mcsymbol name="getAppSetting" filename="queries.ts" path="lib/db/queries.ts" startline="123" type="function"></mcsymbol>(teamId, params.key).
- **SWR Usage**: Client components use `useSWR` to fetch and cache data from these API routes.
  ```typescript
  // app/(dashboard)/dashboard/einstellungen/page.tsx
  const { data: dbSettings, mutate } = useSWR<FileSystemSettings>(
    "/api/settings?key=fileSystem",
    fetcher
  );
  ```
- **Form Submissions**: Forms in client components often use `useActionState` to call Server Actions for data mutations (e.g., saving settings in <mcfile name="page.tsx" path="app/(dashboard)/dashboard/einstellungen/page.tsx"></mcfile> which calls an action that posts to `/api/settings`).

## 6. Key Pattern: `appSettings` Table

The <mcsymbol name="appSettings" filename="schema.ts" path="lib/db/schema.ts" startline="65" type="class"></mcsymbol> table is a crucial part of the settings management strategy. It acts as a flexible key-value store for team-specific configurations.

- **Structure**: `teamId`, `settingKey` (varchar), `value` (jsonb).
- **Usage**: Instead of creating new tables for every type of setting, many settings are stored here.
  - `settingKey`: A unique string identifying the setting (e.g., `"fileSystem"`, `"externalWebsites"`, `"info"`).
  - `value`: A JSON object containing the actual settings data.
- This pattern is used extensively in <mcfile name="page.tsx" path="app/(dashboard)/dashboard/einstellungen/page.tsx"></mcfile> for managing various types of settings.

## 7. Instructions for Developer Agent

### Adding New Settings (using `appSettings` pattern):

1.  **Define Data Structure**: If the settings are complex, consider defining a Zod schema for validation (similar to <mcsymbol name="FileSystemSettingsSchema" filename="actions.ts" path="app/(dashboard)/dashboard/einstellungen/actions.ts" startline="5" type="class"></mcsymbol>).
2.  **Choose `settingKey`**: Select a unique string for `settingKey` (e.g., `"myNewFeatureSettings"`).
3.  **Saving Settings**: In a Server Action or API route:
    a. Get the `teamId` for the current user (e.g., via <mcsymbol name="getUser" filename="queries.ts" path="lib/db/queries.ts" startline="5" type="function"></mcsymbol> and then <mcsymbol name="getTeamForUser" filename="queries.ts" path="lib/db/queries.ts" startline="100" type="function"></mcsymbol>).
    b. Call <mcsymbol name="updateAppSetting" filename="queries.ts" path="lib/db/queries.ts" startline="133" type="function"></mcsymbol>(teamId, "yourSettingKey", settingsObject).
4.  **Retrieving Settings**: In an API route (for SWR) or Server Action/Component:
    a. Get `teamId`.
    b. Call <mcsymbol name="getAppSetting" filename="queries.ts" path="lib/db/queries.ts" startline="123" type="function"></mcsymbol>(teamId, "yourSettingKey"). The result's `value` field will contain your settings object.
5.  **UI Integration**: Update client components to fetch/display these settings and forms to save them via Server Actions or API calls.

### Querying Existing Data (General):

1.  **Identify Table**: Check <mcfile name="schema.ts" path="lib/db/schema.ts"></mcfile> for the relevant table(s).
2.  **Check Existing Queries**: Look in <mcfile name="queries.ts" path="lib/db/queries.ts"></mcfile> for a function that already meets your needs.
3.  **Create New Query Function**: If necessary, add a new asynchronous function to <mcfile name="queries.ts" path="lib/db/queries.ts"></mcfile>.
    - Follow existing patterns: use Drizzle ORM, handle authentication/authorization if needed (e.g., by calling <mcsymbol name="getUser" filename="queries.ts" path="lib/db/queries.ts" startline="5" type="function"></mcsymbol>).
    - Export the function.

### Authentication Context:

- **Crucial**: Most database operations are tied to an authenticated user and their team.
- Always ensure that server-side logic (Server Actions, API Routes, query functions in <mcfile name="queries.ts" path="lib/db/queries.ts"></mcfile>) correctly retrieves and uses the authenticated user's context, typically starting with a call to <mcsymbol name="getUser" filename="queries.ts" path="lib/db/queries.ts" startline="5" type="function"></mcsymbol>.

By following these guidelines, you can effectively interact with and manage data within the Klark0 application's database.

## 8. Scenario: Integrating a New 'Webfield' and Associated Table

This scenario walks through adding a new feature that requires a new database table, for example, a 'Webfield' where users can store specific URLs related to their projects.

### 1. Define the New Table in Schema

First, you'll define the new table in <mcfile name="schema.ts" path="lib/db/schema.ts"></mcfile>.

```typescript
// In lib/db/schema.ts

// ... other table definitions

export const webfields = pgTable("webfields", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  projectId: integer("project_id").notNull(), // Assuming projects table exists or will be added
  fieldName: text("field_name").notNull(), // e.g., "Official Website", "Documentation Link"
  fieldValue: text("field_value").notNull(), // The URL or data for the webfield
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const webfieldsRelations = relations(webfields, ({ one }) => ({
  team: one(teams, {
    fields: [webfields.teamId],
    references: [teams.id],
  }),
  // Add relation to projects table if applicable
  // project: one(projects, {
  //   fields: [webfields.projectId],
  //   references: [projects.id],
  // }),
}));

export type Webfield = typeof webfields.$inferSelect;
export type NewWebfield = typeof webfields.$inferInsert;
```

**Explanation:**

- `teamId`: Links the webfield to a specific team.
- `projectId`: (Optional, adapt as needed) Links the webfield to a specific project within a team.
- `fieldName`: A descriptive name for the webfield.
- `fieldValue`: The actual data/URL for the webfield.

### 2. Generate and Apply Migrations

After defining the schema, generate and apply the database migration:

```bash
pnpm db:generate
# Ensure your migration tool (e.g., pnpm db:migrate or similar) is run to apply the changes
# pnpm db:migrate
```

### 3. Create Query Functions

Next, add functions to <mcfile name="queries.ts" path="lib/db/queries.ts"></mcfile> to interact with the new `webfields` table.

```typescript
// In lib/db/queries.ts
import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { webfields, NewWebfield, Webfield } from "./schema";
import { getUser } from "../auth"; // Assuming getUser authenticates and provides teamId

// Function to create a new webfield
export async function createWebfield(
  data: Omit<NewWebfield, "id" | "createdAt" | "updatedAt" | "teamId">
): Promise<Webfield | null> {
  const { user, teamId } = await getUser();
  if (!user || !teamId) {
    throw new Error("Authentication required.");
  }
  try {
    const [newWebfield] = await db
      .insert(webfields)
      .values({
        ...data,
        teamId,
      })
      .returning();
    return newWebfield;
  } catch (error) {
    console.error("Error creating webfield:", error);
    return null;
  }
}

// Function to get webfields for a specific project (and team)
export async function getWebfieldsByProject(
  projectId: number
): Promise<Webfield[]> {
  const { user, teamId } = await getUser();
  if (!user || !teamId) {
    throw new Error("Authentication required.");
  }
  try {
    return await db.query.webfields.findMany({
      where: and(
        eq(webfields.teamId, teamId),
        eq(webfields.projectId, projectId)
      ),
      orderBy: (webfields, { asc }) => [asc(webfields.createdAt)],
    });
  } catch (error) {
    console.error("Error fetching webfields by project:", error);
    return [];
  }
}

// Function to update a webfield
export async function updateWebfield(
  id: number,
  data: Partial<Omit<NewWebfield, "id" | "teamId" | "createdAt">>
): Promise<Webfield | null> {
  const { user, teamId } = await getUser();
  if (!user || !teamId) {
    throw new Error("Authentication required.");
  }
  try {
    const [updatedWebfield] = await db
      .update(webfields)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(webfields.id, id), eq(webfields.teamId, teamId)))
      .returning();
    return updatedWebfield;
  } catch (error) {
    console.error("Error updating webfield:", error);
    return null;
  }
}

// Function to delete a webfield
export async function deleteWebfield(
  id: number
): Promise<{ success: boolean }> {
  const { user, teamId } = await getUser();
  if (!user || !teamId) {
    throw new Error("Authentication required.");
  }
  try {
    await db
      .delete(webfields)
      .where(and(eq(webfields.id, id), eq(webfields.teamId, teamId)));
    return { success: true };
  } catch (error) {
    console.error("Error deleting webfield:", error);
    return { success: false };
  }
}
```

### 4. Create API Route or Server Action

To expose this functionality to the frontend, create an API route (e.g., `app/api/webfields/route.ts`) or Server Actions.

**Example API Route (`app/api/webfields/route.ts`):**

```typescript
// In app/api/webfields/route.ts (or a more specific path like app/api/projects/[projectId]/webfields/route.ts)
import { NextResponse } from "next/server";
import {
  createWebfield,
  getWebfieldsByProject,
  // updateWebfield, // Implement if needed for PUT
  // deleteWebfield  // Implement if needed for DELETE
} from "@/lib/db/queries";
import { getUser } from "@/lib/auth"; // Ensure auth is handled

// GET webfields for a project
export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  // This example assumes projectId is part of the URL, e.g., /api/projects/[projectId]/webfields
  // Adjust based on your actual routing structure.
  // If projectId is not in params, you might get it from searchParams or request body for other types of requests.
  const { user, teamId } = await getUser();
  if (!user || !teamId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Example: If projectId is a query parameter like /api/webfields?projectId=123
  const { searchParams } = new URL(request.url);
  const projectIdStr = searchParams.get("projectId");

  if (!projectIdStr) {
    return NextResponse.json(
      { error: "Project ID is required" },
      { status: 400 }
    );
  }
  const projectId = parseInt(projectIdStr, 10);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid Project ID" }, { status: 400 });
  }

  try {
    const webfieldsData = await getWebfieldsByProject(projectId);
    return NextResponse.json(webfieldsData);
  } catch (error) {
    console.error("API Error fetching webfields:", error);
    return NextResponse.json(
      { error: "Failed to fetch webfields" },
      { status: 500 }
    );
  }
}

// POST to create a new webfield
export async function POST(request: Request) {
  const { user, teamId } = await getUser();
  if (!user || !teamId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    // Validate body: ensure projectId, fieldName, fieldValue are present
    const { projectId, fieldName, fieldValue } = body;
    if (projectId === undefined || !fieldName || !fieldValue) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const newWebfield = await createWebfield({
      projectId,
      fieldName,
      fieldValue,
    });
    if (!newWebfield) {
      return NextResponse.json(
        { error: "Failed to create webfield" },
        { status: 500 }
      );
    }
    return NextResponse.json(newWebfield, { status: 201 });
  } catch (error) {
    console.error("API Error creating webfield:", error);
    return NextResponse.json(
      { error: "Failed to create webfield" },
      { status: 500 }
    );
  }
}

// Implement PUT and DELETE handlers similarly, using updateWebfield and deleteWebfield query functions.
```

**Using Server Actions (Alternative):**

Define Server Actions directly in your React components or in separate files (e.g., `app/actions/webfieldActions.ts`).

```typescript
// Example: app/actions/webfieldActions.ts
"use server";

import {
  createWebfield as dbCreateWebfield,
  getWebfieldsByProject as dbGetWebfieldsByProject,
  updateWebfield as dbUpdateWebfield,
  deleteWebfield as dbDeleteWebfield,
} from "@/lib/db/queries";
import { NewWebfield, Webfield } from "@/lib/db/schema";
import { revalidatePath } from "next/cache";

export async function createWebfieldAction(
  data: Omit<NewWebfield, "id" | "createdAt" | "updatedAt" | "teamId">
): Promise<Webfield | { error: string }> {
  try {
    const newWebfield = await dbCreateWebfield(data);
    if (!newWebfield) return { error: "Failed to create webfield" };
    revalidatePath(`/projects/${data.projectId}`); // Example path to revalidate
    return newWebfield;
  } catch (e: any) {
    return { error: e.message || "An unknown error occurred" };
  }
}

export async function getWebfieldsByProjectAction(
  projectId: number
): Promise<Webfield[] | { error: string }> {
  try {
    return await dbGetWebfieldsByProject(projectId);
  } catch (e: any) {
    return { error: e.message || "An unknown error occurred" };
  }
}

// ... implement updateWebfieldAction and deleteWebfieldAction similarly
```

### 5. Frontend Integration

Finally, integrate this into your frontend components. This involves:

- Fetching data (e.g., using SWR with the API route, or calling Server Actions).
- Displaying the webfields.
- Providing forms/UI elements to create, update, or delete webfields, which would call the API or Server Actions.

**Example (Conceptual - using SWR and API route):**

```tsx
// In a React component, e.g., components/WebfieldsDisplay.tsx
"use client";

import useSWR from "swr";
import { useState } from "react";

interface WebfieldData {
  id: number;
  fieldName: string;
  fieldValue: string;
  // ... other fields
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function WebfieldsDisplay({ projectId }: { projectId: number }) {
  const {
    data: webfields,
    error,
    mutate,
  } = useSWR<WebfieldData[]>(`/api/webfields?projectId=${projectId}`, fetcher);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");

  const handleAddWebfield = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/webfields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          fieldName: newFieldName,
          fieldValue: newFieldValue,
        }),
      });
      if (!res.ok) throw new Error("Failed to add webfield");
      setNewFieldName("");
      setNewFieldValue("");
      mutate(); // Revalidate SWR cache
    } catch (err) {
      console.error(err);
      // Handle error display
    }
  };

  if (error) return <div>Failed to load webfields.</div>;
  if (!webfields) return <div>Loading...</div>;

  return (
    <div>
      <h3>Webfields for Project {projectId}</h3>
      <ul>
        {webfields.map((field) => (
          <li key={field.id}>
            <strong>{field.fieldName}:</strong>{" "}
            <a
              href={field.fieldValue}
              target="_blank"
              rel="noopener noreferrer">
              {field.fieldValue}
            </a>
            {/* Add edit/delete buttons here */}
          </li>
        ))}
      </ul>
      <form onSubmit={handleAddWebfield}>
        <h4>Add New Webfield</h4>
        <input
          type="text"
          placeholder="Field Name (e.g., GitHub Repo)"
          value={newFieldName}
          onChange={(e) => setNewFieldName(e.target.value)}
          required
        />
        <input
          type="url"
          placeholder="Field Value (URL)"
          value={newFieldValue}
          onChange={(e) => setNewFieldValue(e.target.value)}
          required
        />
        <button type="submit">Add Webfield</button>
      </form>
    </div>
  );
}
```

This comprehensive example covers the full lifecycle of adding a new data entity ('webfield') that is linked to existing structures (teams, potentially projects) and making it accessible and manageable through the application.
