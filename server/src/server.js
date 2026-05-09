const express = require('express');
const connectDB = require('./config/database');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config({
  path: path.resolve(__dirname, '../.env')  
});

const pythonScriptPath = path.resolve(__dirname, '../src/services/embedding_server.py');
const pythonProcess = spawn('python3', [pythonScriptPath], {
  stdio: 'inherit'
});
pythonProcess.on('error', (err) => {
  console.error('Failed to start Python embedding server:', err);
});
process.on('exit', () => pythonProcess.kill());


const app = express();
app.use(cors());
connectDB();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from the backend!' });
});
app.use('/api/auth', require('./routes/auth'));
app.use('/api/invites', require('./routes/invites'));
app.use('/api/users', require('./routes/users'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/features', require('./routes/features'));
app.use('/api/epics', require('./routes/epics'));
app.use('/api/project', require('./routes/project'));
app.use("/api/llm", require("./routes/llm"));
app.use('/api/context-files', require('./routes/contextFiles'));
app.use('/api/user-interactions', require('./routes/userInteractions'));

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
