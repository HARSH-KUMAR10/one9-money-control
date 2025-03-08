// Generate HTML content
const generateHTML = (stats) => {
  return `
      <html>
  <head>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        margin: 20px;
      }
      .container {
        max-width: 600px;
        margin: auto;
        background: #f9f9f9;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      }
      h1 {
        text-align: center;
        color: #4CAF50;
      }
      .section {
        margin-bottom: 20px;
      }
      .section h2 {
        font-size: 18px;
        color: #555;
        border-bottom: 2px solid #4CAF50;
        padding-bottom: 5px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
      }
      table th, table td {
        text-align: left;
        padding: 8px;
        border: 1px solid #ddd;
      }
      table th {
        background: #4CAF50;
        color: white;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Expense Summary</h1>
      <div class="section">
        <h2>Total Amount</h2>
        <h2>${stats.totalAmount}</h2>
      </div>
      <div class="section">
        <h2>Amount by Type</h2>
        <table>
          <tr><th>Type</th><th>Amount</th></tr>
          <tr><td>Fixed</td><td>${stats.totalAmountByType.fixed}</td></tr>
                <tr><td>Variable</td><td>${
                  stats.totalAmountByType.variable
                }</td></tr>
        </table>
      </div>
      <div class="section">
        <h2>Amount by Need or Want</h2>
        <table>
          <tr><th>Category</th><th>Amount</th></tr>
          <tr><td>Need</td><td>${stats.totalAmountByNeedOrWant.need}</td></tr>
                <tr><td>Want</td><td>${
                  stats.totalAmountByNeedOrWant.want
                }</td></tr>
        </table>
      </div>
      <div class="section">
        <h2>Amount by Frequency</h2>
        <table>
          <tr><th>Date</th><th>Amount</th></tr>
          ${Object.entries(stats.totalAmountByFrequency)
            .map(
              ([date, amount]) => `<tr><td>${date}</td><td>${amount}</td></tr>`
            )
            .join("")}
        </table>
      </div>
      <div class="section">
        <h2>Amount by Category</h2>
        <table>
          <tr><th>Category</th><th>Amount</th></tr>
          ${Object.entries(stats.totalAmountByCategory)
            .sort((a, b) => b[1] - a[1])
            .map(
              ([category, amount]) =>
                `<tr><td>${category}</td><td>${amount}</td></tr>`
            )
            .join("")}
        </table>
      </div>
    </div>
  </body>
</html>
    `;
};

module.exports = { generateHTML };
