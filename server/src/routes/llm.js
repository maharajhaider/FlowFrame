const express = require('express');
const { generateSprintStructure } = require("../services/llmtaskGenerator");

const router = express.Router();

router.post("/generate-sprint", async (req, res) => {
  const { prompt, attachments = [] } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const sprintData = await generateSprintStructure(prompt, attachments);
    res.json(sprintData);
  } catch (err) {
    console.error("LLM Error:", err);
    res.status(500).json({ error: "Failed to generate sprint tasks." });
  }
});

module.exports = router;
