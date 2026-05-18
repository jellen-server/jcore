// middleware/errorHandler.ts
import { Response } from "express";
import AppError from "../errors/AppError";

export const errorHandler = (err: Error, res: Response): void => {
  let statusCode = 500;
  let message = "Internal server error";

  // AppError 인스턴스인 경우
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  const response = {
    success: false,
    error: message,
  };

  res.status(statusCode).json(response);
};
