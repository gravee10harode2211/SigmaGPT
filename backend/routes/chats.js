// import express from "express";
// import Threads from "../models/Threads.js";
// import getOpenAIAPIResponse from "../utils/openai.js";

// const router=express.Router();

// //test
// router.post("/test",async(req,res)=>{
//     try{
//         const thread=new Threads({
//             threadId:"xyz",
//             title:"Testing New Thread"
//         });
//         const response=await thread.save();
//         res.send(response);

//     }catch(err){
//         console.log(err);
//         res.status(500).json({error:"failed to save in DB"});
//     }
// });

// //get all threads
// router.get("/thread", async(req,res)=>{
// try{
//     const threads = await Threads.find({}).sort({ updatedAt: -1 });
//     res.json(threads);
// }catch(err){
//     console.log(err);
//     res.status(500).json({error:"Failed to fetch threads"});
// }
// });

// //perticular thread

// router.get("/thread/:threadId",async(req,res)=>{
//     const{threadId}=req.params;

//     try{
//         const thread=await Threads.findOne({threadId});

//         if(!thread){
//             return res.status(404).json({error:"Thread is not found"});
//         }
//         res.json(thread.messages);
//     }catch(err){
//         console.log(err);
//         res.status(500).json({error:"Fialed to fetch chat"});
//     }
// });

// //delete
// router.delete("/thread/:threadId",async(req,res)=>{
//     const{threadId}=req.params;
//     try{
//         const deletedThread=await Threads.findOneAndDelete({threadId});
//         if(!deletedThread){
//            return res.status(404).json({error:"Thread not found"});

//         }
//         res.status(200).json({success:"Thread deleted successfully"});

//     }catch(err){
//         console.log(err);
//         res.status(500).json({error:"Failed to delete thread"});
//     }
// });

// //main route

// router.post("/chat",async(req,res)=>{
//     const{threadId,messages}=req.body || {};
//     if(!threadId || !messages){
//        return  res.status(400).json({error:"missing required fields"});

//     }
//     try{
//         let thread=await Threads.findOne({threadId});
//         if(!thread){
//             //create  new thread0
//             thread = new Threads({
//                 threadId,
//                 title:messages,
//                 messages:[{role:"user",content:messages}]
//             });
//         }else{
//             thread.messages.push({role:"user",content:messages});
//         }
//        const assistantReply = await getOpenAIAPIResponse(messages);

//        thread.messages.push({role:"assistant",content:assistantReply});
//        thread.updatedAt=new Date();

//        await thread.save();
//        res.json({reply:assistantReply});
//     }catch(err){
//         console.log(err);
//         res.status(500).json({error:"something went wrong"});
//     }

// });

// export default router;

import express from "express";
import rateLimit from "express-rate-limit";
import Threads from "../models/Threads.js";
import getChatCompletion from "../utils/openai.js";

const router = express.Router();

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  keyGenerator: (req) => String(req.userId),
  message: { error: "Too many messages, slow down a little" },
});

router.get("/thread", async (req, res) => {
  try {
    const threads = await Threads.find({ userId: req.userId })
      .sort({ updatedAt: -1 })
      .select("threadId title updatedAt");
    res.json(threads);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch threads" });
  }
});

router.get("/thread/:threadId", async (req, res) => {
  try {
    const thread = await Threads.findOne({
      threadId: req.params.threadId,
      userId: req.userId,
    });
    if (!thread) return res.status(404).json({ error: "Thread not found" });
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
      userId: req.userId,
    });
    if (!deleted) return res.status(404).json({ error: "Thread not found" });
    res.json({ success: "Thread deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete thread" });
  }
});

router.post("/chat", chatLimiter, async (req, res) => {
    console.log("CHAT API HIT");
console.log("Request Body:", req.body);
console.log("Groq Key Exists:", !!process.env.GROQ_API_KEY);
  const { threadId, message } = req.body || {};

  if (
    typeof threadId !== "string" ||
    !threadId ||
    typeof message !== "string" ||
    !message.trim()
  ) {
    return res.status(400).json({ error: "threadId and message are required" });
  }
  if (message.length > 4000)
    return res.status(400).json({ error: "Message too long" });

  try {
    let thread = await Threads.findOne({ threadId, userId: req.userId });

    if (!thread) {
      thread = new Threads({
        userId: req.userId,
        threadId,
        title: message.trim().slice(0, 40),
        messages: [],
      });
    }

    thread.messages.push({ role: "user", content: message });

    const history = thread.messages.map(({ role, content }) => ({
      role,
      content,
    }));
    const assistantReply = await getChatCompletion(history);
    console.log("AI Reply:", assistantReply);

    thread.messages.push({ role: "assistant", content: assistantReply });
    await thread.save();

    res.json({ reply: assistantReply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;
