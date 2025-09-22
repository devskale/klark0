# Project Info System Documentation

## Overview

The Project Info system in kontext.one manages tender project metadata through a comprehensive data flow that includes reading from JSON files, AI-powered generation, and writing back to storage. This document provides detailed technical information about these processes.

## System Architecture

**Main Component**: `app/(dashboard)/dashboard/ainfo/info.tsx`
**Storage**: WebDAV-based filesystem with sidecar JSON files
**Caching**: SWR for efficient data fetching and cache management
**AI Integration**: Streaming responses with robust JSON extraction

## Data Flow Processes

### 1. Reading from JSON 📖

**File Location**: `projekt.meta.json` (sidecar metadata file)
**API Endpoint**: `GET /api/fs/metadata`

#### Process Flow:
1. Component constructs metadata path: `projectDir + "projekt.meta.json"`
2. Uses SWR to fetch metadata via `GET /api/fs/metadata?path={metadataPath}`
3. API makes WebDAV GET request to retrieve the JSON file
4. If file exists, returns JSON content; if not found (404), returns `null`
5. React useEffect populates all form fields when `projectMeta` data loads

#### Data Structure:
```typescript
{
  vergabestelle: string,
  adresse: string,
  projektName: string,
  startDatum: string,
  bieterabgabe: string,
  projektStart: string,
  endDatum: string,
  beschreibung: string,
  referenznummer: string,
  schlagworte: string,
  sprache: string,
  dokumentdatum: string,
  selectedParser: string,
  metadaten: string[] // converted to comma-separated string
}
```

#### Implementation Details:
- **SWR Configuration**: `{ revalidateOnFocus: false }` to prevent unnecessary refetches
- **Error Handling**: Graceful handling of missing files (returns null)
- **Type Safety**: Null checks before populating form fields
- **Cache Management**: Automatic cache updates via SWR

### 2. AI Generation 🤖

**Trigger**: "Init" button (`handleInit` function)
**AI Query**: Uses `AI_QUERIES.A_INFO` from `app/api/ai/config.ts`

#### Process Flow:

##### 1. Context Preparation:
- Finds AAB PDF files in the `A/` directory
- Constructs path to parser markdown file based on selected parser:
  - **Marker**: `A/md/{baseName}/{baseName}.marker.md`
  - **MD**: `A/md/{baseName}.md`
  - **Other**: `A/md/{baseName}.{parser}.md`
- Loads parsed markdown content via `POST /api/fs/read`

##### 2. AI Processing:
- Sends markdown content to `POST /api/ai/gem/stream` with `queryType: "A_INFO"`
- AI analyzes document using A_INFO prompt (max 200,000 characters)
- Streams back JSON response with extracted metadata

##### 3. Response Parsing:
- Cleans markdown code fences from AI response
- Extracts JSON between first `{` and last `}`
- Parses JSON and populates form fields

#### Expected AI JSON Output:
```typescript
{
  "Vergabestelle": string,
  "Addresse": string,
  "Projekttitel": string,
  "Ausschreibungsstart": string,
  "Ausschreibungsende": string,
  "Projektstart": string,
  "Projektende": string,
  "Projekt Kurzbeschreibung": string,
  "Referenznummer": string,
  "Dokumentdatum": string,
  "Sprache": string,
  "Schlagworte": string[]
}
```

#### AI Prompt (A_INFO):
The AI uses a specialized prompt that:
- Analyzes "Allgemeinen Ausschreibungsunterlagen" documents
- Extracts specific metadata fields relevant to tender projects
- Returns structured JSON without additional formatting
- Handles missing information gracefully (returns "NONE" or empty arrays)

#### Error Handling:
- Validates required inputs (project, AAB file, parser)
- Comprehensive error messages for missing files
- Robust JSON parsing with fallback extraction
- Debug information stored for troubleshooting

### 3. Writing to JSON 💾

**Trigger**: "Speichern" button (`handleSaveMeta` function)
**API Endpoint**: `POST /api/fs/metadata`

#### Process Flow:

##### 1. Data Preparation:
- Collects all form field values into `metaObj`
- Converts empty strings to `null` for clean storage
- Splits comma-separated `metadataList` into array
- Trims and filters empty values

##### 2. API Call:
- Sends `POST /api/fs/metadata` with `{path, metadata}`
- API performs WebDAV PUT request with `JSON.stringify(metadata, null, 2)`
- Returns success response with saved metadata

##### 3. Cache Update:
- Updates SWR cache with new metadata using `mutateMeta(() => json.metadata, false)`
- No revalidation needed since we have fresh data
- Immediate UI update without server round-trip

#### Saved JSON Structure:
```typescript
{
  vergabestelle: string | null,
  adresse: string | null,
  projektName: string | null,
  startDatum: string | null,
  bieterabgabe: string | null,
  projektStart: string | null,
  endDatum: string | null,
  beschreibung: string | null,
  referenznummer: string | null,
  schlagworte: string | null,
  sprache: string | null,
  dokumentdatum: string | null,
  selectedParser: string | null,
  metadaten: string[] // array of trimmed, non-empty strings
}
```

## API Endpoints

### `/api/fs/metadata` (GET)
- **Purpose**: Retrieve project metadata JSON file
- **Authentication**: Team context required
- **Parameters**: `path` (query parameter)
- **Response**: JSON metadata or `null` if not found
- **Implementation**: Direct WebDAV GET request

### `/api/fs/metadata` (POST)
- **Purpose**: Save project metadata to JSON file
- **Authentication**: Team context required
- **Body**: `{path: string, metadata: object}`
- **Response**: `{success: true, metadata: object}`
- **Implementation**: WebDAV PUT with formatted JSON

### `/api/fs/read` (POST)
- **Purpose**: Read parser markdown files for AI context
- **Body**: `{path: string}`
- **Response**: `{content: string}`
- **Usage**: Loading parsed document content for AI analysis

### `/api/ai/gem/stream` (POST)
- **Purpose**: AI-powered metadata extraction
- **Body**: `{queryType: "A_INFO", context: string, maxContextLength: number}`
- **Response**: Streaming JSON with extracted metadata
- **Implementation**: Gemini AI with structured prompts

## Technical Implementation Details

### State Management
- **React State**: Individual useState hooks for each form field
- **SWR Cache**: Automatic cache management with manual mutation
- **Loading States**: Separate loading indicators for save and AI operations
- **Error States**: Comprehensive error handling with user feedback

### File System Integration
- **WebDAV Protocol**: All file operations use WebDAV for remote storage
- **Sidecar Files**: Metadata stored as `.meta.json` files alongside projects
- **Path Construction**: Dynamic path building based on project structure
- **Parser Detection**: Automatic detection of available parsers per document

### AI Integration
- **Streaming Responses**: Real-time processing of AI-generated content
- **Context Limits**: 200,000 character limit for document analysis
- **JSON Extraction**: Robust parsing with multiple fallback strategies
- **Error Recovery**: Graceful handling of malformed AI responses

### User Interface
- **Editable Fields**: Custom EditableText components for inline editing
- **Parser Selection**: Dynamic dropdown based on detected parsers
- **Progress Indicators**: Loading states for all async operations
- **Debug Information**: Collapsible dev info section for troubleshooting

## Development Guidelines

### Error Handling Best Practices
1. Always validate required inputs before processing
2. Provide meaningful error messages to users
3. Log detailed errors for debugging
4. Implement graceful fallbacks for missing data

### Performance Considerations
1. Use SWR for efficient data fetching and caching
2. Implement proper loading states for user feedback
3. Avoid unnecessary re-renders with proper dependency arrays
4. Optimize AI context length to balance accuracy and performance

### Type Safety
1. Define proper TypeScript interfaces for all data structures
2. Use null checks before accessing nested properties
3. Implement proper error boundaries for component isolation
4. Validate API responses before processing

### Testing Strategies
1. Test all three data flow processes independently
2. Mock AI responses for consistent testing
3. Validate JSON parsing edge cases
4. Test error scenarios and recovery mechanisms

## Troubleshooting

### Common Issues

#### AI Generation Fails
- **Cause**: Missing or invalid parser markdown files
- **Solution**: Verify parser files exist and contain valid content
- **Debug**: Check `aiContextPath` in dev info section

#### Save Operation Fails
- **Cause**: WebDAV connection issues or permission problems
- **Solution**: Verify filesystem settings and credentials
- **Debug**: Check network tab for API response details

#### Data Not Loading
- **Cause**: Missing metadata file or SWR cache issues
- **Solution**: Use refresh button to force cache revalidation
- **Debug**: Check if `projekt.meta.json` exists in project directory

### Debug Information
The component includes a collapsible "Dev Info" section that displays:
- Project paths and directory structure
- Parser detection results
- AI context and prompts
- Raw AI responses
- SWR cache status

This information is invaluable for troubleshooting issues and understanding the system's current state.

## Future Enhancements

### Planned Improvements
1. **Validation**: Add form validation for date formats and required fields
2. **Versioning**: Implement metadata versioning for change tracking
3. **Batch Operations**: Support for bulk metadata updates across projects
4. **Templates**: Predefined metadata templates for common project types
5. **Export/Import**: JSON export/import functionality for metadata backup

### Performance Optimizations
1. **Caching**: Implement more aggressive caching strategies
2. **Compression**: Compress large AI context before transmission
3. **Pagination**: Handle large document sets more efficiently
4. **Background Processing**: Move AI operations to background workers

This documentation provides a comprehensive understanding of the project info system's architecture and implementation details, enabling effective development and maintenance of this critical component.