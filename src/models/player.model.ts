import {
  Pool,
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";

/**
 * players 테이블 모델
 */
export class PlayerModel {
  id: string;
  uuid: string;
  steamid64: string;
  nickname: string;
  avatar: string;
  createdAt: Date;
  lastVisitedAt: Date;
  totalPlaytime: number;

  constructor(data: any) {
    this.id = data.id || "";
    this.uuid = data.uuid || "";
    this.steamid64 = data.steamid64 || "";
    this.nickname = data.nickname || "";
    this.avatar = data.avatar || "";
    this.createdAt = new Date(data.createdAt || new Date());
    this.lastVisitedAt = new Date(data.lastVisitedAt || new Date());
    this.totalPlaytime = data.totalPlaytime || 0;
  }

  /**
   * 플레이어 생성
   * @param uuid 플레이어 uuid
   * @param steamid64 플레이어 SteamID64
   * @param nickname 플레이어 닉네임
   * @param avatar 플레이어 아바타 URL
   * @param connection MariaDB 연결 객체
   * @returns 생성된 PlayerModel 인스턴스
   */
  static async create(
    uuid: string,
    steamid64: string,
    nickname: string,
    avatar: string,
    connection: PoolConnection | Pool,
  ) {
    const [result] = await connection.execute<ResultSetHeader>(
      `
        INSERT INTO players (player_uuid, steamid64, nickname, avatar)
        VALUES (?, ?, ?, ?)
      `,
      [uuid, steamid64, nickname, avatar],
    );

    const player = new PlayerModel({
      id: String(result.insertId),
      uuid,
      steamid64,
      nickname,
      avatar,
      createdAt: new Date(),
      lastVisitedAt: new Date(),
      totalPlaytime: 0,
    });

    return player;
  }

  /**
   * 플레이어 id로 플레이어 조회
   * @param playerId 플레이어 id
   * @param connection MariaDB 연결 객체
   * @returns PlayerModel 인스턴스 또는 null
   */
  static async findById(playerId: string, connection: PoolConnection | Pool) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `
        SELECT *
        FROM players
        WHERE player_id = ?
      `,
      [playerId],
    );

    const player = rows[0];
    if (!player) {
      return null;
    }

    return this.formatPlayer(player);
  }

  /**
   * SteamID64로 플레이어 조회
   * @param steamid64 SteamID64
   * @param connection MariaDB 연결 객체
   * @returns PlayerModel 인스턴스 또는 null
   */
  static async findBySteamId64(
    steamid64: string,
    connection: PoolConnection | Pool,
  ) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `
        SELECT *
        FROM players
        WHERE steamid64 = ?
      `,
      [steamid64],
    );

    const player = rows[0];
    if (!player) {
      return null;
    }

    return this.formatPlayer(player);
  }

  /**
   * 플레이어 uuid로 플레이어 조회
   * @param playerUuid 플레이어 uuid
   * @param connection MariaDB 연결 객체
   * @returns PlayerModel 인스턴스 또는 null
   */
  static async findByUuid(
    playerUuid: string,
    connection: PoolConnection | Pool,
  ) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `
        SELECT *
        FROM players
        WHERE player_uuid = ?
      `,
      [playerUuid],
    );

    const player = rows[0];
    if (!player) {
      return null;
    }

    return this.formatPlayer(player);
  }

  /**
   * 닉네임으로 플레이어 조회 (부분 일치)
   * @param nickname 조회할 닉네임 (부분 일치)
   * @param connection MariaDB 연결 객체
   * @returns PlayerModel 인스턴스 배열 또는 null
   */
  static async findByNickname(
    nickname: string,
    connection: PoolConnection | Pool,
  ) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `
        SELECT *
        FROM players
        WHERE nickname LIKE CONCAT('%', ?, '%')
      `,
      [nickname],
    );

    if (rows.length === 0) {
      return null;
    }

    const players = rows.map((row) => this.formatPlayer(row));
    return players;
  }

  /**
   * 플레이어 프로필 업데이트
   * @param playerId 플레이어 id
   * @param nickname 닉네임
   * @param avatar 아바타 URL
   * @param connection MariaDB 연결 객체
   */
  static async updateProfile(
    playerId: string,
    nickname: string,
    avatar: string,
    connection: PoolConnection | Pool,
  ) {
    await connection.execute(
      `
        UPDATE players
        SET nickname = ?, avatar = ?
        WHERE player_id = ?
      `,
      [nickname, avatar, playerId],
    );
  }

  /**
   * 플레이어 마지막 방문 시간 업데이트
   * @param playerId 플레이어 id
   * @param connection MariaDB 연결 객체
   */
  static async updateLastVisit(
    playerId: string,
    connection: PoolConnection | Pool,
  ) {
    await connection.execute(
      `
        UPDATE players
        SET last_visited_at = NOW()
        WHERE player_id = ?
      `,
      [playerId],
    );
  }

  /**
   * DB에서 조회한 데이터를 PlayerModel 인스턴스로 변환한다.
   * @param data DB에서 조회한 데이터 객체
   * @returns PlayerModel 인스턴스 또는 null
   */
  private static formatPlayer(data: RowDataPacket | null) {
    if (!data) {
      return null;
    }

    const player = new PlayerModel({
      id: String(data.player_id),
      uuid: data.player_uuid,
      steamid64: data.steamid64,
      nickname: data.nickname,
      avatar: data.avatar,
      createdAt: data.created_at,
      lastVisitedAt: data.last_visited_at,
      totalPlaytime: data.total_playtime,
    });
    return player;
  }
}
