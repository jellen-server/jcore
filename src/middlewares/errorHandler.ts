// middleware/errorHandler.ts
import { NextFunction, Request, Response } from "express";
import AppError from "../errors/AppError";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  let statusCode = 500;
  let message = "Internal server error";

  // AppError 인스턴스인 경우
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // 예외 응답 생성
  const response = {
    success: false,
    error: message,
  };

  // 예외 응답 전송
  res.status(statusCode).json(response);
};
