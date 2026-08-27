require('dotenv').config({ path: '../.env.local' });

async function run() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  console.log(data.models.map(m => m.name).join('\n'));
}
run();
