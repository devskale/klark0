"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProject } from "@/context/ProjectContext";
// Card components were imported but not directly used in this file.
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Info from "./info";
import Strukt from "./strukt";
import Dok from "./dok";
import Aidok from "./aidok"; // Reverted to static import
import { Sparkles } from "lucide-react";
// import dynamicNext from 'next/dynamic'; // Removed dynamic import if no longer needed

export default function AInfoPage() {
  // Added export default function AInfoPage()
  const { selectedProject } = useProject(); // Added this line back

  return (
    <section className="p-4">
      <Tabs defaultValue="info" className="w-full">
        <TabsList>
          <TabsTrigger value="info"> Info </TabsTrigger>
          <TabsTrigger value="strukt"> Strukt </TabsTrigger>
          <TabsTrigger value="dok"> Dok </TabsTrigger>
          <TabsTrigger value="sparkles">
            {" "}
            <Sparkles />{" "}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="info">
          <Info />
        </TabsContent>
        <TabsContent value="strukt">
          <Strukt />
        </TabsContent>
        <TabsContent value="dok">
          <Dok />
        </TabsContent>
        <TabsContent value="sparkles">
          <Aidok />
        </TabsContent>
      </Tabs>
    </section>
  );
}
