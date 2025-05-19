"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProject } from "@/context/ProjectContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Info from "./info";
import Strukt from "./strukt";
import Dok from "./dok";
import Aidok from "./aidok";
import { Sparkles } from "lucide-react";

export default function AInfoPage() {
  const { selectedProject } = useProject();

  return (
    <section className="p-4">
          <Tabs defaultValue="info" className="w-full">
            <TabsList>
              <TabsTrigger value="info"> Info </TabsTrigger>
              <TabsTrigger value="strukt"> Strukt </TabsTrigger>
              <TabsTrigger value="dok"> Dok </TabsTrigger>
              <TabsTrigger value="sparkles"> <Sparkles /> </TabsTrigger>
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
