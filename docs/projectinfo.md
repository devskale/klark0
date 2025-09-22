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

### Bieterdokumente (Doks) System
**Main Component**: `app/(dashboard)/dashboard/ainfo/doks.tsx`
**Storage**: WebDAV-based filesystem with `projekt.json` main project file
**Data Source**: `bdoks.bieterdokumente` array within project structure
**Caching**: SWR for efficient data fetching and real-time updates
**UI Features**: Filtering, statistics, and responsive table display

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

### 4. Bieterdokumente Display 📋

**File Location**: `projekt.json` (main project metadata file)
**API Endpoint**: `POST /api/fs/read`
**Data Source**: `bdoks.bieterdokumente` array

#### Process Flow:

##### 1. Data Loading:
- Component constructs project path: `projectDir + "projekt.json"`
- Uses SWR to fetch complete project data via `POST /api/fs/read`
- API reads full `projekt.json` file content via WebDAV GET request
- Parses JSON and extracts `bdoks.bieterdokumente` array for display

##### 2. Data Processing:
- Filters documents based on search term, document type, and requirement type
- Calculates statistics (total documents, signed requirements, document types)
- Groups documents by type for organized display
- Applies responsive table formatting for optimal viewing

##### 3. UI Rendering:
- Displays filterable table with document information
- Shows statistics cards with document counts and requirements
- Provides search functionality across document descriptions
- Implements responsive design for desktop and mobile viewing

#### Data Structure (BieterDokument):
```typescript
{
  anforderungstyp: string,        // e.g., "Eignungsnachweis", "Angebot"
  dokumenttyp: string,            // e.g., "Referenzliste", "Preisblatt"
  beschreibung?: string,          // Detailed description of document
  unterzeichnung_erforderlich: boolean,  // Whether signature is required
  bemerkungen?: string,           // Additional notes or requirements
  los?: string                    // Associated lot number if applicable
}
```

#### Implementation Details:
- **API Integration**: Uses `POST /api/fs/read` to retrieve complete project data
- **Data Extraction**: Accesses `bdoks.bieterdokumente` from nested project structure
- **Error Handling**: Graceful handling of missing data or malformed JSON
- **Performance**: SWR caching with `{ revalidateOnFocus: false }` configuration
- **Type Safety**: TypeScript interfaces for document structure validation

#### UI Features:
- **Search Functionality**: Real-time filtering by document description
- **Type Filtering**: Filter by document type (Alle, Eignungsnachweis, Angebot, etc.)
- **Requirement Filtering**: Filter by signature requirement (Alle, Erforderlich, Nicht erforderlich)
- **Statistics Display**: Overview cards showing document counts and requirements
- **Responsive Table**: Optimized display for various screen sizes
- **Loading States**: Skeleton loading during data fetch operations

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
- **Purpose**: Read complete project files including bid documents data
- **Body**: `{path: string}`
- **Response**: `{content: string}`
- **Usage**: Loading complete `projekt.json` content for bid documents display and AI context
- **Doks Integration**: Primary endpoint for accessing `bdoks.bieterdokumente` data structure

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
- **Doks Display**: Responsive table interface with filtering and search capabilities
- **Statistics Cards**: Overview displays for document counts and requirements
- **Filter Controls**: Multi-criteria filtering by type, requirements, and search terms

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

#### Bid Documents Not Displaying
- **Cause**: Missing or malformed `bdoks.bieterdokumente` structure in `projekt.json`
- **Solution**: Verify `projekt.json` contains valid `bdoks` object with `bieterdokumente` array
- **Debug**: Check browser console for JSON parsing errors and verify data structure
- **API Issue**: Ensure using `POST /api/fs/read` instead of `GET /api/fs/metadata` for complete data access

### Debug Information
The component includes a collapsible "Dev Info" section that displays:
- Project paths and directory structure
- Parser detection results
- AI context and prompts
- Raw AI responses
- SWR cache status

This information is invaluable for troubleshooting issues and understanding the system's current state.

## Kriterien Management System

### Overview
The Kriterien Management system manages tender criteria directly within the main project data structure. The system has been migrated from standalone AI extraction to integrated criteria management with human review capabilities and persistent storage in `projekt.json`.

### Data Flow Processes

#### 1. Reading Criteria 📖

**File Location**: `{projectDir}projekt.json` (main project file)
**API Endpoint**: `GET /api/fs/metadata`
**Persistence Function**: `loadKriterienFromFile(projectDir)`

##### Process Flow:
1. Component constructs project path: `projectDir + "projekt.json"`
2. Uses SWR to fetch project data via `GET /api/fs/metadata?path={projectPath}`
3. API reads `projekt.json` file via WebDAV GET request
4. Extracts `kriterien` array from project data structure
5. React component displays criteria with review status and filtering capabilities

##### Data Structure (ProjektKriterium):
```typescript
{
  id: string,
  kategorie: 'eignungskriterium' | 'zuschlagskriterium' | 'formale_anforderung',
  unterkategorie?: string,
  titel: string,
  beschreibung?: string,
  gewichtung?: string,
  los?: string,
  nachweise?: string[],
  pruefung?: {
    status: 'offen' | 'geprueft' | 'nachbesserung' | 'erfuellt',
    bemerkung?: string,
    pruefer?: string,
    datum?: string
  }
}
```

#### 2. Criteria Management Interface 📋

**Component**: Tabular interface with filtering and grouping
**Actions**: View, filter, group, and update review status
**Data Source**: Direct integration with `projekt.json` structure

##### Process Flow:
1. Component loads criteria from `projekt.json` via SWR
2. Displays criteria in responsive table format
3. Provides filtering by category, status, and Los
4. Enables grouping by category or Los
5. Allows updating review status for individual criteria

##### UI Features:
- **Filtering**: Filter by kategorie, pruefung status, or Los
- **Grouping**: Group criteria by kategorie or Los for better organization
- **Status Management**: Update review status (offen, geprueft, nachbesserung, erfuellt)
- **Responsive Design**: Optimized for desktop and mobile viewing
- **Real-time Updates**: Immediate UI updates with SWR cache management

#### 3. Updating Criteria Status 💾

**API Endpoint**: `POST /api/fs/metadata`
**Persistence Function**: `updateKriteriumPruefung(projectPath, kriteriumId, pruefung)`

##### Data Preparation:
- Validates kriterium ID exists in project data
- Creates pruefung object with status, bemerkung, pruefer, and datum
- Preserves existing criteria data while updating only review status
- Maintains data integrity with atomic updates

##### API Call:
```javascript
POST /api/fs/metadata
{
  path: "{projectDir}projekt.json",
  metadata: {
    // Updated project data with modified kriterium pruefung status
  }
}
```

##### Implementation:
- WebDAV PUT operation to save complete project file
- Atomic write operation with error handling
- SWR cache mutation for immediate UI updates
- Preserves all existing project data structure

#### 4. Review Status Management 📋

**Function**: `updateKriteriumPruefung(projectPath, kriteriumId, pruefung)`
**Purpose**: Track human review and validation of individual criteria

##### Process Flow:
1. Load existing project data from `projekt.json`
2. Find specific kriterium by ID in the kriterien array
3. Update pruefung object with new status and metadata
4. Set datum to current timestamp for audit trail
5. Save updated project data back to file
6. Maintain complete review history within project structure

### Type Definitions

#### Core Interfaces:
```typescript
interface ProjektKriterium {
  id: string;
  kategorie: 'eignungskriterium' | 'zuschlagskriterium' | 'formale_anforderung';
  unterkategorie?: string;
  titel: string;
  beschreibung?: string;
  gewichtung?: string;
  los?: string;
  nachweise?: string[];
  pruefung?: {
    status: 'offen' | 'geprueft' | 'nachbesserung' | 'erfuellt';
    bemerkung?: string;
    pruefer?: string;
    datum?: string;
  };
}

interface ProjektJson {
  meta: {
    meta: ProjectMetadata;
  };
  bdoks: any[];
  ids: ProjektIds;
  kriterien: ProjektKriterium[];
}
```

### API Endpoints

#### `/api/fs/metadata` (GET)
- **Purpose**: Load project data including criteria from main project file
- **Parameters**: `path` (projekt.json file path)
- **Response**: `ProjektJson` object with kriterien array or `null`
- **Implementation**: WebDAV GET with JSON parsing, extracts kriterien array

#### `/api/fs/metadata` (POST)
- **Purpose**: Update project data including criteria status changes
- **Body**: `{ path: string, metadata: ProjektJson }`
- **Response**: `{ success: boolean }`
- **Implementation**: WebDAV PUT with atomic write operation, preserves complete project structure

### Technical Implementation

#### State Management:
- SWR for project data fetching and caching (including criteria)
- Local state for filtering and grouping preferences
- Review status tracking with timestamps per kriterium
- Error state management for failed update operations

#### File System Integration:
- **Unified Storage**: All data in `projekt.json` main project file
- **Atomic Operations**: Safe concurrent access with complete file updates
- **Data Integrity**: Preserves complete project structure during updates
- **Error Recovery**: Graceful handling of corrupted project files

#### Data Management:
- **Centralized Structure**: Criteria integrated into main project data
- **Type Safety**: Comprehensive TypeScript interfaces for validation
- **Immutable Updates**: Functional updates preserving existing data
- **Cache Synchronization**: SWR cache mutations for immediate UI feedback

#### User Interface:
- **Responsive Table**: Optimized display for desktop and mobile
- **Advanced Filtering**: Multi-criteria filtering by category, status, Los
- **Flexible Grouping**: Dynamic grouping by category or Los
- **Status Management**: Inline editing of review status and notes
- **Real-time Updates**: Immediate UI feedback with optimistic updates

### Development Guidelines

#### Error Handling Best Practices:
- Always validate kriterium ID exists before updating
- Provide meaningful error messages for validation failures
- Implement graceful degradation for missing project files
- Log update errors for debugging and audit trail

#### Performance Considerations:
- Use SWR caching to minimize API calls for project data
- Implement debounced filtering for large criteria sets
- Optimize table rendering with virtualization for extensive lists
- Use optimistic updates for immediate user feedback

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
1. **Form Validation**: Add comprehensive form validation for date formats and required fields
2. **Versioning**: Implement metadata versioning for change tracking
3. **Batch Operations**: Support for bulk metadata updates across projects
4. **Templates**: Predefined metadata templates for common project types
5. **Export/Import**: JSON export/import functionality for metadata backup
6. **Criteria Bulk Operations**: Bulk status updates for multiple criteria
7. **Criteria Search**: Full-text search within criteria titles and descriptions
8. **Criteria Analytics**: Dashboard for criteria completion statistics
9. **Criteria Templates**: Predefined criteria templates for different tender types
10. **Doks Export**: Export bid documents list to PDF or Excel format
11. **Doks Sorting**: Advanced sorting capabilities by multiple columns
12. **Doks Grouping**: Group documents by Los, type, or requirement status
13. **Doks Status Tracking**: Track document submission status and deadlines

### Recently Implemented ✅
- **Data Structure Compatibility**: Fixed `lose` field handling between UI and storage formats
- **Backward Compatibility**: Support for both legacy string arrays and new object arrays
- **API Optimization**: Flattened metadata structure for UI consumption while preserving storage integrity
- **Unified Data Structure**: Migrated criteria from separate files to integrated `projekt.json` structure
- **Modern UI Interface**: Responsive table with filtering, grouping, and status management
- **Type Safety**: Comprehensive TypeScript interfaces for criteria validation and type checking
- **Centralized Persistence**: Single source of truth for all project data including criteria
- **Doks System**: Complete bid documents display system with filtering and search capabilities
- **Full Data Access**: Switched from metadata API to full file read API for complete `projekt.json` access
- **Responsive Doks UI**: Table interface with statistics cards and multi-criteria filtering

### Performance Optimizations
1. **Caching**: Implement more aggressive caching strategies
2. **Compression**: Compress large AI context before transmission
3. **Pagination**: Handle large document sets more efficiently
4. **Background Processing**: Move AI operations to background workers

## Migration from Legacy System

### Overview
The kriterien system has been migrated from a standalone AI extraction approach to an integrated data management system within the main project structure.

### Key Changes
- **Data Storage**: Moved from `kriterien.meta.json` sidecar files to integrated `projekt.json` structure
- **AI Extraction**: Removed automated AI extraction in favor of manual criteria management
- **User Interface**: Replaced extraction-focused UI with management-focused table interface
- **Data Structure**: Simplified from complex nested extraction metadata to flat `ProjektKriterium` objects
- **Persistence**: Unified persistence layer using existing project metadata APIs

### Migration Benefits
- **Simplified Architecture**: Single source of truth for all project data
- **Better Performance**: Reduced API calls by loading all data together
- **Improved UX**: Focus on criteria management rather than extraction
- **Data Integrity**: Atomic updates preserve complete project structure
- **Maintainability**: Reduced complexity by removing AI extraction dependencies

### Backward Compatibility
The new system is **not backward compatible** with the legacy `kriterien.meta.json` format. Projects using the old format will need to migrate their criteria data to the new `projekt.json` structure.

This documentation provides a comprehensive understanding of the project info system's architecture and implementation details, enabling effective development and maintenance of this critical component.