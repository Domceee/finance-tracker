import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';

const router = Router();
const apiKey = process.env.GEMINI_API_KEY;

router.post('/ask', async (req, res) => {
  const { prompt } = req.body;

  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
  }

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return res.json({
      answer: response.text ?? '',
    });
  } catch (error) {
    console.error('Gemini request failed:', error);
    return res.status(500).json({ error: 'Failed to get AI response' });
  }
});

export default router;
