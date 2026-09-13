const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error(err.stack);

  if (err.code === "P2002" || err.code === 11000) {
    error = new Error("Duplicate value entered. Record already exists.");
    error.statusCode = 409;
  } else if (err.name?.includes("Prisma") || (typeof err.code === "string" && err.code.startsWith("P"))) {
    error = new Error("A database error occurred.");
    error.statusCode = 500;
  }

  const statusCode = error.statusCode || 500;
  const isProd = process.env.NODE_ENV === "production";
  const safeMessage = statusCode >= 500 && isProd
    ? "Internal Server Error"
    : (error.message || "Server Error");

  res.status(statusCode).json({
    success: false,
    message: safeMessage,
    error: safeMessage,
  });
};

export default errorHandler;
