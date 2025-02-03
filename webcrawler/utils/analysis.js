const Together = require("together-ai");
const config = require("../../config");
const { setTimeout: delay } = require("timers/promises"); // For adding delays

const together = new Together({
  apiKey: config.apiKey,
});

// Helper function to split content into chunks
function chunkContent(content, chunkSize = 3200) {
  const chunks = [];
  for (let i = 0; i < content.length; i += chunkSize) {
    chunks.push({
      index: chunks.length + 1,
      content: content.slice(i, i + chunkSize),
    });
  }
  return chunks;
}

// Helper function to merge JSON objects
function mergeJsonObjects(jsonArray) {
  const mergedJson = {};

  jsonArray.forEach(json => {
    if (json && typeof json === 'object') {
      Object.keys(json).forEach(key => {
        const value = json[key];

        if (value !== null && value !== undefined && value !== '') {
          if (mergedJson[key]) {
            if (Array.isArray(mergedJson[key])) {
              if (Array.isArray(value)) {
                mergedJson[key].push(...value);
              } else {
                mergedJson[key].push(value);
              }
            } else {
              if (Array.isArray(value)) {
                mergedJson[key] = [mergedJson[key], ...value];
              } else {
                mergedJson[key] = [mergedJson[key], value];
              }
            }
          } else {
            mergedJson[key] = value;
          }
        }
      });
    }
  });

  return mergedJson;
}

// Helper function to sanitize and parse JSON string
function sanitizeAndParseJson(jsonString) {
  try {
    // Use a more precise regular expression to extract JSON content
    const jsonMatch = jsonString.match(/```json\s*({.*})\s*```/s);
    if (jsonMatch) {
      const cleanedString = jsonMatch[1].trim();
      // Parse the cleaned JSON string
      return JSON.parse(cleanedString);
    } else {
      console.error("No valid JSON content found in the response.");
      return null;
    }
  } catch (e) {
    console.error("Error parsing JSON string:", e);
    return null;
  }
}

const analyze = async (
  pageSource,
  prompt = "Please extract the following data:",
  source = 0
) => {
  const htmlContent = `${pageSource?.meta || ""}\n${pageSource?.body || ""}`;
  const chunks = chunkContent(htmlContent);
  const totalChunks = chunks.length;

  console.log(`Total chunks to process: ${totalChunks}`);

  const jsonResponses = [];

  // Process chunks sequentially
  for (const { index, content } of chunks) {
    console.log(`Processing chunk ${index}/${totalChunks}`);

    const messages = [
      {
        role: "system",
        content: `You are an expert web crawler and data extraction specialist. Your primary responsibility is to analyze raw HTML or structured data provided to you, extract relevant information, and format it into well-structured JSON output. Your tasks include:

Data Analysis: Carefully examine the raw data (e.g., HTML, XML, or other structured formats) to identify and extract the required information based on the user's instructions.

JSON Structure Compliance: Strictly follow any JSON schema, structure, or formatting guidelines provided by the user. If no specific structure is provided, organize the data into a logical and consistent JSON format.

Data Cleaning: Ensure the extracted data is clean, accurate, and free of unnecessary noise (e.g., extra spaces, irrelevant tags, or redundant information).

Error Handling: If the raw data is incomplete, inconsistent, or lacks the required information, notify the user with a clear explanation of the issue.

Output Precision: Provide only the JSON data as your output response. Do not include any additional commentary, explanations, or metadata unless explicitly requested by the user.

Scalability: Handle large datasets efficiently, ensuring the JSON output is optimized for readability and usability.

User Instructions: Prioritize and adhere to any specific instructions or constraints provided by the user regarding data extraction, formatting, or delivery.

Your goal is to deliver precise, well-formatted JSON data that meets the user's requirements, ensuring high accuracy and reliability in every task.`,
      },
      {
        role: "user",
        content: `${prompt}\n\nHTML_CHUNK [${index}/${totalChunks}]:\n${content}`,
      },
    ];

    try {
      // Get chunk response
      const chunkResponse = await together.chat.completions.create({
        messages,
        model: source === 0 ? config.models.meta_lang : config.models.deepseek,
        temperature: 0.2,
        max_tokens: null,
        stop: ["<|eot_id|>", "<|eom_id|>"],
      });

      // Store AI response
      const aiResponse = chunkResponse.choices[0]?.message?.content || "{}";

      console.log(`Chunk ${index}/${totalChunks} processed successfully.`);

      // Sanitize and parse JSON response
      const jsonResponse = sanitizeAndParseJson(aiResponse);
      if (jsonResponse) {
        jsonResponses.push(jsonResponse);
        console.log(`JSON response for chunk ${index}/${totalChunks} parsed successfully.`);
      } else {
        console.error(`Failed to parse JSON response for chunk ${index}/${totalChunks}.`);
      }
    } catch (error) {
      console.error(`Error processing chunk ${index}/${totalChunks}:`, error);
    }

    // Add a delay to avoid rate limiting (60 requests per minute = 1 request per second)
    await delay(2000); // 1 second delay
  }

  // Merge JSON responses
  const mergedJson = mergeJsonObjects(jsonResponses);
  console.log("JSON responses merged successfully.");

  return mergedJson;
};

module.exports = {
  analyze,
};
