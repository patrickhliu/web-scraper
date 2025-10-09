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

function stripHtml(html)
{
   html = html.replace(/<\/?[^>]+(>|$)/g, "");
   return html.replace(/[\n\r]/g, "");
}

app.get('/scrape', async (req, res, next) => {
    let filters = JSON.parse(req.query.filters);
    let slug = "store_game_en_us";

    if(filters.sort_by == "title")  {
        if(filters.sort_dir == "asc") slug = "store_game_en_us_title_asc";
        if(filters.sort_dir == "desc") slug = "store_game_en_us_title_des";
    } else if (filters.sort_by == "price") {
        if(filters.sort_dir == "asc") slug = "store_game_en_us_price_asc";
        if(filters.sort_dir == "desc") slug = "store_game_en_us_price_des";
    }

    let url = "https://u3b6gr4ua3-dsn.algolia.net/1/indexes/" + slug + "/query";
    const appId = 'U3B6GR4UA3';
    const apiKey = 'a29c6927638bfd8cee23993e51e721c9';

    const headers = {
        'Content-Type': 'application/json',
        'x-algolia-application-id': appId,
        'x-algolia-api-key': apiKey,
    };

    let body = {
        "query": req.query.q,
        "filters": "",
        "hitsPerPage": 50,
        "distinct": 0,
        "analytics": true,
        "facetingAfterDistinct": true,
        "clickAnalytics": true,
        "highlightPreTag": "^*^^",
        "highlightPostTag": "^*",
        "attributesToHighlight": [
            "description"
        ],
        "facets": [
            "*"
        ],
        "maxValuesPerFacet": 100,
        "page": req.query.current_page - 1,
    }

    let filterStr = "";
    if(filters.game_category) {
        for(let str of filters.game_category) {
            if(str == "games") str = "(NOT topLevelFilters:'DLC' AND NOT topLevelFilters:'Games with DLC' AND NOT topLevelFilters:'Upgrade pack')";
            if(str == "dlc") str = "(topLevelFilters:'DLC' AND NOT topLevelFilters:'Games with DLC')";
            if(str == "both") str = "(topLevelFilters:'Games with DLC')";
            if(str == "demo") str = "(topLevelFilters:'Demo available')";
            if(str == "voucher") str = "(topLevelFilters:'Game voucher eligible')";

            if(!filterStr) filterStr += str;
            else filterStr += " AND " + str;
        }
    }

    if(filters.console) {
        let str = "";
        //if(filters.console == "all") str = "(corePlatforms:'Nintendo Switch' OR corePlatforms:'Nintendo Switch 2')";
        if(filters.console == "switch1") str = "(corePlatforms:'Nintendo Switch')";
        else if(filters.console == "switch2") str = "(corePlatforms:'Nintendo Switch 2')";

        if(str) {
            if(!filterStr) filterStr += str;
            else filterStr += " AND " + str;
        }
    }

    if(filters.availability) {
        for(let str of filters.availability) {
            if(!filterStr) filterStr += "availability:'" + str + "'";
            else filterStr += " AND availability:'" + str + "'";
        }
    }

    if(filters.sales) {
        for(let str of filters.sales) {
            if(str == "sales") str = "(topLevelFilters:'Deals')";

            if(!filterStr) filterStr += str;
            else filterStr += " AND " + str;
        }
    }

    if(filters.format) {
        let str = "";
        //if(filters.format == "all") str = "(editions:'Physical' OR editions:'Digital')";
        if(filters.format == "physical") str = "(editions:'Physical')";
        else if(filters.format == "digital") str = "(editions:'Digital')";

        if(str) {
            if(!filterStr) filterStr += str;
            else filterStr += " AND " + str;
        }
    }

    if(filters.price_range) {
        let str = "";
        if(filters.price_range == 0) str = "(priceRange:'Free to start')";
        else if(filters.price_range == 1) str = "(priceRange:'$0 - $4.99')";
        else if(filters.price_range == 2) str = "(priceRange:'$5 - $9.99')";
        else if(filters.price_range == 3) str = "(priceRange:'$10 - $19.99')";
        else if(filters.price_range == 4) str = "(priceRange:'$40+')";

        if(str) {
            if(!filterStr) filterStr += str;
            else filterStr += " AND " + str;
        }
    }

    body.filters = filterStr;

    let results = [];
    let count = {
        dlc:0, deals:0, games_dlc:0, demo:0, voucher:0, upgrade:0
    };

    try {
        const response = await axios.post(url, body, { headers: headers });
        logger.info(JSON.stringify(response.data));
        count.dlc = response.data.facets.topLevelFilters.DLC;
        count.deals = response.data.facets.topLevelFilters.Deals;
        count.games_dlc = response.data.facets.topLevelFilters["Games with DLC"];
        count.demo = response.data.facets.topLevelFilters["Demo available"];
        count.voucher = response.data.facets.topLevelFilters["Game Voucher eligible"];
        count.upgrade = response.data.facets.topLevelFilters["Upgrade pack"];

        for(let o of response.data.hits) {
            const options = { year: 'numeric', month: 'numeric', day: 'numeric' };
            const oneDay = 1000 * 60 * 60 * 24;

            let now = Date.now(); // already in ms...
            let releaseDate = new Date(o.releaseDate);
            let discountEnds = null;

            if(o.price.salePrice) {
                discountEnds = o.eshopDetails.discountPriceEndTimestamp * 1000;
            }

            let game = {
                photo_url: o.productImageSquare ? o.productImageSquare : "https://assets.nintendo.com/image/upload/ar_16:9,w_500/" + o.productImage,
                title: o.title,
                release_date: releaseDate.toLocaleString('en-US', options),
                release_future: releaseDate > now,
                release_future_days: (releaseDate > now) ? Math.round(Math.abs(((Math.floor(releaseDate.getTime())) - now) / oneDay)) : null,
                platform_code : o.platformCode,
                current_price: o.price.salePrice,
                regular_price: o.price.regPrice,
                discount_percent: !o.price.salePrice ? 0 : Math.ceil(((o.price.regPrice - o.price.salePrice) / o.price.regPrice) * 100),
                discount_ends: !discountEnds ? null : Math.round(Math.abs((discountEnds - now) / oneDay)),
                availability: o.availability,
            }

            results.push(game);
        }

        res.send({
            results: results,
            count: count,
            total_pages: response.data.nbPages,
        });
    } catch (error) {
        //console.error('Error fetching data:', error);
        console.log('error2...' + filterStr);
    }
});

app.get('/scrape-old', async (req, res, next) => {
    let url = 'https://www.nintendo.com/us/search/#p=1&cat=gme&sort=df';
    //let url = 'https://www.nintendo.com/us/store/games/#p=1&sort=df&show=0&f=topLevelFilters&topLevelFilters=Deals';

    axios.get(url).then(response => {
        logger.info(response.data);
        console.log(response);
    }).catch(error => {
        console.error('Error fetching root:', error);
    });

    return;




    let browser = await playwright.chromium.launch();
    let page = await browser.newPage();
      await page.goto(url);

    let results = [];

    let gameDivs = await page.locator('div.y83ib').all();

    for (let gameDiv of gameDivs) {
        let photoUrl = '';
        let title = '';
        let releaseDate = '';
        let currentPrice = '';
        let regularPrice = '';

        try {
            //photoUrl = await gameDiv.locator('img.UBTQd').first().getAttribute('src');
            //console.log(photoUrl);
        } catch (error) {

        }

        try {
            title = await gameDiv.locator('div.HRRF1').locator("> *").first().locator("> *").first().innerText();
            console.log(title);
        } catch (error) {

        }

        try {
            releaseDate = await gameDiv.locator('div.HRRF1').locator("> *").first().locator("> *").nth(1).innerText();
            releaseDate = releaseDate.replace('Releases ', '');
            console.log(releaseDate);
        } catch (error) {

        }

        try {
            currentPrice = await gameDiv.locator('div.HRRF1').locator("> *").nth(2).locator("> *").first().locator("> *").first().locator("> *").first().innerText();
            currentPrice = currentPrice.split(':').length > 1 ? stripHtml(currentPrice).split(':')[1] :currentPrice;
            console.log(currentPrice);
        } catch (error) {

        }

        try {
            regularPrice = await gameDiv.locator('div.HRRF1').locator("> *").nth(2).locator("> *").first().locator("> *").first().locator("> *").nth(1).innerText();
            regularPrice = regularPrice.split(':').length > 1 ? stripHtml(regularPrice).split(':')[1] :regularPrice;
            console.log(regularPrice);
        } catch (error) {

        }

        results.push({
            photo_url: photoUrl,
            title: title,
            release_date: releaseDate,
            current_price: currentPrice,
            regular_price: regularPrice,
            is_discount: currentPrice != regularPrice,
            is_preorder: new Date(releaseDate) > new Date(),
        });
    }

      await browser.close();
    res.send(results);
});

app.listen(port, () => {
  console.log(`Express server listening at http://localhost:${port}`);
});