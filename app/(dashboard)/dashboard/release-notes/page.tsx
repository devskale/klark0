import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { readFile } from 'fs/promises';
import path from 'path';

// Function to fetch release notes content
async function getReleaseNotes() {
  const filePath = path.join(process.cwd(), 'docs', 'release-notes.md');
  try {
    const content = await readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error("Error reading release notes:", error);
    return "# Release Notes\n\nContent could not be loaded. Please check back later.";
  }
}

export default async function ReleaseNotesPage() {
  const releaseNotesContent = await getReleaseNotes();

  return (
    <div className="flex flex-col gap-6 p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Release Notes</CardTitle>
          <CardDescription>Latest updates and version history for fairgabe.app</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="current" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="current">Current Version (0.0.1)</TabsTrigger>
              <TabsTrigger value="history">Version History</TabsTrigger>
            </TabsList>
            <TabsContent value="current" className="space-y-4">
              <div className="prose max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                  {releaseNotesContent.split('## Version 0.0.1')[1]?.split('## Version')[0] || releaseNotesContent}
                </ReactMarkdown>
              </div>
            </TabsContent>
            <TabsContent value="history" className="space-y-4">
              <div className="prose max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                  {releaseNotesContent}
                </ReactMarkdown>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
