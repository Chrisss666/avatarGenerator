# avatarJS

Deterministischer, abhängigkeitsfreier Charakter-Avatar-Generator in Vanilla JavaScript (ES6).

Aus einem beliebigen Namen (z. B. `"Max Mustermann"`) wird ein einzigartiger SVG-Avatar erzeugt — wahlweise als kleine Figur mit Hautton, Frisur, Bart, Augen, Kleidung, Brille, Kopfbedeckung und Schmuck, als abstraktes Farbmuster oder als Initialen-Kachel. Der gleiche Name erzeugt **immer exakt denselben Avatar** (Seed-basierter Pseudozufall), unterschiedliche Namen ergeben sichtbar unterschiedliche Ergebnisse.

## Features

- **Zero Dependencies / Offline-fähig** — keine externen Libraries, Fonts, Bilder oder Netzwerk-Requests. Alles wird zur Laufzeit als reiner SVG-String zusammengesetzt.
- **Deterministisch** — Name → NFC-Normalisierung → FNV-1a Hash → Seed → Mulberry32-PRNG. Gleicher Name = gleicher Avatar, reproduzierbar über Sessions, Geräte und Unicode-Kodierungen (NFC/NFD) hinweg.
- **3 wählbare Stile** (`options.style`) — `"character"` (ausführliche Figur, Default), `"abstract"` (abstrakte Farbformen) und `"initials"` (Initialen vor Farbfläche).
- **Große Vielfalt** — im Stil `"character"`: 10 Hauttöne, 13 Haarfarben, 9 Frisuren, 6 Bart-Varianten, 6 Augen-Varianten, 5 Augenbrauen, 3 Nasen, 6 Mund-Varianten, 3 Brillen, 3 Kopfbedeckungen, Ohrringe, Sommersprossen, Rouge und 4 Kleidungsschnitte vor 10 Verlaufs-Hintergründen — mehrere Milliarden mögliche Kombinationen.
- **Hochwertige Optik** — durchgängige Konturlinien, Bezier-basiertes Gesicht (kein Ellipsen-Klischee), Farbverlauf-Hintergründe, weiche Schattierung/Glanzlicht und ein dezenter Sticker-Schatten.
- **MVC-freundlich** — `generateAvatar(name, options)` liefert einen validen, eigenständigen SVG-String (inkl. `xmlns`), der sich direkt in `innerHTML` bzw. eine View einsetzen lässt. Zusätzlich ein schlanker `AvatarGenerator`-Klassen-Wrapper für DI-basierte Architekturen.

## Verwendung

Keine Installation, kein Build-Schritt nötig — einfach die Datei [`avatarGenerator.js`](avatarGenerator.js) ins Projekt kopieren und als ES-Modul importieren.

```js
import { generateAvatar } from './avatarGenerator.js';

const svgString = generateAvatar('Max Mustermann', { size: 128 });
document.getElementById('avatar-container').innerHTML = svgString;
```

Stil auswählen:

```js
generateAvatar('Max Mustermann', { style: 'character' }); // Default: ausführliche Figur
generateAvatar('Max Mustermann', { style: 'abstract' });  // Abstrakte Farbformen
generateAvatar('Max Mustermann', { style: 'initials' });  // Initialen vor Farbfläche
```

Als injizierbarer Service (z. B. in einem MVC-Controller/View-Layer):

```js
import { AvatarGenerator } from './avatarGenerator.js';

const avatarService = new AvatarGenerator({ size: 96 });
view.render({ avatarSvg: avatarService.create(user.name) });
```

### API

#### `generateAvatar(name, options?)`

| Parameter        | Typ      | Beschreibung                                                                 |
| ----------------- | -------- | ----------------------------------------------------------------------------- |
| `name`            | `string` | Beliebiger String, dient als Seed. Leere/ungültige Werte fallen auf `"anonymous"` zurück. |
| `options.size`    | `number` | Breite/Höhe des SVG in Pixeln. Standard: `128`.                              |
| `options.style`   | `string` | `"character"` (Default), `"abstract"` oder `"initials"`. Unbekannte Werte fallen auf `"character"` zurück. |

Gibt einen vollständigen SVG-Markup-String zurück (`<svg xmlns="..." viewBox="0 0 100 100" ...>...</svg>`).

#### `class AvatarGenerator`

```js
new AvatarGenerator(defaultOptions?)
```

- `.create(name, options?)` — delegiert an `generateAvatar`, gemischt mit den im Konstruktor gesetzten Default-Optionen.

## Live-Demo

[`avatar-test.html`](avatar-test.html) ist eine eigenständige, offline lauffähige Testseite (einfach im Browser öffnen) mit Eingabefeld für Live-Vorschau und einer Beispiel-Galerie.

## Lizenz

Dieses Projekt steht **nicht** unter einer Open-Source-Lizenz. Alle Rechte liegen bei [Chrisss666](https://github.com/Chrisss666). Nutzung, Kopie, Modifikation oder Weitergabe ist nur mit ausdrücklicher Erlaubnis des Autors gestattet — siehe [LICENSE](LICENSE).

Für eine Nutzungserlaubnis bitte über GitHub Kontakt aufnehmen.
