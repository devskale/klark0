import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function AfreigabePage() {
  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium bold text-gray-900 mb-6">
        Freigabe
      </h1>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Ausschreibungs Projekt Daten Freigabe</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Hier können Sie die Freigabe von Ausschreibungs-Projektdaten
            verwalten.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
