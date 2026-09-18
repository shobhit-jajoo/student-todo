export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

export const handleError = (error: unknown) => {
  if (error instanceof AppError) {
    return { statusCode: error.statusCode, message: error.message };
  }

  if (error instanceof Error) {
    return {
      statusCode: 500,
      message: 'Something went wrong',
    };
  }

  return { statusCode: 500, message: 'Something went wrong' };
};
