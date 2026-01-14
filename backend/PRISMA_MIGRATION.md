# FoodPlaner Backend - Prisma Migration Guide

## Migration von PostgreSQL zu Prisma abgeschlossen ✓

Dein Backend wurde erfolgreich von `pg` (PostgreSQL Node.js Client) zu **Prisma ORM** migriert.

## Was hat sich geändert?

### ✅ Installation
- `@prisma/client` und `prisma` CLI wurden installiert
- `pg` (raw PostgreSQL client) wurde entfernt

### ✅ Datenbank Schema
- Ein neues Prisma Schema wurde erstellt: [`prisma/schema.prisma`](prisma/schema.prisma)
- Alle Tabellen wurden als Prisma Models definiert
- Beziehungen zwischen den Tabellen sind konfiguriert

### ✅ Server Code
- Alle `pool.query()` Aufrufe wurden durch Prisma Queries ersetzt
- `PrismaClient` ist jetzt der zentrale Datenbank-Zugriffspunkt
- Alle REST-API-Endpoints funktionieren wie zuvor

### ✅ Initialisierungsskripte
- `init-db.ts` - Initialisiert die Datenbank mit Test-Account
- `reset-db.ts` - Setzt die Datenbank komplett zurück
- Alte Migrations-Skripte wurden entfernt

### ✅ Konfiguration
- `.env` - Enthält die `DATABASE_URL` für Prisma
- `.env.example` - Dokumentation der erforderlichen Umgebungsvariablen

## Erste Schritte

### 1. Umgebungsvariablen konfigurieren

Bearbeite die `.env` Datei mit deinen PostgreSQL-Daten:

```env
# PostgreSQL Verbindung
DATABASE_URL="postgresql://username:password@localhost:5432/foodplaner"

# Server Port
PORT=3001

# JWT Secret (für Produktion ändern!)
JWT_SECRET=your_jwt_secret_here_change_this_in_production
```

**Oder für SQLite (Entwicklung):**

```env
DATABASE_URL="file:./prisma/dev.db"
PORT=3001
JWT_SECRET=your_jwt_secret_here_change_this_in_production
```

### 2. Prisma Migrations durchführen

```bash
# Erstelle die Datenbank-Struktur
npm run prisma:migrate

# Oder drücke direkt auf die Datenbank
npm run prisma:push
```

### 3. Datenbank initialisieren (optional)

```bash
# Erstelle einen Test-Account
npm run prisma:seed

# Oder: Setze DB zurück und erstelle Test-Account neu
npm run db:reset
```

### 4. Server starten

```bash
# Produktion
npm start

# Entwicklung (mit Hot-Reload)
npm run dev
```

## Available npm Scripts

| Script | Beschreibung |
|--------|-------------|
| `npm start` | Startet den Server |
| `npm run dev` | Startet den Server mit nodemon (Hot-Reload) |
| `npm run prisma:migrate` | Erstellt Prisma Migrations |
| `npm run prisma:push` | Drückt Schema direkt zur Datenbank (für Entwicklung) |
| `npm run prisma:seed` | Initialisiert Datenbank mit Test-Account |
| `npm run db:reset` | Setzt Datenbank zurück und erstellt Test-Account neu |

## Wichtige Änderungen in der Code-Struktur

### Vorher (pg):
```typescript
const result = await pool.query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);
const user = result.rows[0];
```

### Nachher (Prisma):
```typescript
const user = await prisma.user.findUnique({
  where: { id: userId }
});
```

## Datenbank Schema

Das neue Prisma Schema definiert diese Models:

- **User** - Benutzerkonten
- **ShoppingList** - Einkaufslisten
- **ShoppingListItem** - Artikel in Einkaufslisten
- **ListCollaborator** - Mitarbeiter auf Listen
- **Recipe** - Rezepte
- **RecipeItem** - Zutaten in Rezepten
- **ItemCategory** - Kategorien für Artikel

Siehe [`prisma/schema.prisma`](prisma/schema.prisma) für das vollständige Schema.

## Migrationen zu PostgreSQL (existierende Datenbank)

Wenn du bereits eine PostgreSQL-Datenbank mit Daten hast:

### Option 1: Daten migrieren
```bash
# Drücke das neue Schema zur Datenbank (wird neue Tabellen erstellen)
npm run prisma:push

# ODER mit Migration (für Versionskontrolle)
npm run prisma:migrate
```

### Option 2: Schema anpassen
Falls deine Datenbank anders strukturiert ist, bearbeite die [`prisma/schema.prisma`](prisma/schema.prisma) Datei und führe dann aus:

```bash
npm run prisma:migrate
```

## Prisma Studio (optional)

Um deine Datenbank visuell zu erkunden und zu bearbeiten:

```bash
npx prisma studio
```

Dies öffnet eine web-basierte UI auf `http://localhost:5555`

## Troubleshooting

### Problem: "Can't reach database server"
- Stelle sicher, dass PostgreSQL läuft
- Überprüfe `DATABASE_URL` in `.env`
- Überprüfe Port, Username, Passwort

### Problem: "Migration failed"
```bash
# Setze Migrations zurück
npm run db:reset

# Oder: Starte komplett neu
npx prisma migrate reset
```

### Problem: "Cannot find module '@prisma/client'"
```bash
# Neu installieren
npm install
```

## Sicherheitshinweise

- ⚠️ **JWT_SECRET** in `.env` ändern für Produktion!
- ⚠️ `DATABASE_URL` sollte nicht in Git committed werden (wird durch `.gitignore` ignoriert)
- ⚠️ Teste Migrationen in Entwicklung, bevor du sie in Produktion durchführst

## Weitere Ressourcen

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)

---

**Deine Migration zu Prisma ist abgeschlossen!** 🎉

Falls du Fragen hast oder Probleme auftreten, überprüfe die `.env`-Konfiguration und die `prisma/schema.prisma` Datei.
