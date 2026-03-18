
export class ApiError extends Error {

  public readonly statusCode: number;

  public override readonly message: string;

  public readonly errors?: any[];

  public readonly success = false as const;

  constructor(statusCode: number, message: string, errors?: any[]) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.message = message;
    if (errors !== undefined) {
      this.errors = errors;
    }
    Object.setPrototypeOf(this, ApiError.prototype);
    Error.captureStackTrace?.(this, ApiError);
  }
}
