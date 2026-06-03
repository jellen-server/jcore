import {
  Pool,
  PoolConnection,
  QueryError,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { ConflictError } from "../errors/CustomErrors";

/**
 * 포인트 계좌 모델
 */
export class PointAccountsModel {
  id: string;
  uuid: string;
  ownerId: string;
  accountNumber: string;
  password: string;
  point: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any) {
    this.id = data.id || "";
    this.uuid = data.uuid || "";
    this.ownerId = data.ownerId || "";
    this.accountNumber = data.accountNumber || "";
    this.password = data.password || "";
    this.point = data.point || 0;
    this.createdAt = new Date(data.createdAt || new Date());
    this.updatedAt = new Date(data.updatedAt || new Date());
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
   * 포인트 계좌 생성
   * @param uuid 계좌 uuid
   * @param ownerId 예금주 id
   * @param accountNumber 계좌 번호
   * @param connection MariaDB 연결 객체
   * @returns 생성된 PointAccountModel 인스턴스
   */
  static async create(
    uuid: string,
    ownerId: string,
    accountNumber: string,
    connection: PoolConnection | Pool,
  ) {
    try {
      const [result] = await connection.execute<ResultSetHeader>(
        `
        INSERT INTO point_accounts (account_uuid, owner_id, account_number)
        VALUES (?, ?, ?)
      `,
        [uuid, ownerId, accountNumber],
      );

      const pointAccount = new PointAccountsModel({
        id: String(result.insertId),
        uuid,
        ownerId,
        accountNumber,
        password: null,
        point: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return pointAccount;
    } catch (error) {
      if ((error as QueryError).errno === 1062) {
        throw new ConflictError("Point account already exists.");
      }
      throw error;
    }
  }

  /**
   * 계좌 id로 포인트 계좌 조회
   * @param accountId 조회할 계좌 id
   * @param connection MariaDB 연결 객체
   * @returns 조회된 PointAccountModel 인스턴스 또는 null
   */
  static async findById(accountId: string, connection: PoolConnection | Pool) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `
        SELECT *
        FROM point_accounts
        WHERE account_id = ?
      `,
      [accountId],
    );

    const pointAccount = rows[0];
    if (!pointAccount) {
      return null;
    }

    return this.formatPointAccount(pointAccount);
  }

  /**
   * 계좌 uuid로 포인트 계좌 조회
   * @param accountUuid 조회할 계좌 uuid
   * @param connection MariaDB 연결 객체
   * @returns 조회된 PointAccountModel 인스턴스 또는 null
   */
  static async findByUuid(
    accountUuid: string,
    connection: PoolConnection | Pool,
  ) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `
        SELECT *
        FROM point_accounts
        WHERE uuid = ?
      `,
      [accountUuid],
    );

    const pointAccount = rows[0];
    if (!pointAccount) {
      return null;
    }

    return this.formatPointAccount(pointAccount);
  }

  /**
   * 플레이어 id로 포인트 계좌 조회
   * @param playerId 조회할 플레이어 id
   * @param connection MariaDB 연결 객체
   * @returns 조회된 PointAccountModel 인스턴스 또는 null
   */
  static async findByOwnerId(
    ownerId: string,
    connection: PoolConnection | Pool,
  ) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `
        SELECT *
        FROM point_accounts
        WHERE owner_id = ?
      `,
      [ownerId],
    );

    const pointAccount = rows[0];
    if (!pointAccount) {
      return null;
    }

    return this.formatPointAccount(pointAccount);
  }

  /**
   * 계좌 번호로 포인트 계좌 조회
   * @param accountNumber 조회할 계좌 번호
   * @param connection MariaDB 연결 객체
   * @returns 조회된 PointAccountModel 인스턴스 또는 null
   */
  static async findByAccountNumber(
    accountNumber: string,
    connection: PoolConnection | Pool,
  ) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `
        SELECT *
        FROM point_accounts
        WHERE account_number = ?
      `,
      [accountNumber],
    );

    const pointAccount = rows[0];
    if (!pointAccount) {
      return null;
    }

    return this.formatPointAccount(pointAccount);
  }

  /**
   * DB에서 조회한 데이터를 PointAccountModel 인스턴스로 변환한다.
   * @param data DB에서 조회한 데이터 객체
   * @returns PointAccountModel 인스턴스 또는 null
   */
  private static formatPointAccount(data: RowDataPacket | null) {
    if (!data) {
      return null;
    }

    const pointAccount = new PointAccountsModel({
      id: String(data.account_id),
      uuid: data.account_uuid,
      ownerId: data.owner_id,
      accountNumber: data.account_number,
      password: data.password,
      point: data.point,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
    return pointAccount;
  }
}
