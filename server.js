// https://dev.to/drruvari/building-a-web-scraper-with-reactjs-express-and-tailwindcss-a-journey-into-data-collection-31g9
// https://books.toscrape.com/

const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();
app.use(cors());
const port = 3000;

app.get('/', (req, res) => {
  console.log(req);
  res.send('Hello World from Express!');
});

app.get('/scrape', async (req, res) => {
  //const url = req.query.url;
  const url = 'https://books.toscrape.com/';
  console.log(url);

  try {
    const response = await axios.get(url).then(response => {
        //console.log(response);

        const html = response.data;
        console.log('html', html);
        const $ = cheerio.load(html);
        const data = [];

        $(".row li a[title]").each((index, element) => {
          console.log(element);
        });

        
      }).catch(error => {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error('Server responded with error:', error.response.data);
          console.error('Status:', error.response.status);
          console.error('Headers:', error.response.headers);
        } else if (error.request) {
          // The request was made but no response was received
          console.error('No response received:', error.request);
        } else {
          // Something happened in setting up the request that triggered an Error
          console.error('Error setting up request:', error.message);
        }
        console.error('Axios config:', error.config);
      });


    

    /* $(".row li a[title]").each((index, element) => {
      console.log(element);
    }); */

    /* $("a").each((index, element) => {
      data.push({
        text: $(element).text(),
        href: $(element).attr("href"),
      });
    }); */

    
    //res.json(data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error accessing the URL" });
  }
});

app.listen(port, () => {
  console.log(`Express server listening at http://localhost:${port}`);
});