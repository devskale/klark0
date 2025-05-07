import { NextRequest, NextResponse } from 'next/server';
import { getTeamForUser, getAppSetting, updateAppSetting } from '@/lib/db/queries';
import { FileSystemSettings } from '@/app/(dashboard)/dashboard/einstellungen/page'; // Assuming types are exported or can be defined here

// Define FileSystemSettings type locally if not easily importable or to avoid client components in server code
// For this example, we assume it can be imported or is defined in a shared types file.
// If FileSystemSettings is in a "use client" file, you'd redefine it here or move it to a shared types file.

export async function GET(request: NextRequest) {
  try {
    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json({ error: 'Team not found or user not authenticated' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const settingKey = searchParams.get('key');

    if (!settingKey) {
      return NextResponse.json({ error: 'Setting key is required' }, { status: 400 });
    }

    const setting = await getAppSetting(team.id, settingKey);

    if (!setting) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
    }

    return NextResponse.json(setting.value);
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    if (error.code === '42P01') { // PostgreSQL error code for undefined_table
      return NextResponse.json({ error: 'Database schema error: A required table is missing. Please ensure migrations are up to date.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json({ error: 'Team not found or user not authenticated' }, { status: 404 });
    }

    const body = await request.json();
    const { settingKey, value } = body;

    if (!settingKey || value === undefined) {
      return NextResponse.json({ error: 'Setting key and value are required' }, { status: 400 });
    }

    // Optional: Add validation for the 'value' structure based on 'settingKey'
    // For example, if settingKey is 'fileSystem', validate 'value' against FileSystemSettings structure

    const updatedSetting = await updateAppSetting(team.id, settingKey, value);

    return NextResponse.json(updatedSetting);
  } catch (error: any) {
    console.error('Error updating settings:', error);
    if (error.code === '42P01') { // PostgreSQL error code for undefined_table
      return NextResponse.json({ error: 'Database schema error: A required table is missing. Please ensure migrations are up to date.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
