import express from 'express';

const app = express();
const PORT = 3001;

// Middleware - JSON Body parsen
app.use(express. json());

// Test-Endpoint
app.get('/api/items/:id', (req, res) => {
    const { name } = req.body;

    const newItem = {
        id: 1, // Kommt von der Datenbank
        name: name,
        completed: false
    };
    res.status(201).json(newItem);
});

// Mock-Endpoint mit Test-Daten
app.get('/api/items', (req, res) => {
  const mockItems = [
    { id:  1, name: 'Brot', completed: false },
    { id: 2, name:  'Milch', completed: true },
    { id: 3, name: 'Eier', completed: false }
  ];
  res.json(mockItems);
});

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});