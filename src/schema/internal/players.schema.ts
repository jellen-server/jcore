import z from "zod";

/**
 * 플레이어 접속 요청 파라미터 검증 스키마
 */
export const connectionParamsSchema = z.object({
  steamid64: z.string("SteamID64 must be a string"),
});
/**
 * 플레이어 접속 요청 바디 검증 스키마
 */
export const connectionBodySchema = z.object({
  ip: z.string("IP must be a string"),
  port: z.number("Port must be a number"),
  nickname: z.string("Nickname must be a string"),
});
