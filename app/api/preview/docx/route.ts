import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import path from 'path';
import { withTeamContext, RequestWithTeam } from '@/lib/auth/team-context';
import { getFileSystemSettings } from '@/lib/db/settings';

/**
 * API route to convert DOCX files to HTML
 * Accepts POST requests with filePath in the body
 * Returns sanitized HTML content
 */
async function handleDocxPreview(request: RequestWithTeam) {
  if (!request.teamId) {
    return NextResponse.json(
      { error: 'Team context required.' },
      { status: 401 }
    );
  }
  try {
    const { filePath } = await request.json();
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    // Validate file extension
    const ext = path.extname(filePath).toLowerCase();
    if (ext !== '.docx' && ext !== '.doc') {
      return NextResponse.json(
        { error: 'Invalid file type. Only .docx and .doc files are supported.' },
        { status: 400 }
      );
    }

    // Security: Prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.includes('..')) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
      );
    }

    // Get filesystem configuration from database
    const fsSettings = await getFileSystemSettings(request.teamId);

    if (fsSettings.type !== 'webdav') {
      return NextResponse.json({ error: 'Unsupported FS' }, { status: 400 });
    }

    if (!fsSettings.host || !fsSettings.username || !fsSettings.password) {
      return NextResponse.json(
        { error: 'Incomplete WebDAV configuration' },
        { status: 400 }
      );
    }

    // Construct the file URL
    const fileUrl = new URL(
      filePath,
      fsSettings.host.endsWith('/') ? fsSettings.host : fsSettings.host + '/'
    ).toString();

    // Fetch the file content directly from WebDAV
    const fileResponse = await fetch(fileUrl, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${fsSettings.username}:${fsSettings.password}`
        ).toString('base64')}`,
      },
    });
    
    if (!fileResponse.ok) {
      return NextResponse.json(
        { error: 'File not found or could not be read' },
        { status: 404 }
      );
    }

    // Get file as buffer for mammoth
    const fileBuffer = await fileResponse.arrayBuffer();
    
    // Convert DOCX to HTML using buffer
    const result = await mammoth.convertToHtml({ buffer: Buffer.from(fileBuffer) });
    
    // Create a DOM environment for DOMPurify (server-side)
    const window = new JSDOM('').window;
    const purify = DOMPurify(window);
    
    // Sanitize the HTML to prevent XSS
    const sanitizedHtml = purify.sanitize(result.value);
    
    // Return the sanitized HTML and any conversion messages
    return NextResponse.json({
      html: sanitizedHtml,
      messages: result.messages,
      success: true
    });
    
  } catch (error) {
    console.error('Error processing DOCX file:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process DOCX file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Export the wrapped handlers
 */
export const POST = withTeamContext(handleDocxPreview);

/**
 * Handle GET requests - return method not allowed
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to convert DOCX files.' },
    { status: 405 }
  );
}