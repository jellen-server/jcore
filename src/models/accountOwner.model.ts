import {
  Pool,
  PoolConnection,
  QueryError,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { ConflictError } from "../errors/CustomErrors";

/**
 * 예금주 테이블 모델
 */
export class AccountOwnerModel {
  id: string;
  uuid: string;
  type: "player" | "company";
  createdAt: Date;
  updatedAt: Date | null;

  constructor(data: any) {
    this.id = String(data.id);
    this.uuid = data.uuid;
    this.type = data.type;
    this.createdAt = new Date(data.createdAt);
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : null;
  }

  /**
   * 객체를 JSON으로 변환할 때 id 필드를 제외한다.
   * @returns 객체에서 id 필드를 제외한 나머지 필드로 구성된 객체
   */
  toJSON() {
    const { id, ...rest } = this;
    return rest;
  }

  /**
   * 예금주 생성
   * @param uuid 예금주 uuid
   * @param type 예금주 유형 ("player" 또는 "company")
   * @param connection MariaDB 연결 객체
   * @returns 생성된 AccountOwnerModel 인스턴스
   */
  static async create(
    uuid: string,
    type: "player" | "company",
    connection: PoolConnection | Pool,
  ) {
    try {
      const [result] = await connection.execute<ResultSetHeader>(
        `
        INSERT INTO account_owners (owner_uuid, type)
        VALUES (?, ?)
      `,
        [uuid, type],
      );

      return new AccountOwnerModel({
        id: String(result.insertId),
        uuid,
        type,
        createdAt: new Date(),
        updatedAt: null,
      });
    } catch (error) {
      if ((error as QueryError).errno === 1062) {
        throw new ConflictError("Account owner already exists.");
      }
      throw error;
    }
  }

  /**
   * 예금주 id로 예금주 조회
   * @param id 예금주 id
   * @param connection MariaDB 연결 객체
   * @returns AccountOwnerModel 인스턴스 또는 null
   */
  static async findById(id: string, connection: PoolConnection | Pool) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `
        SELECT *
        FROM account_owners
        WHERE owner_id = ?
      `,
      [id],
    );

    const accountOwner = rows[0];
    if (!accountOwner) {
      return null;
    }

    return this.formatAccountOwner(accountOwner);
  }

  /**
   * DB에서 조회한 데이터를 AccountOwnerModel 인스턴스로 변환한다.
   * @param data DB에서 조회한 데이터 객체
   * @returns AccountOwnerModel 인스턴스 또는 null
   */
  private static formatAccountOwner(data: any) {
    if (!data) {
      return null;
    }

    return new AccountOwnerModel({
      id: String(data.id),
      uuid: data.uuid,
      type: data.type,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
