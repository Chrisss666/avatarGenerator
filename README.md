# avatarJS

Deterministic, dependency-free character avatar generator in vanilla JavaScript (ES6).

From any given name (e.g. `"John Doe"`) a unique SVG avatar is generated — either as a small character with skin tone, hairstyle, beard, eyes, clothing, glasses, headwear and jewelry, as an abstract color pattern, or as an initials tile. The same name **always produces exactly the same avatar** (seed-based pseudo-randomness), while different names produce visibly different results.

## Features

- **Zero Dependencies / Offline-capable** — no external libraries, fonts, images, or network requests. Everything is assembled at runtime as a pure SVG string.
- **Deterministic** — name → NFC normalization → FNV-1a hash → seed → Mulberry32 PRNG. Same name = same avatar, reproducible across sessions, devices, and Unicode encodings (NFC/NFD).
- **3 selectable styles** (`options.style`) — `"character"` (detailed figure, default), `"abstract"` (abstract color shapes), and `"initials"` (initials in front of a color area).
- **Great variety** — in `"character"` style: 10 skin tones, 13 hair colors, 9 hairstyles, 6 beard variants, 6 eye variants, 5 eyebrows, 3 noses, 6 mouth variants, 3 glasses, 3 headwear types, earrings, freckles, blush, and 4 clothing cuts in front of 10 gradient backgrounds — several billion possible combinations.
- **High-quality look** — consistent outlines, Bezier-based face (no ellipse cliché), gradient backgrounds, soft shading/highlights, and a subtle sticker shadow.
- **MVC-friendly** — `generateAvatar(name, options)` returns a valid, standalone SVG string (including `xmlns`) that can be inserted directly into `innerHTML` or a view. Also includes a lightweight `AvatarGenerator` class wrapper for DI-based architectures.

## Usage

No installation, no build step needed — just copy the [`avatarGenerator.js`](avatarGenerator.js) file into your project and import it as an ES module.

```js
import { generateAvatar } from './avatarGenerator.js';

const svgString = generateAvatar('John Doe', { size: 128 });
document.getElementById('avatar-container').innerHTML = svgString;
```

Choosing a style:

```js
generateAvatar('John Doe', { style: 'character' }); // Default: detailed figure
generateAvatar('John Doe', { style: 'abstract' });  // Abstract color shapes
generateAvatar('John Doe', { style: 'initials' });  // Initials in front of a color area
```

As an injectable service (e.g. in an MVC controller/view layer):

```js
import { AvatarGenerator } from './avatarGenerator.js';

const avatarService = new AvatarGenerator({ size: 96 });
view.render({ avatarSvg: avatarService.create(user.name) });
```

### API

#### `generateAvatar(name, options?)`

| Parameter         | Type     | Description                                                                    |
| ------------------ | -------- | ------------------------------------------------------------------------------- |
| `name`             | `string` | Any string, used as the seed. Empty/invalid values fall back to `"anonymous"`. |
| `options.size`     | `number` | Width/height of the SVG in pixels. Default: `128`.                             |
| `options.style`    | `string` | `"character"` (default), `"abstract"`, or `"initials"`. Unknown values fall back to `"character"`. |

Returns a complete SVG markup string (`<svg xmlns="..." viewBox="0 0 100 100" ...>...</svg>`).

#### `class AvatarGenerator`

```js
new AvatarGenerator(defaultOptions?)
```

- `.create(name, options?)` — delegates to `generateAvatar`, merged with the default options set in the constructor.

## Live Demo

[`avatar-test.html`](avatar-test.html) is a standalone, offline-capable test page (just open it in a browser) with an input field for a live preview and an example gallery.

## License

This project is **not** under an open-source license. All rights belong to [Chrisss666](https://github.com/Chrisss666). Use, copying, modification, or redistribution is only permitted with the express permission of the author — see [LICENSE](LICENSE).

For usage permission, please get in touch via GitHub.
