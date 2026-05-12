import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pharmaRouter from "./pharma";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/pharma", pharmaRouter);

export default router;
