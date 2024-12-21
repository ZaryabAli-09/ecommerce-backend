class ApiResponse {
  constructor(data, message, status = "success") {
    this.status = status;
    this.data = data;
    this.message = message;
  }
}

export { ApiResponse };
