const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('file:///Users/gerorawert/Documents/Github/MrTrewar.github.io/gym-tracker/index.html');
  await new Promise(r => setTimeout(r, 2000));
  
  const result = await page.evaluate(async () => {
    try {
      if(window.saveSession) await window.saveSession();
      return "SUCCESS";
    } catch(err) {
      return "ERROR: " + err.message;
    }
  });
  console.log(result);
  
  await browser.close();
})();
