import dotenv from 'dotenv';
import express from 'express';
import mongoclient from './Database/db.js'; 
import cors from 'cors';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001; 
app.use(cors())
app.use(express.json()); 

const db = mongoclient.db("Annotations");

app.post('/annotations', async (req, res) => {
  const data = req.body;
  const predictedCollection = db.collection("Predicted");
  const correctedCollection = db.collection("Corrected");

  try {
    const correctedResult = await correctedCollection.insertOne(data);
    const predictedResult = await predictedCollection.updateOne(
      { patient_id: data.patient_id, prescription: data.prescription },
      { $set: { corrected: true } }
    );
    res.status(201).json({ corrected: correctedResult, predicted: predictedResult });
  } catch (error) {
    res.status(500).json({ message: 'Error processing corrections', error: error.message });
  }
});

app.post('/login', async (req, res) => {
  const { userName, password } = req.body;

  try {
    const user = await db.collection('Users').findOne({ userName });
    if (user && user.password === password) {
      res.json({ success: true });
    } else {
      res.json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error accessing user data', error: error.message });
  }
});


app.get('/uncorrected-annotations', async (req, res) => {
  try {
    const uncorrectedData = await db.collection("Predicted")
    .find({
      $or: [
        { corrected: { $exists: false } }, 
        { corrected: false }              
      ]
    })
    .limit(10)
    .toArray();
  
    res.status(200).json(uncorrectedData);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching uncorrected data', error: error.message });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});