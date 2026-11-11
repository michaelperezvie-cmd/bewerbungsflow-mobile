# BewerbungsFlow · Mobil

Eine statische iPhone-Website für den manuellen Ablauf mit den drei vorhandenen
ChatGPT-Plugins. Sie funktioniert ohne eingeschalteten Mac und benötigt keine
Modell-API, API-Schlüssel, Datenbank oder Zahlungsfunktion.

## Ablauf

1. Vollständige Stellenanzeige einfügen.
2. Direkt unter der Stellenanzeige „Bewerbung starten“ tippen. Der Prompt wird
   kopiert und der nächste offene Schritt angezeigt. Dort „ChatGPT öffnen“ tippen.
3. In ChatGPT einen neuen Chat mit dem Plugin starten, Prompt einfügen und die
   Antwort generieren lassen.
4. Die vollständige Antwort zurück in BewerbungsFlow einsetzen und übernehmen.
5. Nach dem dritten Schritt das Anschreiben prüfen, bearbeiten, kopieren, teilen
   oder als TXT beziehungsweise strukturiertes JSON speichern.

Die Reihenfolge lautet: Stellenanzeigen Analytiker → Relevanzhersteller mit CV →
Bewerbungsassistent - Der Careerbot. Der CV und die weiteren Unterlagen werden
weiterhin im jeweiligen ChatGPT-Plugin verwendet. Die Website enthält diese
persönlichen Unterlagen nicht.

Der Link zum bestehenden Bewerbungs-Assistenten ist vorhanden. Die mobile Version
öffnet ihn auf Wunsch; sie bedient ihn nicht und überträgt keine Antworten
automatisch. Ein JSON-Export entspricht dem Format des bestehenden Ablagetools.

## Auf dem iPhone installieren

Website in Safari öffnen → Teilen → „Zum Home-Bildschirm“ → „Hinzufügen“.
Es wird keine App-Store-App und kein Entwicklerkonto benötigt.

Nach dem ersten erfolgreichen Laden ist die Oberfläche offline verfügbar.
ChatGPT benötigt eine Internetverbindung und den eigenen ChatGPT-Zugang.

## Verlauf und Datenschutz

Entwürfe, Zwischenantworten und Anschreiben liegen in IndexedDB dieses Browsers.
Sie werden nicht an einen eigenen Server übertragen. Es gibt keine Telemetrie,
keine extern geladenen Schriftarten und keine Modell-API-Aufrufe. Stellenanzeigen
werden weder in Öffnungslinks noch in URL-Parametern übermittelt. Der Benutzer
kopiert sie selbst in ChatGPT.

Der Verlauf ist **nicht automatisch zwischen Geräten, Browsern oder Safari und
einer separat installierten Web-App synchronisiert**. Das Löschen der Website-Daten
entfernt die lokalen Bewerbungen. Deshalb bietet das Menü eine Sicherungsdatei
und einen Import. Unterstützt werden mobile Sicherungen, Exporte der bestehenden
Desktop-Erweiterung und einzelne vollständige Ergebnis-JSON-Dateien. Archivieren
ist rückgängig zu machen.

## Kosten

Die App besteht ausschließlich aus HTML, CSS, JavaScript und kleinen App-Icons.
Sie wird über GitHub Pages aus einem öffentlichen Repository bereitgestellt.
GitHub Pages ist für öffentliche Repositories im GitHub-Free-Tarif verfügbar:
https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages

Das Programm hat keine Zahlungsfunktion und ruft keine kostenpflichtigen
Modell-Dienste auf. Der bestehende ChatGPT-Tarif und dessen Nutzungslimits gelten
weiter. Es wird kein Tarif gebucht oder automatisch aufgewertet.

## Technik und Updates

- Keine Installation und kein Build für die Website notwendig.
- `core.js`: gemeinsame Prompt- und Ergebnislogik der Desktop-Version.
- `mobile-core.js`: Reihenfolge, Prüfung veralteter Antworten und Sicherungsimport.
- `storage.js`: lokaler Verlauf in IndexedDB.
- `app.js`: mobile Bedienung, Menü, Sicherung und Dateiexport.
- `sw.js`: Offline-Shell; bei Änderungen den Cache-Namen erhöhen.
- `manifest.webmanifest` und App-Icons: Home-Bildschirm-Unterstützung.

Alle Asset-Pfade sind relativ, sodass GitHub-Pages-Projektpfade funktionieren.
Eine Aktualisierung wird im laufenden Programm angeboten; der Wechsel speichert
zuerst den aktuellen Entwurf. Ein erster Service-Worker-Start lädt die Seite nicht
ungefragt neu.

## Validierung

Die automatisierten Tests liegen im ursprünglichen Arbeitsverzeichnis unter
`work/dom-tests/mobile-regression.cjs`. Sie prüfen den vollständigen manuellen
Dreischritt, lokales Speichern, Wiederöffnen im Verlauf, Kopieren und Bearbeiten,
die Reihenfolge, geänderte Eingaben und den Sicherungsimport. Zusätzliche
Browserprüfungen erfolgen bei iPhone-typischen Bildschirmgrößen.

Version 1.0.3 ergänzt den Startknopf direkt unter dem Stellenanzeigenfeld.
Bereits übernommene Antworten bleiben beim Fortsetzen erhalten.
Scripts und Styles verwenden eine Versionskennung im Pfad, damit beim
Neuladen auch mit einem älteren Offline-Cache die passende Oberfläche lädt.
