import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import path from 'path';
import { withTeamContext, RequestWithTeam } from '@/lib/auth/team-context';
import { getFileSystemSettings } from '@/lib/db/settings';

/**
 * API route to convert XLSX files to HTML
 * Accepts POST requests with filePath in the body
 * Returns sanitized HTML content with all sheets
 */
async function handleXlsxPreview(request: RequestWithTeam) {
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
    if (ext !== '.xlsx' && ext !== '.xls') {
      return NextResponse.json(
        { error: 'Invalid file type. Only .xlsx and .xls files are supported.' },
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

    // Get file as buffer for XLSX
    const fileBuffer = await fileResponse.arrayBuffer();
    
    // Read the Excel file from buffer
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    
    // Convert each sheet to HTML
    let combinedHtml = '';
    const sheetNames = workbook.SheetNames;
    
    sheetNames.forEach((sheetName, index) => {
      const worksheet = workbook.Sheets[sheetName];
      
      // Add sheet header if there are multiple sheets
      if (sheetNames.length > 1) {
        combinedHtml += `<div class="sheet-header">`;
        combinedHtml += `<h3 class="sheet-title">Arbeitsblatt: ${sheetName}</h3>`;
        combinedHtml += `</div>`;
      }
      
      // Convert worksheet to HTML table
      const htmlTable = XLSX.utils.sheet_to_html(worksheet, {
        id: `sheet-${index}`,
        editable: false
      });
      
      // Add the table with custom styling
      combinedHtml += `<div class="sheet-content">${htmlTable}</div>`;
      
      // Add separator between sheets (except for the last one)
      if (index < sheetNames.length - 1) {
        combinedHtml += '<hr class="sheet-separator" />';
      }
    });
    
    // Add CSS styling for better presentation
    const styledHtml = `
      <style>
        .sheet-header {
          margin: 20px 0 10px 0;
          padding: 10px;
          background-color: #f5f5f5;
          border-left: 4px solid #007acc;
        }
        .sheet-title {
          margin: 0;
          color: #333;
          font-family: Arial, sans-serif;
          font-size: 18px;
          font-weight: bold;
        }
        .sheet-content {
          margin-bottom: 20px;
          overflow-x: auto;
        }
        .sheet-content table {
          border-collapse: collapse;
          width: 100%;
          font-family: Arial, sans-serif;
          font-size: 14px;
        }
        .sheet-content td, .sheet-content th {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        .sheet-content th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        .sheet-content tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .sheet-content tr:hover {
          background-color: #f5f5f5;
        }
        .sheet-separator {
          border: none;
          border-top: 2px solid #eee;
          margin: 30px 0;
        }
      </style>
      <div class="excel-preview">
        ${combinedHtml}
      </div>
    `;
    
    // Create a DOM environment for DOMPurify (server-side)
    const window = new JSDOM('').window;
    const purify = DOMPurify(window);
    
    // Sanitize the HTML to prevent XSS
    const sanitizedHtml = purify.sanitize(styledHtml);
    
    // Return the sanitized HTML and sheet information
    return NextResponse.json({
      html: sanitizedHtml,
      sheetNames: sheetNames,
      sheetCount: sheetNames.length,
      success: true
    });
    
  } catch (error) {
    console.error('Error processing XLSX file:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process XLSX file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Export the wrapped handlers
 */
export const POST = withTeamContext(handleXlsxPreview);

/**
 * Handle GET requests - return method not allowed
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to convert XLSX files.' },
    { status: 405 }
  );
}