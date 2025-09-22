# Project Info System Documentation

## Overview

The Project Info system in kontext.one manages tender project metadata through a comprehensive data flow that includes reading from JSON files, AI-powered generation, and writing back to storage. This document provides detailed technical information about these processes.

## System Architecture

### Project Info System
**Main Component**: `app/(dashboard)/dashboard/ainfo/info.tsx`
**Storage**: WebDAV-based filesystem with sidecar JSON files
**Caching**: SWR for efficient data fetching and cache management
**AI Integration**: Streaming responses with robust JSON extraction

### Kriterien-Extraktion System
**Main Component**: `app/(dashboard)/dashboard/ainfo/kriterien.tsx`
**Storage**: WebDAV-based filesystem with `kriterien.meta.json` sidecar files
**Persistence Layer**: `lib/kriterien/persistence.ts`
**Type Definitions**: `types/kriterien.ts`
**AI Integration**: Configurable AI queries for criteria extraction

## Data Flow Processes

### 1. Reading from JSON 📖

**File Location**: `projekt.json` (main project metadata file)
**API Endpoint**: `GET /api/fs/metadata`

#### Process Flow:
1. Component constructs metadata path: `projectDir + "projekt.json"`
2. Uses SWR to fetch metadata via `GET /api/fs/metadata?path={metadataPath}`
3. API reads `projekt.json` file via WebDAV GET request
4. API extracts metadata from nested `meta.meta` structure and flattens it for UI
5. If file exists, returns flattened JSON content; if not found (404), returns `null`
6. React useEffect populates all form fields when `projectMeta` data loads

#### Data Structure (UI Format):
```typescript
{
  auftraggeber: string,
  aktenzeichen: string,
  ausschreibungsgegenstand: string,
  datum: string,
  lose: string[], // Array of "Los X: Bezeichnung" strings (converted from object array)
  selectedParser: string
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
  "Auftraggeber": string,
  "Aktenzeichen": string,
  "Ausschreibungsgegenstand": string,
  "Datum": string,
  "Lose": [
    {
      "nummer": string,
      "bezeichnung": string
    }
  ]
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
- Handles `lose` field as string array (UI format)

##### 2. API Call:
- Sends `POST /api/fs/metadata` with `{path, metadata}`
- API merges with existing `projekt.json` data
- Preserves existing object structure for `lose` field if it exists
- Performs WebDAV PUT request to save complete project data

##### 3. Cache Update:
- Updates SWR cache with new metadata using `mutateMeta(() => json.metadata, false)`
- No revalidation needed since we have fresh data
- Immediate UI update without server round-trip

#### Saved JSON Structure (in projekt.json):
```typescript
{
  meta: {
    meta: {
      auftraggeber: string | null,
      aktenzeichen: string | null,
      ausschreibungsgegenstand: string | null,
      datum: string | null,
      lose: Array<{nummer: string, bezeichnung: string}>, // Preserved as object array
      selectedParser: string | null
    }
  },
  bdoks: any[], // Preserved from existing data
  ids: any[]    // Preserved from existing data
}
```

## API Endpoints

### `/api/fs/metadata` (GET)
- **Purpose**: Retrieve and flatten project metadata from `projekt.json`
- **Authentication**: Team context required
- **Parameters**: `path` (query parameter)
- **Response**: Flattened JSON metadata or `null` if not found
- **Implementation**: Reads `projekt.json`, extracts `meta.meta` structure, converts `lose` objects to UI strings

### `/api/fs/metadata` (POST)
- **Purpose**: Save project metadata to `projekt.json` while preserving structure
- **Authentication**: Team context required
- **Body**: `{path: string, metadata: object}`
- **Response**: `{success: true, metadata: object}`
- **Implementation**: Merges with existing data, preserves `lose` object structure, saves via WebDAV PUT

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
- **Main Project File**: Metadata stored in `projekt.json` with nested structure
- **Path Construction**: Dynamic path building based on project structure
- **Data Transformation**: UI converts object arrays to strings, API preserves object structure
- **Backward Compatibility**: Handles both legacy string arrays and new object arrays

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

## Kriterien-Extraktion System

### Overview
The Kriterien-Extraktion system extracts and manages tender criteria from documents, providing structured data for qualification and award criteria. The system uses AI-powered extraction with human review capabilities and persistent storage.

### Data Flow Processes

#### 1. Reading Criteria 📖

**File Location**: `{projectDir}kriterien.meta.json` (sidecar metadata file)
**API Endpoint**: `GET /api/fs/metadata`
**Persistence Function**: `loadKriterienFromFile(projectDir)`

##### Process Flow:
1. Component constructs criteria path: `projectDir + "kriterien.meta.json"`
2. Uses SWR to fetch criteria via `GET /api/fs/metadata?path={criteriaPath}`
3. API reads `kriterien.meta.json` file via WebDAV GET request
4. Returns complete `KriterienMetadata` object or `null` if not found
5. React component displays extracted criteria with review status

##### Data Structure (KriterienMetadata):
```typescript
{
  extractedCriteria: KriterienExtraktion,
  extractionTimestamp: string,
  extractionMethod: string, // "KRITERIEN_EXTRAKTION", "A_INFO", etc.
  aabFileName?: string,
  parserUsed?: string,
  lastModified: string,
  version: string,
  reviewStatus?: {
    aiReviewed: boolean,
    humanReviewed: boolean,
    lastReviewDate?: string,
    reviewNotes?: string
  }
}
```

#### 2. AI Criteria Extraction 🤖

**Trigger**: "Kriterien extrahieren" button
**AI Query**: Configurable AI queries for criteria extraction
**Streaming**: Real-time AI response processing

##### Process Flow:
1. User triggers extraction via button click
2. Component sends AI request with document context
3. AI streams response with structured criteria data
4. Real-time parsing and validation of JSON response
5. Automatic save to `kriterien.meta.json` upon completion

##### Expected AI Output Format:
```json
{
  "eignungskriterien": {
    "befugnis": [{"kriterium": "...", "nachweise": [...]}],
    "berufliche_zuverlaessigkeit": [...],
    "technische_leistungsfaehigkeit": [...],
    "finanzielle_und_wirtschaftliche_leistungsfaehigkeit": [...]
  },
  "zuschlagskriterien": [
    {
      "los": {"nummer": "Los 1", "bezeichnung": "..."},
      "prinzip": "Bestbieterprinzip",
      "kriterien": [{"name": "...", "gewichtung": "..."}]
    }
  ],
  "subunternehmerregelung": ["..."],
  "formale_anforderungen": ["..."]
}
```

#### 3. Writing Criteria 💾

**API Endpoint**: `POST /api/fs/metadata`
**Persistence Function**: `saveKriterienToFile(projectDir, criteria, metadata)`

##### Data Preparation:
- Validates criteria structure using `validateKriterienExtraktion()`
- Creates metadata with extraction timestamp and method
- Includes review status and version information
- Preserves original extraction context (parser, filename)

##### API Call:
```javascript
POST /api/fs/metadata
{
  path: "{projectDir}kriterien.meta.json",
  metadata: KriterienMetadata
}
```

##### Implementation:
- WebDAV PUT operation to save JSON file
- Atomic write operation with error handling
- SWR cache mutation for immediate UI updates
- Backup of previous version before overwrite

#### 4. Review Status Management 📋

**Function**: `updateKriterienReviewStatus(projectDir, reviewStatus)`
**Purpose**: Track human review and validation of AI-extracted criteria

##### Process Flow:
1. Load existing criteria metadata
2. Update review status fields (aiReviewed, humanReviewed, etc.)
3. Set lastReviewDate to current timestamp
4. Save updated metadata back to file
5. Maintain extraction history and review trail

### Type Definitions

#### Core Interfaces:
```typescript
interface KriteriumNachweis {
  dokument: string;
  typ: 'PFLICHT' | 'ODER';
  gueltigkeit?: string;
  hinweis?: string;
}

interface KriteriumObjekt {
  kriterium: string;
  nachweise: KriteriumNachweis[];
}

interface ZuschlagsKriterium {
  name: string;
  gewichtung: string;
  unterkriterien?: ZuschlagsKriterium[];
}
```

### API Endpoints

#### `/api/fs/metadata` (GET)
- **Purpose**: Load criteria metadata from sidecar JSON files
- **Parameters**: `path` (criteria file path)
- **Response**: `KriterienMetadata` object or `null`
- **Implementation**: WebDAV GET with JSON parsing

#### `/api/fs/metadata` (POST)
- **Purpose**: Save criteria metadata to sidecar JSON files
- **Body**: `{ path: string, metadata: KriterienMetadata }`
- **Response**: `{ success: boolean }`
- **Implementation**: WebDAV PUT with atomic write operation

### Technical Implementation

#### State Management:
- SWR for criteria data fetching and caching
- Local state for AI extraction progress
- Review status tracking with timestamps
- Error state management for failed operations

#### File System Integration:
- **Sidecar Files**: `kriterien.meta.json` alongside project files
- **Atomic Operations**: Safe concurrent access with file locking
- **Backup Strategy**: Version preservation before updates
- **Error Recovery**: Graceful handling of corrupted files

#### AI Integration:
- **Streaming Responses**: Real-time criteria extraction display
- **JSON Validation**: Robust parsing with error recovery
- **Context Preservation**: Document source and extraction method tracking
- **Retry Logic**: Automatic retry on extraction failures

#### User Interface:
- **Real-time Updates**: Live display of extraction progress
- **Review Interface**: Human validation and editing capabilities
- **Status Indicators**: Visual feedback for review states
- **Error Display**: Clear error messages and recovery options

### Development Guidelines

#### Error Handling Best Practices:
- Always validate criteria structure before saving
- Provide meaningful error messages for validation failures
- Implement graceful degradation for missing files
- Log extraction errors for debugging and improvement

#### Performance Considerations:
- Use SWR caching to minimize API calls
- Implement debounced auto-save for user edits
- Optimize JSON parsing for large criteria sets
- Consider pagination for extensive criteria lists

## Lose Field Handling

### Data Structure Transformation
The `lose` field requires special handling due to the mismatch between UI expectations and data storage format:

#### Storage Format (projekt.json):
```json
{
  "lose": [
    {"nummer": "Los 1", "bezeichnung": "Bauleistungen"},
    {"nummer": "Los 2", "bezeichnung": "Elektroinstallation"}
  ]
}
```

#### UI Format (EditableText component):
```javascript
["Los 1: Bauleistungen", "Los 2: Elektroinstallation"]
```

### Implementation Details

#### Reading (API → UI):
1. API reads `projekt.json` and extracts `meta.meta.lose` array of objects
2. UI `useEffect` converts objects to strings: `${obj.nummer}: ${obj.bezeichnung}`
3. Fallback for legacy string arrays (backward compatibility)

#### Writing (UI → API):
1. UI sends string array to API
2. API preserves existing object structure if it exists in `projekt.json`
3. Only falls back to string array if no object structure is found

#### Benefits:
- **UI Simplicity**: EditableText works with comma-separated strings
- **Data Integrity**: Full object structure preserved in storage
- **Backward Compatibility**: Handles both old and new data formats
- **Future-Proof**: Object structure allows for additional fields

## Future Enhancements

### Planned Improvements
1. **Form Validation**: Add comprehensive form validation for date formats and required fields (line 265 in projectinfo.md)
2. **Versioning**: Implement metadata versioning for change tracking
3. **Batch Operations**: Support for bulk metadata updates across projects
4. **Templates**: Predefined metadata templates for common project types
5. **Export/Import**: JSON export/import functionality for metadata backup
6. **Criteria Editing**: Interactive editing interface for extracted criteria
7. **Criteria Validation**: Advanced validation rules for criteria completeness
8. **Multi-Document Extraction**: Support for extracting criteria from multiple documents
9. **Criteria Templates**: Predefined criteria templates for different tender types

### Recently Implemented ✅
- **Data Structure Compatibility**: Fixed `lose` field handling between UI and storage formats
- **Backward Compatibility**: Support for both legacy string arrays and new object arrays
- **API Optimization**: Flattened metadata structure for UI consumption while preserving storage integrity
- **Criteria Extraction System**: Complete AI-powered criteria extraction with structured data output
- **Criteria Persistence**: Robust save/load operations with metadata tracking and review status
- **Type Safety**: Comprehensive TypeScript interfaces for criteria validation and type checking

### Performance Optimizations
1. **Caching**: Implement more aggressive caching strategies
2. **Compression**: Compress large AI context before transmission
3. **Pagination**: Handle large document sets more efficiently
4. **Background Processing**: Move AI operations to background workers

This documentation provides a comprehensive understanding of the project info system's architecture and implementation details, enabling effective development and maintenance of this critical component.