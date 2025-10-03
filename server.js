// https://dev.to/drruvari/building-a-web-scraper-with-reactjs-express-and-tailwindcss-a-journey-into-data-collection-31g9
// https://books.toscrape.com/


const playwright = require("playwright")
const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const winston = require('winston');
const cors = require("cors");
const port = 3000;
const app = express();
app.use(cors());

const logger = winston.createLogger({
  level: 'info', // Set the minimum level of messages to log (e.g., 'info', 'debug', 'error')
  format: winston.format.combine(
    winston.format.timestamp(), // Add a timestamp to your logs
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`; // Customize your log format
    })
  ),
  transports: [
    //new winston.transports.Console(), // Optional: Log to console as well
    new winston.transports.File({ filename: 'patrick.log' }) // Log to a file named 'app.log'
  ]
});

app.get('/', (req, res, next) => {
  res.send('Hello World from Express!');
});

app.get('/scrape', async (req, res, next) => {
    //let url = 'https://www.nintendo.com/us/search/#p=1&cat=gme&sort=df';
    let url = 'https://www.nintendo.com/us/store/games/#p=1&sort=df&show=0&f=topLevelFilters&topLevelFilters=Deals';

    const browser = await playwright.chromium.launch();

      const page = await browser.newPage();

      await page.goto(url);

    // A locator is not iterable per se
    // each parentDiv has 4 child divs...
    const parentDivs = await page.locator('div.HRRF1').all();
    let games = [];

    // await parentDiv.locator("> *").all();  -- lists the 4 child divs...
    console.log('pat1');

    for (const parentDiv of parentDivs) {
        let firstDiv = await parentDiv.locator("> *").first().locator("> *").first().innerText();
        let count = await parentDiv.locator("> *").first().locator("> *").count();
        let title = 'unknown';
        let releaseDate = 'unknown';

        if(count == 2) { // not discounted
            title = await parentDiv.locator("> *").first().locator("> *").first().innerText();
            releaseDate = await parentDiv.locator("> *").first().locator("> *").nth(1).innerText();
        }

        games.push({title: title, release_date: releaseDate.split(' ')[1]});
        continue;

        //let firstDiv = await parentDiv.locator('div:nth-child(1)'); // i guess this is if you have 4 sibling divs?  // J5IPV
        //let title = await firstDiv.locator('h3').nth(0).innerText();    // sometimes it's h2 or h3....
        //console.log('title', title);
        //let releaseDate = await firstDiv.locator('div').nth(0).innerText();

        //let thirdDiv = await parentDiv.locator('div:nth-of-type(3)');   // MVVbT
        //console.log(thirdDiv.innerHTML())
        //let regularPrice = await thirdDiv.locator('div').nth(1).locator('span').nth(0).allTextContents(); // nth(0) is the first span child... nests, grandchild, great-grandchild, etc....

        //let salePrice = await thirdDiv.locator('div').nth(0).innerHTML();   //_8rhZP
        //let pat = await thirdDiv.locator('div').nth(1).innerHTML();   // _5cBXA, can have 1 to 3 child elements...
        //let pat = await thirdDiv.locator('div').nth(1).nth(0).count();  // if 1 - not on sale
        //let pat = await thirdDiv.locator('div').nth(1).nth(1).count();    // if > 1 - has a discount?
        //console.log(thirdDiv.innerHTML());


        games.push({title: title, release_date: releaseDate, regular_price: regularPrice[0].split(':')[1]});
        continue;


        const childDivs = await parentDiv.locator('>div').all();    // .all() if you want to loop through it as an array...

        for (const childDiv of childDivs) {
            let count = await childDiv.locator('h3').count();
            if(count == 0) continue;

            let h3 = await childDiv.locator('h3');
            let title = await h3.innerText();

            let div = await childDiv.locator('div.k9MOS');
            let releaseDate = await div.innerText();

            games.push({title: title, releaseDate: releaseDate});
        }
        //let h2 = el.locate('h2["style"]="--lines: 2;"');    // --lines: 2;
        //const textContent = await h2.textContent();
        //console.log(`List item text: ${textContent}`);
    }

      await browser.close();
    res.send(games);
});

app.listen(port, () => {
  console.log(`Express server listening at http://localhost:${port}`);
});