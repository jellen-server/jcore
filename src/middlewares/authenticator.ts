import { NextFunction, Response } from "express";
import { ApiKeyRequest, APIResponse, ErrorCode } from "../types";
import { ApiKeyModel } from "../models";
import { mariaDB } from "../config/mariadb";

// API 키 접두사
const API_KEY_PREFIX = process.env.API_KEY_PREFIX || "";

/**
 * API 키 인증 미들웨어
 * @param req API 요청 객체
 * @param res API 응답 객체
 * @param next 다음 미들웨어 호출 함수
 */
export const authenticateApiKey = async (
  req: ApiKeyRequest,
  res: Response<APIResponse>,
  next: NextFunction,
) => {
  try {
    // 헤더에서 API 키 추출
    const apiKey = req.headers["x-api-key"];
    if (!apiKey) {
      res.status(401).json({
        success: false,
        message: "API key is required.",
        error: ErrorCode.API_KEY_MISSING,
      });
      return;
    } else if (!String(apiKey).startsWith(API_KEY_PREFIX)) {
      res.status(403).json({
        success: false,
        message: "Invalid API key.",
        error: ErrorCode.API_KEY_INVALID,
      });
      return;
    }

    // API 키 검증
    const apiKeyModel = await ApiKeyModel.findByKey(
      String(apiKey).slice(API_KEY_PREFIX.length),
      mariaDB,
    );
    if (!apiKeyModel || apiKeyModel.status !== "active") {
      res.status(403).json({
        success: false,
        message: "Invalid API key.",
        error: ErrorCode.API_KEY_INVALID,
      });
      return;
    }

    // 요청에 API 키 정보 추가
    req.apiKey = apiKeyModel;
    next();
  } catch (error) {
    next(error);
  }
};
