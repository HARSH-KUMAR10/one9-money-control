const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log incoming request details
  console.log(`\n[Incoming Request] ${req?.method} ${req?.originalUrl}`);
  //   console.log("Headers:", JSON.stringify(req?.headers));
  if (Object.keys(req?.body)?.length) {
    console.log("Body:", JSON.stringify(req?.body));
  }

  // Capture response details
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[Response] Status: ${res?.statusCode} | Time Taken: ${duration}ms`
    );
  });

  next();
};

module.exports = requestLogger;
