const axios = require("axios");

// Helper functions
async function fetchProxyList() {
  const url =
    "https://github.com/zloi-user/hideip.me/raw/refs/heads/master/https.txt";
  const response = await axios.get(url);
  const data = response.data
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((e) => e.split(":").slice(0, 2).join(":"));
  return data;
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDelay(min, max) {
  return new Promise((resolve) => setTimeout(resolve, randomNumber(min, max)));
}

// Convert the difference to a human-readable format
function formatTime(ms) {
  let seconds = Math.floor(ms / 1000);
  let minutes = Math.floor(seconds / 60);
  let hours = Math.floor(minutes / 60);

  // Calculate remaining seconds and minutes
  seconds = seconds % 60;
  minutes = minutes % 60;

  // Format the output
  let result = [];
  if (hours > 0) result.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes > 0) result.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  if (seconds > 0 || result.length === 0) {
      // Include milliseconds if less than 1 second
      if (ms < 1000) {
          result.push(`${ms} millisecond${ms > 1 ? 's' : ''}`);
      } else {
          result.push(`${seconds} second${seconds > 1 ? 's' : ''}`);
      }
  }

  return result.join(', ');
}

module.exports = {
  fetchProxyList,
  randomDelay,
  randomNumber,
};
