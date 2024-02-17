const express = require('express');
const mysql = require('mysql');

const app = express();
app.use(express.json());

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'YourRootPassword',
  database: 'newdb'
});

connection.connect(err => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to database');
});

app.post('/api/post', (req, res) => {
  const { firstName, lastName } = req.body;

  const sql = 'INSERT INTO abc (first_name, last_name) VALUES (?, ?)';
  connection.query(sql, [firstName, lastName], (err, result) => {
    if (err) {
      console.error('Error inserting data:', err);
      res.status(500).json({ error: 'Failed to insert data into database' });
      return;
    }
    console.log('Data inserted:', result);
    res.json({ message: 'Data received and inserted into database' });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
