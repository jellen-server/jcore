import { Pool, PoolConnection, ResultSetHeader } from "mysql2/promise";

/**
 * 서버 접속 기록 모델 클래스
 */
export class ConnectionLogsModel {
  id: string;
  playerId: string;
  ip: string;
  port: number;
  nickname: string;
  createdAt: Date;

  constructor(data: any) {
    this.id = String(data.id);
    this.playerId = data.playerId;
    this.ip = data.ip;
    this.port = data.port;
    this.nickname = data.nickname;
    this.createdAt = new Date(data.createdAt);
  }

  static async create(
    playerId: string,
    ip: string,
    port: number,
    nickname: string,
    connection: PoolConnection | Pool,
  ) {
    const [result] = await connection.execute<ResultSetHeader>(
      `
        INSERT INTO connection_logs (player_id, ip, port, nickname)
        VALUES (?, ?, ?, ?)
      `,
      [playerId, ip, port, nickname],
    );

    return new ConnectionLogsModel({
      id: String(result.insertId),
      playerId,
      ip,
      port,
      nickname,
      createdAt: new Date(),
    });
  }

  /**
   * DB에서 조회한 데이터를 ConnectionLogsModel 인스턴스로 변환한다.
   * @param data DB에서 조회한 데이터 객체
   * @returns ConnectionLogsModel 인스턴스 또는 null
   */
  private static formatConnectionLog(data: any) {
    if (!data) {
      return null;
    }

    return new ConnectionLogsModel({
      id: String(data.id),
      playerId: data.player_id,
      ip: data.ip,
      port: data.port,
      nickname: data.nickname,
      createdAt: new Date(data.created_at),
    });
  }
}
