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

app.get('/open-chrome', async (req, res, next) => {
    console.log('open-chrome');

    const browser = await playwright.chromium.launch();

      const page = await browser.newPage();

      await page.goto('https://www.nintendo.com/us/search/#p=1&cat=gme&sort=df');

    const headings = await page.locator('div.Duonm');

    for (let i = 0; i < await headings.count(); i++) {
        console.log(await headings.nth(i).innerText());
    }

      await browser.close();
});

app.get('/scrape', (req, res, next) => {
  //const url = req.query.url;
  //const url = 'https://www.nintendo.com/us/store/sales-and-deals';
  const url = 'https://www.nintendo.com/us/search/#p=1&cat=gme&sort=df';

  try {
    axios.get(url).then(response => {
        console.log(response);
      /* console.log(response.data);
      console.log(response.status);
      console.log(response.statusText);
      console.log(response.headers);
      console.log(response.config); */

        const html = response.data;
        const $ = cheerio.load(html);

        let htmlStr = $('script[id="__NEXT_DATA__"]').text();
        logger.info(htmlStr);

        //let result = JSON.parse(htmlStr);
        //console.log(result.props.pageProps);
        //res.status(200).send(result.props.pageProps.page.content.merchandisedGrid);

        /* for(let k in result.props.pageProps.page.content.merchandisedGrid) {
          console.log(k, result.props.pageProps.page.content.merchandisedGrid[k].name);
        } */
      }).catch(error => {
        console.log('error', error);
      });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error accessing the URL" });
  }
});

app.listen(port, () => {
  console.log(`Express server listening at http://localhost:${port}`);
});