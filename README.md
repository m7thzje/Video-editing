# Puck's Avontuur 🦜

Een vrolijke 3D-explorer in de browser, gebouwd met [Three.js](https://threejs.org) en [Vite](https://vite.dev).
Speel als **Puck**, een grijze roodstaart papegaai die niet graag vliegt: hij loopt, klimt op meubels en
takken en kan hooguit een klein stukje hoppen.

**Level 1 – De woonkamer:** vind de 10 verstopte nootjes. Kruip in een kartonnen doos voor een blij geluidje en
een bonus (de *nootjesradar* wijst 12 seconden lang het dichtstbijzijnde nootje aan). Zijn alle nootjes gevonden,
dan gaat de deur naar buiten open — loop erdoor om het level te voltooien.

## Besturing

| | Desktop | Mobiel |
|---|---|---|
| Lopen | `WASD` / pijltjes | virtuele joystick links |
| Hoppen | `Spatie` | hop-knop rechts |
| Camera | muis (klik in beeld voor muisvergrendeling, of slepen) | vegen over het scherm |
| Klimmen | loop tegen de bank, kooi, plant, boekenkast, radiator of een tafelpoot aan | idem |
| Geluid aan/uit | `M` | – |

## Ontwikkelen

```bash
npm install
npm run dev      # ontwikkelserver op http://localhost:5173
npm run build    # productie-build in dist/
npm run preview  # build lokaal bekijken
```

## Geluiden

Geluiden worden geladen uit `public/assets/sounds/`. De audio start pas na de eerste interactie (klik, tik of toets).
Ontbreekt een bestand, dan speelt het spel automatisch een gesynthetiseerd placeholder-geluid af.

Verwachte bestandsnamen (per geluid wordt eerst `.mp3`, dan `.ogg`, dan `.wav` geprobeerd):

| Bestand | Wanneer |
|---|---|
| `nut.mp3` | een nootje gevonden |
| `box.mp3` | Puck kruipt in een kartonnen doos (blij geluid) |
| `hop.mp3` | Puck hopt |
| `level-complete.mp3` | alle nootjes gevonden / level voltooid |

Houd de bestanden kort en klein (bij voorkeur < 100 kB) zodat ze snel laden op mobiel.

## Online zetten (GitHub Pages)

De workflow `.github/workflows/deploy.yml` bouwt het spel en publiceert `dist/` op GitHub Pages bij elke push naar
`main` (of de ontwikkelbranch), en is ook handmatig te starten via *Actions → Deploy naar GitHub Pages → Run workflow*.

Eenmalig instellen: ga in de repository naar **Settings → Pages** en kies bij *Build and deployment → Source* voor
**GitHub Actions**. Het spel staat daarna op `https://<gebruiker>.github.io/<repository>/`.
Vite gebruikt `base: './'`, dus de build werkt onder elk subpad.

## Projectstructuur

```
src/
  main.js        spel-loop, HUD, nootjes, dozen, radar, deur
  livingRoom.js  level 1: kamer, meubels, botsvormen, nootjes, dozen, licht
  puck.js        Puck-model (simpele vormen) + loop/hop/klim-animatie
  physics.js     karakterfysica: lopen, klimmen, hoppen, botsen met blokken
  camera.js      third-person volgcamera met botsing
  input.js       toetsenbord, muis, joystick, hop-knop en vegen
  audio.js       geluiden laden + placeholder-synthese
  textures.js    procedurele texturen (vloer, behang, kleed, lucht)
```

## Prestaties op mobiel

- Lambert-materialen met flat shading (lowpoly), één schaduwcasterende lamp met **statische** schaduwmap die alleen
  ververst als er iets verandert (de deur); Puck heeft een goedkope blob-schaduw.
- Pixel ratio begrensd (max. 1,5 op touch) en wordt automatisch verlaagd als de framerate onder de 45 fps zakt.
- Kooitralies zijn samengevoegd tot één mesh; alle texturen worden procedureel gemaakt (geen downloads).
