"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProject } from "@/context/ProjectContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BAuditPage from "./audit";
import Info from "./info";
import BDoksPage from "./bdoks";

export default function BInfoPage() {
  const { selectedProject } = useProject();

  return (
    <section className="p-4">
      <Tabs defaultValue="info" className="w-full">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="doks">Doks</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>
        <TabsContent value="info">
          <Info />
        </TabsContent>
        <TabsContent value="doks">
          <BDoksPage />
        </TabsContent>
        <TabsContent value="audit">
          <BAuditPage />
        </TabsContent>
      </Tabs>
    </section>
  );
}
