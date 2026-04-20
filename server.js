import express from 'express';
import bodyParser from 'body-parser';
import { chromium } from 'playwright';

const app = express();
app.use(bodyParser.json());

app.post('/run-test', async (req, res) => {
  const { script } = req.body;

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await eval(script);

    await browser.close();

    res.json({ success: true });

  } catch (e) {
    // 🧠 DOM للـ auto-heal
    const html = await page.content();

    // 📸 screenshot من الصفحة الحقيقية (مهم!)
    const screenshot = await page.screenshot({
      encoding: 'base64',
      fullPage: true
    });

    await browser.close();

    res.json({
      success: false,
      error: e.message,
      dom: html,
      screenshot   // 🔥 هذا أهم تعديل
    });
  }
});

app.listen(3000, () => {
  console.log('🚀 MCP server running on port 3000');
});


