
import "dotenv/config";

const getChatCompletion = async (messages) => {
  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages: messages,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.log("Groq API Error:", data);
      throw new Error(data.error?.message || "Groq API request failed");
    }

    return data.choices[0].message.content;

  } catch (err) {
    console.log("Chat Completion Error:", err);
    throw err;
  }
};

export default getChatCompletion;
