export class ApiResponse<T = unknown> {

  public readonly statusCode: number;

  public readonly data: T;

  public readonly message: string;

  public readonly success: boolean;

  constructor(statusCode: number, data: T, message: string) {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}
