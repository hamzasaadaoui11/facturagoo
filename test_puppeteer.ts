import puppeteer from 'puppeteer';

async function test() {
  try {
    console.log('Launching puppeteer...');
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    console.log('Puppeteer launched successfully!');
    await browser.close();
  } catch (err) {
    console.error('Puppeteer failed:', err);
    process.exit(1);
  }
}
test();
