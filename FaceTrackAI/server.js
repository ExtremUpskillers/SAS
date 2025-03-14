const express = require('express');
const path = require('path');
const app = express();
const PORT = 3001;

// Serve static files
app.use(express.static(__dirname));

// Serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Web interface running at http://localhost:${PORT}`);
});