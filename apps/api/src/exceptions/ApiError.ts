module.exports = class ApiError extends Error {
  status: number;
  message: string;
  errors: unknown[];

  constructor(status: number, message: string, errors: unknown[] = []) {
    super(message);
    this.status = status;
    this.message = message;
    this.errors = errors;
  }

  static UnauthorizedError() {
    return new ApiError(401, "User is not authorized");
  }

  static BadRequest(message: string, errors: unknown[] = []) {
    return new ApiError(400, message, errors);
  }

  static Internal(message: string) {
    return new ApiError(500, message);
  }

  static NotFound(message: string) {
    return new ApiError(404, message);
  }
};
