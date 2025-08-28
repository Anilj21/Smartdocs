const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;
    console.log("user message: ", userMessage);
    
    const response = await axios({
      method: 'post',
      url: 'http://localhost:11434/api/chat',
      data: {
        model: 'llama3.1:8b',
        messages: [{ role: 'user', content: userMessage }]
      },
      responseType: 'stream' // Get a streaming response
    });

    let fullMessage = '';

    response.data.on('data', (chunk) => {
      const lines = chunk.toString().trim().split('\n');
      for (const line of lines) {
        if (line) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.message?.content) {
              fullMessage += parsed.message.content;
            }
          } catch (err) {
            console.error('Error parsing JSON chunk:', err);
          }
        }
      }
    });

    response.data.on('end', () => {
      // ✅ Send only once after stream finishes
      res.json({ reply: fullMessage });
    });

    response.data.on('error', (err) => {
      console.error('Stream error:', err);
      res.status(500).send('Error receiving stream from Ollama');
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error communicating with Ollama');
  }
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
