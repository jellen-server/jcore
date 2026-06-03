import { Router } from "express";
import { validateBody, validateParams } from "../../../middlewares/validation";
import {
  connectionBodySchema,
  connectionParamsSchema,
} from "../../../schema/internal/players.schema";
import { PlayersController } from "../../../controllers";

const playersRouter = Router();

// 플레이어 연결 처리
playersRouter.post(
  "/:steamid64/connection",
  validateParams(connectionParamsSchema),
  validateBody(connectionBodySchema),
  PlayersController.handleConnection,
);

export default playersRouter;
