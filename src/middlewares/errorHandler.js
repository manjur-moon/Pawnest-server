export function notFoundHandler(req, res, next) {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
}

export function errorHandler(error, req, res, next) {
  console.error(error);
  res.status(error.status || 500).json({ success: false, message: error.message || "Internal Server Error" });
}
