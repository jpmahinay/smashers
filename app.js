// Backend: Express + BigQuery (Cloud Run)

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { BigQuery } = require('@google-cloud/bigquery');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// BigQuery client
// Ensure service-account.json is mounted at /usr/src/app/service-account.json via Cloud Run secret volume.
const bigquery = new BigQuery({ keyFilename: 'service-account.json' });

// Dataset and region (MUST match your dataset's location)
const DATASET = 'smashers_data';
const LOCATION = 'asia-east2';

// Simple root to verify service is up
app.get('/', (req, res) => res.send('SMASHERS API is running'));

// ------------- USERS -------------

// Create a user
app.post('/api/users', async (req, res) => {
  try {
    const user = req.body;
    await bigquery.dataset(DATASET).table('users').insert([user]);
    res.json({ success: true });
  } catch (error) {
    console.error('POST /api/users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const query = `SELECT * FROM \`${bigquery.projectId}.${DATASET}.users\``;
    const [rows] = await bigquery.query({ query, location: LOCATION });
    res.json(rows);
  } catch (error) {
    console.error('GET /api/users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user by id (partial)
app.put('/api/users/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const fields = req.body || {};
    const setClause = Object.keys(fields).map(k => `${k}=@${k}`).join(', ');
    if (!setClause) return res.json({ success: true });
    const query = `UPDATE \`${bigquery.projectId}.${DATASET}.users\` SET ${setClause} WHERE id=@id`;
    await bigquery.query({ query, location: LOCATION, params: { id, ...fields } });
    res.json({ success: true });
  } catch (error) {
    console.error('PUT /api/users/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete user by id
app.delete('/api/users/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const query = `DELETE FROM \`${bigquery.projectId}.${DATASET}.users\` WHERE id=@id`;
    await bigquery.query({ query, location: LOCATION, params: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/users/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ------------- MATCHES -------------

// Create a match
app.post('/api/matches', async (req, res) => {
  try {
    const match = req.body;
    await bigquery.dataset(DATASET).table('matches').insert([match]);
    res.json({ success: true });
  } catch (error) {
    console.error('POST /api/matches error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all matches
app.get('/api/matches', async (req, res) => {
  try {
    const query = `SELECT * FROM \`${bigquery.projectId}.${DATASET}.matches\``;
    const [rows] = await bigquery.query({ query, location: LOCATION });
    res.json(rows);
  } catch (error) {
    console.error('GET /api/matches error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ------------- COUPLES -------------

// Create a couple
app.post('/api/couples', async (req, res) => {
  try {
    const couple = req.body;
    await bigquery.dataset(DATASET).table('couples').insert([couple]);
    res.json({ success: true });
  } catch (error) {
    console.error('POST /api/couples error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all couples
app.get('/api/couples', async (req, res) => {
  try {
    const query = `SELECT * FROM \`${bigquery.projectId}.${DATASET}.couples\``;
    const [rows] = await bigquery.query({ query, location: LOCATION });
    res.json(rows);
  } catch (error) {
    console.error('GET /api/couples error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ------------- ATTENDANCE -------------

// Upsert attendance for date (delete then insert)
app.post('/api/attendance', async (req, res) => {
  try {
    const { date, presentUserIds } = req.body;
    const delQuery = `DELETE FROM \`${bigquery.projectId}.${DATASET}.attendance\` WHERE date=@date`;
    await bigquery.query({ query: delQuery, location: LOCATION, params: { date } });
    await bigquery.dataset(DATASET).table('attendance').insert([{ date, presentUserIds }]);
    res.json({ success: true });
  } catch (error) {
    console.error('POST /api/attendance error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get attendance rows
app.get('/api/attendance', async (req, res) => {
  try {
    const query = `SELECT * FROM \`${bigquery.projectId}.${DATASET}.attendance\``;
    const [rows] = await bigquery.query({ query, location: LOCATION });
    res.json(rows);
  } catch (error) {
    console.error('GET /api/attendance error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ------------- SERVER -------------

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
