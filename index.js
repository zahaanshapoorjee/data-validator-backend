// Load environment variables from .env file
import dotenv from 'dotenv';
import express from 'express';
import mongoclient from './Database/db.js'; // Ensure db.js exports using ES6 modules
import cors from 'cors';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001; // Fallback to 3001 if PORT isn't set
app.use(cors())
app.use(express.json()); // Use express.json middleware to parse JSON bodies

// Get the database connection
const db = mongoclient.db("Annotations"); // Adjust "Annotations" if your DB name is different

app.post('/annotations', async (req, res) => {
  const data = req.body;
  const predictedCollection = db.collection("Predicted");
  const correctedCollection = db.collection("Corrected");

  try {
    // Insert the corrected data into the 'Corrected' collection
    const correctedResult = await correctedCollection.insertOne(data);

    // Update the 'corrected' field to 'true' in the 'Predicted' collection
    // Use both `patient_id` and `prescription` to identify the record
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
      // If password matches
      res.json({ success: true });
    } else {
      // If no user is found or password does not match
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