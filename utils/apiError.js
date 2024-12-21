class ApiError extends Error {
  constructor(statusCode, message, status = "error") {
    super(message);
    this.statusCode = statusCode;
    this.status = status;
    this.data = null;
    this.message = message;
  }
}

export { ApiError };
