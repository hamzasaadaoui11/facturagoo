import express from 'express';
import { createServer as createViteServer } from 'vite';
import puppeteer from 'puppeteer';
import * as path from 'path';
import cors from 'cors';

// Global browser instance to avoid cold starts on every PDF generation
let globalBrowser: any = null;

async function getBrowser() {
  if (!globalBrowser) {
    globalBrowser = await puppeteer.launch({ 
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    });
  }
  return globalBrowser;
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (globalBrowser) await globalBrowser.close();
  process.exit(0);
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  app.post('/api/pdf', async (req, res) => {
    let page;
    try {
      const { html, filename } = req.body;
      
      if (!html) {
        return res.status(400).json({ error: 'HTML content missing' });
      }

      const browser = await getBrowser();
      page = await browser.newPage();
      
      // We set content exactly as a print context
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Inject standard print CSS implicitly matched by browser native print
      await page.addStyleTag({
        content: `
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
            margin: 0;
            padding: 0;
            font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
          }
          @page { margin: 0; size: A4; }
        `
      });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: false,
        margin: { top: 0, bottom: 0, left: 0, right: 0 }
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename || 'document.pdf'}"`);
      res.send(Buffer.from(pdfBuffer));

    } catch (error) {
      console.error('PDF generation error:', error);
      res.status(500).json({ error: 'Failed to generate PDF' });
    } finally {
      if (page) {
        await page.close(); // Only close the tab, keep the browser alive for the next user
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
