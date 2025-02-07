const express = require("express");
const { PuppeteerService, analyze } = require("./webcrawler");
const { PPTGenerator } = require("./ppt_generator");
const config = require("./config");
const path = require("path");

const app = express();
const port = 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/webcrawler", async (req, res) => {
  // Handle the POST request to /webcrawler
  const data = req.body;
  if (!data.link) {
    res.status(400).json({
      status: "error",
      message: "Link is required!",
    });
  }
  const link = data.link;
  const prompt = data.prompt || "";
  const source = data.source || 0;
  const start_time = Date.now();
  const puppeteerService = new PuppeteerService();
  await puppeteerService.initiate();
  const results = await puppeteerService.crawl(link);
  await puppeteerService.close();
  const analysisData = await analyze(results.pageSource, prompt, source); // 0 by default is eta and 1 is DeepSeek
  const scrape_data = {
    status: "success",
    source: source === 0 ? config.models.meta_lang : config.models.deepseek,
    link,
    user_prompt: prompt,
    scrapped_data: results,
    analysis_data: analysisData,
    start_time,
    end_time: Date.now(),
    message: `${link} scrapped successfully!`,
  };
  res.status(200).json({ ...scrape_data });
});

app.post("/generate/ppt", async (req, res) => {
  // Handle the POST request to /webcrawler
  const data = req.body;
  if (!data.prompt) {
    res.status(400).json({
      status: "error",
      message: "Prompt is required!",
    });
  }
  const prompt = data.prompt;
  const generator = new PPTGenerator();
  const start_time = Date.now();
  const { success, fileName } = await generator.generatePresentation(prompt);
  const ppt_data = {
    success,
    source: [config.models.meta_lang, config.models.flux],
    user_prompt: prompt,
    start_time,
    end_time: Date.now(),
    file: fileName,
    message: `PPT generated successfully!`,
  };
  res.status(200).json({ ...ppt_data });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
