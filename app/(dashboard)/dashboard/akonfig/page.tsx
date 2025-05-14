import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function AkonfigPage() {
  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium bold text-gray-900 mb-6">
        Konfiguration
      </h1>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Ausschreibungs-Konfiguration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dokumentvorlage
              </label>
              <select className="w-full p-2 border border-gray-300 rounded-md">
                <option>Standardvorlage</option>
                <option>Bauvorhaben</option>
                <option>IT-Dienstleistungen</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Genehmigungsworkflow
              </label>
              <select className="w-full p-2 border border-gray-300 rounded-md">
                <option>Ein-Stufen-Genehmigung</option>
                <option>Zwei-Stufen-Genehmigung</option>
                <option>Manuelle Genehmigung</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                E-Mail-Benachrichtigungen aktivieren
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
