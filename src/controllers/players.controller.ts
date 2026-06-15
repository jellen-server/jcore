import { Response } from "express";
import { ApiKeyRequest, APIResponse } from "../types";
import { asyncHandler } from "../utils/asyncHandler";
import { PlayersService } from "../services";

export class PlayersController {
  /**
   * 플레이어 연결 처리
   */
  static handleConnection = asyncHandler(
    async (req: ApiKeyRequest, res: Response<APIResponse>) => {
      const { steamid64 } = req.params as { steamid64: string };
      const { ip, port, nickname } = req.body;

      // 플레이어 연결 처리
      const player = await PlayersService.handleConnection(
        steamid64,
        ip,
        port,
        nickname,
      );

      // 응답 데이터에서 id 필드 제거
      const { id, ...responseData } = player;

      // 성공 응답 반환
      res.json({
        success: true,
        message: "Player connection recorded successfully.",
        data: responseData,
      });
    },
  );
}
