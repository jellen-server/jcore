import { Pool, PoolConnection, ResultSetHeader } from "mysql2/promise";

/**
 * 닉네임 기록 테이블 모델
 */
export class NicknameHistoryModel {
  id: string;
  playerId: string;
  nickname: string;
  createdAt: Date;

  constructor(data: any) {
    this.id = String(data.id);
    this.playerId = data.playerId;
    this.nickname = data.nickname;
    this.createdAt = new Date(data.createdAt);
  }

  /**
   * 닉네임 변경 로그 기록
   * @param playerId 플레이어 id
   * @param nickname 변경된 닉네임
   * @param connection MariaDB 연결 객체
   * @returns 생성된 NicknameHistoryModel 인스턴스
   */
  static async create(
    playerId: string,
    nickname: string,
    connection: PoolConnection | Pool,
  ) {
    const [result] = await connection.execute<ResultSetHeader>(
      `
        INSERT INTO nickname_history (player_id, nickname)
        VALUES (?, ?)
      `,
      [playerId, nickname],
    );

    return new NicknameHistoryModel({
      id: String(result.insertId),
      playerId,
      nickname,
      createdAt: new Date(),
    });
  }

  /**
   * DB에서 조회한 데이터를 NicknameHistoryModel 인스턴스로 변환한다.
   * @param data DB에서 조회한 데이터 객체
   * @returns NicknameHistoryModel 인스턴스 또는 null
   */
  static async formatNicknameHistory(data: any) {
    if (!data) {
      return null;
    }

    return new NicknameHistoryModel({
      id: data.id,
      playerId: data.player_id,
      nickname: data.nickname,
      createdAt: data.created_at,
    });
  }
}
