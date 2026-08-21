# EKT Medien – Website-Übergabe

Diese Datei ist für die Person gedacht, die sich um Domain und Go-Live kümmert.

## Was das hier ist

Eine fertige, statische Landingpage. **Kein Build-Schritt, keine Abhängigkeiten, kein Node/npm nötig.**
HTML, CSS und ein bisschen Vanilla-JavaScript, das war's. Einfach die Dateien irgendwo hosten, fertig.

Einzige externe Abhängigkeit: Google Fonts (Archivo), wird per `<link>` in `index.html` geladen, kein Setup nötig.

## Dateistruktur

```
index.html          → die komplette Seite (alle Inhalte, eine Datei)
styles.css           → Layout & Komponenten
brand-tokens.css      → Farben/Typografie-Tokens (Quelle der Wahrheit für Farben, bitte nicht duplizieren)
app.js                → Mobile-Menü, Scroll-Reveal, Reel-Carousel, BTS-Video-Loop
assets/logos/          → Kundenlogos (Referenzen-Leiste)
assets/photos/         → Team-/BTS-Fotos (About-Sektion)
assets/video/          → Behind-the-Scenes-Video (About-Sektion)
```

## Live gehen, heute

**Schnellster Weg (kein Account nötig, kein Git):**

1. Auf [app.netlify.com/drop](https://app.netlify.com/drop) gehen.
2. Den kompletten Ordner (in dem diese Datei liegt) per Drag & Drop draufziehen.
3. Fertig, es gibt sofort eine Live-URL (z. B. `irgendwas-123.netlify.app`).
4. Danach kostenlosen Netlify-Account anlegen und die Seite „claimen", sonst verfällt der Link nach kurzer Zeit wieder.

**Alternative:** GitHub Pages, Vercel, oder jeder andere Static Hosting Anbieter funktioniert genauso, es müssen einfach nur alle Dateien in diesem Ordner (inkl. `assets/`) hochgeladen werden, mit `index.html` als Startseite.

## Sobald die Domain steht

1. Domain beim Registrar kaufen.
2. Beim Hosting-Anbieter (z. B. Netlify) unter „Domain Management" die Domain eintragen.
3. Die vom Anbieter angezeigten DNS-Einträge beim Domain-Registrar setzen.
4. SSL/HTTPS aktiviert sich bei den meisten Anbietern (u. a. Netlify) automatisch, kostenlos.

Am Code muss dafür nichts geändert werden.

## Offene Punkte

- **E-Mail-Kontaktoption fehlt noch.** WhatsApp und Instagram sind bereits als Klick-Links eingebaut (Nav, Mobile-Menü, finaler CTA-Bereich, Footer). Sobald eine Kontakt-E-Mail-Adresse feststeht, einfach `mailto:`-Links nach demselben Muster wie die WhatsApp-/Instagram-Links ergänzen.
- **Video-Dateigröße:** `assets/video/team-bts.mp4` ist knapp 65 MB, technisch funktionsfähig, aber für eine schnelle Ladezeit lohnt sich vorher eine Kompression (z. B. mit HandBrake auf ca. 1080p/H.264, sollte auf wenige MB runtergehen, ohne sichtbaren Qualitätsverlust).

## Was schon erledigt ist

Copy, Design, Kundenlogos, echte Testimonials, WhatsApp/Instagram-Verlinkung, Team-Bereich mit BTS-Material, keine Preise auf der Seite (bewusste Entscheidung), Mobile-getestet.
