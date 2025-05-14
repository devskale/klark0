import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function AtoolsPage() {
  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium bold text-gray-900 mb-6">
        Tools
      </h1>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Nachrichten</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Hier können Sie Nachrichten für ATools verwalten.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
