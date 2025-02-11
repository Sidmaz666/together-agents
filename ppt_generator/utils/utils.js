// Sleep function to introduce delay
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Function to sanitize and parse JSON from AI response
function sanitizeAndParseJson(jsonString) {
  // Try to parse the string directly as JSON.
  try {
    return JSON.parse(jsonString);
  } catch (initialError) {
    // If direct parsing fails, try to extract JSON from a markdown code block.
    // This regex matches triple backticks with an optional "json" specifier.
    const codeBlockRegex = /```(?:json\s*)?\n?([\s\S]*?)\n?```/i;
    const match = jsonString.match(codeBlockRegex);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch (codeBlockError) {
        throw new Error(
          `Error parsing JSON from extracted code block: ${codeBlockError.message}`
        );
      }
    }
    // If no code block is found, throw the original error.
    throw new Error(`Invalid JSON input: ${initialError.message}`);
  }
}

/**
 * Function to generate slide JSON output based on provided slide data.
 * The slideData object should at least include:
 *   - title: string (required)
 * Optionally it may include:
 *   - subtitle: string
 *   - content: an object or an array of content objects (each with its own type, text, etc.)
 *   - centeredText: an array of content objects (for the “Centered Text” layout)
 *
 * Available layouts:
 *  [
 *    'Title Slide',
 *    'Title Content',
 *    'Title and 2 Content',
 *    'Title Subtitle Content',
 *    'Centered Text',
 *    'Title, Two Content and Content',
 *    'Title Content and Two Content',
 *    'Title Two Content Over Content',
 *    'Title Content Over Content',
 *    'Title 4 Content',
 *    'Title 6 Content'
 *  ]
 *
 * The function analyzes the content and returns an object with two keys:
 *   - layout: the chosen layout name (string)
 *   - data: the JSON object matching the templateEngine format for that layout.
 *
 * @param {Object} slideData - The input slide data.
 * @returns {Object} An object with { layout, data }.
 */
function generateSlideLayout(slideData) {
  if (!slideData || !slideData.title) {
    throw new Error("Invalid slide data: Title is required.");
  }

  // Initialize the JSON with the title.
  const slideJSON = {
    title: { text: slideData.title },
  };

  let layout = "";

  // 1. If a "centeredText" property is provided (an array with at least one element), use the "Centered Text" layout.
  if (
    slideData.centeredText &&
    Array.isArray(slideData.centeredText) &&
    slideData.centeredText.length > 0
  ) {
    layout = "Centered Text";
    slideJSON.centeredText = slideData.centeredText;
    return { layout, data: slideJSON };
  }

  // Normalize content into an array (if provided).
  let contentArray = [];
  if (slideData.content) {
    contentArray = Array.isArray(slideData.content)
      ? slideData.content
      : [slideData.content];
  }

  // 2. If a subtitle is provided, attach it and use that information to decide the layout.
  if (slideData.subtitle) {
    slideJSON.subtitle = { text: slideData.subtitle };

    if (contentArray.length === 0) {
      // Only title and subtitle exist → "Title Slide"
      layout = "Title Slide";
      return { layout, data: slideJSON };
    } else if (contentArray.length === 1) {
      // A single content block plus subtitle → "Title Subtitle Content"
      layout = "Title Subtitle Content";
      slideJSON.content = contentArray[0];
      return { layout, data: slideJSON };
    } else if (contentArray.length === 2) {
      // Exactly two content blocks → "Title and 2 Content"
      layout = "Title and 2 Content";
      slideJSON.contentLeft = contentArray[0];
      slideJSON.contentRight = contentArray[1];
      return { layout, data: slideJSON };
    } else if (contentArray.length === 3) {
      // Three content blocks; use a layout that distinguishes between a top and two bottom areas.
      layout = "Title, Two Content and Content";
      slideJSON.contentTopLeft = contentArray[0];
      slideJSON.contentTopRight = contentArray[1];
      slideJSON.contentBottom = contentArray[2];
      return { layout, data: slideJSON };
    } else if (contentArray.length === 4) {
      // Four content blocks → "Title 4 Content"
      layout = "Title 4 Content";
      slideJSON.content1 = contentArray[0];
      slideJSON.content2 = contentArray[1];
      slideJSON.content3 = contentArray[2];
      slideJSON.content4 = contentArray[3];
      return { layout, data: slideJSON };
    } else if (contentArray.length === 6) {
      // Six content blocks → "Title 6 Content"
      layout = "Title 6 Content";
      slideJSON.content1 = contentArray[0];
      slideJSON.content2 = contentArray[1];
      slideJSON.content3 = contentArray[2];
      slideJSON.content4 = contentArray[3];
      slideJSON.content5 = contentArray[4];
      slideJSON.content6 = contentArray[5];
      return { layout, data: slideJSON };
    } else {
      // For any other number of content items, default to a flexible layout.
      layout = "Title Content";
      slideJSON.content = contentArray;
      return { layout, data: slideJSON };
    }
  } else {
    // 3. If no subtitle is provided.
    if (contentArray.length === 0) {
      // Only a title exists → fallback to a simple "Title Slide"
      layout = "Title Slide";
      return { layout, data: slideJSON };
    } else if (contentArray.length === 1) {
      // A single content block → "Title Content"
      layout = "Title Content";
      slideJSON.content = contentArray[0];
      return { layout, data: slideJSON };
    } else if (contentArray.length === 2) {
      // Two content blocks → "Title and 2 Content"
      layout = "Title and 2 Content";
      slideJSON.contentLeft = contentArray[0];
      slideJSON.contentRight = contentArray[1];
      return { layout, data: slideJSON };
    } else if (contentArray.length === 3) {
      // Three content blocks: a common industry practice is to use a layout that splits the content into two areas on top and one on bottom.
      // (If needed, additional heuristics can be applied by checking content types.)
      layout = "Title, Two Content and Content";
      slideJSON.contentTopLeft = contentArray[0];
      slideJSON.contentTopRight = contentArray[1];
      slideJSON.contentBottom = contentArray[2];
      return { layout, data: slideJSON };
    } else if (contentArray.length === 4) {
      // Four content blocks → "Title 4 Content"
      layout = "Title 4 Content";
      slideJSON.content1 = contentArray[0];
      slideJSON.content2 = contentArray[1];
      slideJSON.content3 = contentArray[2];
      slideJSON.content4 = contentArray[3];
      return { layout, data: slideJSON };
    } else if (contentArray.length === 6) {
      // Six content blocks → "Title 6 Content"
      layout = "Title 6 Content";
      slideJSON.content1 = contentArray[0];
      slideJSON.content2 = contentArray[1];
      slideJSON.content3 = contentArray[2];
      slideJSON.content4 = contentArray[3];
      slideJSON.content5 = contentArray[4];
      slideJSON.content6 = contentArray[5];
      return { layout, data: slideJSON };
    } else {
      // For any other number of content blocks, default to "Title Content" with all items merged.
      layout = "Title Content";
      slideJSON.content = contentArray;
      return { layout, data: slideJSON };
    }
  }
}

module.exports = {
  delay: sleep,
  ParseJSON: sanitizeAndParseJson,
  getLayout: generateSlideLayout
};
