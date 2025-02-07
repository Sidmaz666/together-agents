require("dotenv").config();

module.exports = {
  apiKey: process.env.API_KEY,
  models:{
    meta_vision : "meta-llama/Llama-Vision-Free",
    meta_lang: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
    flux:"black-forest-labs/FLUX.1-schnell-Free",
    stable: "stabilityai/stable-diffusion-xl-base-1.0",
    deepseek: "deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free"
  }
}
