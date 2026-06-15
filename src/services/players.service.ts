import { mariaDB } from "../config/mariadb";
import { ConflictError, InternalServerError } from "../errors/CustomErrors";
import {
  AccountOwnerModel,
  ConnectionLogsModel,
  NicknameHistoryModel,
  PlayersModel,
  PointAccountsModel,
  PointTransactionsModel,
} from "../models";
import { generateAccountNumber, generateUuid } from "../utils";
import { fetchSteamProfile } from "../utils/steam";
import TransactionHandler from "../utils/transactionHandler";

export class PlayersService {
  /**
   * 게임 서버 내 플레이어 접속 처리
   * @param steamid64 플레이어 SteamID64
   * @param ip 플레이어 접속 IP 주소
   * @param port 플레이어 접속 포트 번호
   * @param nickname 플레이어 닉네임
   */
  static async handleConnection(
    steamid64: string,
    ip: string,
    port: number,
    nickname: string,
  ) {
    return await TransactionHandler.executeInTransaction(
      mariaDB,
      async (connection) => {
        // 플레이어 스팀 정보 불러오기
        const playerSteamInfo = await fetchSteamProfile(steamid64);

        // 플레이어 정보 조회
        const player = await PlayersModel.findBySteamId64(
          steamid64,
          connection,
        );
        if (!player) {
          // 플레이어 정보가 존재하지 않으면 새로 생성
          // 플레이어 예금주 생성
          const accountOwnerUuid = generateUuid();
          const newAccountOwner = await AccountOwnerModel.create(
            accountOwnerUuid,
            "player",
            connection,
          );

          // 플레이어 데이터 생성
          const playerUuid = generateUuid();
          const newPlayer = await PlayersModel.create(
            playerUuid,
            steamid64,
            nickname,
            playerSteamInfo?.avatarFull || "",
            newAccountOwner.id,
            connection,
          );

          // 포인트 계좌 생성 (계좌번호 중복 시 최대 10회 재시도)
          const pointAccountUuid = generateUuid();
          let newPointAccount;
          for (let attempt = 0; attempt < 10; attempt++) {
            try {
              newPointAccount = await PointAccountsModel.create(
                pointAccountUuid,
                newAccountOwner.id,
                generateAccountNumber(),
                connection,
              );
              break;
            } catch (error: any) {
              if (error instanceof ConflictError) continue;
              throw error;
            }
          }

          if (!newPointAccount) {
            throw new InternalServerError(
              "Failed to create point account after retrying account number generation.",
            );
          }

          // 초기 자금 트랜잭션 생성
          // Jellen 중앙 은행 계좌 조회
          const jellenCentralBankAccount = await PointAccountsModel.findById(
            process.env.JELLEN_CENTRAL_BANK_ACCOUNT_ID!,
            connection,
          );
          if (!jellenCentralBankAccount) {
            throw new InternalServerError(
              "Failed to find Jellen central bank account for initial point transaction.",
            );
          }

          // 거래 트랜잭션 생성
          const transactionUuid = generateUuid();
          const initialPoint = Number(process.env.INITIAL_POINTS) || 0;
          const initialPointReason =
            process.env.INITIAL_POINTS_REASON || "서버 최초 접속 보상";
          const newPointTransaction = await PointTransactionsModel.create(
            transactionUuid,
            jellenCentralBankAccount.id,
            newPointAccount.id,
            initialPoint,
            jellenCentralBankAccount.point - initialPoint,
            initialPoint,
            initialPointReason,
            connection,
          );

          // 새로 생성된 플레이어 정보 반환
          return newPlayer;
        }

        // 플레이어 정보가 존재하면
        // 닉네임, 마지막 접속 일자 업데이트
        const newLastVisitedAt = new Date();
        await PlayersModel.updateOnLogin(
          player.id,
          nickname,
          playerSteamInfo?.avatarFull || null,
          newLastVisitedAt,
          connection,
        );

        // 접속 로그 기록
        await ConnectionLogsModel.create(
          player.id,
          ip,
          port,
          nickname,
          connection,
        );

        // 닉네임 변경 로그 기록 (닉네임이 변경된 경우에만)
        if (player.nickname !== nickname) {
          await NicknameHistoryModel.create(
            player.id,
            player.nickname,
            connection,
          );
        }

        // 업데이트된 플레이어 정보 반환
        player.lastVisitedAt = newLastVisitedAt;
        return player;
      },
    );
  }
}
