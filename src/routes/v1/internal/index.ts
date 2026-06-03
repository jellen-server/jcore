import { Router } from "express";
import playersRouter from "./players.route";
import { authenticateApiKey } from "../../../middlewares/authenticator";

const internalRouter = Router();

internalRouter.use("/players", authenticateApiKey, playersRouter);

export default internalRouter;
