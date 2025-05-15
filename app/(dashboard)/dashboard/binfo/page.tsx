"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProject } from "@/context/ProjectContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AKriterienPage from "./kriterien";
import Info from "./info";

export default function AInfoPage() {
  const { selectedProject } = useProject();

  return (
    <section className="p-4">
          <Tabs defaultValue="info" className="w-full">
            <TabsList>
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="kriterien">Kriterien</TabsTrigger>
            </TabsList>
            <TabsContent value="info">
              <Info />
            </TabsContent>
            <TabsContent value="kriterien">
              <AKriterienPage />
            </TabsContent>
          </Tabs>
    </section>
  );
}
