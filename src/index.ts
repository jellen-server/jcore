import express, { Request, Response } from "express";
import "dotenv/config";

const app = express();

app.set("trust proxy", 2);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 기본 라우트 설정
app.get("/", (_req: Request, res: Response) => {
  res.send("jCore node.js server!");
});

// 헬스체크 라우트 설정
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    message: "서버가 정상적으로 작동 중입니다.",
  });
});

// 서버 시작
const PORT = Number(process.env.PORT);
app.listen(PORT, () => {
  console.log(`서버가 ${PORT}번 포트에서 실행 중입니다.`);
});
