import { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";

/**
 * API 키 테이블 모델
 */
export class ApiKeyModel {
  id: string;
  uuid: string;
  key: string;
  status: "active" | "disabled";
  comment?: string;
  createdAt: Date;

  constructor(data: any) {
    this.id = String(data.id);
    this.uuid = data.uuid;
    this.key = data.key;
    this.status = data.status;
    this.comment = data.comment;
    this.createdAt = data.createdAt || new Date();
  }

  /**
   * API 키 문자열로 API 키를 조회한다.
   * @param key API 키 문자열
   * @param connection MariaDB 연결 객체
   * @returns ApiKeyModel 인스턴스 또는 null
   */
  static async findByKey(key: string, connection: PoolConnection | Pool) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `
        SELECT *
        FROM apikey
        WHERE apikey = ?
      `,
      [key],
    );

    const apiKey = rows[0];
    if (!apiKey) {
      return null;
    }

    return this.formatApiKey(apiKey);
  }

  /**
   * DB에서 조회한 데이터를 ApiKeyModel 인스턴스로 변환한다.
   * @param data DB에서 조회한 데이터 객체
   * @returns ApiKeyModel 인스턴스 또는 null
   */
  private static formatApiKey(data: any) {
    if (!data) {
      return null;
    }

    return new ApiKeyModel({
      id: String(data.id),
      uuid: data.uuid,
      key: data.key,
      status: data.status,
      comment: data.comment,
      createdAt: data.created_at,
    });
  }
}
