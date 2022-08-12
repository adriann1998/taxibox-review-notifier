require("dotenv").config();
const fetch = require("node-fetch");
const AWS = require("aws-sdk");
const documentClient = new AWS.DynamoDB.DocumentClient({
  region: "ap-southeast-2",
});

exports.handler = async (event) => {
  await main();
};

const main = async () => {
  const params = {
    TableName: "TAXIBOX-V2-Review-Details-Data",
  };
  await documentClient.scan(params, async (err, data) => {
    if (err) {
      reject(JSON.stringify(err, null, 2));
    } else {
      const today = new Date();
      const lastMonth = new Date().setMonth(today.getMonth()-1);
      const monthBefore = new Date().getMonth(); // change this to "new Date().getMonth() - 1" once DynamoDB is populating more than 10 days worth of data
      const lastMonthReviews = data.Items.filter(review => new Date(review.addedOn).getMonth() === monthBefore);
      const reviews = lastMonthReviews
        .flatMap(r => r.data)
        .map(r => ({
          ...r,
          uniqueIdentifier: `${r.source}-${r.id}`
        }));
      const uniqueReviews = [...new Map(reviews.map(item => [item['uniqueIdentifier'], item])).values()];
      const totalReviews = uniqueReviews.length;
      const reviewCounts = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      };
      uniqueReviews.forEach(r => {
        const rating = r.rating;
        reviewCounts[rating]++;
      });
      const month = new Date(lastMonth).toLocaleString('default', { month: 'long' })
      const htmlContent = `
        <html>
        <body>
          <h3 style="font-size: 24px;">${month} Reviews</h3>
          <p>
            Rating 1= ${reviewCounts[1]} reviews (${(reviewCounts[1]/totalReviews*100).toFixed(2)}%) <br/>
            Rating 2= ${reviewCounts[2]} reviews (${(reviewCounts[2]/totalReviews*100).toFixed(2)}%) <br/>
            Rating 3= ${reviewCounts[3]} reviews (${(reviewCounts[3]/totalReviews*100).toFixed(2)}%) <br/>
            Rating 4= ${reviewCounts[4]} reviews (${(reviewCounts[4]/totalReviews*100).toFixed(2)}%) <br/>
            Rating 5= ${reviewCounts[5]} reviews (${(reviewCounts[5]/totalReviews*100).toFixed(2)}%)<br/>
            Total = ${totalReviews} reviews (100%)
          </p>
        </body>
        </html>
      `;
      const emailData = {
        to: "angkajaya98@gmail.com",
        subject: `Montly Review Report - [${month}]`,
        emailName: "monthly-review-report",
        content: htmlContent,
      }
      await sendRawEmail(emailData);
    }
  });
};

const sendRawEmail = (args) => {
  const emailData = {
    asset: {
      from_email: "info@taxibox.com.au",
      from_name: "TAXIBOX <info@taxibox.com.au>",
      cc: args.cc,
      subject: args.subject,
      email_name: args.emailName,
      html_body: args.content,
      liquid_syntax_enabled: true,
      attachments: args.attachments,
    },
    emails: [
      {
        fields: {
          "bol::sp": true,
          "str::email": args.to,
          "str::soi-ctx": "TAXIBOX API"
        },
        "location": null
      }
    ],
    merge_by: [
      "str::email"
    ],
    merge_strategy: 2,
    find_strategy: 0,
    skip_non_existing: false
  };

  // construct http options
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": process.env.AUTOPILOT_API_KEY,
      "Content-Length": emailData.length,
    },
    body: JSON.stringify(emailData),
  };

  // send email
  return new Promise((resolve, reject) => {
    fetch("https://api.ap3api.com/v1/transactional/send", options)
      .then((response) => response.json())
      .then((data) => {
        console.log(data)
        if (data.error) {
          resolve(false);
        };
        resolve(true);
      })
      .catch((error) => {
        resolve(false);
    });
  });
}

module.exports = {
  main: main,
};