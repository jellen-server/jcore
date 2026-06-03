import {
  Pool,
  PoolConnection,
  QueryError,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { ConflictError } from "../errors/CustomErrors";

/**
 * 포인트 거래 기록 모델
 */
export class PointTransactionsModel {
  id: string;
  uuid: string;
  senderAccountId: string;
  senderAccountHolderUuid?: string;
  senderAccountHolderNickname?: string;
  senderAccountNumber?: string;
  receiverAccountId: string;
  receiverAccountHolderUuid?: string;
  receiverAccountHolderNickname?: string;
  receiverAccountNumber?: string;
  amount: number;
  senderBalanceAfter: number;
  receiverBalanceAfter: number;
  comment: string | null;
  createdAt: Date;

  constructor(data: any) {
    this.id = data.id || "";
    this.uuid = data.uuid || "";
    this.senderAccountId = data.senderAccountId || "";
    this.senderAccountHolderUuid = data.senderAccountHolderUuid || undefined;
    this.senderAccountHolderNickname =
      data.senderAccountHolderNickname || undefined;
    this.senderAccountNumber = data.senderAccountNumber || undefined;
    this.receiverAccountId = data.receiverAccountId || "";
    this.receiverAccountHolderUuid =
      data.receiverAccountHolderUuid || undefined;
    this.receiverAccountHolderNickname =
      data.receiverAccountHolderNickname || undefined;
    this.receiverAccountNumber = data.receiverAccountNumber || undefined;
    this.amount = data.amount || 0;
    this.senderBalanceAfter = data.senderBalanceAfter || 0;
    this.receiverBalanceAfter = data.receiverBalanceAfter || 0;
    this.comment = data.comment || null;
    this.createdAt = new Date(data.createdAt || new Date());
  }

  /**
   * 객체를 JSON으로 변환할 때 id 필드를 제외한다.
   * @returns 객체에서 id 필드를 제외한 나머지 필드로 구성된 객체
   */
  toJSON() {
    const { id, senderAccountId, receiverAccountId, ...rest } = this;
    return rest;
  }

  /**
   * 포인트 거래 기록 생성
   * @param transactionUuid 거래 기록 uuid
   * @param senderAccountId 송금자 계좌 id
   * @param receiverAccountId 수금자 계좌 id
   * @param amount 거래 금액
   * @param senderBalanceAfter 송금자 거래 후 잔액
   * @param receiverBalanceAfter 수금자 거래 후 잔액
   * @param comment 거래 메모 또는 null
   * @param connection MariaDB 연결 객체
   * @returns 생성된 PointTransactionModel 인스턴스
   */
  static async create(
    transactionUuid: string,
    senderAccountId: string,
    receiverAccountId: string,
    amount: number,
    senderBalanceAfter: number,
    receiverBalanceAfter: number,
    comment: string | null,
    connection: PoolConnection | Pool,
  ) {
    try {
      const [result] = await connection.execute<ResultSetHeader>(
        `
        INSERT INTO point_transactions
            (transaction_uuid, sender_account_id, receiver_account_id, amount, sender_balance_after, receiver_balance_after, comment)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [
          transactionUuid,
          senderAccountId,
          receiverAccountId,
          amount,
          senderBalanceAfter,
          receiverBalanceAfter,
          comment,
        ],
      );

      return new PointTransactionsModel({
        id: String(result.insertId),
        uuid: transactionUuid,
        senderAccountId,
        receiverAccountId,
        amount,
        senderBalanceAfter,
        receiverBalanceAfter,
        comment,
        createdAt: new Date(),
      });
    } catch (error) {
      if ((error as QueryError).errno === 1062) {
        throw new ConflictError("Point transaction already exists.");
      }
      throw error;
    }
  }

  /**
   * DB에서 조회한 데이터를 PointTransactionModel 인스턴스로 변환한다.
   * @param data DB에서 조회한 데이터 객체
   * @returns PointTransactionModel 인스턴스 또는 null
   */
  private static async formatTransaction(data: RowDataPacket | null) {
    if (!data) {
      return null;
    }

    return new PointTransactionsModel({
      id: String(data.id),
      uuid: data.transaction_uuid,
      senderAccountId: String(data.sender_account_id),
      senderAccountHolderUuid: data.sender_account_holder_uuid,
      senderAccountHolderNickname: data.sender_account_holder_nickname,
      senderAccountNumber: data.sender_account_number,
      receiverAccountId: String(data.receiver_account_id),
      receiverAccountHolderUuid: data.receiver_account_holder_uuid,
      receiverAccountHolderNickname: data.receiver_account_holder_nickname,
      receiverAccountNumber: data.receiver_account_number,
      amount: data.amount,
      senderBalanceAfter: data.sender_balance_after,
      receiverBalanceAfter: data.receiver_balance_after,
      comment: data.comment,
      createdAt: new Date(data.created_at),
    });
  }
}
