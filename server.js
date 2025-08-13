// server.js
const express = require('express');
const { createPsdBuffer } = require('ag-psd');
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// API: تبدیل JSON Fabric.js به فایل PSD
app.post('/export-to-psd', (req, res) => {
  try {
    const { objects, width = 800, height = 600, name = 'template' } = req.body;

    if (!Array.isArray(objects)) {
      return res.status(400).json({ error: 'Invalid objects array' });
    }

    // تبدیل اشیاء Fabric.js به لایه‌های PSD
    const layers = objects
      .filter(obj => obj.data && obj.data.left !== undefined)
      .map((obj, idx) => {
        const data = obj.data;
        const left = data.left || 0;
        const top = data.top || 0;
        const width = (data.width || 0) * (data.scaleX || 1);
        const height = (data.height || 0) * (data.scaleY || 1);

        const layer = {
          name: obj.layer_name || `${obj.type}_layer_${idx}`,
          left: Math.round(left),
          top: Math.round(top),
          right: Math.round(left + width),
          bottom: Math.round(top + height),
          blendMode: 'normal',
          visible: data.visible !== false,
        };

        // پشتیبانی از متن
        if (obj.type === 'textbox' && data.text) {
          layer.text = {
            value: data.text,
            font: data.fontFamily || 'Arial',
            size: data.fontSize || 16,
            color: hexToRgb(data.fill || '#000000'),
          };
        }

        return layer;
      });

    // ایجاد فایل PSD
    const psd = { width, height, children: layers };
    const buffer = createPsdBuffer(psd, { compression: 'raw' });

    // ارسال به کاربر به عنوان دانلود
    res.setHeader('Content-Type', 'application/x-photoshop');
    res.setHeader('Content-Disposition', `attachment; filename="${name}.psd"`);
    res.send(buffer);

  } catch (err) {
    console.error('PSD Export Error:', err);
    res.status(500).json({ error: 'Failed to create PSD', details: err.message });
  }
});

// کمکی: تبدیل رنگ هگز به RGB
function hexToRgb(hex) {
  const match = hex.replace('#', '').match(/.{1,2}/g);
  if (!match) return { r: 0, g: 0, b: 0 };
  const [r, g, b] = match.map(val => parseInt(val, 16));
  return { r: Math.max(0, Math.min(255, r || 0)),
           g: Math.max(0, Math.min(255, g || 0)),
           b: Math.max(0, Math.min(255, b || 0)) };
}

// تست سلام
app.get('/', (req, res) => {
  res.send(`
    <h2>✅ سرویس PSD آماده است!</h2>
    <p>از <code>POST /export-to-psd</code> برای تبدیل JSON به PSD استفاده کنید.</p>
    <pre>
POST Body Example:
{
  "objects": [...],
  "width": 1000,
  "height": 800,
  "name": "my-design"
}
    </pre>
  `);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`PSD Service running on port ${port}`);
});