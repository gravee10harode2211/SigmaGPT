
import express from "express";
import rateLimit from "express-rate-limit";
import Threads from "../models/Threads.js";
import getChatCompletion from "../utils/openai.js";

const router = express.Router();

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
});

router.get("/thread", async (req, res) => {
  try {
    const threads = await Threads.find({})
      .sort({ updatedAt: -1 })
      .select("threadId title updatedAt");

    res.json(threads);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "Failed to fetch threads" });
  }
});

router.get("/thread/:threadId", async (req, res) => {
  try {
    const thread = await Threads.findOne({
      threadId: req.params.threadId,
    });

    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    res.json(thread.messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch chat" });
  }
});

router.delete("/thread/:threadId", async (req, res) => {
  try {
    const deleted = await Threads.findOneAndDelete({
      threadId: req.params.threadId,
    });

    if (!deleted) {
      return res.status(404).json({ error: "Thread not found" });
    }

    res.json({ success: "Thread deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete thread" });
  }
});

router.post("/chat", chatLimiter, async (req, res) => {
  const { threadId, message } = req.body || {};

  if (!threadId || !message) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    let thread = await Threads.findOne({ threadId });

    if (!thread) {
      thread = new Threads({
        threadId,
        title: message.trim().slice(0, 40),
        messages: [],
      });
    }

    thread.messages.push({
      role: "user",
      content: message,
    });

    const history = thread.messages.map(({ role, content }) => ({
      role,
      content,
    }));
console.log("HISTORY:", history);
console.log("IS ARRAY:", Array.isArray(history));
    const assistantReply = await getChatCompletion(history);

    thread.messages.push({
      role: "assistant",
      content: assistantReply,
    });

    await thread.save();

    res.json({ reply: assistantReply });
  } catch (err) {
    console.error("CHAT ERROR:", err);
    console.error("FULL ERROR:", err.stack);
    res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;
