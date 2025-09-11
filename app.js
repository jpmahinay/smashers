const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const {BigQuery} = require('@google-cloud/bigquery');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const bigquery = new BigQuery({ keyFilename: 'service-account.json' });
const DATASET = 'smashers_data';

// Example: Create a user
app.post('/api/users', async (req, res) => {
  try {
    const user = req.body;
    await bigquery.dataset(DATASET).table('users').insert([user]);
    res.json({success: true});
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

// Example: Get all users
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await bigquery.query(
      `SELECT * FROM \`${bigquery.projectId}.${DATASET}.users\``);
    res.json(rows);
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

// Add similar endpoints for matches, couples, attendance as needed

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
