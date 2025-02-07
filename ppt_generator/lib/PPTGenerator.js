const Together = require("together-ai");
const PptxTemplateEngine = require("./PptxTemplateEngine");
const fs = require("fs");
const path = require("path");
const { models, apiKey } = require("../../config");
const colorSchemes = require("../utils/colorscheme.json");
const { delay, ParseJSON, getLayout } = require("../utils/utils");

class PPTGenerator {
  constructor(theme = "default") {
    this.client = new Together({ apiKey: apiKey });
    this.models = models;
    this.SLIDE_SYS_PROMPT = fs.readFileSync(
      path.join(__dirname, "SLIDE_SYS_PROMPT")
    );
    this.SCHEMA_SYS_PROMPT = fs.readFileSync(
      path.join(__dirname, "SCHEMA_SYS_PROMPT")
    );
    this.templateEngine = new PptxTemplateEngine(colorSchemes[theme]);
    this.imageDir = path.join(__dirname, "img");
    if (!fs.existsSync(this.imageDir)) {
      fs.mkdirSync(this.imageDir, { recursive: true });
    }
  }

  get pptSchemaPrompt() {
    return this.SCHEMA_SYS_PROMPT?.toString();
  }

  get pptSlidePrompt() {
    return this.SLIDE_SYS_PROMPT?.toString();
  }

  async generateSchema(prompt) {
    const response = await this.client.chat.completions.create({
      messages: [
        { role: "system", content: this.pptSchemaPrompt },
        { role: "user", content: prompt },
      ],
      model: this.models.meta_lang,
      temperature: 0.7,
    });

    await delay(2000);
    return ParseJSON(response.choices[0].message.content);
  }

  async generateSlide({ title, description }) {
    const response = await this.client.chat.completions.create({
      messages: [
        { role: "system", content: this.pptSlidePrompt },
        {
          role: "user",
          content: `Title: ${title}\nDescription: ${description}`,
        },
      ],
      model: this.models.meta_lang,
      temperature: 0.7,
    });
    await delay(2000);
    return ParseJSON(response.choices[0].message.content);
  }

  async generateImage(fluxPrompt) {
    try {
      const imageResponse = await this.client.images.create({
        model: this.models.flux,
        prompt: fluxPrompt,
        width: 1024,
        height: 1024,
        steps: 1,
        n: 1,
        response_format: "b64_json",
      });
      await delay(2000);
      const base64Image = imageResponse.data[0].b64_json;
      const imagePath = path.join(this.imageDir, `slide_${Date.now()}.png`);
      fs.writeFileSync(imagePath, base64Image, "base64");
      return imagePath;
    } catch (error) {
      console.error("Image generation error:", error);
      return null;
    }
  }

  async generatePresentation(prompt, outputPath) {
    try {
      const schema = await this.generateSchema(prompt);
      const slides = [];
      console.dir(
        {
          schema,
        },
        { depth: null }
      );

      for (const slide of schema.slides) {
        // Generate slide data for the current slide.
        let slideData = await this.generateSlide({ ...slide });

        // Iterate over all keys in slideData.
        for (const key of Object.keys(slideData)) {
          // Process keys that start with "content".
          if (key.startsWith("content")) {
            const contentData = slideData[key];

            // Define a helper function to process a single item.
            const processImageItem = async (item) => {
              if (item?.type === "image" && item?.fluxPrompt) {
                const imagePath = await this.generateImage(item.fluxPrompt);
                if (imagePath) {
                  // Remove the fluxPrompt property and add the image path.
                  delete item.fluxPrompt;
                  item.path = imagePath;
                }
              }
            };

            // If the content value is an array, process each element.
            if (Array.isArray(contentData)) {
              for (const item of contentData) {
                await processImageItem(item);
              }
            }
            // If the content value is a single object, process it directly.
            else if (contentData && typeof contentData === "object") {
              await processImageItem(contentData);
            }
          }
        }

        // Push the processed slideData into the slides array.
        slides.push(slideData);
      }

      for (const slide of slides) {
        console.dir({ slide }, { depth: null });
        this.templateEngine.addSlide(slide.layout, slide);
      }

      // Step 5: Generate the final PPTX file
      const fileName = `${schema.presentation_title?.replaceAll(" ","_")}_${Date.now()}.pptx`
      await this.templateEngine.generatePresentation(
        outputPath || `./public/${fileName}`
      );
      console.log(
        "Presentation created successfully at: ",
        outputPath || `./public/${fileName}`
      );
      return {
        status: "success",
        fileName,
        path: outputPath || `./public/${fileName}`,
      };
    } catch (error) {
      console.error("Presentation generation error:", error);
      return { status: "error", message: error.message };
    }
  }
}

module.exports = PPTGenerator;
