/**
 * This project sends a review summary notification email to Ying every month
 * To deploy: zip this folder and then upload the zipped folder to AWS Lambda
 * The Lambda function name is "monthly-review-count-notifier"
 */
const { main } = require("./main");

exports.handler = async (event) => {
  const result = await main();
  const response = {
    statusCode: 200,
    body: JSON.stringify(result)
  };
  return response;
};