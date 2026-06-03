import axios from "axios";
import { XMLParser } from "fast-xml-parser";

/**
 * Steam 프로필 XML 데이터 인터페이스
 */
export interface SteamProfileXML {
  steamID64: string; // 스팀 고유번호
  nickname: string; // 사용자 이름
  onlineState: string; // 온라인 상태
  avatarIcon: string; // 아이콘 아바타 URL
  avatarMedium: string; // 중간 스케일 아바타 URL
  avatarFull: string; // 풀 스케일 아바타 URL
}

/**
 * Steam 고유 번호로 스팀 사용자 프로필 데이터 추출
 * @param steamId64 스팀 고유 번호
 * @returns 스팀 사용자 프로필 데이터 또는 null
 */
export const fetchSteamProfile = async (
  steamId64: string,
): Promise<SteamProfileXML | null> => {
  try {
    // Steam 프로필 XML URL
    const url = `https://steamcommunity.com/profiles/${steamId64}?xml=1`;
    const response = await axios.get(url);
    const xmlData = response.data;

    // XMLParser를 사용하여 XML 파싱
    const parser = new XMLParser({
      ignoreAttributes: false,
      trimValues: true,
    });
    const parsed = parser.parse(xmlData);

    // 사용자 데이터 반환
    const steamProfile = {
      steamID64: parsed.profile.steamID64,
      nickname: parsed.profile.steamID,
      onlineState: parsed.profile.onlineState,
      avatarIcon: parsed.profile.avatarIcon,
      avatarMedium: parsed.profile.avatarMedium,
      avatarFull: parsed.profile.avatarFull,
    } as SteamProfileXML;
    return steamProfile;
  } catch (error) {
    // 오류 발생 시 null 반환
    return null;
  }
};
