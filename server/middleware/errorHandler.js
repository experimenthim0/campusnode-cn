const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error(err.stack);

  if (err.code === "P2002" || err.code === 11000) {
    const message = "Duplicate field value entered";
    error = new Error(message);
    error.statusCode = 400;
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' && !error.statusCode ? "Internal Server Error" : error.message || "Server Error",
  });
};

export default errorHandler;
