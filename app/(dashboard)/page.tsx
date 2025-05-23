import { Button } from "@/components/ui/button";
import { ArrowRight, CreditCard, Database, Zap } from "lucide-react";
import { Terminal } from "./terminal";

export default function HomePage() {
  return (
    <main>
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left">
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight sm:text-4xl md:text-5xl">
                <div className="flex items-center gap-2">
                  <img
                    src="/android-chrome-192x192.png"
                    alt="FAIrgabe Wien Logo"
                    className="h-12 w-auto"
                  />
                  FAIrgabe Wien
                </div>
                <span className="text-3xl block text-orange-500 mt-2">
                  Digitale Transparente Vergabeaudits
                </span>
              </h1>
              <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-xl lg:text-lg xl:text-xl">
                Digitale Vergabeaudits ermöglichen eine faire, transparente und
                nachvollziehbare Bewertung – unterstützt durch sichere und
                vertrauenswürdige KI.
              </p>
              <div className="mt-8 sm:max-w-lg sm:mx-auto sm:text-center lg:text-left lg:mx-0">
                <a href="/dashboard">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-lg rounded-full">
                    Zum Projekt Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </a>
              </div>
            </div>
            <div className="mt-12 relative sm:max-w-lg sm:mx-auto lg:mt-0 lg:max-w-none lg:mx-0 lg:col-span-6 lg:flex lg:items-center">
              <Terminal />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-3 lg:gap-8">
            <div className="p-6 rounded-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-orange-500 text-white">
                <Zap className="h-6 w-6" />
              </div>
              <div className="mt-5">
                <h2 className="text-lg font-medium text-gray-900">Effizienz</h2>
                <p className="mt-2 text-base text-gray-500">
                  Optimieren Sie Ihre Vergabeprozesse durch unsere hochmodernen
                  digitalen Auditmethoden. Wir gewährleisten Präzision und
                  Nachvollziehbarkeit bei jeder Prüfung.
                </p>
              </div>
            </div>

            <div className="mt-10 lg:mt-0 p-6 rounded-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-orange-500 text-white">
                <Database className="h-6 w-6" />
              </div>
              <div className="mt-5">
                <h2 className="text-lg font-medium text-gray-900">
                  KI-Auditing
                </h2>
                <p className="mt-2 text-base text-gray-500">
                  Eigens entwickelte KI-Verfahren analysieren Ihrer
                  Vergabeaudits. Ihr Vorteil is Effizienzsteigerung und tiefere
                  Einblicke.
                </p>
              </div>
            </div>

            <div className="mt-10 lg:mt-0 p-6 rounded-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-orange-500 text-white">
                <CreditCard className="h-6 w-6" />
              </div>
              <div className="mt-5">
                <h2 className="text-lg font-medium text-gray-900">
                  Sicherheit
                </h2>
                <p className="mt-2 text-base text-gray-500">
                  Höchste Datensicherheit für Ihre sensiblen Informationen.
                  Unsere Plattform ist vollständig konform mit EU-KI-Act, DSGVO
                  und NIS2.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                Bereit zu beginnen?
              </h2>
              <p className="mt-3 max-w-3xl text-lg text-gray-500">
                Erstellen Sie Ihr erstes Vergabeprojekt in wenigen Minuten und
                laden Sie Ihre Dokumente sicher hoch. Starten Sie jetzt mit der
                digitalen Vergabe.
              </p>
            </div>
            <div className="mt-8 lg:mt-0 flex justify-center lg:justify-end">
              <a href="https://github.com/devskale/klark0" target="_blank">
                <Button
                  size="lg"
                  className="text-lg rounded-full bg-orange-500 hover:bg-orange-600 text-white">
                  Jetzt Projekt anlegen
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
