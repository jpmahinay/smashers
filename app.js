const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const {BigQuery} = require('@google-cloud/bigquery');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Initialize BigQuery client
const bigquery = new BigQuery({ keyFilename: 'service-account.json' });
const DATASET = 'smashers_data';

// ---- USERS ----

// Create a user
app.post('/api/users', async (req, res) => {
  try {
    const user = req.body;
    await bigquery.dataset(DATASET).table('users').insert([user]);
    res.json({success: true});
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await bigquery.query(
      `SELECT * FROM \`${bigquery.projectId}.${DATASET}.users\``
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

// ---- MATCHES ----

// Create a match
app.post('/api/matches', async (req, res) => {
  try {
    const match = req.body;
    await bigquery.dataset(DATASET).table('matches').insert([match]);
    res.json({success: true});
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

// Get all matches
app.get('/api/matches', async (req, res) => {
  try {
    const [rows] = await bigquery.query(
      `SELECT * FROM \`${bigquery.projectId}.${DATASET}.matches\``
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

// ---- COUPLES ----

// Create a couple
app.post('/api/couples', async (req, res) => {
  try {
    const couple = req.body;
    await bigquery.dataset(DATASET).table('couples').insert([couple]);
    res.json({success: true});
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

// Get all couples
app.get('/api/couples', async (req, res) => {
  try {
    const [rows] = await bigquery.query(
      `SELECT * FROM \`${bigquery.projectId}.${DATASET}.couples\``
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

// ---- ATTENDANCE ----

// Create/Update attendance for a date
app.post('/api/attendance', async (req, res) => {
  try {
    const { date, presentUserIds } = req.body;
    // Upsert logic: delete existing row for date before insert (BigQuery doesn't support update in streaming insert)
    await bigquery.query(
      `DELETE FROM \`${bigquery.projectId}.${DATASET}.attendance\` WHERE date = @date`,
      { params: { date } }
    );
    await bigquery.dataset(DATASET).table('attendance').insert([{ date, presentUserIds }]);
    res.json({success: true});
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

// Get all attendance
app.get('/api/attendance', async (req, res) => {
  try {
    const [rows] = await bigquery.query(
      `SELECT * FROM \`${bigquery.projectId}.${DATASET}.attendance\``
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

// ---- SERVER ----

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
