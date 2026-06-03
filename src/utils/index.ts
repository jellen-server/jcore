import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

/**
 * UUID를 생성하는 유틸리티 함수
 *
 */
export const generateUuid = () => {
  return uuidv4();
};

/**
 * 계좌 번호를 생성하는 함수
 * @returns XXXX-XXXX 형식의 계좌번호 (예: "1234-5678")
 */
export const generateAccountNumber = (): string => {
  const part1 = crypto.randomInt(0, 10000).toString().padStart(4, "0");
  const part2 = crypto.randomInt(0, 10000).toString().padStart(4, "0");

  return `${part1}-${part2}`;
};
