import express from 'express';

const app = express();
const PORT = 3001;

// Middleware - JSON Body parsen
app.use(express.json());

// Health-Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server läuft!' });
});

// Mock-Endpoint:  ALLE Items abrufen (GET)
app.get('/api/items', (req, res) => {
  const mockItems = [
    { id:  1, name: 'Brot', completed: false },
    { id: 2, name: 'Milch', completed: true },
    { id:  3, name: 'Eier', completed: false }
  ];
  res.json(mockItems);
});

// Einzelnes Item abrufen (GET mit ID)
app.get('/api/items/:id', (req, res) => {
  const itemId = req.params.id;
  
  const item = {
    id: itemId,
    name: 'Beispiel Item',
    completed: false
  };
  
  res.json(item);
});

// Neues Item erstellen (POST)
app.post('/api/items', (req, res) => {
  const { name } = req. body;

  const newItem = {
    id: 1,  // Kommt später von der Datenbank
    name: name,
    completed:  false
  };

  res. status(201).json(newItem);
});

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});